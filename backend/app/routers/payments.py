
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Booking, Payment, Coupon
from app.schemas import PaymentCreate, PaymentResponse, PaymentSimulationRequest


router = APIRouter(
    prefix="/api/v1/payments",
    tags=["Payments"],
)


def calculate_coupon_discount(
    coupon: Coupon,
    original_amount: float,
) -> float:
    """Calculate a coupon discount on the server."""

    discount_type = coupon.discount_type.upper()
    discount_value = float(coupon.discount_value)

    if discount_type == "PERCENTAGE":
        discount = original_amount * discount_value / 100

        if coupon.maximum_discount is not None:
            discount = min(
                discount,
                float(coupon.maximum_discount),
            )

    elif discount_type == "FIXED":
        discount = discount_value

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported coupon discount type",
        )

    return round(min(discount, original_amount), 2)


def get_valid_coupon(
    db: Session,
    coupon_code: str,
    original_amount: float,
) -> Coupon:
    """Find and validate a coupon before applying it."""

    code = coupon_code.strip().upper()

    coupon = (
        db.query(Coupon)
        .filter(Coupon.code == code)
        .first()
    )

    if not coupon or not coupon.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or inactive coupon",
        )

    now = datetime.utcnow()

    if coupon.valid_from and now < coupon.valid_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coupon is not valid yet",
        )

    if coupon.expires_at and now > coupon.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coupon has expired",
        )

    if (
        coupon.usage_limit is not None
        and coupon.used_count >= coupon.usage_limit
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coupon usage limit reached",
        )

    if original_amount < float(coupon.minimum_amount or 0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking amount does not meet the coupon minimum",
        )

    return coupon


@router.post(
    "/",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a payment for the logged-in user's booking."""

    booking = (
        db.query(Booking)
        .filter(
            Booking.id == payment_data.booking_id,
            Booking.user_id == current_user.id,
        )
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    if booking.booking_status == "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot process payment for a cancelled booking",
        )

    if booking.booking_status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment is only allowed for pending bookings",
        )

    existing_payment = (
        db.query(Payment)
        .filter(Payment.booking_id == booking.id)
        .first()
    )

    if existing_payment:
        if existing_payment.payment_status == "SUCCESS":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This booking has already been paid for",
            )

        if existing_payment.payment_status == "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A pending payment already exists for this booking",
            )

    original_amount = round(float(booking.total_price), 2)
    coupon = None
    discount_amount = 0.0

    coupon_code = payment_data.coupon_code

    if coupon_code and coupon_code.strip():
        coupon = get_valid_coupon(
            db=db,
            coupon_code=coupon_code,
            original_amount=original_amount,
        )

        discount_amount = calculate_coupon_discount(
            coupon=coupon,
            original_amount=original_amount,
        )

    final_amount = round(
        max(0.0, original_amount - discount_amount),
        2,
    )

    if existing_payment:
        # Retry a failed payment using the new payment details.
        existing_payment.payment_method = payment_data.payment_method
        existing_payment.payment_status = "PENDING"
        existing_payment.transaction_id = None
        existing_payment.amount = final_amount
        existing_payment.coupon_id = coupon.id if coupon else None
        existing_payment.discount_amount = discount_amount

        db.commit()
        db.refresh(existing_payment)

        return existing_payment

    payment = Payment(
        booking_id=booking.id,
        payment_method=payment_data.payment_method,
        payment_status="PENDING",
        transaction_id=None,
        amount=final_amount,
        coupon_id=coupon.id if coupon else None,
        discount_amount=discount_amount,
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return payment


@router.post(
    "/{payment_id}/simulate",
    response_model=PaymentResponse,
)
def simulate_payment(
    payment_id: int,
    simulation_data: PaymentSimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Simulate a successful or failed payment."""

    payment = (
        db.query(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .filter(
            Payment.id == payment_id,
            Booking.user_id == current_user.id,
        )
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    booking = (
        db.query(Booking)
        .filter(Booking.id == payment.booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    # Recheck the booking status before processing the payment.
    if booking.booking_status == "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot process payment for a cancelled booking",
        )

    if payment.payment_status == "SUCCESS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This payment has already been completed",
        )

    if payment.payment_status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending payments can be simulated",
        )

    if booking.booking_status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending bookings can be paid for",
        )

    if simulation_data.success:
        # Recheck coupon usage before confirming the simulated payment.
        coupon = None

        if payment.coupon_id is not None:
            coupon = (
                db.query(Coupon)
                .filter(Coupon.id == payment.coupon_id)
                .first()
            )

            if not coupon or not coupon.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The coupon is no longer available",
                )

            if (
                coupon.usage_limit is not None
                and coupon.used_count >= coupon.usage_limit
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Coupon usage limit reached",
                )

            coupon.used_count += 1

        payment.payment_status = "SUCCESS"
        payment.transaction_id = (
            f"SIM-{uuid4().hex[:12].upper()}"
        )
        booking.booking_status = "CONFIRMED"

    else:
        payment.payment_status = "FAILED"
        payment.transaction_id = None

    db.commit()
    db.refresh(payment)

    return payment


@router.get(
    "/booking/{booking_id}",
    response_model=PaymentResponse,
)
def get_payment_by_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the payment associated with a user's booking."""

    booking = (
        db.query(Booking)
        .filter(
            Booking.id == booking_id,
            Booking.user_id == current_user.id,
        )
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    payment = (
        db.query(Payment)
        .filter(Payment.booking_id == booking.id)
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found for this booking",
        )

    return payment


@router.get(
    "/{payment_id}",
    response_model=PaymentResponse,
)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a payment belonging to the logged-in user."""

    payment = (
        db.query(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .filter(
            Payment.id == payment_id,
            Booking.user_id == current_user.id,
        )
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    return payment

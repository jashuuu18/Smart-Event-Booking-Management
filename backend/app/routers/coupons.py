
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Booking, Coupon, Payment, User
from app.schemas import (
    CouponCreate,
    CouponUpdate,
    CouponResponse,
    CouponApplyRequest,
    CouponApplyResponse,
)
from app.dependencies import (
    get_current_user,
    require_admin,
    require_user,
)

router = APIRouter(
    prefix="/api/v1/coupons",
    tags=["Coupons"],
)


def current_utc():
    """Return UTC time without timezone information for naive DB datetimes."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def calculate_discount(coupon: Coupon, amount: float) -> float:
    """Validate coupon eligibility and calculate its discount."""
    now = current_utc()

    if not coupon.is_active:
        raise HTTPException(
            status_code=400,
            detail="Coupon is inactive",
        )

    if coupon.valid_from and coupon.valid_from > now:
        raise HTTPException(
            status_code=400,
            detail="Coupon is not yet valid",
        )

    if coupon.expires_at and coupon.expires_at <= now:
        raise HTTPException(
            status_code=400,
            detail="Coupon has expired",
        )

    if (
        coupon.usage_limit is not None
        and coupon.used_count >= coupon.usage_limit
    ):
        raise HTTPException(
            status_code=400,
            detail="Coupon usage limit reached",
        )

    if amount < coupon.minimum_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum booking amount is {coupon.minimum_amount}",
        )

    if coupon.discount_type == "PERCENTAGE":
        discount = amount * coupon.discount_value / 100

        if coupon.maximum_discount is not None:
            discount = min(discount, coupon.maximum_discount)

    elif coupon.discount_type == "FIXED":
        discount = coupon.discount_value

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid coupon discount type",
        )

    return round(min(discount, amount), 2)


# ADMIN: Create a coupon.
@router.post(
    "/",
    response_model=CouponResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_coupon(
    payload: CouponCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    code = payload.code.strip().upper()

    existing = db.query(Coupon).filter(
        Coupon.code == code
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Coupon code already exists",
        )

    if (
        payload.valid_from
        and payload.expires_at
        and payload.expires_at <= payload.valid_from
    ):
        raise HTTPException(
            status_code=400,
            detail="Expiry must be later than the start date",
        )

    if (
        payload.discount_type == "PERCENTAGE"
        and payload.discount_value > 100
    ):
        raise HTTPException(
            status_code=400,
            detail="Percentage discount cannot exceed 100",
        )

    coupon = Coupon(
        **payload.model_dump(exclude={"code"}),
        code=code,
    )

    db.add(coupon)
    db.commit()
    db.refresh(coupon)

    return coupon


# AUTHENTICATED USERS: List active coupons.
@router.get(
    "/",
    response_model=list[CouponResponse],
)
def list_coupons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Coupon)
        .filter(Coupon.is_active.is_(True))
        .order_by(Coupon.id.desc())
        .all()
    )


# ADMIN: Get one coupon by ID.
@router.get(
    "/{coupon_id}",
    response_model=CouponResponse,
)
def get_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    coupon = db.query(Coupon).filter(
        Coupon.id == coupon_id
    ).first()

    if not coupon:
        raise HTTPException(
            status_code=404,
            detail="Coupon not found",
        )

    return coupon


# ADMIN: Update a coupon.
@router.patch(
    "/{coupon_id}",
    response_model=CouponResponse,
)
def update_coupon(
    coupon_id: int,
    payload: CouponUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    coupon = db.query(Coupon).filter(
        Coupon.id == coupon_id
    ).first()

    if not coupon:
        raise HTTPException(
            status_code=404,
            detail="Coupon not found",
        )

    changes = payload.model_dump(exclude_unset=True)

    discount_type = changes.get(
        "discount_type", coupon.discount_type
    )
    discount_value = changes.get(
        "discount_value", coupon.discount_value
    )

    if discount_type == "PERCENTAGE" and discount_value > 100:
        raise HTTPException(
            status_code=400,
            detail="Percentage discount cannot exceed 100",
        )

    valid_from = changes.get("valid_from", coupon.valid_from)
    expires_at = changes.get("expires_at", coupon.expires_at)

    if valid_from and expires_at and expires_at <= valid_from:
        raise HTTPException(
            status_code=400,
            detail="Expiry must be later than the start date",
        )

    for field, value in changes.items():
        setattr(coupon, field, value)

    db.commit()
    db.refresh(coupon)

    return coupon


# ADMIN: Deactivate a coupon without deleting historical data.
@router.delete(
    "/{coupon_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def deactivate_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    coupon = db.query(Coupon).filter(
        Coupon.id == coupon_id
    ).first()

    if not coupon:
        raise HTTPException(
            status_code=404,
            detail="Coupon not found",
        )

    coupon.is_active = False
    db.commit()


# USER: Validate a coupon against their own pending booking.
# This endpoint previews the discount; it does not consume the coupon.
@router.post(
    "/validate",
    response_model=CouponApplyResponse,
)
def validate_coupon_endpoint(
    payload: CouponApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    coupon = db.query(Coupon).filter(
        Coupon.code == payload.code.strip().upper()
    ).first()

    if not coupon:
        raise HTTPException(
            status_code=404,
            detail="Coupon not found",
        )

    booking = db.query(Booking).filter(
        Booking.id == payload.booking_id,
        Booking.user_id == current_user.id,
    ).first()

    if not booking:
        # Do not disclose whether another user's booking exists.
        raise HTTPException(
            status_code=404,
            detail="Booking not found",
        )

    if booking.booking_status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail="Coupon can only be applied to a pending booking",
        )

    payment = db.query(Payment).filter(
        Payment.booking_id == booking.id
    ).first()

    if payment and payment.payment_status == "SUCCESS":
        raise HTTPException(
            status_code=400,
            detail="Coupon cannot be applied after successful payment",
        )

    original_amount = round(float(booking.total_price), 2)

    if original_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Booking total must be greater than zero",
        )

    discount_amount = calculate_discount(
        coupon,
        original_amount,
    )

    final_amount = round(
        original_amount - discount_amount,
        2,
    )

    return CouponApplyResponse(
        coupon_code=coupon.code,
        discount_type=coupon.discount_type,
        discount_value=coupon.discount_value,
        original_amount=original_amount,
        discount_amount=discount_amount,
        final_amount=final_amount,
        message="Coupon is valid. Discount calculated successfully.",
    )

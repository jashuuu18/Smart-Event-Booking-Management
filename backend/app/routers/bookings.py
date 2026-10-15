
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import update

from app.database import get_db
from app.dependencies import get_current_user, require_organizer
from app.models import User, Event, Booking, Ticket, Payment
from app.schemas import (
    BookingCreate,
    BookingResponse,
    BookingCancellationResponse,
    OrganizerBookingResponse,
    format_booking_response,
)
from app.services.booking_service import calculate_total_price
from app.services.ticket_service import (
    generate_ticket_code,
    generate_qr_code,
)
from app.services.notification_service import create_notification
from app.services.event_service import update_event_status
from app.services.availability_manager import availability_manager


router = APIRouter(
    prefix="/api/v1/bookings",
    tags=["Bookings"],
)


def get_event_or_404(db: Session, event_id: int) -> Event:
    event = (
        db.query(Event)
        .filter(Event.id == event_id)
        .first()
    )

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found",
        )

    return event


def check_event_bookable(event: Event) -> None:
    if event.event_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="This event has been cancelled",
        )

    if event.event_status == "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail="This event has already completed",
        )

    if event.event_status == "ONGOING":
        raise HTTPException(
            status_code=400,
            detail="Ticket booking is closed because the event is ongoing",
        )


def broadcast_availability(event: Event) -> None:
    """
    Schedule a WebSocket broadcast after the database transaction commits.
    The route handlers call this only after a successful commit.
    """
    import asyncio

    message = {
        "type": "availability",
        "event_id": event.id,
        "available_tickets": event.available_tickets,
        "total_tickets": event.total_tickets,
        "event_status": event.event_status,
    }

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(
            availability_manager.broadcast(event.id, message)
        )
    except RuntimeError:
        # No running event loop; the database operation remains successful.
        pass


@router.post(
    "/",
    response_model=BookingResponse,
    status_code=201,
)
def create_booking(
    booking_data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if booking_data.ticket_quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Ticket quantity must be greater than zero",
        )

    try:
        # Read event and refresh its status.
        event = get_event_or_404(db, booking_data.event_id)
        update_event_status(event)
        db.commit()
        db.refresh(event)

        check_event_bookable(event)

        # Atomic reservation: only one concurrent request can claim
        # tickets while sufficient inventory remains.
        reservation = db.execute(
            update(Event)
            .where(
                Event.id == event.id,
                Event.available_tickets >= booking_data.ticket_quantity,
                Event.event_status == "UPCOMING",
            )
            .values(
                available_tickets=(
                    Event.available_tickets
                    - booking_data.ticket_quantity
                )
            )
        )

        if reservation.rowcount != 1:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail="Not enough tickets available, or the event is no longer bookable",
            )

        db.flush()

        # Refresh the updated event count.
        db.refresh(event)

        total_price = calculate_total_price(
            event.ticket_price,
            booking_data.ticket_quantity,
        )

        booking = Booking(
            user_id=current_user.id,
            event_id=event.id,
            ticket_quantity=booking_data.ticket_quantity,
            total_price=total_price,
            booking_status="PENDING",
        )

        db.add(booking)
        db.flush()

        ticket_code = generate_ticket_code()
        qr_code_url = generate_qr_code(ticket_code)

        ticket = Ticket(
            booking_id=booking.id,
            ticket_code=ticket_code,
            qr_code_url=qr_code_url,
        )
        db.add(ticket)

        create_notification(
            db=db,
            user_id=current_user.id,
            title="Booking Created",
            message=(
                f"Your booking for '{event.title}' has been created. "
                f"You reserved {booking.ticket_quantity} ticket(s). "
                f"Total amount: ₹{booking.total_price:.2f}. "
                "Complete payment to confirm your booking."
            ),
            notification_type="BOOKING",
        )

        db.commit()
        db.refresh(booking)
        db.refresh(event)

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    # Notify connected clients only after the reservation is committed.
    broadcast_availability(event)

    return format_booking_response(booking)


@router.get("/", response_model=list[BookingResponse])
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )

    return [
        format_booking_response(booking)
        for booking in bookings
    ]


@router.get(
    "/organizer/event/{event_id}",
    response_model=list[OrganizerBookingResponse],
)
def get_event_bookings_for_organizer(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    event = get_event_or_404(db, event_id)

    if event.organizer_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only view bookings for your own events",
        )

    bookings = (
        db.query(Booking, User)
        .join(User, Booking.user_id == User.id)
        .filter(Booking.event_id == event_id)
        .order_by(Booking.created_at.desc())
        .all()
    )

    return [
        OrganizerBookingResponse(
            booking_id=booking.id,
            user_id=user.id,
            username=user.username,
            email=user.email,
            event_id=event.id,
            event_title=event.title,
            ticket_quantity=booking.ticket_quantity,
            total_price=booking.total_price,
            booking_status=booking.booking_status,
            created_at=booking.created_at,
        )
        for booking, user in bookings
    ]


@router.get(
    "/{booking_id}",
    response_model=BookingResponse,
)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
            status_code=404,
            detail="Booking not found",
        )

    return format_booking_response(booking)




@router.patch(
    "/{booking_id}/cancel",
    response_model=BookingCancellationResponse,
)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        # 1. Find a booking belonging to the logged-in user.
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
                status_code=404,
                detail="Booking not found",
            )

        event_id = booking.event_id
        quantity = booking.ticket_quantity

        # 2. Only pending or confirmed bookings may be cancelled.
        # The atomic update prevents duplicate ticket restoration.
        cancellation = db.execute(
            update(Booking)
            .where(
                Booking.id == booking_id,
                Booking.user_id == current_user.id,
                Booking.booking_status.in_(
                    ["PENDING", "CONFIRMED"]
                ),
            )
            .values(booking_status="CANCELLED")
        )

        if cancellation.rowcount != 1:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail=(
                    "This booking has already been processed "
                    "and cannot be cancelled again."
                ),
            )

        # 3. Find the event.
        event = get_event_or_404(db, event_id)

        # 4. Determine whether a refund is applicable.
        payment = (
            db.query(Payment)
            .filter(Payment.booking_id == booking_id)
            .first()
        )

        if payment is None:
            refund_status = "NOT_APPLICABLE"

        elif (payment.payment_status or "").upper() in {
            "SUCCESS",
            "SUCCEEDED",
            "COMPLETED",
            "PAID",
        }:
            # Simulated refund tracking only.
            refund_status = "PENDING"

        else:
            # No successful payment means no refund is due.
            refund_status = "NOT_APPLICABLE"

        # 5. Save the refund status if a payment exists.
        if payment is not None:
            payment.refund_status = refund_status

        # 6. Restore the cancelled tickets atomically.
        db.execute(
            update(Event)
            .where(Event.id == event_id)
            .values(
                available_tickets=(
                    Event.available_tickets + quantity
                )
            )
        )

        # 7. Notify the user.
        if refund_status == "PENDING":
            message = (
                f"Your booking for '{event.title}' was cancelled. "
                "Your simulated refund status is PENDING."
            )
        else:
            message = (
                f"Your booking for '{event.title}' was cancelled. "
                "No refund is applicable."
            )

        create_notification(
            db=db,
            user_id=current_user.id,
            title="Booking Cancelled",
            message=message,
            notification_type="BOOKING",
        )

        # 8. Save all changes in one transaction.
        db.commit()

        # 9. Load the saved booking and event.
        booking = (
            db.query(Booking)
            .filter(Booking.id == booking_id)
            .first()
        )

        event = (
            db.query(Event)
            .filter(Event.id == event_id)
            .first()
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise

    # 10. Broadcast updated availability after committing.
    broadcast_availability(event)

    
    response_data = format_booking_response(booking)
    response_data["refund_status"] = refund_status

    return response_data
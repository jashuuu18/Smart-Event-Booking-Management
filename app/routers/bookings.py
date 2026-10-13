
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_organizer
from app.models import User, Event, Booking, Ticket
from app.schemas import (
    BookingCreate,
    BookingResponse,
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

router = APIRouter(
    prefix="/api/v1/bookings",
    tags=["Bookings"],
)


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
    # Find the event.
    event = (
        db.query(Event)
        .filter(Event.id == booking_data.event_id)
        .first()
    )

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found",
        )

    # Refresh the event status using its start and end times.
    update_event_status(event)
    db.commit()
    db.refresh(event)

    # Reject bookings for events that cannot be booked.
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
            detail=(
                "Ticket booking is closed because "
                "the event is ongoing"
            ),
        )

    # Check ticket availability.
    if booking_data.ticket_quantity > event.available_tickets:
        raise HTTPException(
            status_code=400,
            detail="Not enough tickets available",
        )

    # Calculate the total booking price.
    total_price = calculate_total_price(
        event.ticket_price,
        booking_data.ticket_quantity,
    )

    # Create the booking.
    booking = Booking(
        user_id=current_user.id,
        event_id=event.id,
        ticket_quantity=booking_data.ticket_quantity,
        total_price=total_price,
        booking_status="PENDING",
    )

    # Reduce available ticket count.
    event.available_tickets -= booking_data.ticket_quantity

    db.add(booking)
    db.flush()

    # Generate a unique ticket code and QR code.
    ticket_code = generate_ticket_code()
    qr_code_url = generate_qr_code(ticket_code)

    ticket = Ticket(
        booking_id=booking.id,
        ticket_code=ticket_code,
        qr_code_url=qr_code_url,
    )
    db.add(ticket)

    # Create a booking confirmation notification.
    create_notification(
        db=db,
        user_id=current_user.id,
        title="Booking Confirmed",
        message=(
            f"Your booking for '{event.title}' has been confirmed. "
            f"You booked {booking.ticket_quantity} ticket(s). "
            f"Total amount: ₹{booking.total_price:.2f}."
        ),
        notification_type="BOOKING",
    )

    db.commit()
    db.refresh(booking)

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
    """Allow an organizer to view bookings for their own event."""

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

    result = []

    for booking, user in bookings:
        result.append(
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
        )

    return result


@router.get(
    "/{booking_id}",
    response_model=BookingResponse,
)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return a booking only if it belongs to the logged-in user."""

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


@router.patch("/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Find a booking belonging to the logged-in user
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

    # Only pending bookings can be cancelled
    if booking.booking_status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail="Only pending bookings can be cancelled",
        )

    event = db.query(Event).filter(
        Event.id == booking.event_id
    ).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found",
        )

    # Restore the reserved tickets
    event.available_tickets += booking.ticket_quantity

    # Update booking status
    booking.booking_status = "CANCELLED"

    # Notify the user
    create_notification(
        db=db,
        user_id=current_user.id,
        title="Booking Cancelled",
        message=(
            f"Your booking for '{event.title}' "
            "has been cancelled."
        ),
        notification_type="BOOKING",
    )

    db.commit()
    db.refresh(booking)

    return format_booking_response(booking)

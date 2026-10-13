
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_organizer
from app.models import Event, User, Booking, Notification
from app.schemas import EventCreate, EventUpdate, EventResponse
from app.services.event_service import update_event_status
from app.services.notification_service import create_notification

router = APIRouter(
    prefix="/api/v1/events",
    tags=["Events"]
)


# Create a new event
@router.post("/", response_model=EventResponse, status_code=201)
def create_event(
    event_data: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer)
):
    event = Event(
        title=event_data.title,
        description=event_data.description,
        category=event_data.category,
        location=event_data.location,
        event_date=event_data.event_date,
        event_end_date=event_data.event_end_date,
        ticket_price=event_data.ticket_price,
        total_tickets=event_data.total_tickets,
        available_tickets=event_data.total_tickets,
        banner_image=event_data.banner_image,
        organizer_id=current_user.id,
        event_status="UPCOMING"
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return event


# Get all events with optional category and title search
@router.get("/", response_model=list[EventResponse])
def get_events(
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db)
):
    query = db.query(Event)

    if category:
        query = query.filter(Event.category.ilike(category))

    if search:
        query = query.filter(Event.title.ilike(f"%{search}%"))

    events = query.order_by(Event.event_date.asc()).all()

    for event in events:
        update_event_status(event)

    db.commit()

    return events


# Get events created by the logged-in organizer
@router.get("/my-events", response_model=list[EventResponse])
def get_my_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer)
):
    events = (
        db.query(Event)
        .filter(Event.organizer_id == current_user.id)
        .order_by(Event.event_date.asc())
        .all()
    )

    for event in events:
        update_event_status(event)

    db.commit()

    return events


# Update an event and notify users who booked it
@router.put("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    event_data: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer)
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id)
        .first()
    )

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    if event.organizer_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own events"
        )

    # Validate the final start and end dates together.
    new_start = (
        event_data.event_date
        if event_data.event_date is not None
        else event.event_date
    )

    new_end = (
        event_data.event_end_date
        if event_data.event_end_date is not None
        else event.event_end_date
    )

    if new_end <= new_start:
        raise HTTPException(
            status_code=422,
            detail="Event end date must be after event start date"
        )

    # Update only the fields provided by the organizer.
    if event_data.title is not None:
        event.title = event_data.title

    if event_data.description is not None:
        event.description = event_data.description

    if event_data.category is not None:
        event.category = event_data.category

    if event_data.location is not None:
        event.location = event_data.location

    if event_data.event_date is not None:
        event.event_date = event_data.event_date

    if event_data.event_end_date is not None:
        event.event_end_date = event_data.event_end_date

    if event_data.ticket_price is not None:
        event.ticket_price = event_data.ticket_price

    if event_data.banner_image is not None:
        event.banner_image = event_data.banner_image

    if event_data.total_tickets is not None:
        tickets_sold = (
            event.total_tickets - event.available_tickets
        )

        if event_data.total_tickets < tickets_sold:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Total tickets cannot be less than "
                    "tickets already sold"
                )
            )

        event.total_tickets = event_data.total_tickets
        event.available_tickets = (
            event_data.total_tickets - tickets_sold
        )

    # Refresh the status after changing the dates.
    update_event_status(event)

    # Notify users with active bookings for this event.
    bookings = (
        db.query(Booking)
        .filter(
            Booking.event_id == event.id,
            Booking.booking_status != "CANCELLED"
        )
        .all()
    )

    for booking in bookings:
        create_notification(
            db=db,
            user_id=booking.user_id,
            title="Event Updated",
            message=(
                f"The event '{event.title}' has been updated. "
                "Please check the latest event details."
            ),
            notification_type="EVENT"
        )

    db.commit()
    db.refresh(event)

    return event


# Cancel an event and notify users with bookings

@router.put("/{event_id}/cancel", response_model=EventResponse)
def cancel_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer)
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    if event.organizer_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only cancel your own events"
        )

    if event.event_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Event is already cancelled"
        )

    # Cancel the event.
    event.event_status = "CANCELLED"

    # Find active bookings for this event.
    bookings = (
        db.query(Booking)
        .filter(
            Booking.event_id == event.id,
            Booking.booking_status != "CANCELLED"
        )
        .all()
    )

    for booking in bookings:
        # Restore tickets from this booking.
        event.available_tickets += booking.ticket_quantity

        # Cancel the booking.
        booking.booking_status = "CANCELLED"

        # Notify the customer.
        create_notification(
            db=db,
            user_id=booking.user_id,
            title="Event Cancelled",
            message=(
                f"The event '{event.title}' has been cancelled. "
                f"Your booking #{booking.id} has also been cancelled. "
                "Please contact the organizer for refund information."
            ),
            notification_type="EVENT"
        )

    try:
        db.commit()
        db.refresh(event)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to cancel event"
        )

    return event


# Get one event by ID
@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db)
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id)
        .first()
    )

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    update_event_status(event)

    db.commit()
    db.refresh(event)

    return event
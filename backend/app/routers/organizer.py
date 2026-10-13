
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_organizer
from app.models import User, Event, Booking
from app.schemas import (
    OrganizerEventInsight,
    OrganizerDashboardResponse,
    OrganizerEventPerformance
)


router = APIRouter(
    prefix="/api/v1/organizer",
    tags=["Organizer Analytics"]
)


@router.get(
    "/dashboard",
    response_model=OrganizerDashboardResponse
)
def get_organizer_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer)
):
    events = (
        db.query(Event)
        .filter(
            Event.organizer_id == current_user.id
        )
        .order_by(Event.created_at.desc())
        .all()
    )

    event_insights = []

    total_tickets_sold = 0
    total_remaining_tickets = 0
    total_bookings = 0
    total_revenue = 0.0

    for event in events:

        bookings = (
            db.query(Booking)
            .filter(
                Booking.event_id == event.id
            )
            .all()
        )

        booking_count = len(bookings)

        tickets_sold = sum(
            booking.ticket_quantity
            for booking in bookings
            if booking.booking_status != "CANCELLED"
        )

        revenue = sum(
            booking.total_price
            for booking in bookings
            if booking.booking_status != "CANCELLED"
        )

        remaining_tickets = event.available_tickets

        event_insights.append(
            OrganizerEventInsight(
                event_id=event.id,
                event_title=event.title,
                event_status=event.event_status,
                total_tickets=event.total_tickets,
                tickets_sold=tickets_sold,
                remaining_tickets=remaining_tickets,
                booking_count=booking_count,
                revenue=revenue
            )
        )

        total_tickets_sold += tickets_sold
        total_remaining_tickets += remaining_tickets
        total_bookings += booking_count
        total_revenue += revenue

    return OrganizerDashboardResponse(
        total_events=len(events),
        total_tickets_sold=total_tickets_sold,
        total_remaining_tickets=total_remaining_tickets,
        total_bookings=total_bookings,
        total_revenue=total_revenue,
        events=event_insights
    )

@router.get(
    "/events/{event_id}/performance",
    response_model=OrganizerEventPerformance
)
def get_event_performance(
    event_id: int,
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
            detail="You can only view performance of your own events"
        )

    bookings = (
        db.query(Booking)
        .filter(
            Booking.event_id == event.id
        )
        .all()
    )

    valid_bookings = [
        booking
        for booking in bookings
        if booking.booking_status != "CANCELLED"
    ]

    booking_count = len(valid_bookings)

    tickets_sold = sum(
        booking.ticket_quantity
        for booking in valid_bookings
    )

    revenue = sum(
        booking.total_price
        for booking in valid_bookings
    )

    remaining_tickets = event.available_tickets

    if event.total_tickets > 0:
        ticket_sales_percentage = (
            tickets_sold / event.total_tickets
        ) * 100
    else:
        ticket_sales_percentage = 0.0

    if booking_count > 0:
        average_revenue_per_booking = (
            revenue / booking_count
        )
    else:
        average_revenue_per_booking = 0.0

    return OrganizerEventPerformance(
        event_id=event.id,
        event_title=event.title,
        event_status=event.event_status,
        event_date=event.event_date,
        ticket_price=event.ticket_price,
        total_tickets=event.total_tickets,
        tickets_sold=tickets_sold,
        remaining_tickets=remaining_tickets,
        booking_count=booking_count,
        revenue=revenue,
        ticket_sales_percentage=round(
            ticket_sales_percentage,
            2
        ),
        average_revenue_per_booking=round(
            average_revenue_per_booking,
            2
        )
    )


from datetime import datetime
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Event, EventView, Booking, User


router = APIRouter(
    prefix="/api/v1/recommendations",
    tags=["Recommendations"]
)


# --------------------------------------------------
# 1. Record an event view
# --------------------------------------------------
@router.post(
    "/views/{event_id}",
    status_code=status.HTTP_201_CREATED
)
def record_event_view(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(
        Event.id == event_id
    ).first()

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    view = EventView(
        user_id=current_user.id,
        event_id=event.id,
        viewed_at=datetime.utcnow()
    )

    db.add(view)
    db.commit()
    db.refresh(view)

    return {
        "success": True,
        "message": "Event view recorded successfully",
        "event_id": view.event_id,
        "viewed_at": view.viewed_at
    }


# --------------------------------------------------
# 2. Personalized recommendations
# --------------------------------------------------
@router.get("/for-you")
def get_personalized_recommendations(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if limit < 1 or limit > 50:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 50"
        )

    # Get categories from the user's bookings.
    booked_categories = (
        db.query(Event.category)
        .join(Booking, Booking.event_id == Event.id)
        .filter(
            Booking.user_id == current_user.id,
            Booking.booking_status.in_(
                ["CONFIRMED", "SUCCESS"]
            )
        )
        .all()
    )

    # Get categories from the user's viewing history.
    viewed_categories = (
        db.query(Event.category)
        .join(EventView, EventView.event_id == Event.id)
        .filter(
            EventView.user_id == current_user.id
        )
        .all()
    )

    category_counts = Counter(
        [row[0] for row in booked_categories]
        + [row[0] for row in viewed_categories]
    )

    # Exclude events the user has already viewed.
    viewed_event_ids = {
        row[0]
        for row in db.query(EventView.event_id)
        .filter(EventView.user_id == current_user.id)
        .distinct()
        .all()
    }

    # Only recommend upcoming events with available tickets.
    query = db.query(Event).filter(
        Event.event_date >= datetime.utcnow(),
        Event.available_tickets > 0,
        Event.event_status == "UPCOMING"
    )

    if viewed_event_ids:
        query = query.filter(
            ~Event.id.in_(viewed_event_ids)
        )

    events = query.all()

    # Prioritize the categories the user has shown interest in.
    events.sort(
        key=lambda event: (
            category_counts.get(event.category, 0),
            event.created_at or datetime.min
        ),
        reverse=True
    )

    # If no unseen events are available, show eligible events
    # again rather than returning an empty list.
    if not events:
        events = (
            db.query(Event)
            .filter(
                Event.event_date >= datetime.utcnow(),
                Event.available_tickets > 0,
                Event.event_status == "UPCOMING"
            )
            .order_by(Event.created_at.desc())
            .all()
        )

        events.sort(
            key=lambda event: (
                category_counts.get(event.category, 0),
                event.created_at or datetime.min
            ),
            reverse=True
        )

    recommendations = events[:limit]

    return {
        "success": True,
        "count": len(recommendations),
        "based_on": (
            "booking categories and viewed events"
            if category_counts
            else "upcoming available events"
        ),
        "recommendations": [
            {
                "id": event.id,
                "title": event.title,
                "description": event.description,
                "category": event.category,
                "location": event.location,
                "event_date": event.event_date,
                "ticket_price": event.ticket_price,
                "available_tickets": event.available_tickets,
                "banner_image": event.banner_image
            }
            for event in recommendations
        ]
    }


# --------------------------------------------------
# 3. Trending events
# --------------------------------------------------
@router.get("/trending")
def get_trending_events(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    if limit < 1 or limit > 50:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 50"
        )

    # Count confirmed/successful bookings per event.
    booking_counts = (
        db.query(
            Booking.event_id.label("event_id"),
            func.count(Booking.id).label("booking_count")
        )
        .filter(
            Booking.booking_status.in_(
                ["CONFIRMED", "SUCCESS"]
            )
        )
        .group_by(Booking.event_id)
        .subquery()
    )

    results = (
        db.query(
            Event,
            booking_counts.c.booking_count
        )
        .outerjoin(
            booking_counts,
            Event.id == booking_counts.c.event_id
        )
        .filter(
            Event.event_date >= datetime.utcnow(),
            Event.available_tickets > 0,
            Event.event_status == "UPCOMING"
        )
        .order_by(
            booking_counts.c.booking_count.desc(),
            Event.created_at.desc()
        )
        .limit(limit)
        .all()
    )

    return {
        "success": True,
        "count": len(results),
        "trending_events": [
            {
                "id": event.id,
                "title": event.title,
                "description": event.description,
                "category": event.category,
                "location": event.location,
                "event_date": event.event_date,
                "ticket_price": event.ticket_price,
                "available_tickets": event.available_tickets,
                "banner_image": event.banner_image,
                "booking_count": booking_count or 0
            }
            for event, booking_count in results
        ]
    }

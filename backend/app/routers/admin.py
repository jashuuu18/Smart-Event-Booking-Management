
import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Event, Booking, Ticket, Notification
from app.dependencies import require_admin


router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin"]
)


# --------------------------------------------------
# 1. ADMIN DASHBOARD STATISTICS
# --------------------------------------------------

@router.get("/dashboard")
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    total_users = db.query(User).count()

    total_organizers = (
        db.query(User)
        .filter(User.role == "ORGANIZER")
        .count()
    )

    total_customers = (
        db.query(User)
        .filter(User.role == "USER")
        .count()
    )

    total_events = db.query(Event).count()

    upcoming_events = (
        db.query(Event)
        .filter(Event.event_status == "UPCOMING")
        .count()
    )

    ongoing_events = (
        db.query(Event)
        .filter(Event.event_status == "ONGOING")
        .count()
    )

    completed_events = (
        db.query(Event)
        .filter(Event.event_status == "COMPLETED")
        .count()
    )

    cancelled_events = (
        db.query(Event)
        .filter(Event.event_status == "CANCELLED")
        .count()
    )

    total_bookings = db.query(Booking).count()

    active_bookings = (
        db.query(Booking)
        .filter(Booking.booking_status != "CANCELLED")
        .count()
    )

    cancelled_bookings = (
        db.query(Booking)
        .filter(Booking.booking_status == "CANCELLED")
        .count()
    )

    total_tickets_sold = (
        db.query(
            func.coalesce(func.sum(Booking.ticket_quantity), 0)
        )
        .filter(Booking.booking_status != "CANCELLED")
        .scalar()
    )

    total_revenue = (
        db.query(
            func.coalesce(func.sum(Booking.total_price), 0)
        )
        .filter(Booking.booking_status != "CANCELLED")
        .scalar()
    )

    return {
        "total_users": total_users,
        "total_organizers": total_organizers,
        "total_customers": total_customers,
        "total_events": total_events,
        "upcoming_events": upcoming_events,
        "ongoing_events": ongoing_events,
        "completed_events": completed_events,
        "cancelled_events": cancelled_events,
        "total_bookings": total_bookings,
        "active_bookings": active_bookings,
        "cancelled_bookings": cancelled_bookings,
        "total_tickets_sold": int(total_tickets_sold or 0),
        "total_revenue": float(total_revenue or 0)
    }


# --------------------------------------------------
# 2. LIST ALL USERS
# --------------------------------------------------

@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    users = (
        db.query(User)
        .order_by(User.id.desc())
        .all()
    )

    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at
        }
        for user in users
    ]


# --------------------------------------------------
# 3. UPDATE A USER'S ROLE
# --------------------------------------------------

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    new_role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    allowed_roles = ["USER", "ORGANIZER", "ADMIN"]
    new_role = new_role.upper()

    if new_role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Invalid role. Choose USER, ORGANIZER, or ADMIN."
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.id == current_user.id and new_role != "ADMIN":
        raise HTTPException(
            status_code=400,
            detail="You cannot remove your own ADMIN role."
        )

    user.role = new_role
    db.commit()
    db.refresh(user)

    return {
        "message": "User role updated successfully",
        "user_id": user.id,
        "role": user.role
    }


# --------------------------------------------------
# 4. LIST ALL EVENTS
# --------------------------------------------------

@router.get("/events")
def get_all_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    events = (
        db.query(Event)
        .order_by(Event.id.desc())
        .all()
    )

    return [
        {
            "id": event.id,
            "title": event.title,
            "category": event.category,
            "location": event.location,
            "event_date": event.event_date,
            "event_end_date": event.event_end_date,
            "ticket_price": event.ticket_price,
            "total_tickets": event.total_tickets,
            "available_tickets": event.available_tickets,
            "event_status": event.event_status,
            "organizer_id": event.organizer_id
        }
        for event in events
    ]


# --------------------------------------------------
# 5. DELETE AN EVENT
# --------------------------------------------------

@router.delete("/events/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
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

    # Find bookings and users affected by this deletion.
    bookings = (
        db.query(Booking)
        .filter(Booking.event_id == event_id)
        .all()
    )

    booking_ids = [booking.id for booking in bookings]
    affected_user_ids = list({
        booking.user_id for booking in bookings
    })

    # Delete tickets belonging to these bookings.
    if booking_ids:
        db.query(Ticket).filter(
            Ticket.booking_id.in_(booking_ids)
        ).delete(synchronize_session=False)

    # Delete notifications for affected users that refer to this event.
    if affected_user_ids:
        event_notification_filter = (
            Notification.user_id.in_(affected_user_ids),
            Notification.message.contains(event.title)
        )

        db.query(Notification).filter(
            *event_notification_filter
        ).delete(synchronize_session=False)

    # Delete bookings before deleting the event.
    if booking_ids:
        db.query(Booking).filter(
            Booking.id.in_(booking_ids)
        ).delete(synchronize_session=False)

    db.delete(event)
    db.commit()

    return {
        "message": "Event and associated booking records deleted successfully",
        "event_id": event_id
    }


# --------------------------------------------------
# 6. RECENT BOOKINGS REPORT
# --------------------------------------------------

@router.get("/recent-bookings")
def get_recent_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    bookings = (
        db.query(Booking)
        .order_by(Booking.created_at.desc())
        .limit(10)
        .all()
    )

    results = []

    for booking in bookings:
        user = (
            db.query(User)
            .filter(User.id == booking.user_id)
            .first()
        )

        event = (
            db.query(Event)
            .filter(Event.id == booking.event_id)
            .first()
        )

        results.append({
            "booking_id": booking.id,
            "customer_name": (
                user.username if user else "Unknown"
            ),
            "customer_email": (
                user.email if user else None
            ),
            "event_title": (
                event.title if event else "Deleted event"
            ),
            "ticket_quantity": booking.ticket_quantity,
            "total_price": booking.total_price,
            "booking_status": booking.booking_status,
            "created_at": booking.created_at
        })

    return results


# --------------------------------------------------
# 7. EXPORT ALL BOOKINGS AS CSV
# --------------------------------------------------

@router.get("/export/bookings")
def export_bookings_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    bookings = (
        db.query(Booking)
        .order_by(Booking.created_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Booking ID",
        "Customer Name",
        "Customer Email",
        "Event Title",
        "Ticket Quantity",
        "Total Price",
        "Booking Status",
        "Booking Date"
    ])

    for booking in bookings:
        user = (
            db.query(User)
            .filter(User.id == booking.user_id)
            .first()
        )

        event = (
            db.query(Event)
            .filter(Event.id == booking.event_id)
            .first()
        )

        writer.writerow([
            booking.id,
            user.username if user else "Unknown",
            user.email if user else "",
            event.title if event else "Deleted event",
            booking.ticket_quantity,
            booking.total_price,
            booking.booking_status,
            (
                booking.created_at.isoformat()
                if booking.created_at else ""
            )
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition":
                'attachment; filename="smartevent_bookings.csv"'
        }
    )


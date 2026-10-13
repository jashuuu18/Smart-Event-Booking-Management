from sqlalchemy.orm import Session

from app.models import Notification


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str
) -> Notification:
    

    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        is_read=False
    )

    db.add(notification)

    return notification


def create_booking_notification(
    db: Session,
    user_id: int,
    event_title: str
) -> Notification:
    

    return create_notification(
        db=db,
        user_id=user_id,
        title="Booking Confirmed",
        message=(
            f"Your booking for '{event_title}' "
            "has been confirmed."
        ),
        notification_type="BOOKING"
    )


def create_event_reminder_notification(
    db: Session,
    user_id: int,
    event_title: str
) -> Notification:
    

    return create_notification(
        db=db,
        user_id=user_id,
        title="Event Reminder",
        message=(
            f"Your event '{event_title}' "
            "is coming up soon."
        ),
        notification_type="EVENT"
    )
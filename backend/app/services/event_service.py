from datetime import datetime

from app.models import Event


def calculate_event_status(event: Event) -> str:
    if event.event_status == "CANCELLED":
        return "CANCELLED"

    now = datetime.utcnow()

    if now < event.event_date:
        return "UPCOMING"

    if event.event_date <= now < event.event_end_date:
        return "ONGOING"

    return "COMPLETED"


def update_event_status(event: Event) -> str:
    event.event_status = calculate_event_status(event)
    return event.event_status

from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Event, EventAnnouncement, User
from app.services.announcement_service import announcement_manager


router = APIRouter(
    prefix="/api/v1/announcements",
    tags=["Event Announcements"],
)


class AnnouncementCreate(BaseModel):
    event_id: int
    title: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=3)
    announcement_type: str = "GENERAL"


# GET: Retrieve announcements for an event
@router.get("/{event_id}")
def get_event_announcements(
    event_id: int,
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(
        Event.id == event_id
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    announcements = (
        db.query(EventAnnouncement)
        .filter(EventAnnouncement.event_id == event_id)
        .order_by(EventAnnouncement.created_at.desc())
        .all()
    )

    return {
        "success": True,
        "count": len(announcements),
        "announcements": [
            {
                "id": item.id,
                "event_id": item.event_id,
                "title": item.title,
                "message": item.message,
                "announcement_type": item.announcement_type,
                "created_at": item.created_at,
            }
            for item in announcements
        ],
    }


# POST: Create and broadcast an announcement
@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
)
async def create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = getattr(
        current_user.role,
        "value",
        current_user.role,
    )
    role = str(role).upper()

    if role not in ("ADMIN", "ORGANIZER"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only organizers and admins "
                "can publish announcements"
            ),
        )

    event = db.query(Event).filter(
        Event.id == data.event_id
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    announcement = EventAnnouncement(
        event_id=data.event_id,
        title=data.title,
        message=data.message,
        announcement_type=data.announcement_type,
        created_at=datetime.utcnow(),
    )

    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    announcement_data = {
        "id": announcement.id,
        "event_id": announcement.event_id,
        "title": announcement.title,
        "message": announcement.message,
        "announcement_type": announcement.announcement_type,
        "created_at": (
            announcement.created_at.isoformat()
            if announcement.created_at
            else None
        ),
    }

    await announcement_manager.broadcast(
        announcement.event_id,
        {
            "type": "NEW_ANNOUNCEMENT",
            "announcement": announcement_data,
        },
    )

    return {
        "success": True,
        "message": "Announcement published successfully",
        "announcement": announcement_data,
    }


# WebSocket: Live announcements for an event
@router.websocket("/ws/{event_id}")
async def event_announcements_websocket(
    websocket: WebSocket,
    event_id: int,
):
    # Verify that the event exists.
    db_generator = get_db()
    db = next(db_generator)

    try:
        event = db.query(Event).filter(
            Event.id == event_id
        ).first()

        if not event:
            await websocket.close(code=1008)
            return
    finally:
        try:
            next(db_generator)
        except StopIteration:
            pass

    await announcement_manager.connect(
        event_id,
        websocket,
    )

    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        pass

    finally:
        announcement_manager.disconnect(
            event_id,
            websocket,
        )

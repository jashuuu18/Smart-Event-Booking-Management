
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Event
from app.services.availability_manager import availability_manager

router = APIRouter(tags=["Real-Time Availability"])


@router.websocket("/ws/events/{event_id}/availability")
async def event_availability_websocket(
    websocket: WebSocket,
    event_id: int,
    db: Session = Depends(get_db),
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id)
        .first()
    )

    if event is None:
        await websocket.close(code=1008, reason="Event not found")
        return

    await availability_manager.connect(event_id, websocket)

    try:
        # Send the latest availability immediately on connection.
        await websocket.send_json({
            "type": "availability",
            "event_id": event.id,
            "available_tickets": event.available_tickets,
            "total_tickets": event.total_tickets,
            "event_status": event.event_status,
        })

        # Keep the connection open until the client disconnects.
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        pass

    finally:
        availability_manager.disconnect(event_id, websocket)
        db.close()

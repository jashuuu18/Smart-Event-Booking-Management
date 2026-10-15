
from typing import Dict, Set

from fastapi import WebSocket


class AnnouncementConnectionManager:
    """
    Manages WebSocket connections for event announcements.

    Each event has its own set of connected clients.
    When a new announcement is published, it can be
    broadcast to clients viewing that event.
    """

    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(
        self,
        event_id: int,
        websocket: WebSocket,
    ) -> None:
        """Accept and register a WebSocket connection."""

        await websocket.accept()

        if event_id not in self.active_connections:
            self.active_connections[event_id] = set()

        self.active_connections[event_id].add(websocket)

    def disconnect(
        self,
        event_id: int,
        websocket: WebSocket,
    ) -> None:
        """Remove a disconnected WebSocket client."""

        connections = self.active_connections.get(event_id)

        if connections is not None:
            connections.discard(websocket)

            if not connections:
                self.active_connections.pop(event_id, None)

    async def broadcast(
        self,
        event_id: int,
        message: dict,
    ) -> None:
        """Send an announcement to every client viewing an event."""

        connections = list(
            self.active_connections.get(event_id, set())
        )

        for websocket in connections:
            try:
                await websocket.send_json(message)

            except Exception:
                # Remove clients whose connections have failed.
                self.disconnect(event_id, websocket)


# Create one shared manager instance for the application.
announcement_manager = AnnouncementConnectionManager()


from fastapi import WebSocket


class AvailabilityManager:
    def __init__(self):
        # Store WebSocket connections by event ID.
        self.connections: dict[int, list[WebSocket]] = {}

    async def connect(self, event_id: int, websocket: WebSocket):
        await websocket.accept()

        if event_id not in self.connections:
            self.connections[event_id] = []

        self.connections[event_id].append(websocket)

    def disconnect(self, event_id: int, websocket: WebSocket):
        event_connections = self.connections.get(event_id, [])

        if websocket in event_connections:
            event_connections.remove(websocket)

        if not event_connections:
            self.connections.pop(event_id, None)

    async def broadcast(self, event_id: int, message: dict):
        event_connections = self.connections.get(event_id, [])
        disconnected = []

        for websocket in list(event_connections):
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(event_id, websocket)


availability_manager = AvailabilityManager()

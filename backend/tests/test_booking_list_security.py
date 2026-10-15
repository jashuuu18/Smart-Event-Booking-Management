
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_current_user

client = TestClient(app)


def test_booking_list_returns_only_current_users_bookings():
    fake_user = SimpleNamespace(id=-999, username="test_user")

    app.dependency_overrides[get_current_user] = lambda: fake_user

    try:
        response = client.get("/api/v1/bookings/")

        assert response.status_code == 200

        bookings = response.json()
        assert isinstance(bookings, list)

        # The fake user ID does not belong to existing project users.
        # Therefore, their booking list should be empty.
        assert bookings == []
    finally:
        app.dependency_overrides.pop(get_current_user, None)

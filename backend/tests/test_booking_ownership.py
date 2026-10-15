
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_current_user


client = TestClient(app)


def test_user_cannot_view_another_users_booking():
    fake_user = SimpleNamespace(id=-999, username="test_user")

    app.dependency_overrides[get_current_user] = lambda: fake_user

    try:
        response = client.get("/api/v1/bookings/999999999")

        # The fake user must not be able to retrieve another user's booking.
        assert response.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_user_cannot_cancel_another_users_booking():
    fake_user = SimpleNamespace(id=-999, username="test_user")

    app.dependency_overrides[get_current_user] = lambda: fake_user

    try:
        response = client.patch(
            "/api/v1/bookings/999999999/cancel"
        )

        # The fake user must not be able to cancel another user's booking.
        assert response.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)

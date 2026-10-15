
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_booking_list_requires_authentication():
    response = client.get("/api/v1/bookings/")

    assert response.status_code in (401, 403), (
        f"Expected an authentication error, "
        f"but received {response.status_code}: "
        f"{response.text}"
    )


from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_current_user

client = TestClient(app)


def test_payment_refund_response_contains_status():
    fake_user = SimpleNamespace(
        id=-999,
        username="test_user",
    )

    app.dependency_overrides[get_current_user] = lambda: fake_user

    try:
        # A deliberately nonexistent booking should not expose
        # another user's payment information.
        response = client.get("/api/v1/payments/booking/999999999")

        assert response.status_code in (403, 404), (
            f"Unexpected status {response.status_code}: {response.text}"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

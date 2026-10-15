
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_application_starts():
    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert "openapi" in response.json()


def test_swagger_schema_contains_api_paths():
    response = client.get("/openapi.json")

    assert response.status_code == 200

    paths = response.json().get("paths", {})

    assert isinstance(paths, dict)
    assert len(paths) > 0

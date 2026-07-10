from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_running_status():
    """
    Verifies that the root API endpoint returns the status running and correct metadata.
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert data["application"] == "SprintMind AI Backend"
    assert data["version"] == "1.0.0"

def test_health_check_status():
    """
    Verifies that the health endpoint returns 200 OK and healthy status.
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

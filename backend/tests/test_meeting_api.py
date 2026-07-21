import pytest
from uuid import UUID
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth import get_current_user
from app.projects.repository import ProjectRepository, _MOCK_DB
from app.projects.schemas import ProjectCreate
from app.tasks.repository import TaskRepository, _MOCK_TASK_DB
from app.meetings.repository import _MOCK_MEETINGS_DB

client = TestClient(app)


class MockUser:
    id = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
    email = "user-test@sprintmind.ai"


OWNER_ID = UUID(MockUser.id)


@pytest.fixture(autouse=True)
def clean_mock_dbs():
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_MEETINGS_DB.clear()
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_MEETINGS_DB.clear()


def test_analyze_meeting_api_endpoint():
    project_repo = ProjectRepository()
    project = project_repo.create(OWNER_ID, ProjectCreate(name="Meeting Target Project", description="Test"))

    payload = {
        "title": "Architecture Sync",
        "notes": """
        - TODO: Refactor authentication service assigned to @tushar due Friday
        - Decided: Migrate to JWT token authorization.
        - Blocker: Database migrations pending execution.
        """
    }

    response = client.post(f"/api/projects/{project.id}/meetings/analyze", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["title"] == "Architecture Sync"
    assert "summary" in data
    assert len(data["action_items"]) >= 1
    assert len(data["decisions"]) >= 1
    assert len(data["blockers"]) >= 1
    assert len(data["recommendations"]) >= 1

    meeting_id = data["id"]

    # Test GET meeting by ID
    get_res = client.get(f"/api/meetings/{meeting_id}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Architecture Sync"

    # Test LIST meetings for project
    list_res = client.get(f"/api/projects/{project.id}/meetings")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

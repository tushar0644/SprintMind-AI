import pytest
from uuid import UUID, uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth import get_current_user
from app.projects.repository import ProjectRepository, _MOCK_DB
from app.projects.schemas import ProjectCreate
from app.sprints.repository import SprintRepository, _MOCK_SPRINT_DB
from app.tasks.repository import TaskRepository, _MOCK_TASK_DB
from app.risks.repository import _MOCK_RISK_DB
from app.dashboard.repository import _MOCK_DASHBOARD_DB
from app.tasks.schemas import TaskCreate

client = TestClient(app)


class MockUser:
    id = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
    email = "user-test@sprintmind.ai"


OWNER_ID = UUID(MockUser.id)


@pytest.fixture(autouse=True)
def clean_mock_dbs():
    _MOCK_DB.clear()
    _MOCK_SPRINT_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_RISK_DB.clear()
    _MOCK_DASHBOARD_DB.clear()
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()
    _MOCK_DB.clear()
    _MOCK_SPRINT_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_RISK_DB.clear()
    _MOCK_DASHBOARD_DB.clear()


def _make_project(name="Executive Dashboard Project"):
    repo = ProjectRepository()
    return repo.create(OWNER_ID, ProjectCreate(name=name, description="Test project for executive dashboard"))


def test_get_project_dashboard_endpoint():
    project = _make_project()

    task_repo = TaskRepository()
    sprint_repo = SprintRepository()

    task_repo.create(OWNER_ID, TaskCreate(project_id=project.id, title="Initial Feature", story_points=5, status="done"))
    sprint_repo.create(project.id, OWNER_ID, sprint_number=1, name="Sprint 1", capacity=20, total_points=5, status="completed")

    response = client.get(f"/api/projects/{project.id}/dashboard")

    assert response.status_code == 200
    data = response.json()

    assert data["project_id"] == str(project.id)
    assert "health_score" in data
    assert "status" in data
    assert data["completed_tasks"] == 1
    assert data["total_tasks"] == 1
    assert data["velocity"] == 5.0
    assert len(data["recommendations"]) > 0
    assert "estimated_finish" in data


def test_dashboard_unauthorized_if_not_owner():
    project = _make_project()
    _MOCK_DB[0].owner_id = uuid4()

    response = client.get(f"/api/projects/{project.id}/dashboard")
    assert response.status_code == 403
    assert response.json()["detail"] == "Access denied."

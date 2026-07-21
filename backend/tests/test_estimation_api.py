import pytest
from uuid import UUID, uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth import get_current_user
from app.projects.repository import ProjectRepository, _MOCK_DB
from app.projects.schemas import ProjectCreate
from app.sprints.repository import SprintRepository, _MOCK_SPRINT_DB
from app.estimation.repository import _MOCK_ESTIMATION_DB

client = TestClient(app)


class MockUser:
    id = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
    email = "user-test@sprintmind.ai"


OWNER_ID = UUID(MockUser.id)


@pytest.fixture(autouse=True)
def clean_mock_dbs():
    _MOCK_DB.clear()
    _MOCK_SPRINT_DB.clear()
    _MOCK_ESTIMATION_DB.clear()
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()
    _MOCK_DB.clear()
    _MOCK_SPRINT_DB.clear()
    _MOCK_ESTIMATION_DB.clear()


def _make_project(name="Estimation Target Project"):
    repo = ProjectRepository()
    return repo.create(OWNER_ID, ProjectCreate(name=name, description="Test project for timeline & estimation"))


def test_get_project_timeline_endpoint():
    project = _make_project()
    sprint_repo = SprintRepository()
    sprint_repo.create(project.id, OWNER_ID, sprint_number=1, name="Sprint 1", capacity=20, total_points=15)
    sprint_repo.create(project.id, OWNER_ID, sprint_number=2, name="Sprint 2", capacity=20, total_points=25)

    response = client.get(f"/api/projects/{project.id}/timeline?sprint_duration_days=14")

    assert response.status_code == 200
    data = response.json()

    assert data["project_id"] == str(project.id)
    assert "project_start" in data
    assert "project_finish" in data
    assert data["estimated_duration_days"] == 28
    assert len(data["sprint_dates"]) == 2
    assert len(data["milestones"]) == 4
    assert data["team_velocity"] == 20.0


def test_get_project_estimation_endpoint():
    project = _make_project()
    sprint_repo = SprintRepository()
    sprint_repo.create(project.id, OWNER_ID, sprint_number=1, name="Sprint 1", capacity=20, total_points=20)

    response = client.get(f"/api/projects/{project.id}/estimation")

    assert response.status_code == 200
    data = response.json()

    assert data["project_id"] == str(project.id)
    assert data["sprints_count"] == 1
    assert data["total_points"] == 20
    assert data["average_velocity"] == 20.0
    assert "confidence" in data
    assert len(data["sprint_dates"]) == 1
    assert len(data["milestones"]) == 4


def test_estimation_unauthorized_if_not_owner():
    project = _make_project()
    # Change owner of project to another UUID
    _MOCK_DB[0].owner_id = uuid4()

    response = client.get(f"/api/projects/{project.id}/estimation")
    assert response.status_code == 403
    assert response.json()["detail"] == "Access denied."

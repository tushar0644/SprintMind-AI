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
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()
    _MOCK_DB.clear()
    _MOCK_SPRINT_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_RISK_DB.clear()


def _make_project(name="Risk Analysis Project"):
    repo = ProjectRepository()
    return repo.create(OWNER_ID, ProjectCreate(name=name, description="Test project for risk analysis"))


def test_post_analyze_project_risks_endpoint():
    project = _make_project()

    task_repo = TaskRepository()
    sprint_repo = SprintRepository()

    t1 = task_repo.create(OWNER_ID, TaskCreate(project_id=project.id, title="Core Architecture", story_points=13))
    t2 = task_repo.create(OWNER_ID, TaskCreate(project_id=project.id, title="Secondary Module", story_points=3, depends_on=[t1.id]))
    sprint_repo.create(project.id, OWNER_ID, sprint_number=1, name="Sprint 1", capacity=10, total_points=16)

    response = client.post(f"/api/projects/{project.id}/risks/analyze")

    assert response.status_code == 200
    data = response.json()

    assert data["project_id"] == str(project.id)
    assert data["total_risks"] > 0
    assert len(data["risks"]) > 0

    first_risk = data["risks"][0]
    assert "title" in first_risk
    assert "description" in first_risk
    assert "severity" in first_risk
    assert "category" in first_risk
    assert "recommendation" in first_risk


def test_get_project_risks_endpoint():
    project = _make_project()

    # Call get first (will trigger analysis)
    get_res = client.get(f"/api/projects/{project.id}/risks")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["project_id"] == str(project.id)


def test_risk_analysis_unauthorized_if_not_owner():
    project = _make_project()
    _MOCK_DB[0].owner_id = uuid4()

    response = client.post(f"/api/projects/{project.id}/risks/analyze")
    assert response.status_code == 403
    assert response.json()["detail"] == "Access denied."

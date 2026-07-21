import pytest
from uuid import UUID
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth import get_current_user
from app.projects.repository import ProjectRepository, _MOCK_DB
from app.projects.schemas import ProjectCreate
from app.sprints.repository import SprintRepository, _MOCK_SPRINT_DB
from app.tasks.repository import TaskRepository, _MOCK_TASK_DB
from app.risks.repository import _MOCK_RISK_DB
from app.dashboard.repository import _MOCK_DASHBOARD_DB
from app.portfolio.repository import _MOCK_PORTFOLIO_DB

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
    _MOCK_PORTFOLIO_DB.clear()
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()
    _MOCK_DB.clear()
    _MOCK_SPRINT_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_RISK_DB.clear()
    _MOCK_DASHBOARD_DB.clear()
    _MOCK_PORTFOLIO_DB.clear()


def test_get_portfolio_dashboard_endpoint():
    project_repo = ProjectRepository()
    sprint_repo = SprintRepository()

    p = project_repo.create(OWNER_ID, ProjectCreate(name="Portfolio Alpha", description="Alpha project"))
    sprint_repo.create(p.id, OWNER_ID, sprint_number=1, name="Sprint 1", capacity=20, total_points=12)

    response = client.get("/api/portfolio/dashboard")

    assert response.status_code == 200
    data = response.json()

    assert "summary" in data
    assert data["summary"]["total_projects"] == 1
    assert len(data["project_cards"]) == 1
    assert data["project_cards"][0]["name"] == "Portfolio Alpha"
    assert "health_distribution" in data
    assert "upcoming_milestones" in data


def test_get_portfolio_dashboard_v1_endpoint():
    response = client.get("/api/v1/portfolio/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data

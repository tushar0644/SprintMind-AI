import pytest
from uuid import UUID
from app.dashboard.aggregator import DashboardAggregator
from app.projects.repository import ProjectRepository, _MOCK_DB
from app.projects.schemas import ProjectCreate
from app.tasks.repository import TaskRepository, _MOCK_TASK_DB
from app.sprints.repository import SprintRepository, _MOCK_SPRINT_DB
from app.risks.repository import _MOCK_RISK_DB
from app.dashboard.repository import _MOCK_DASHBOARD_DB
from app.tasks.schemas import TaskCreate

OWNER_ID = UUID("dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c")


@pytest.fixture(autouse=True)
def clean_mock_dbs():
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_SPRINT_DB.clear()
    _MOCK_RISK_DB.clear()
    _MOCK_DASHBOARD_DB.clear()
    yield
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_SPRINT_DB.clear()
    _MOCK_RISK_DB.clear()
    _MOCK_DASHBOARD_DB.clear()


def test_dashboard_aggregator_recommendation_rules():
    project_repo = ProjectRepository()
    task_repo = TaskRepository()
    sprint_repo = SprintRepository()

    project = project_repo.create(OWNER_ID, ProjectCreate(name="Health Test Project", description="Test project"))

    # Create overloaded sprint and oversized task
    task_repo.create(OWNER_ID, TaskCreate(project_id=project.id, title="Giant Core Module", story_points=13))
    sprint_repo.create(project.id, OWNER_ID, sprint_number=1, name="Sprint 1", capacity=10, total_points=16)

    aggregator = DashboardAggregator(task_repo=task_repo, sprint_repo=sprint_repo)
    dash = aggregator.generate_dashboard(OWNER_ID, project.id)

    assert dash.project_id == project.id
    assert dash.health_score < 100.0
    assert dash.total_tasks == 1
    assert dash.sprint_progress.total_sprints == 1

    # Check deterministic recommendations
    recs = dash.recommendations
    assert len(recs) >= 1
    rec_text = " ".join(recs)
    assert "scope" in rec_text.lower() or "oversized" in rec_text.lower()

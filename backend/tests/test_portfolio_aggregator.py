import pytest
from uuid import UUID
from app.portfolio.aggregator import PortfolioAggregator
from app.projects.repository import ProjectRepository, _MOCK_DB
from app.projects.schemas import ProjectCreate
from app.tasks.repository import TaskRepository, _MOCK_TASK_DB
from app.sprints.repository import SprintRepository, _MOCK_SPRINT_DB
from app.risks.repository import _MOCK_RISK_DB
from app.dashboard.repository import _MOCK_DASHBOARD_DB
from app.portfolio.repository import _MOCK_PORTFOLIO_DB
from app.tasks.schemas import TaskCreate

OWNER_ID = UUID("dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c")


@pytest.fixture(autouse=True)
def clean_mock_dbs():
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_SPRINT_DB.clear()
    _MOCK_RISK_DB.clear()
    _MOCK_DASHBOARD_DB.clear()
    _MOCK_PORTFOLIO_DB.clear()
    yield
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_SPRINT_DB.clear()
    _MOCK_RISK_DB.clear()
    _MOCK_DASHBOARD_DB.clear()
    _MOCK_PORTFOLIO_DB.clear()


def test_portfolio_aggregator_empty_projects():
    aggregator = PortfolioAggregator()
    response = aggregator.generate_portfolio_dashboard(OWNER_ID)

    assert response.summary.total_projects == 0
    assert response.summary.average_health_score == 100.0
    assert response.project_cards == []
    assert response.health_distribution.healthy == 0


def test_portfolio_aggregator_multiple_projects_ranking():
    project_repo = ProjectRepository()
    task_repo = TaskRepository()
    sprint_repo = SprintRepository()

    # Project A: Healthy
    p_healthy = project_repo.create(OWNER_ID, ProjectCreate(name="Healthy Platform", description="Good project"))
    sprint_repo.create(p_healthy.id, OWNER_ID, sprint_number=1, name="Sprint 1", capacity=20, total_points=10)

    # Project B: Critical Overload
    p_critical = project_repo.create(OWNER_ID, ProjectCreate(name="Critical Legacy App", description="Overloaded project"))
    task_repo.create(OWNER_ID, TaskCreate(project_id=p_critical.id, title="Giant Refactor Task", story_points=13))
    sprint_repo.create(p_critical.id, OWNER_ID, sprint_number=1, name="Sprint 1", capacity=10, total_points=18)

    aggregator = PortfolioAggregator()
    res = aggregator.generate_portfolio_dashboard(OWNER_ID)

    assert res.summary.total_projects == 2
    assert len(res.project_cards) == 2
    assert len(res.projects_requiring_attention) >= 1

    # Project cards ranked descending by health_score
    assert res.project_cards[0].health_score >= res.project_cards[1].health_score
    assert res.project_cards[0].name == "Healthy Platform"

    # Projects requiring attention ranked ascending (worst first)
    assert res.projects_requiring_attention[0].name == "Critical Legacy App"

    # Health distribution
    assert res.health_distribution.healthy >= 1

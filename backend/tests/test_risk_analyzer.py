import pytest
from uuid import UUID
from app.risks.analyzer import RiskAnalyzer
from app.projects.repository import ProjectRepository, _MOCK_DB
from app.projects.schemas import ProjectCreate
from app.tasks.repository import TaskRepository, _MOCK_TASK_DB
from app.sprints.repository import SprintRepository, _MOCK_SPRINT_DB
from app.risks.repository import RiskRepository, _MOCK_RISK_DB
from app.tasks.schemas import TaskCreate

OWNER_ID = UUID("dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c")


@pytest.fixture(autouse=True)
def clean_mock_dbs():
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_SPRINT_DB.clear()
    _MOCK_RISK_DB.clear()
    yield
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_SPRINT_DB.clear()
    _MOCK_RISK_DB.clear()


def test_risk_analyzer_full_pipeline():
    project_repo = ProjectRepository()
    task_repo = TaskRepository()
    sprint_repo = SprintRepository()

    project = project_repo.create(OWNER_ID, ProjectCreate(name="Risk Target Project", description="Test project"))

    # Create oversized task with dependency
    t1 = task_repo.create(OWNER_ID, TaskCreate(project_id=project.id, title="Mega Task", story_points=13))
    t2 = task_repo.create(OWNER_ID, TaskCreate(project_id=project.id, title="Sub Task", story_points=3, depends_on=[t1.id]))

    # Create overloaded sprint
    sprint_repo.create(project.id, OWNER_ID, sprint_number=1, name="Sprint 1", capacity=10, total_points=16)

    analyzer = RiskAnalyzer(task_repo=task_repo, sprint_repo=sprint_repo)
    result = analyzer.analyze_project(OWNER_ID, project.id)

    assert result.project_id == project.id
    assert result.total_risks > 0
    assert result.high_risks_count >= 1

    severities = [r.severity for r in result.risks]
    assert "high" in severities or "critical" in severities
    assert len(result.risks) == result.total_risks

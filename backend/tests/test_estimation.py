import pytest
from uuid import UUID, uuid4
from datetime import datetime, timezone, timedelta

from app.estimation.milestones import MilestoneGenerator
from app.estimation.schemas import SprintTimelineEntry
from app.estimation.estimator import ProjectEstimator
from app.sprints.repository import SprintRepository, _MOCK_SPRINT_DB
from app.estimation.repository import EstimationRepository, _MOCK_ESTIMATION_DB

OWNER_ID = UUID("dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c")
PROJECT_ID = uuid4()


@pytest.fixture(autouse=True)
def clean_mock_dbs():
    _MOCK_SPRINT_DB.clear()
    _MOCK_ESTIMATION_DB.clear()
    yield
    _MOCK_SPRINT_DB.clear()
    _MOCK_ESTIMATION_DB.clear()


def test_milestone_generation():
    gen = MilestoneGenerator()
    start = datetime(2026, 8, 1, 0, 0, tzinfo=timezone.utc)
    finish = start + timedelta(days=56)

    entries = [
        SprintTimelineEntry(sprint_number=1, name="Sprint 1", start_date=start, end_date=start + timedelta(days=14), total_points=20, task_count=4, status="planned"),
        SprintTimelineEntry(sprint_number=2, name="Sprint 2", start_date=start + timedelta(days=14), end_date=start + timedelta(days=28), total_points=20, task_count=4, status="planned"),
        SprintTimelineEntry(sprint_number=3, name="Sprint 3", start_date=start + timedelta(days=28), end_date=start + timedelta(days=42), total_points=20, task_count=4, status="planned"),
        SprintTimelineEntry(sprint_number=4, name="Sprint 4", start_date=start + timedelta(days=42), end_date=finish, total_points=20, task_count=4, status="planned"),
    ]

    milestones = gen.generate_milestones(entries, start, finish)

    names = [m.name for m in milestones]
    assert "MVP Completion" in names
    assert "Beta" in names
    assert "RC" in names
    assert "Production Release" in names

    prod_m = next(m for m in milestones if m.name == "Production Release")
    assert prod_m.completion_percentage == 100.0
    assert prod_m.target_date == finish


def test_estimator_full_pipeline():
    sprint_repo = SprintRepository()
    sprint_repo.create(PROJECT_ID, OWNER_ID, sprint_number=1, name="Sprint 1", capacity=20, total_points=18)
    sprint_repo.create(PROJECT_ID, OWNER_ID, sprint_number=2, name="Sprint 2", capacity=20, total_points=22)

    estimator = ProjectEstimator(sprint_repo=sprint_repo)
    result = estimator.generate_estimation(OWNER_ID, PROJECT_ID, sprint_duration_days=14)

    assert result.project_id == PROJECT_ID
    assert result.sprints_count == 2
    assert result.total_points == 40
    assert result.average_velocity == 20.0
    assert result.estimated_duration_days == 28
    assert len(result.sprint_dates) == 2
    assert len(result.milestones) == 4

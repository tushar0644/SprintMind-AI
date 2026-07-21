import pytest
from uuid import UUID
from app.meetings.task_mapper import MeetingTaskMapper
from app.meetings.schemas import ActionItemSchema
from app.tasks.repository import TaskRepository, _MOCK_TASK_DB
from app.projects.repository import ProjectRepository, _MOCK_DB
from app.projects.schemas import ProjectCreate
from app.tasks.schemas import TaskCreate

OWNER_ID = UUID("dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c")


@pytest.fixture(autouse=True)
def clean_mock_dbs():
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    yield
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()


def test_task_mapper_matching_and_suggested_new():
    project_repo = ProjectRepository()
    task_repo = TaskRepository()

    project = project_repo.create(OWNER_ID, ProjectCreate(name="Task Map Project", description="Test"))
    existing_task = task_repo.create(OWNER_ID, TaskCreate(project_id=project.id, title="Implement OAuth Login Flow", story_points=5))

    mapper = MeetingTaskMapper(task_repo=task_repo)

    action_items = [
        ActionItemSchema(title="Implement OAuth Login Flow for users"),
        ActionItemSchema(title="Create brand new reporting dashboard widget"),
    ]

    mapped_items, map_results = mapper.map_action_items_to_tasks(
        owner_id=OWNER_ID,
        project_id=project.id,
        action_items=action_items,
    )

    assert map_results[0].status == "matched"
    assert map_results[0].matched_task_id == existing_task.id

    assert map_results[1].status == "suggested_new"
    assert map_results[1].matched_task_id is None

import pytest
from datetime import datetime, timezone
from uuid import UUID, uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth import get_current_user
from app.projects.repository import ProjectRepository, _MOCK_DB
from app.projects.schemas import ProjectCreate, ProjectResponse
from app.tasks.repository import TaskRepository, _MOCK_TASK_DB
from app.tasks.schemas import TaskCreate, TaskUpdate
from app.sprints.repository import SprintRepository, _MOCK_SPRINT_DB
from app.sprints.service import SprintPlanner

client = TestClient(app)


class MockUser:
    id = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
    email = "user-test@sprintmind.ai"


OWNER_ID = UUID(MockUser.id)


@pytest.fixture(autouse=True)
def clean_mock_dbs():
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_SPRINT_DB.clear()
    yield
    app.dependency_overrides.clear()
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_SPRINT_DB.clear()


def _make_project(name="Sprint Planning Target"):
    repo = ProjectRepository()
    return repo.create(OWNER_ID, ProjectCreate(name=name, description="test project"))


def _make_task(project_id, points=2, priority="medium", depends_on=None):
    repo = TaskRepository()
    return repo.create(
        OWNER_ID,
        TaskCreate(
            project_id=project_id,
            title=f"Task {uuid4()}",
            priority=priority,
            story_points=points,
            depends_on=depends_on or [],
        ),
    )


def _planner():
    return SprintPlanner(ProjectRepository(), TaskRepository(), SprintRepository())


def test_capacity_bin_packing_without_dependencies():
    project = _make_project()
    for _ in range(4):
        _make_task(project.id, points=2)

    result = _planner().plan_sprints(OWNER_ID, project.id, capacity=5)

    assert result.tasks_scheduled == 4
    assert result.tasks_unscheduled == 0
    assert result.sprints_count == 2
    assert [s.total_points for s in result.sprints] == [4, 4]
    assert all(s.total_points <= 5 for s in result.sprints)
    assert sum(len(s.tasks) for s in result.sprints) == 4


def test_dependency_chain_forces_sequential_sprints():
    project = _make_project()
    task_a = _make_task(project.id, points=3)
    task_b = _make_task(project.id, points=3, depends_on=[task_a.id])
    task_c = _make_task(project.id, points=3, depends_on=[task_b.id])

    result = _planner().plan_sprints(OWNER_ID, project.id, capacity=3)

    assert result.sprints_count == 3
    sprint_of = {}
    for sprint in result.sprints:
        for t in sprint.tasks:
            sprint_of[t.id] = sprint.sprint_number

    assert sprint_of[task_a.id] < sprint_of[task_b.id] < sprint_of[task_c.id]


def test_priority_breaks_ties_within_available_tasks():
    project = _make_project()
    _make_task(project.id, points=2, priority="low")
    urgent = _make_task(project.id, points=2, priority="urgent")

    result = _planner().plan_sprints(OWNER_ID, project.id, capacity=2)

    first_sprint_task_id = result.sprints[0].tasks[0].id
    assert first_sprint_task_id == urgent.id


def test_oversized_task_gets_its_own_sprint_instead_of_blocking():
    project = _make_project()
    _make_task(project.id, points=100)

    result = _planner().plan_sprints(OWNER_ID, project.id, capacity=5)

    assert result.sprints_count == 1
    assert result.sprints[0].total_points == 100


def test_done_and_cancelled_tasks_are_not_scheduled():
    project = _make_project()
    repo = TaskRepository()
    todo_task = _make_task(project.id, points=2)
    done_task = _make_task(project.id, points=2)
    repo.update(done_task.id, TaskUpdate(status="done"))

    result = _planner().plan_sprints(OWNER_ID, project.id, capacity=10)

    assert result.tasks_scheduled == 1
    scheduled_ids = {t.id for s in result.sprints for t in s.tasks}
    assert todo_task.id in scheduled_ids
    assert done_task.id not in scheduled_ids


def test_replanning_replaces_previous_sprints():
    project = _make_project()
    _make_task(project.id, points=2)
    planner = _planner()

    first = planner.plan_sprints(OWNER_ID, project.id, capacity=5)
    _make_task(project.id, points=2)
    second = planner.plan_sprints(OWNER_ID, project.id, capacity=5)

    fetched = planner.get_sprints(OWNER_ID, project.id)
    assert len(fetched) == second.sprints_count
    assert second.tasks_scheduled == 2
    assert first.sprints[0].id != second.sprints[0].id or first.tasks_scheduled != second.tasks_scheduled


def test_plan_sprints_unknown_project_raises():
    with pytest.raises(ValueError):
        _planner().plan_sprints(OWNER_ID, uuid4(), capacity=5)


def test_plan_sprints_route_and_get_sprints_route():
    app.dependency_overrides[get_current_user] = lambda: MockUser()

    create_res = client.post("/api/v1/projects", json={"name": "Router Sprint Project", "description": "d"})
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    for i in range(3):
        task_res = client.post(
            "/api/v1/tasks",
            json={"project_id": project_id, "title": f"Task {i}", "story_points": 3},
        )
        assert task_res.status_code == 201

    plan_res = client.post(f"/api/v1/projects/{project_id}/plan-sprints", json={"capacity": 5})
    assert plan_res.status_code == 200
    plan_data = plan_res.json()
    assert plan_data["tasks_scheduled"] == 3
    assert plan_data["sprints_count"] >= 1

    get_res = client.get(f"/api/v1/projects/{project_id}/sprints")
    assert get_res.status_code == 200
    sprints = get_res.json()
    assert len(sprints) == plan_data["sprints_count"]
    assert sum(len(s["tasks"]) for s in sprints) == 3


def test_plan_sprints_route_rejects_foreign_project():
    # Injected directly into the mock store (not via repo.create) so this
    # test never touches the real Supabase project for a fabricated owner.
    now = datetime.now(timezone.utc)
    foreign_project = ProjectResponse(
        id=uuid4(),
        owner_id=uuid4(),
        name="Someone Else Project",
        description="d",
        status="active",
        created_at=now,
        updated_at=now,
        deleted_at=None,
    )
    _MOCK_DB.append(foreign_project)
    app.dependency_overrides[get_current_user] = lambda: MockUser()

    res = client.post(f"/api/v1/projects/{foreign_project.id}/plan-sprints", json={})
    assert res.status_code == 403

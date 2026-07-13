import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from app.main import app
from app.services.auth import get_current_user
from app.projects.repository import _MOCK_DB
from app.tasks.repository import _MOCK_TASK_DB

client = TestClient(app)

# Helper mock user
class MockUser:
    id = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
    email = "user-test@sprintmind.ai"

@pytest.fixture(autouse=True)
def clean_mock_db_and_dependencies():
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()

def test_task_crud_flow():
    """
    Verifies the end-to-end CRUD flow for tasks under an authenticated session.
    """
    # 1. Create a project first
    proj_response = client.post("/api/projects", json={
        "name": "SprintMind Core",
        "description": "Core software engine.",
        "status": "active"
    })
    assert proj_response.status_code == 201
    project_id = proj_response.json()["id"]

    # 2. Get tasks (initially empty)
    response = client.get(f"/api/tasks?project_id={project_id}")
    assert response.status_code == 200
    assert response.json() == []

    # 3. Create a task
    create_res = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "Implement authentication middleware",
        "description": "Add JWT validation.",
        "status": "todo",
        "priority": "high"
    })
    assert create_res.status_code == 201
    task = create_res.json()
    assert task["title"] == "Implement authentication middleware"
    assert task["description"] == "Add JWT validation."
    assert task["status"] == "todo"
    assert task["priority"] == "high"
    task_id = task["id"]

    # 4. Retrieve list and verify it is there
    list_res = client.get(f"/api/tasks?project_id={project_id}")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["id"] == task_id

    # 4.1 List all tasks by owner (no project filter)
    all_res = client.get("/api/tasks")
    assert all_res.status_code == 200
    assert len(all_res.json()) == 1
    assert all_res.json()[0]["id"] == task_id

    # 5. Get task by ID
    get_res = client.get(f"/api/tasks/{task_id}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Implement authentication middleware"

    # 6. Update task status, priority and title
    update_res = client.patch(f"/api/tasks/{task_id}", json={
        "title": "Updated Title",
        "status": "in_progress",
        "priority": "low"
    })
    assert update_res.status_code == 200
    updated_task = update_res.json()
    assert updated_task["title"] == "Updated Title"
    assert updated_task["status"] == "in_progress"
    assert updated_task["priority"] == "low"

    # 7. Delete (soft-delete) task
    delete_res = client.delete(f"/api/tasks/{task_id}")
    assert delete_res.status_code == 204

    # 8. Verify task is no longer returned in list
    list_after_delete = client.get(f"/api/tasks?project_id={project_id}")
    assert list_after_delete.status_code == 200
    assert list_after_delete.json() == []

    # 9. Verify get by ID returns 404
    get_after_delete = client.get(f"/api/tasks/{task_id}")
    assert get_after_delete.status_code == 404

def test_task_validation_errors():
    """
    Verifies that invalid values are rejected with 422 or 400 status codes.
    """
    # Create project context
    proj_response = client.post("/api/projects", json={
        "name": "Validation Project",
        "status": "active"
    })
    project_id = proj_response.json()["id"]

    # Empty title
    response = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "",
        "status": "todo"
    })
    assert response.status_code == 422

    # Title too long (> 200 characters)
    response = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "A" * 201,
        "status": "todo"
    })
    assert response.status_code == 422

    # Invalid status
    response = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "Test Task",
        "status": "invalid_status"
    })
    assert response.status_code == 422

    # Invalid priority
    response = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "Test Task",
        "priority": "invalid_priority"
    })
    assert response.status_code == 422

def test_project_ownership_and_existence():
    """
    Verifies that user cannot create tasks in non-existent projects or projects owned by others.
    """
    # 1. Non-existent project
    fake_project_id = str(uuid4())
    response = client.post("/api/tasks", json={
        "project_id": fake_project_id,
        "title": "Task in fake project"
    })
    assert response.status_code == 400
    assert "Project not found or access denied" in response.json()["detail"]

    # 2. Project owned by someone else
    # Create project under MockUser session
    create_res = client.post("/api/projects", json={"name": "Project One"})
    project_id = create_res.json()["id"]

    # Change auth session to a different user
    class OtherUser:
        id = "e99d578a-082b-43bc-9967-34b28adffb2c"
        email = "other@sprintmind.ai"

    app.dependency_overrides[get_current_user] = lambda: OtherUser()

    try:
        # Other user tries to create task in MockUser's project
        res = client.post("/api/tasks", json={
            "project_id": project_id,
            "title": "Hack task"
        })
        assert res.status_code == 400
        assert "Project not found or access denied" in res.json()["detail"]
    finally:
        app.dependency_overrides[get_current_user] = lambda: MockUser()

def test_task_ownership_denied():
    """
    Verifies that a user cannot access, modify, or delete tasks owned by others.
    """
    # Create project and task under MockUser session
    proj_res = client.post("/api/projects", json={"name": "Mock Project"})
    project_id = proj_res.json()["id"]

    create_res = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "Private Task"
    })
    task_id = create_res.json()["id"]

    # Change auth session to a different user
    class OtherUser:
        id = "e99d578a-082b-43bc-9967-34b28adffb2c"
        email = "other@sprintmind.ai"

    app.dependency_overrides[get_current_user] = lambda: OtherUser()

    try:
        # Try to view task
        assert client.get(f"/api/tasks/{task_id}").status_code == 403
        
        # Try to update task
        assert client.patch(f"/api/tasks/{task_id}", json={"title": "Hacked"}).status_code == 403
        
        # Try to delete task
        assert client.delete(f"/api/tasks/{task_id}").status_code == 403
    finally:
        app.dependency_overrides[get_current_user] = lambda: MockUser()

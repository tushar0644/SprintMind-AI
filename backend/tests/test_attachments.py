import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from app.main import app
from app.services.auth import get_current_user
from app.projects.repository import _MOCK_DB
from app.tasks.repository import _MOCK_TASK_DB
from app.attachments.repository import _MOCK_ATTACHMENTS_DB

client = TestClient(app)

# Helper mock user
class MockUser:
    id = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
    email = "user-test@sprintmind.ai"

@pytest.fixture(autouse=True)
def clean_mock_db_and_dependencies():
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_ATTACHMENTS_DB.clear()
    # Disable global auth overrides for unauthorized tests explicitly,
    # or override conditionally.
    yield
    app.dependency_overrides.clear()
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_ATTACHMENTS_DB.clear()


def test_get_project_attachments_unauthorized():
    """
    Verifies that retrieving project attachments without authorization returns 401.
    """
    project_id = str(uuid4())
    response = client.get(f"/api/v1/attachments/project/{project_id}")
    assert response.status_code == 401


def test_upload_attachment_unauthorized():
    """
    Verifies that uploading an attachment without authorization returns 401.
    """
    project_id = str(uuid4())
    response = client.post(
        "/api/v1/attachments/upload",
        data={"project_id": project_id},
        files={"file": ("test.txt", b"hello", "text/plain")}
    )
    assert response.status_code == 401


def test_attachment_crud_flow_authorized():
    """
    Verifies the end-to-end CRUD flow for attachments under an authorized session.
    """
    # 1. Authorize session
    app.dependency_overrides[get_current_user] = lambda: MockUser()

    # 2. Create a project and task
    proj_res = client.post("/api/projects", json={
        "name": "SprintMind Core",
        "description": "Core software engine.",
        "status": "active"
    })
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    task_res = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "Implement authentication middleware",
        "description": "Add JWT validation.",
        "status": "todo",
        "priority": "high"
    })
    assert task_res.status_code == 201
    task_id = task_res.json()["id"]

    # 3. Upload a file for the task/project
    upload_res = client.post(
        "/api/v1/attachments/upload",
        data={"project_id": project_id, "task_id": task_id},
        files={"file": ("hello_world.txt", b"Hello Antigravity Team!", "text/plain")}
    )
    assert upload_res.status_code == 200
    att_data = upload_res.json()
    assert att_data["file_name"] == "hello_world.txt"
    assert att_data["file_size"] == len(b"Hello Antigravity Team!")
    assert att_data["content_type"] == "text/plain"
    assert att_data["project_id"] == project_id
    assert att_data["task_id"] == task_id
    attachment_id = att_data["id"]

    # 4. Retrieve attachments by project
    proj_atts_res = client.get(f"/api/v1/attachments/project/{project_id}")
    assert proj_atts_res.status_code == 200
    assert len(proj_atts_res.json()) == 1
    assert proj_atts_res.json()[0]["id"] == attachment_id

    # 5. Retrieve attachments by task
    task_atts_res = client.get(f"/api/v1/attachments/task/{task_id}")
    assert task_atts_res.status_code == 200
    assert len(task_atts_res.json()) == 1
    assert task_atts_res.json()[0]["id"] == attachment_id

    # 6. Delete attachment
    del_res = client.delete(f"/api/v1/attachments/{attachment_id}")
    assert del_res.status_code == 204

    # 7. Verify deletion
    proj_atts_res_after = client.get(f"/api/v1/attachments/project/{project_id}")
    assert proj_atts_res_after.status_code == 200
    assert len(proj_atts_res_after.json()) == 0

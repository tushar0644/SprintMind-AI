import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from app.main import app
from app.services.auth import get_current_user
from app.projects.repository import _MOCK_DB
from app.tasks.repository import _MOCK_TASK_DB
from app.comments.repository import _MOCK_COMMENTS_DB
from app.notifications.repository import _MOCK_NOTIFICATIONS_DB
from app.activity.repository import _MOCK_ACTIVITIES_DB

client = TestClient(app)

class MockUser:
    id = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
    email = "user-test@sprintmind.ai"

@pytest.fixture(autouse=True)
def clean_mock_db_and_dependencies():
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_COMMENTS_DB.clear()
    _MOCK_NOTIFICATIONS_DB.clear()
    _MOCK_ACTIVITIES_DB.clear()
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_COMMENTS_DB.clear()
    _MOCK_NOTIFICATIONS_DB.clear()
    _MOCK_ACTIVITIES_DB.clear()

def test_project_activity_timeline_logging():
    # 1. Create project
    proj_res = client.post("/api/projects", json={"name": "SprintMind 2.0", "description": "New Features"})
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    # Verify project_created activity logged
    assert len(_MOCK_ACTIVITIES_DB) == 1
    assert _MOCK_ACTIVITIES_DB[0]["action"] == "project_created"
    assert _MOCK_ACTIVITIES_DB[0]["project_id"] == project_id

def test_task_creation_and_update_notifications_logging():
    # Setup project
    proj_res = client.post("/api/projects", json={"name": "Project X"})
    project_id = proj_res.json()["id"]
    
    # 1. Create task with assignee
    task_payload = {
        "project_id": project_id,
        "title": "Build API",
        "description": "Create endpoints",
        "status": "todo",
        "priority": "medium",
        "assignee_id": "97c11bef-1730-41c2-b03f-05edabbfba6d"
    }
    task_res = client.post("/api/tasks", json=task_payload)
    if task_res.status_code != 201:
        print("TASK CREATION FAILURE DETAILS:", task_res.json())
    assert task_res.status_code == 201
    task_id = task_res.json()["id"]

    # Verify activity logged
    assert any(a["action"] == "task_created" for a in _MOCK_ACTIVITIES_DB)

    # Verify assignee notification created
    assert len(_MOCK_NOTIFICATIONS_DB) == 1
    assert _MOCK_NOTIFICATIONS_DB[0]["user_id"] == "97c11bef-1730-41c2-b03f-05edabbfba6d"
    assert "You have been assigned" in _MOCK_NOTIFICATIONS_DB[0]["message"]

    # 2. Update task status
    update_res = client.patch(f"/api/tasks/{task_id}", json={
        "status": "in_progress"
    })
    assert update_res.status_code == 200

    # Verify task_updated activity logged
    assert any(a["action"] == "task_updated" for a in _MOCK_ACTIVITIES_DB)

    # Verify notification created for assignee due to status update
    assert len(_MOCK_NOTIFICATIONS_DB) == 2
    assert _MOCK_NOTIFICATIONS_DB[1]["user_id"] == "97c11bef-1730-41c2-b03f-05edabbfba6d"
    assert "status changed from 'todo' to 'in_progress'" in _MOCK_NOTIFICATIONS_DB[1]["message"]

def test_comment_and_replies_notifications_logging():
    # Setup project and task
    proj_res = client.post("/api/projects", json={"name": "Project Y"})
    project_id = proj_res.json()["id"]
    task_res = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "Task Y",
        "status": "todo",
        "priority": "low"
    })
    task_id = task_res.json()["id"]

    # Create comment
    comment_res = client.post("/api/comments", json={
        "task_id": task_id,
        "content": "A test comment"
    })
    assert comment_res.status_code == 201
    comment_id = comment_res.json()["id"]

    # Verify activity logged
    assert any(a["action"] == "comment_added" for a in _MOCK_ACTIVITIES_DB)

    # Reply to comment
    reply_res = client.post("/api/comments", json={
        "task_id": task_id,
        "content": "A reply comment",
        "parent_id": comment_id
    })
    assert reply_res.status_code == 201

    # Verify activity logged
    assert any(a["action"] == "reply_added" for a in _MOCK_ACTIVITIES_DB)

def test_notifications_crud_endpoints():
    # Pre-populate some notifications
    notif_id_1 = str(uuid4())
    notif_id_2 = str(uuid4())
    _MOCK_NOTIFICATIONS_DB.extend([
        {
            "id": notif_id_1,
            "user_id": MockUser.id,
            "sender_id": None,
            "title": "Notif 1",
            "message": "Msg 1",
            "type": "task",
            "reference_id": None,
            "is_read": False,
            "created_at": "2026-07-19T10:00:00Z",
            "sender_display_name": None
        },
        {
            "id": notif_id_2,
            "user_id": MockUser.id,
            "sender_id": None,
            "title": "Notif 2",
            "message": "Msg 2",
            "type": "comment",
            "reference_id": None,
            "is_read": True,
            "created_at": "2026-07-19T11:00:00Z",
            "sender_display_name": None
        }
    ])

    # 1. GET unread count
    count_res = client.get("/api/notifications/unread-count")
    assert count_res.status_code == 200
    assert count_res.json()["unread_count"] == 1

    # 2. GET list
    list_res = client.get("/api/notifications?page=1&limit=10")
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total_count"] == 2
    assert len(data["notifications"]) == 2

    # Filtered GET list
    filter_res = client.get("/api/notifications?type=task")
    assert filter_res.status_code == 200
    assert filter_res.json()["total_count"] == 1

    # 3. PATCH read status
    read_res = client.patch(f"/api/notifications/{notif_id_1}/read")
    assert read_res.status_code == 200
    assert _MOCK_NOTIFICATIONS_DB[0]["is_read"] is True

    # 4. POST read all
    # reset first
    _MOCK_NOTIFICATIONS_DB[0]["is_read"] = False
    _MOCK_NOTIFICATIONS_DB[1]["is_read"] = False
    read_all_res = client.post("/api/notifications/read-all")
    assert read_all_res.status_code == 200
    assert all(n["is_read"] for n in _MOCK_NOTIFICATIONS_DB)

    # 5. DELETE notification
    del_res = client.delete(f"/api/notifications/{notif_id_1}")
    assert del_res.status_code == 204
    assert len(_MOCK_NOTIFICATIONS_DB) == 1

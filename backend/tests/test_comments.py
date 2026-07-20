import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from app.main import app
from app.services.auth import get_current_user
from app.projects.repository import _MOCK_DB
from app.tasks.repository import _MOCK_TASK_DB
from app.comments.repository import _MOCK_COMMENTS_DB, _MOCK_REACTIONS_DB

client = TestClient(app)

class MockUser:
    id = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
    email = "user-test@sprintmind.ai"

class OtherUser:
    id = "55555555-5555-5555-5555-555555555555"
    email = "other-user@sprintmind.ai"

@pytest.fixture(autouse=True)
def clean_mock_db_and_dependencies():
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_COMMENTS_DB.clear()
    _MOCK_REACTIONS_DB.clear()
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_COMMENTS_DB.clear()
    _MOCK_REACTIONS_DB.clear()

def test_comment_crud_and_replies_flow():
    # 1. Setup: Create project and task
    proj_res = client.post("/api/projects", json={"name": "Project 1", "description": "D1"})
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    task_res = client.post("/api/tasks", json={
        "project_id": project_id,
        "title": "Task 1",
        "description": "Desc 1",
        "status": "todo",
        "priority": "high"
    })
    assert task_res.status_code == 201
    task_id = task_res.json()["id"]

    # 2. List comments (initially empty)
    list_res = client.get(f"/api/comments?task_id={task_id}")
    assert list_res.status_code == 200
    assert list_res.json()["comments"] == []
    assert list_res.json()["total_count"] == 0

    # 3. Create a top-level root comment
    comment_1_res = client.post("/api/comments", json={
        "task_id": task_id,
        "content": "This is the **first** root comment."
    })
    assert comment_1_res.status_code == 201
    c1 = comment_1_res.json()
    assert c1["content"] == "This is the **first** root comment."
    assert c1["parent_id"] is None
    c1_id = c1["id"]

    # 4. Reply to comment 1
    reply_1_res = client.post("/api/comments", json={
        "task_id": task_id,
        "parent_id": c1_id,
        "content": "Replying to first comment."
    })
    assert reply_1_res.status_code == 201
    r1 = reply_1_res.json()
    assert r1["content"] == "Replying to first comment."
    assert r1["parent_id"] == c1_id
    r1_id = r1["id"]

    # 5. Get comments list: root comment should have reply nested in `replies`
    get_list = client.get(f"/api/comments?task_id={task_id}")
    assert get_list.status_code == 200
    data = get_list.json()
    assert data["total_count"] == 1  # 1 root comment
    assert len(data["comments"]) == 1
    root = data["comments"][0]
    assert root["id"] == c1_id
    assert len(root["replies"]) == 1
    assert root["replies"][0]["id"] == r1_id

    # 6. Edit comment (Author update)
    edit_res = client.patch(f"/api/comments/{c1_id}", json={
        "content": "This is edited content."
    })
    assert edit_res.status_code == 200
    assert edit_res.json()["content"] == "This is edited content."

    # 7. Edit comment (Unauthorized update check)
    # Switch active authenticated user dependency to other user
    app.dependency_overrides[get_current_user] = lambda: OtherUser()
    unauth_edit = client.patch(f"/api/comments/{c1_id}", json={
        "content": "Hacked content"
    })
    assert unauth_edit.status_code == 403

    # Switch back to author
    app.dependency_overrides[get_current_user] = lambda: MockUser()

    # 8. Reactions toggle
    react_res = client.post(f"/api/comments/{c1_id}/reactions", json={"emoji": "👍"})
    assert react_res.status_code == 200
    assert react_res.json()["active"] is True

    # Get comment to check reaction state
    get_comment_res = client.get(f"/api/comments?task_id={task_id}")
    assert get_comment_res.status_code == 200
    comment_data = get_comment_res.json()["comments"][0]
    assert len(comment_data["reactions"]) == 1
    assert comment_data["reactions"][0]["emoji"] == "👍"
    assert comment_data["reactions"][0]["user_display_name"] == "Mock User"

    # Toggle reaction off
    react_off_res = client.post(f"/api/comments/{c1_id}/reactions", json={"emoji": "👍"})
    assert react_off_res.status_code == 200
    assert react_off_res.json()["active"] is False

    # Get comment to verify reaction is removed
    get_comment_off = client.get(f"/api/comments?task_id={task_id}")
    assert len(get_comment_off.json()["comments"][0]["reactions"]) == 0

    # 9. Delete comment (Author delete - soft delete check)
    del_res = client.delete(f"/api/comments/{c1_id}")
    assert del_res.status_code == 204

    # Verify soft delete returns [Comment deleted]
    get_deleted = client.get(f"/api/comments?task_id={task_id}")
    assert get_deleted.status_code == 200
    deleted_root = get_deleted.json()["comments"][0]
    assert deleted_root["content"] == "[Comment deleted]"
    assert deleted_root["user_display_name"] == "Deleted User"

def test_comment_pagination_flow():
    # Setup project and task
    proj_res = client.post("/api/projects", json={"name": "Project 2", "description": "D2"})
    project_id = proj_res.json()["id"]
    task_res = client.post("/api/tasks", json={
        "project_id": project_id, "title": "T2", "status": "todo", "priority": "medium"
    })
    task_id = task_res.json()["id"]

    # Create 5 root comments
    for i in range(5):
        client.post("/api/comments", json={
            "task_id": task_id,
            "content": f"Comment root {i}"
        })

    # Retrieve page 1 with limit 2
    p1 = client.get(f"/api/comments?task_id={task_id}&page=1&limit=2")
    assert p1.status_code == 200
    data1 = p1.json()
    assert data1["total_count"] == 5
    assert len(data1["comments"]) == 2
    assert data1["comments"][0]["content"] == "Comment root 0"
    assert data1["comments"][1]["content"] == "Comment root 1"

    # Retrieve page 2 with limit 2
    p2 = client.get(f"/api/comments?task_id={task_id}&page=2&limit=2")
    assert p2.status_code == 200
    data2 = p2.json()
    assert len(data2["comments"]) == 2
    assert data2["comments"][0]["content"] == "Comment root 2"
    assert data2["comments"][1]["content"] == "Comment root 3"

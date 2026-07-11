import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from app.main import app
from app.services.auth import get_current_user
from app.projects.repository import _MOCK_DB

client = TestClient(app)

# Helper mock user
class MockUser:
    id = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
    email = "user-test@sprintmind.ai"

@pytest.fixture(autouse=True)
def clean_mock_db_and_dependencies():
    _MOCK_DB.clear()
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()
    _MOCK_DB.clear()

def test_project_crud_flow():
    """
    Verifies the end-to-end CRUD flow for projects under an authenticated session.
    """
    # 1. Start with an empty list
    response = client.get("/api/projects")
    assert response.status_code == 200
    assert response.json() == []

    # 2. Create a project
    create_res = client.post("/api/projects", json={
        "name": "SprintMind Core",
        "description": "Core software engine.",
        "status": "active"
    })
    assert create_res.status_code == 201
    project = create_res.json()
    assert project["name"] == "SprintMind Core"
    assert project["description"] == "Core software engine."
    assert project["status"] == "active"
    project_id = project["id"]

    # 3. Retrieve list and verify it is there
    list_res = client.get("/api/projects")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["id"] == project_id

    # 4. Get project by ID
    get_res = client.get(f"/api/projects/{project_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "SprintMind Core"

    # 5. Update project status and description
    update_res = client.patch(f"/api/projects/{project_id}", json={
        "description": "Updated core engine details.",
        "status": "archived"
    })
    assert update_res.status_code == 200
    updated_project = update_res.json()
    assert updated_project["description"] == "Updated core engine details."
    assert updated_project["status"] == "archived"

    # 6. Delete (soft-delete) project
    delete_res = client.delete(f"/api/projects/{project_id}")
    assert delete_res.status_code == 204

    # 7. Verify project is no longer returned in list
    list_after_delete = client.get("/api/projects")
    assert list_after_delete.status_code == 200
    assert list_after_delete.json() == []

    # 8. Verify get by ID returns 404
    get_after_delete = client.get(f"/api/projects/{project_id}")
    assert get_after_delete.status_code == 404

def test_project_validation_errors():
    """
    Verifies that invalid values are rejected with 422 or 400 status codes.
    """
    # Name too short
    response = client.post("/api/projects", json={"name": "Ab", "status": "active"})
    assert response.status_code == 422

    # Name too long (> 100 characters)
    response = client.post("/api/projects", json={"name": "A" * 101, "status": "active"})
    assert response.status_code == 422

    # Invalid status
    response = client.post("/api/projects", json={"name": "SprintMind", "status": "pending"})
    assert response.status_code == 422

def test_duplicate_project_name_rejected():
    """
    Verifies that user cannot create two active projects with the same name.
    """
    client.post("/api/projects", json={"name": "Duplicate Project"})
    
    response = client.post("/api/projects", json={"name": "Duplicate Project"})
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

def test_project_ownership_denied():
    """
    Verifies that a user cannot access or modify projects owned by others.
    """
    # Create project under MockUser session (owner_id: dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c)
    create_res = client.post("/api/projects", json={"name": "Private Project"})
    project_id = create_res.json()["id"]

    # Change auth session to a different user
    class OtherUser:
        id = "e99d578a-082b-43bc-9967-34b28adffb2c"
        email = "other@sprintmind.ai"

    app.dependency_overrides[get_current_user] = lambda: OtherUser()

    try:
        # Try to view project
        assert client.get(f"/api/projects/{project_id}").status_code == 403
        
        # Try to update project
        assert client.patch(f"/api/projects/{project_id}", json={"name": "Hacked"}).status_code == 403
        
        # Try to delete project
        assert client.delete(f"/api/projects/{project_id}").status_code == 403
    finally:
        app.dependency_overrides[get_current_user] = lambda: MockUser()


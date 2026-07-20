import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from app.main import app
from app.services.auth import get_current_user
from app.projects.repository import _MOCK_DB
from app.documents.repository import _MOCK_DOCUMENTS_DB

client = TestClient(app)

# Helper mock user
class MockUser:
    id = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
    email = "user-test@sprintmind.ai"

@pytest.fixture(autouse=True)
def clean_mock_db_and_dependencies():
    _MOCK_DB.clear()
    _MOCK_DOCUMENTS_DB.clear()
    yield
    app.dependency_overrides.clear()
    _MOCK_DB.clear()
    _MOCK_DOCUMENTS_DB.clear()

def test_get_project_documents_unauthorized():
    """
    Verifies that retrieving project documents without authorization returns 401.
    """
    project_id = str(uuid4())
    response = client.get(f"/api/v1/documents/project/{project_id}")
    assert response.status_code == 401

def test_upload_document_unauthorized():
    """
    Verifies that uploading a document without authorization returns 401.
    """
    project_id = str(uuid4())
    response = client.post(
        "/api/v1/documents/upload",
        data={"project_id": project_id},
        files={"file": ("test.txt", b"hello", "text/plain")}
    )
    assert response.status_code == 401

def test_document_crud_flow_authorized():
    """
    Verifies the end-to-end CRUD flow for documents under an authorized session.
    """
    # 1. Authorize session
    app.dependency_overrides[get_current_user] = lambda: MockUser()

    # 2. Create a project
    proj_res = client.post("/api/projects", json={
        "name": "SprintMind Core Docs",
        "description": "Core engine docs.",
        "status": "active"
    })
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    # 3. Upload a document
    upload_res = client.post(
        "/api/v1/documents/upload",
        data={"project_id": project_id},
        files={"file": ("architecture.pdf", b"PDF bytes", "application/pdf")}
    )
    assert upload_res.status_code == 200
    doc_data = upload_res.json()
    assert doc_data["file_name"] == "architecture.pdf"
    assert doc_data["file_size"] == len(b"PDF bytes")
    assert doc_data["content_type"] == "application/pdf"
    assert doc_data["project_id"] == project_id
    document_id = doc_data["id"]

    # 4. Retrieve documents by project
    proj_docs_res = client.get(f"/api/v1/documents/project/{project_id}")
    assert proj_docs_res.status_code == 200
    assert len(proj_docs_res.json()) == 1
    assert proj_docs_res.json()[0]["id"] == document_id

    # 5. Retrieve document metadata by document ID
    meta_res = client.get(f"/api/v1/documents/{document_id}")
    assert meta_res.status_code == 200
    assert meta_res.json()["file_name"] == "architecture.pdf"

    # 6. Test download redirect
    dl_res = client.get(f"/api/v1/documents/{document_id}/download", follow_redirects=False)
    assert dl_res.status_code in [302, 307]

    # 7. Delete document
    del_res = client.delete(f"/api/v1/documents/{document_id}")
    assert del_res.status_code == 204

    # 8. Verify deletion
    proj_docs_res_after = client.get(f"/api/v1/documents/project/{project_id}")
    assert proj_docs_res_after.status_code == 200
    assert len(proj_docs_res_after.json()) == 0

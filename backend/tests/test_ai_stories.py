import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth import get_current_user
from app.ai.epics import _MOCK_EPICS_DB, get_epics
from app.ai.stories import _MOCK_STORIES_DB, get_stories, StoryResponse, EpicWithStoriesResponse
from app.ai.requirements import _MOCK_REQUIREMENTS_DB
from app.ai.planner import story_planner
from app.documents.repository import _MOCK_DOCUMENTS_DB, _MOCK_CHUNKS_DB

client = TestClient(app)

# Helper mock user
class MockUser:
    id = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
    email = "user-test@sprintmind.ai"


@pytest.fixture(autouse=True)
def clean_mock_dbs():
    _MOCK_DOCUMENTS_DB.clear()
    _MOCK_CHUNKS_DB.clear()
    _MOCK_REQUIREMENTS_DB.clear()
    _MOCK_EPICS_DB.clear()
    _MOCK_STORIES_DB.clear()
    yield
    app.dependency_overrides.clear()
    _MOCK_DOCUMENTS_DB.clear()
    _MOCK_CHUNKS_DB.clear()
    _MOCK_REQUIREMENTS_DB.clear()
    _MOCK_EPICS_DB.clear()
    _MOCK_STORIES_DB.clear()


def test_stories_models():
    """
    Verifies base validation behavior of Pydantic stories models.
    """
    story_data = {
        "id": uuid4(),
        "epic_id": uuid4(),
        "document_id": uuid4(),
        "title": "Story Title",
        "description": "As a user...",
        "acceptance_criteria": ["Criteria 1"],
        "priority": "High",
        "story_points": 3,
        "created_at": "2026-07-21T07:44:22.000Z",
        "updated_at": "2026-07-21T07:44:22.000Z"
    }
    model = StoryResponse(**story_data)
    assert model.title == "Story Title"
    assert model.story_points == 3


def test_planner_mock_fallback():
    """
    Verifies that the story planner generator successfully runs in mock fallback mode.
    """
    # 1. Setup mock document
    doc_id = uuid4()
    _MOCK_DOCUMENTS_DB.append({
        "id": str(doc_id),
        "project_id": "mock-project-id",
        "uploader_id": MockUser.id,
        "file_name": "project.txt",
        "file_size": 200,
        "content_type": "text/plain",
        "storage_path": "documents/project.txt"
    })

    # Add mock chunks
    _MOCK_CHUNKS_DB.append({
        "document_id": str(doc_id),
        "chunk_index": 0,
        "page": 1,
        "text": "Requirements content",
        "char_count": 20,
        "token_estimate": 5
    })

    # Run generator
    import asyncio
    res = asyncio.run(story_planner.generate_epics_and_stories(doc_id))
    
    assert len(res) > 0
    assert "[Mock]" in res[0]["title"]
    assert len(res[0]["stories"]) > 0
    assert "[Mock]" in res[0]["stories"][0]["title"]


def test_stories_router_endpoints():
    """
    Verifies POST /stories and GET /stories endpoints.
    """
    app.dependency_overrides[get_current_user] = lambda: MockUser()

    doc_id = str(uuid4())
    _MOCK_DOCUMENTS_DB.append({
        "id": doc_id,
        "project_id": "mock-project-id",
        "uploader_id": MockUser.id,
        "file_name": "project.txt",
        "file_size": 200,
        "content_type": "text/plain",
        "storage_path": "documents/project.txt"
    })

    # Add mock chunks to avoid chunk error
    _MOCK_CHUNKS_DB.append({
        "document_id": doc_id,
        "chunk_index": 0,
        "page": 1,
        "text": "Sprint plan content for epic generation",
        "char_count": 39,
        "token_estimate": 9
    })

    # POST trigger
    res = client.post(f"/api/v1/documents/{doc_id}/stories")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    assert data[0]["document_id"] == doc_id
    assert len(data[0]["stories"]) > 0

    # GET status
    get_res = client.get(f"/api/v1/documents/{doc_id}/stories")
    assert get_res.status_code == 200
    assert len(get_res.json()) == len(data)
    assert get_res.json()[0]["id"] == data[0]["id"]


def test_stories_router_unauthorized():
    doc_id = str(uuid4())
    res = client.post(f"/api/v1/documents/{doc_id}/stories")
    assert res.status_code == 401

    get_res = client.get(f"/api/v1/documents/{doc_id}/stories")
    assert get_res.status_code == 401


def test_stories_router_not_found():
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    fake_id = str(uuid4())
    
    # GET not found
    res = client.get(f"/api/v1/documents/{fake_id}/stories")
    assert res.status_code == 404

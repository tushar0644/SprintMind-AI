import pytest
import asyncio
from uuid import UUID, uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth import get_current_user
from app.projects.repository import _MOCK_DB
from app.tasks.repository import _MOCK_TASK_DB
from app.documents.repository import _MOCK_DOCUMENTS_DB, _MOCK_CHUNKS_DB
from app.ai.project_generator import project_generator, _MOCK_PROJECT_EPICS_DB
from app.ai.requirements import _MOCK_REQUIREMENTS_DB
from app.ai.epics import _MOCK_EPICS_DB
from app.ai.stories import _MOCK_STORIES_DB
from app.ai.mapper import project_mapper

client = TestClient(app)

# Helper mock user
class MockUser:
    id = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
    email = "user-test@sprintmind.ai"


@pytest.fixture(autouse=True)
def clean_mock_dbs():
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_DOCUMENTS_DB.clear()
    _MOCK_CHUNKS_DB.clear()
    _MOCK_REQUIREMENTS_DB.clear()
    _MOCK_EPICS_DB.clear()
    _MOCK_STORIES_DB.clear()
    _MOCK_PROJECT_EPICS_DB.clear()
    yield
    app.dependency_overrides.clear()
    _MOCK_DB.clear()
    _MOCK_TASK_DB.clear()
    _MOCK_DOCUMENTS_DB.clear()
    _MOCK_CHUNKS_DB.clear()
    _MOCK_REQUIREMENTS_DB.clear()
    _MOCK_EPICS_DB.clear()
    _MOCK_STORIES_DB.clear()
    _MOCK_PROJECT_EPICS_DB.clear()


def test_mapper_logic():
    """
    Verifies that mapper correctly normalizes priorities and maps document parameters.
    """
    analysis = {"executive_summary": "E2E summary details."}
    doc_id = uuid4()
    mapped_proj = project_mapper.map_document_to_project_input("test_project_spec.txt", analysis, doc_id)
    assert mapped_proj["name"] == "test_project_spec"
    assert mapped_proj["description"] == "E2E summary details."
    assert mapped_proj["generated_from_document_id"] == doc_id

    raw_epics = [
        {
            "title": "Epic 1",
            "description": "Desc 1",
            "stories": [
                {
                    "title": "Story 1",
                    "description": "Desc S1",
                    "acceptance_criteria": ["Crit 1", "Crit 2"],
                    "priority": "High",
                    "story_points": 3
                }
            ]
        }
    ]
    mapped_epics = project_mapper.map_epics_and_stories(raw_epics)
    assert len(mapped_epics) == 1
    assert mapped_epics[0]["title"] == "Epic 1"
    story = mapped_epics[0]["stories"][0]
    assert story["title"] == "Story 1"
    assert story["priority"] == "high"
    assert story["story_points"] == 3
    assert story["checklist"] == ["Crit 1", "Crit 2"]


def test_project_generation_lifecycle():
    """
    Tests successful generation transaction flow.
    """
    doc_id = uuid4()
    _MOCK_DOCUMENTS_DB.append({
        "id": str(doc_id),
        "project_id": "temp-project-id",
        "uploader_id": MockUser.id,
        "file_name": "smart_home.txt",
        "file_size": 100,
        "content_type": "text/plain",
        "storage_path": "documents/smart_home.txt"
    })

    # Add mock chunks
    _MOCK_CHUNKS_DB.append({
        "document_id": str(doc_id),
        "chunk_index": 0,
        "page": 1,
        "text": "Requirements content for smart home integration",
        "char_count": 30,
        "token_estimate": 8
    })

    # Run generator using standard mock user ID
    owner_uuid = UUID(MockUser.id)
    summary = asyncio.run(project_generator.generate_project(owner_uuid, doc_id))
    
    assert summary["project_name"] == "smart_home"
    assert summary["epics_count"] == 2
    assert summary["tasks_count"] == 4  # Matches _get_mock_epics_and_stories counts

    # Check database records
    assert len(_MOCK_DB) == 1
    assert len(_MOCK_PROJECT_EPICS_DB) == 2
    assert len(_MOCK_TASK_DB) == 4

    # Verify task details are mapped
    task = _MOCK_TASK_DB[0]
    assert task.story_points == 5
    assert len(task.checklist) == 2
    assert task.priority == "high"


def test_duplicate_generation_prevention():
    """
    Verifies that a duplicate generation request for the same document raises ValueError.
    """
    doc_id = uuid4()
    owner_uuid = UUID(MockUser.id)
    
    _MOCK_DOCUMENTS_DB.append({
        "id": str(doc_id),
        "project_id": "temp-project-id",
        "uploader_id": str(owner_uuid),
        "file_name": "smart_home.txt",
        "file_size": 100,
        "content_type": "text/plain",
        "storage_path": "documents/smart_home.txt"
    })

    _MOCK_CHUNKS_DB.append({
        "document_id": str(doc_id),
        "chunk_index": 0,
        "page": 1,
        "text": "Requirements content",
        "char_count": 20,
        "token_estimate": 5
    })

    # Generate once
    summary = asyncio.run(project_generator.generate_project(owner_uuid, doc_id))
    assert summary is not None

    # Generate twice -> should raise ValueError
    with pytest.raises(ValueError) as exc:
        asyncio.run(project_generator.generate_project(owner_uuid, doc_id))
    assert "Project already generated" in str(exc.value)


def test_project_generation_rollback():
    """
    Verifies transaction rollback if a creation step fails (e.g. inserting tasks raises an error).
    """
    doc_id = uuid4()
    owner_uuid = UUID(MockUser.id)
    
    _MOCK_DOCUMENTS_DB.append({
        "id": str(doc_id),
        "project_id": "temp-project-id",
        "uploader_id": str(owner_uuid),
        "file_name": "smart_home.txt",
        "file_size": 100,
        "content_type": "text/plain",
        "storage_path": "documents/smart_home.txt"
    })

    _MOCK_CHUNKS_DB.append({
        "document_id": str(doc_id),
        "chunk_index": 0,
        "page": 1,
        "text": "Requirements content",
        "char_count": 20,
        "token_estimate": 5
    })

    # Mock TaskRepository create to raise exception to trigger rollback
    original_create = project_generator.task_repo.create
    def mock_fail_create(*args, **kwargs):
        raise RuntimeError("Database connection timed out during task insertion.")
    
    project_generator.task_repo.create = mock_fail_create

    try:
        with pytest.raises(RuntimeError) as exc:
            asyncio.run(project_generator.generate_project(owner_uuid, doc_id))
        assert "timed out" in str(exc.value)

        # Rollback check: Databases must be completely clean
        assert len(_MOCK_DB) == 0
        assert len(_MOCK_PROJECT_EPICS_DB) == 0
        assert len(_MOCK_TASK_DB) == 0
    finally:
        project_generator.task_repo.create = original_create


def test_generation_routes():
    """
    Tests FastAPI router routes for project generation.
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

    # Add mock chunks
    _MOCK_CHUNKS_DB.append({
        "document_id": doc_id,
        "chunk_index": 0,
        "page": 1,
        "text": "Sprint plan content",
        "char_count": 19,
        "token_estimate": 5
    })

    # POST trigger project generation
    res = client.post(f"/api/v1/documents/{doc_id}/generate-project")
    assert res.status_code == 200
    data = res.json()
    assert data["project_name"] == "project"
    assert data["epics_count"] == 2
    assert data["tasks_count"] == 4
    
    proj_id = data["project_id"]

    # GET project generated summary
    get_res = client.get(f"/api/v1/projects/{proj_id}/generated")
    assert get_res.status_code == 200
    summary = get_res.json()
    assert summary["project_id"] == proj_id
    assert summary["epics_count"] == 2
    assert summary["tasks_count"] == 4

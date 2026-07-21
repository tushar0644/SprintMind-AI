import pytest
import asyncio
from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth import get_current_user
from app.ai.models import DocumentAnalysisJSON, DocumentAnalysisResponse
from app.ai.prompts import DOCUMENT_ANALYSIS_PROMPT
from app.ai.summarizer import document_summarizer
from app.ai.service import ai_document_service, _MOCK_ANALYSIS_DB
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
    _MOCK_ANALYSIS_DB.clear()
    yield
    app.dependency_overrides.clear()
    _MOCK_DOCUMENTS_DB.clear()
    _MOCK_CHUNKS_DB.clear()
    _MOCK_ANALYSIS_DB.clear()


def test_ai_analysis_models():
    """
    Verifies base validation behavior of Pydantic models.
    """
    json_data = {
        "executive_summary": "Test Summary",
        "objectives": ["Obj 1"],
        "deliverables": ["Del 1"],
        "timeline": ["Week 1"],
        "risks": ["Risk 1"]
    }
    model = DocumentAnalysisJSON(**json_data)
    assert model.executive_summary == "Test Summary"
    assert len(model.objectives) == 1


def test_summarizer_mock_fallback():
    """
    Verifies that the summarizer successfully falls back to mock responses when API is disabled.
    """
    res = document_summarizer.summarize_content("This is dummy text.")
    assert "[Mock]" in res["executive_summary"]
    assert len(res["objectives"]) > 0
    assert len(res["timeline"]) > 0


def test_summarizer_empty_content():
    with pytest.raises(ValueError):
        document_summarizer.summarize_content("")


def test_service_lifecycle_mock_flow():
    """
    Verifies service status transitions (Pending -> Analyzing -> Completed).
    """
    doc_id = uuid4()
    
    # 1. Setup mock document
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
        "text": "Sprint plan content",
        "char_count": 19,
        "token_estimate": 5
    })

    # 2. Initialize
    init_res = ai_document_service.initialize_analysis(doc_id)
    assert init_res["status"] == "Pending"
    assert init_res["document_id"] == str(doc_id)

    # 3. Retrieve
    retrieved = ai_document_service.get_analysis(doc_id)
    assert retrieved is not None
    assert retrieved["status"] == "Pending"

    # 4. Run analysis
    asyncio.run(ai_document_service.run_analysis(doc_id))

    # 5. Verify completed
    final = ai_document_service.get_analysis(doc_id)
    assert final["status"] == "Completed"
    assert "[Mock]" in final["executive_summary"]
    assert len(final["objectives"]) > 0


def test_analysis_router_endpoints():
    """
    Verifies POST /analyze and GET /analysis endpoints.
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

    # POST trigger
    res = client.post(f"/api/v1/documents/{doc_id}/analyze")
    assert res.status_code == 202
    data = res.json()
    assert data["status"] == "Pending"
    assert data["document_id"] == doc_id

    # GET status
    get_res = client.get(f"/api/v1/documents/{doc_id}/analysis")
    assert get_res.status_code == 200
    assert get_res.json()["status"] in ["Pending", "Completed"]


def test_analysis_router_unauthorized():
    doc_id = str(uuid4())
    res = client.post(f"/api/v1/documents/{doc_id}/analyze")
    assert res.status_code == 401


def test_analysis_router_not_found():
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    fake_id = str(uuid4())
    res = client.post(f"/api/v1/documents/{fake_id}/analyze")
    assert res.status_code == 404

import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth import get_current_user
from app.documents.chunker import SemanticChunker, estimate_tokens
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
    yield
    app.dependency_overrides.clear()
    _MOCK_DOCUMENTS_DB.clear()
    _MOCK_CHUNKS_DB.clear()


def test_token_estimation():
    assert estimate_tokens("") == 0
    assert estimate_tokens("hello") == 1
    assert estimate_tokens("a" * 40) == 10


def test_semantic_chunker_basic():
    """
    Verifies base text splitting of the SemanticChunker.
    """
    text = "Paragraph 1 text.\n\nParagraph 2 text."
    chunker = SemanticChunker(max_chunk_size=1000, min_chunk_size=10)
    chunks = chunker.chunk_text(text)
    
    assert len(chunks) == 1
    assert chunks[0]["text"] == text
    assert chunks[0]["char_count"] == len(text)
    assert chunks[0]["token_estimate"] == len(text) // 4


def test_semantic_chunker_heading_preservation():
    """
    Verifies that headings are preserved with their subsequent paragraphs.
    """
    text = "# Core Architecture\nThis describes the core system architecture details."
    chunker = SemanticChunker(max_chunk_size=200, min_chunk_size=10)
    chunks = chunker.chunk_text(text)
    
    assert len(chunks) == 1
    assert "Core Architecture" in chunks[0]["text"]
    assert "describes the core" in chunks[0]["text"]


def test_semantic_chunker_list_grouping():
    """
    Verifies list items are grouped together within size limit.
    """
    text = "Supported formats:\n- PDF documents\n- Word DOCX files\n- Text notes\n- Markdown"
    chunker = SemanticChunker(max_chunk_size=500, min_chunk_size=10)
    chunks = chunker.chunk_text(text)
    
    assert len(chunks) == 1
    assert "PDF documents" in chunks[0]["text"]
    assert "Markdown" in chunks[0]["text"]


def test_chunker_overlap():
    """
    Verifies overlap boundary preservation when max chunk size is exceeded.
    """
    # Create text that exceeds max size
    block1 = "A" * 150
    block2 = "B" * 150
    text = f"{block1}\n\n{block2}"
    
    # Max size = 200, overlap = 50
    chunker = SemanticChunker(max_chunk_size=200, min_chunk_size=10, overlap=50)
    chunks = chunker.chunk_text(text)
    
    assert len(chunks) == 2
    # Second chunk should contain overlap from first chunk
    assert chunks[0]["text"] == block1
    assert chunks[1]["text"].startswith("A" * 50)
    assert chunks[1]["text"].endswith(block2)


def test_chunker_empty_document():
    chunker = SemanticChunker()
    assert chunker.chunk_text("") == []
    assert chunker.chunk_text("   ") == []


def test_chunk_api_endpoints_workflow():
    """
    Verifies documents/{id}/chunk and documents/{id}/chunks routes.
    """
    # 1. Authorize session
    app.dependency_overrides[get_current_user] = lambda: MockUser()

    # 2. Setup mock document record
    doc_id = str(uuid4())
    _MOCK_DOCUMENTS_DB.append({
        "id": doc_id,
        "project_id": "mock-project-id",
        "uploader_id": MockUser.id,
        "file_name": "architecture.txt",
        "file_size": 100,
        "content_type": "text/plain",
        "storage_path": "documents/architecture.txt"
    })

    # 3. Post chunk request
    payload = {
        "max_chunk_size": 1000,
        "min_chunk_size": 50,
        "overlap": 100
    }
    res = client.post(f"/api/v1/documents/{doc_id}/chunk", json=payload)
    assert res.status_code == 200
    
    chunks = res.json()
    assert len(chunks) > 0
    assert chunks[0]["document_id"] == doc_id
    assert chunks[0]["chunk_index"] == 0
    assert "First Line as Title" in chunks[0]["text"]

    # 4. Get chunks request
    get_res = client.get(f"/api/v1/documents/{doc_id}/chunks")
    assert get_res.status_code == 200
    assert len(get_res.json()) == len(chunks)
    assert get_res.json()[0]["id"] == chunks[0]["id"]


def test_chunk_api_unauthorized():
    doc_id = str(uuid4())
    res = client.post(f"/api/v1/documents/{doc_id}/chunk", json={})
    assert res.status_code == 401
    
    get_res = client.get(f"/api/v1/documents/{doc_id}/chunks")
    assert get_res.status_code == 401


def test_chunk_api_not_found():
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    fake_id = str(uuid4())
    res = client.post(f"/api/v1/documents/{fake_id}/chunk", json={})
    assert res.status_code == 404

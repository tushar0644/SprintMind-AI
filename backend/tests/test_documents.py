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


# --- Phase 2.2 Document Parsing Unit Tests ---
from unittest.mock import MagicMock, patch
from app.documents.parser import DocumentParserFactory, PDFParser, DocxParser, TxtParser, MarkdownParser

def test_pdf_parser_success():
    """
    Verifies PDFParser correctly extracts text, counts, and metadata.
    """
    mock_reader = MagicMock()
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "This is a sample document written in English language for test."
    mock_reader.pages = [mock_page]
    mock_reader.metadata.title = "Mock PDF Title"

    with patch("app.documents.parser.PdfReader", return_value=mock_reader):
        parser = DocumentParserFactory.get_parser("doc.pdf")
        assert isinstance(parser, PDFParser)
        res = parser.parse(b"dummy pdf content", "doc.pdf")
        
        assert res.content == "This is a sample document written in English language for test."
        assert res.metadata.title == "Mock PDF Title"
        assert res.metadata.pages == 1
        assert res.metadata.word_count == 11
        assert res.metadata.character_count == len(res.content)
        assert res.metadata.language == "en"

def test_docx_parser_success():
    """
    Verifies DocxParser correctly extracts text and metadata.
    """
    mock_doc = MagicMock()
    mock_para = MagicMock()
    mock_para.text = "This is a sample document written in English language for test."
    mock_doc.paragraphs = [mock_para]
    mock_doc.tables = []
    mock_doc.core_properties.title = "Mock Docx Title"
    mock_doc.core_properties.pages = 2

    with patch("docx.Document", return_value=mock_doc):
        parser = DocumentParserFactory.get_parser("doc.docx")
        assert isinstance(parser, DocxParser)
        res = parser.parse(b"dummy docx content", "doc.docx")
        
        assert res.content == "This is a sample document written in English language for test."
        assert res.metadata.title == "Mock Docx Title"
        assert res.metadata.pages == 2
        assert res.metadata.word_count == 11
        assert res.metadata.language == "en"

def test_txt_parser_success():
    """
    Verifies TxtParser correctly decodes plain text and computes counts.
    """
    text = "First Line as Title\nSecond line of plain text content."
    file_bytes = text.encode("utf-8")
    
    parser = DocumentParserFactory.get_parser("doc.txt")
    assert isinstance(parser, TxtParser)
    res = parser.parse(file_bytes, "doc.txt")
    
    assert res.content == text
    assert res.metadata.title == "First Line as Title"
    assert res.metadata.pages == 1
    assert res.metadata.word_count == 10
    assert res.metadata.language == "en"

def test_markdown_parser_success():
    """
    Verifies MarkdownParser strips syntax, extracts header title and content.
    """
    md_content = """# SprintMind Markdown Guide
Here is some **bold** and *italic* text.
- List item 1
- List item 2
[SprintMind](https://sprintmind.ai)
"""
    file_bytes = md_content.encode("utf-8")
    
    parser = DocumentParserFactory.get_parser("doc.md")
    assert isinstance(parser, MarkdownParser)
    res = parser.parse(file_bytes, "doc.md")
    
    # Verify markup syntax is stripped
    assert "SprintMind Markdown Guide" in res.content
    assert "**" not in res.content
    assert "*" not in res.content
    assert "[SprintMind]" not in res.content
    assert "List item 1" in res.content
    
    # Metadata assertions
    assert res.metadata.title == "SprintMind Markdown Guide"
    assert res.metadata.pages == 1
    assert res.metadata.language == "en"

def test_parser_unsupported_file():
    """
    Verifies factory raises ValueError for unsupported formats.
    """
    with pytest.raises(ValueError) as exc:
        DocumentParserFactory.get_parser("doc.xlsx")
    assert "Unsupported file format" in str(exc.value)

def test_parser_empty_document():
    """
    Verifies all parsers return empty content and correct fallbacks for empty files.
    """
    pdf_res = PDFParser().parse(b"", "empty.pdf")
    assert pdf_res.content == ""
    assert pdf_res.metadata.pages == 0
    assert pdf_res.metadata.word_count == 0
    assert pdf_res.metadata.title == "empty.pdf"

    docx_res = DocxParser().parse(b"", "empty.docx")
    assert docx_res.content == ""
    assert docx_res.metadata.pages == 0
    assert docx_res.metadata.word_count == 0

    txt_res = TxtParser().parse(b"", "empty.txt")
    assert txt_res.content == ""
    assert txt_res.metadata.pages == 1
    assert txt_res.metadata.word_count == 0

    md_res = MarkdownParser().parse(b"", "empty.md")
    assert md_res.content == ""
    assert md_res.metadata.pages == 1
    assert md_res.metadata.word_count == 0

def test_language_detection():
    """
    Verifies language stopword heuristic for English, Spanish, German, French.
    """
    parser = TxtParser()
    
    # English
    en_text = "the and of to in that have it for not on with he as you do at"
    assert parser.detect_language(en_text) == "en"
    
    # Spanish
    es_text = "el la los las de en que y o no se con por para como"
    assert parser.detect_language(es_text) == "es"
    
    # German
    de_text = "der die das und ist in zu den von mit ein eine"
    assert parser.detect_language(de_text) == "de"
    
    # French
    fr_text = "le la les un une des de et en que est dans pour par"
    assert parser.detect_language(fr_text) == "fr"


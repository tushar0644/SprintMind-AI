import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth import get_current_user
from app.ai.requirements import (
    RequirementsExtractionJSON,
    RequirementsResponse,
    _MOCK_REQUIREMENTS_DB,
    get_requirements,
    save_requirements
)
from app.ai.validators import validate_requirements_dict
from app.ai.extractor import requirements_extractor
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
    yield
    app.dependency_overrides.clear()
    _MOCK_DOCUMENTS_DB.clear()
    _MOCK_CHUNKS_DB.clear()
    _MOCK_REQUIREMENTS_DB.clear()


def test_requirements_models():
    """
    Verifies base validation behavior of Pydantic requirements models.
    """
    json_data = {
        "functional_requirements": ["Func 1"],
        "non_functional_requirements": ["NonFunc 1"],
        "business_rules": ["Rule 1"],
        "assumptions": ["Assump 1"],
        "dependencies": ["Dep 1"],
        "risks": ["Risk 1"]
    }
    model = RequirementsExtractionJSON(**json_data)
    assert model.functional_requirements == ["Func 1"]
    assert len(model.non_functional_requirements) == 1


def test_requirements_validation():
    """
    Verifies that validators behave correctly.
    """
    valid_data = {
        "functional_requirements": ["Func 1"],
        "non_functional_requirements": ["NonFunc 1"],
        "business_rules": ["Rule 1"],
        "assumptions": ["Assump 1"],
        "dependencies": ["Dep 1"],
        "risks": ["Risk 1"]
    }
    assert validate_requirements_dict(valid_data) is True

    # Missing keys
    invalid_data_1 = {
        "functional_requirements": ["Func 1"]
    }
    assert validate_requirements_dict(invalid_data_1) is False

    # Invalid type inside list
    invalid_data_2 = {
        "functional_requirements": ["Func 1"],
        "non_functional_requirements": [123],
        "business_rules": ["Rule 1"],
        "assumptions": ["Assump 1"],
        "dependencies": ["Dep 1"],
        "risks": ["Risk 1"]
    }
    assert validate_requirements_dict(invalid_data_2) is False


def test_extractor_mock_fallback():
    """
    Verifies that the extractor falls back to mock responses when API is disabled.
    """
    res = requirements_extractor.extract_requirements("This is dummy text.")
    assert "[Mock]" in res["functional_requirements"][0]
    assert len(res["functional_requirements"]) > 0
    assert len(res["risks"]) > 0


def test_extractor_empty_content():
    with pytest.raises(ValueError):
        requirements_extractor.extract_requirements("")


def test_requirements_db_lifecycle_mock_flow():
    """
    Verifies save and get requirements flow for mock documents.
    """
    doc_id = uuid4()
    
    # Setup mock document
    _MOCK_DOCUMENTS_DB.append({
        "id": str(doc_id),
        "project_id": "mock-project-id",
        "uploader_id": MockUser.id,
        "file_name": "project.txt",
        "file_size": 200,
        "content_type": "text/plain",
        "storage_path": "documents/project.txt"
    })

    dummy_reqs = {
        "functional_requirements": ["Mock functional requirement"],
        "non_functional_requirements": ["Mock non-functional requirement"],
        "business_rules": ["Mock business rule"],
        "assumptions": ["Mock assumption"],
        "dependencies": ["Mock dependency"],
        "risks": ["Mock risk"]
    }

    # Retrieve before save
    assert get_requirements(doc_id) is None

    # Save
    saved = save_requirements(doc_id, dummy_reqs)
    assert saved["document_id"] == str(doc_id)
    assert saved["functional_requirements"] == ["Mock functional requirement"]

    # Retrieve after save
    retrieved = get_requirements(doc_id)
    assert retrieved is not None
    assert retrieved["id"] == saved["id"]
    assert retrieved["functional_requirements"] == ["Mock functional requirement"]


def test_requirements_router_endpoints():
    """
    Verifies POST /requirements and GET /requirements endpoints.
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
        "text": "Sprint plan content for requirements extraction",
        "char_count": 47,
        "token_estimate": 11
    })

    # POST trigger
    res = client.post(f"/api/v1/documents/{doc_id}/requirements")
    assert res.status_code == 200
    data = res.json()
    assert data["document_id"] == doc_id
    assert len(data["functional_requirements"]) > 0

    # GET status
    get_res = client.get(f"/api/v1/documents/{doc_id}/requirements")
    assert get_res.status_code == 200
    assert get_res.json()["document_id"] == doc_id
    assert get_res.json()["id"] == data["id"]


def test_requirements_router_unauthorized():
    doc_id = str(uuid4())
    res = client.post(f"/api/v1/documents/{doc_id}/requirements")
    assert res.status_code == 401

    get_res = client.get(f"/api/v1/documents/{doc_id}/requirements")
    assert get_res.status_code == 401


def test_requirements_router_not_found():
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    fake_id = str(uuid4())
    
    # GET not found
    res = client.get(f"/api/v1/documents/{fake_id}/requirements")
    assert res.status_code == 404

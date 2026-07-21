from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime, timezone
from pydantic import BaseModel, Field, UUID4

# Mock DB for requirements fallback
_MOCK_REQUIREMENTS_DB: List[dict] = []

class RequirementsExtractionJSON(BaseModel):
    functional_requirements: List[str] = Field(default_factory=list, description="Functional requirements")
    non_functional_requirements: List[str] = Field(default_factory=list, description="Non-functional requirements")
    business_rules: List[str] = Field(default_factory=list, description="Business rules")
    assumptions: List[str] = Field(default_factory=list, description="Assumptions")
    dependencies: List[str] = Field(default_factory=list, description="Dependencies")
    risks: List[str] = Field(default_factory=list, description="Risks")


class RequirementsResponse(BaseModel):
    id: UUID4
    document_id: UUID4
    functional_requirements: List[str]
    non_functional_requirements: List[str]
    business_rules: List[str]
    assumptions: List[str]
    dependencies: List[str]
    risks: List[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def _is_mock_document(document_id: UUID) -> bool:
    from app.documents.repository import _MOCK_DOCUMENTS_DB
    return any(str(d["id"]) == str(document_id) for d in _MOCK_DOCUMENTS_DB)


def get_requirements(document_id: UUID) -> Optional[dict]:
    is_mock = _is_mock_document(document_id)
    if is_mock:
        for item in _MOCK_REQUIREMENTS_DB:
            if str(item["document_id"]) == str(document_id):
                return item
        return None

    try:
        from app.database.client import supabase
        res = supabase.table("document_requirements").select("*").eq("document_id", str(document_id)).execute()
        if res.data:
            return res.data[0]
        return None
    except Exception as e:
        err_msg = str(e)
        if any(term in err_msg for term in ["document_requirements", "42P01", "PGRST205", "PGRST204", "cache"]):
            for item in _MOCK_REQUIREMENTS_DB:
                if str(item["document_id"]) == str(document_id):
                    return item
            return None
        raise e


def save_requirements(document_id: UUID, req_data: dict) -> dict:
    is_mock = _is_mock_document(document_id)
    now = datetime.now(timezone.utc).isoformat()
    
    payload = {
        "document_id": str(document_id),
        "functional_requirements": req_data.get("functional_requirements", []),
        "non_functional_requirements": req_data.get("non_functional_requirements", []),
        "business_rules": req_data.get("business_rules", []),
        "assumptions": req_data.get("assumptions", []),
        "dependencies": req_data.get("dependencies", []),
        "risks": req_data.get("risks", []),
        "updated_at": now
    }

    if is_mock:
        for idx, item in enumerate(_MOCK_REQUIREMENTS_DB):
            if str(item["document_id"]) == str(document_id):
                payload["id"] = item["id"]
                payload["created_at"] = item["created_at"]
                _MOCK_REQUIREMENTS_DB[idx] = payload
                return payload
        payload["id"] = str(uuid4())
        payload["created_at"] = now
        _MOCK_REQUIREMENTS_DB.append(payload)
        return payload

    try:
        from app.database.client import supabase
        res = supabase.table("document_requirements").select("*").eq("document_id", str(document_id)).execute()
        if res.data:
            payload["id"] = res.data[0]["id"]
            payload["created_at"] = res.data[0]["created_at"]
            update_res = supabase.table("document_requirements").update(payload).eq("document_id", str(document_id)).execute()
            return update_res.data[0]
        else:
            payload["id"] = str(uuid4())
            payload["created_at"] = now
            insert_res = supabase.table("document_requirements").insert(payload).execute()
            return insert_res.data[0]
    except Exception as e:
        err_msg = str(e)
        if any(term in err_msg for term in ["document_requirements", "42P01", "PGRST205", "PGRST204", "cache"]):
            for idx, item in enumerate(_MOCK_REQUIREMENTS_DB):
                if str(item["document_id"]) == str(document_id):
                    payload["id"] = item["id"]
                    payload["created_at"] = item["created_at"]
                    _MOCK_REQUIREMENTS_DB[idx] = payload
                    return payload
            payload["id"] = str(uuid4())
            payload["created_at"] = now
            _MOCK_REQUIREMENTS_DB.append(payload)
            return payload
        raise e

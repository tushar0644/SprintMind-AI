from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime, timezone
from pydantic import BaseModel, Field, UUID4

# Mock DB for epics fallback
_MOCK_EPICS_DB: List[dict] = []

class EpicCreate(BaseModel):
    title: str = Field(..., description="Title of the epic")
    description: Optional[str] = Field(None, description="Description of the epic")


class EpicResponse(BaseModel):
    id: UUID4
    document_id: UUID4
    title: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def _is_mock_document(document_id: UUID) -> bool:
    from app.documents.repository import _MOCK_DOCUMENTS_DB
    return any(str(d["id"]) == str(document_id) for d in _MOCK_DOCUMENTS_DB)


def get_epics(document_id: UUID) -> List[dict]:
    is_mock = _is_mock_document(document_id)
    if is_mock:
        return [item for item in _MOCK_EPICS_DB if str(item["document_id"]) == str(document_id)]

    try:
        from app.database.client import supabase
        res = supabase.table("document_epics").select("*").eq("document_id", str(document_id)).execute()
        return res.data or []
    except Exception as e:
        err_msg = str(e)
        if any(term in err_msg for term in ["document_epics", "42P01", "PGRST205", "PGRST204", "cache"]):
            return [item for item in _MOCK_EPICS_DB if str(item["document_id"]) == str(document_id)]
        raise e


def save_epic(document_id: UUID, title: str, description: Optional[str] = None) -> dict:
    is_mock = _is_mock_document(document_id)
    now = datetime.now(timezone.utc).isoformat()
    
    payload = {
        "document_id": str(document_id),
        "title": title,
        "description": description,
        "updated_at": now
    }

    if is_mock:
        payload["id"] = str(uuid4())
        payload["created_at"] = now
        _MOCK_EPICS_DB.append(payload)
        return payload

    try:
        from app.database.client import supabase
        payload["id"] = str(uuid4())
        payload["created_at"] = now
        insert_res = supabase.table("document_epics").insert(payload).execute()
        if insert_res.data:
            return insert_res.data[0]
        raise Exception("Failed to insert epic")
    except Exception as e:
        err_msg = str(e)
        if any(term in err_msg for term in ["document_epics", "42P01", "PGRST205", "PGRST204", "cache"]):
            payload["id"] = str(uuid4())
            payload["created_at"] = now
            _MOCK_EPICS_DB.append(payload)
            return payload
        raise e


def delete_epics_by_document(document_id: UUID) -> bool:
    global _MOCK_EPICS_DB
    is_mock = _is_mock_document(document_id)
    
    # Cascade delete mock stories
    from .stories import delete_stories_by_document
    delete_stories_by_document(document_id)

    if is_mock:
        _MOCK_EPICS_DB = [item for item in _MOCK_EPICS_DB if str(item["document_id"]) != str(document_id)]
        return True

    try:
        from app.database.client import supabase
        supabase.table("document_epics").delete().eq("document_id", str(document_id)).execute()
        return True
    except Exception as e:
        err_msg = str(e)
        if any(term in err_msg for term in ["document_epics", "42P01", "PGRST205", "PGRST204", "cache"]):
            _MOCK_EPICS_DB = [item for item in _MOCK_EPICS_DB if str(item["document_id"]) != str(document_id)]
            return True
        raise e

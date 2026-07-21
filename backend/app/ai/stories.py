from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone
from pydantic import BaseModel, Field, UUID4

# In-memory database for stories, used exclusively for mock/test documents.
_MOCK_STORIES_DB: List[dict] = []

class StoryCreate(BaseModel):
    title: str = Field(..., description="Title of the user story")
    description: str = Field(..., description="Description of the user story")
    acceptance_criteria: List[str] = Field(default_factory=list, description="Acceptance criteria list")
    priority: str = Field("Medium", description="Suggested priority (High/Medium/Low)")
    story_points: int = Field(1, description="Story point estimate")


class StoryResponse(BaseModel):
    id: UUID4
    epic_id: UUID4
    document_id: UUID4
    title: str
    description: str
    acceptance_criteria: List[str]
    priority: str
    story_points: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EpicWithStoriesResponse(BaseModel):
    id: UUID4
    document_id: UUID4
    title: str
    description: Optional[str] = None
    stories: List[StoryResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def _is_mock_document(document_id: UUID) -> bool:
    from app.documents.repository import _MOCK_DOCUMENTS_DB
    return any(str(d["id"]) == str(document_id) for d in _MOCK_DOCUMENTS_DB)


def get_stories(document_id: UUID) -> List[dict]:
    is_mock = _is_mock_document(document_id)
    if is_mock:
        return [item for item in _MOCK_STORIES_DB if str(item["document_id"]) == str(document_id)]

    from app.database.client import supabase
    res = supabase.table("document_stories").select("*").eq("document_id", str(document_id)).execute()
    return res.data or []


def save_story(
    epic_id: UUID,
    document_id: UUID,
    title: str,
    description: str,
    acceptance_criteria: List[str],
    priority: str,
    story_points: int
) -> dict:
    is_mock = _is_mock_document(document_id)
    now = datetime.now(timezone.utc).isoformat()
    
    # Priority check constraints validation
    prio = priority if priority in ["High", "Medium", "Low"] else "Medium"
    
    payload = {
        "epic_id": str(epic_id),
        "document_id": str(document_id),
        "title": title,
        "description": description,
        "acceptance_criteria": acceptance_criteria,
        "priority": prio,
        "story_points": story_points if story_points >= 0 else 1,
        "updated_at": now
    }

    if is_mock:
        payload["id"] = str(uuid4())
        payload["created_at"] = now
        _MOCK_STORIES_DB.append(payload)
        return payload

    from app.database.client import supabase
    payload["id"] = str(uuid4())
    payload["created_at"] = now
    insert_res = supabase.table("document_stories").insert(payload).execute()
    if insert_res.data:
        return insert_res.data[0]
    raise Exception("Failed to insert story")


def delete_stories_by_document(document_id: UUID) -> bool:
    global _MOCK_STORIES_DB
    is_mock = _is_mock_document(document_id)
    if is_mock:
        _MOCK_STORIES_DB = [item for item in _MOCK_STORIES_DB if str(item["document_id"]) != str(document_id)]
        return True

    from app.database.client import supabase
    supabase.table("document_stories").delete().eq("document_id", str(document_id)).execute()
    return True

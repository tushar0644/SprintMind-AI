from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone
from app.database.client import supabase
from .schemas import DocumentCreate, DocumentResponse

_MOCK_DOCUMENTS_DB: List[dict] = []
MOCK_USER_ID = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"

class DocumentRepository:
    def _is_mock_user(self, user_id: UUID) -> bool:
        return str(user_id) == MOCK_USER_ID

    def create_document(self, uploader_id: UUID, data: DocumentCreate) -> dict:
        if self._is_mock_user(uploader_id):
            now = datetime.now(timezone.utc).isoformat()
            payload = data.model_dump(mode="json")
            payload["id"] = str(uuid4())
            payload["uploader_id"] = str(uploader_id)
            payload["created_at"] = now
            payload["updated_at"] = now
            _MOCK_DOCUMENTS_DB.append(payload)
            return payload

        payload = data.model_dump(mode="json")
        payload["uploader_id"] = str(uploader_id)
        response = supabase.table("documents").insert(payload).execute()
        if response.data:
            return response.data[0]
        raise Exception("Failed to create document record")

    def get_documents_by_project(self, project_id: UUID) -> List[dict]:
        from app.projects.repository import _MOCK_DB
        is_mock_project = any(str(p.id) == str(project_id) for p in _MOCK_DB)
        if is_mock_project:
            return [
                d for d in _MOCK_DOCUMENTS_DB
                if str(d["project_id"]) == str(project_id)
            ]

        response = supabase.table("documents").select("*").eq("project_id", str(project_id)).order("created_at", desc=True).execute()
        return response.data

    def get_document(self, document_id: UUID) -> Optional[dict]:
        for d in _MOCK_DOCUMENTS_DB:
            if str(d["id"]) == str(document_id):
                return d

        response = supabase.table("documents").select("*").eq("id", str(document_id)).execute()
        if response.data:
            return response.data[0]
        return None

    def delete_document(self, document_id: UUID) -> bool:
        for i, d in enumerate(_MOCK_DOCUMENTS_DB):
            if str(d["id"]) == str(document_id):
                _MOCK_DOCUMENTS_DB.pop(i)
                return True

        response = supabase.table("documents").delete().eq("id", str(document_id)).execute()
        return len(response.data) > 0

document_repository = DocumentRepository()

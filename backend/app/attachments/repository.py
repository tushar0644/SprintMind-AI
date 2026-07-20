from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone
from app.database.client import supabase
from .schemas import AttachmentCreate, AttachmentResponse

_MOCK_ATTACHMENTS_DB: List[dict] = []
MOCK_USER_ID = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"

class AttachmentRepository:
    def _is_mock_user(self, user_id: UUID) -> bool:
        return str(user_id) == MOCK_USER_ID

    def create_attachment(self, uploader_id: UUID, data: AttachmentCreate) -> dict:
        if self._is_mock_user(uploader_id):
            now = datetime.now(timezone.utc).isoformat()
            payload = data.model_dump(mode="json")
            payload["id"] = str(uuid4())
            payload["uploader_id"] = str(uploader_id)
            payload["created_at"] = now
            payload["updated_at"] = now
            _MOCK_ATTACHMENTS_DB.append(payload)
            return payload

        payload = data.model_dump(mode="json")
        payload["uploader_id"] = str(uploader_id)
        response = supabase.table("attachments").insert(payload).execute()
        if response.data:
            return response.data[0]
        raise Exception("Failed to create attachment record")

    def get_attachments_by_project(self, project_id: UUID) -> List[dict]:
        from app.projects.repository import _MOCK_DB
        is_mock_project = any(str(p.id) == str(project_id) for p in _MOCK_DB)
        if is_mock_project:
            return [
                a for a in _MOCK_ATTACHMENTS_DB 
                if str(a["project_id"]) == str(project_id)
            ]

        response = supabase.table("attachments").select("*").eq("project_id", str(project_id)).order("created_at", desc=True).execute()
        return response.data

    def get_attachments_by_task(self, task_id: UUID) -> List[dict]:
        from app.tasks.repository import _MOCK_TASK_DB
        is_mock_task = any(str(t.id) == str(task_id) for t in _MOCK_TASK_DB)
        if is_mock_task:
            return [
                a for a in _MOCK_ATTACHMENTS_DB 
                if str(a.get("task_id")) == str(task_id)
            ]

        response = supabase.table("attachments").select("*").eq("task_id", str(task_id)).order("created_at", desc=True).execute()
        return response.data

    def get_attachment(self, attachment_id: UUID) -> Optional[dict]:
        for a in _MOCK_ATTACHMENTS_DB:
            if str(a["id"]) == str(attachment_id):
                return a

        response = supabase.table("attachments").select("*").eq("id", str(attachment_id)).execute()
        if response.data:
            return response.data[0]
        return None

    def delete_attachment(self, attachment_id: UUID) -> bool:
        for i, a in enumerate(_MOCK_ATTACHMENTS_DB):
            if str(a["id"]) == str(attachment_id):
                _MOCK_ATTACHMENTS_DB.pop(i)
                return True

        response = supabase.table("attachments").delete().eq("id", str(attachment_id)).execute()
        return len(response.data) > 0

attachment_repository = AttachmentRepository()


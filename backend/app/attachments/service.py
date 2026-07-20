import time
from typing import List
from uuid import UUID
from fastapi import UploadFile, HTTPException
from app.database.client import supabase
from .repository import attachment_repository
from .schemas import AttachmentCreate, AttachmentResponse

class AttachmentService:
    def get_file_url(self, storage_path: str) -> str:
        # Supabase Python SDK handles public URL generation
        res = supabase.storage.from_("attachments").get_public_url(storage_path)
        return res
        
    def _attach_urls(self, attachments: List[dict]) -> List[AttachmentResponse]:
        results = []
        for att in attachments:
            att['url'] = self.get_file_url(att['storage_path'])
            results.append(AttachmentResponse(**att))
        return results

    def get_project_attachments(self, project_id: UUID) -> List[AttachmentResponse]:
        attachments = attachment_repository.get_attachments_by_project(project_id)
        return self._attach_urls(attachments)

    def get_task_attachments(self, task_id: UUID) -> List[AttachmentResponse]:
        attachments = attachment_repository.get_attachments_by_task(task_id)
        return self._attach_urls(attachments)

    def delete_attachment(self, attachment_id: UUID, user_id: UUID) -> bool:
        att = attachment_repository.get_attachment(attachment_id)
        if not att:
            raise HTTPException(status_code=404, detail="Attachment not found")
        
        # Verify permissions
        from .repository import MOCK_USER_ID
        if att['uploader_id'] != str(user_id):
            if str(user_id) == MOCK_USER_ID:
                pass
            else:
                proj = supabase.table("projects").select("owner_id").eq("id", att['project_id']).execute()
                if not proj.data or proj.data[0]['owner_id'] != str(user_id):
                    raise HTTPException(status_code=403, detail="Not authorized to delete this attachment")
                
        # Remove from storage
        if str(user_id) != MOCK_USER_ID:
            try:
                supabase.storage.from_("attachments").remove([att['storage_path']])
            except Exception as e:
                pass # ignore storage delete errors

        return attachment_repository.delete_attachment(attachment_id)

    async def upload_attachment(
        self,
        project_id: UUID,
        uploader_id: UUID,
        file: UploadFile,
        task_id: UUID = None
    ) -> AttachmentResponse:
        file_bytes = await file.read()
        storage_path = f"{project_id}/{uploader_id}/{file.filename}"
        
        from .repository import MOCK_USER_ID
        if str(uploader_id) != MOCK_USER_ID:
            try:
                supabase.storage.from_("attachments").upload(
                    path=storage_path,
                    file=file_bytes,
                    file_options={"content-type": file.content_type}
                )
            except Exception:
                # File might exist, prepend timestamp
                storage_path = f"{project_id}/{uploader_id}/{int(time.time())}_{file.filename}"
                supabase.storage.from_("attachments").upload(
                    path=storage_path,
                    file=file_bytes,
                    file_options={"content-type": file.content_type}
                )
            
        data = AttachmentCreate(
            project_id=project_id,
            task_id=task_id,
            file_name=file.filename,
            file_size=len(file_bytes),
            content_type=file.content_type,
            storage_path=storage_path
        )
        
        att = attachment_repository.create_attachment(uploader_id, data)
        att['url'] = self.get_file_url(storage_path)
        return AttachmentResponse(**att)

attachment_service = AttachmentService()


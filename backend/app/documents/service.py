import time
from typing import List
from uuid import UUID
from fastapi import UploadFile, HTTPException
from app.database.client import supabase
from .repository import document_repository
from .schemas import DocumentCreate, DocumentResponse

class DocumentService:
    def get_file_url(self, storage_path: str) -> str:
        # Reusing 'attachments' bucket as specified in requirement
        res = supabase.storage.from_("attachments").get_public_url(storage_path)
        return res

    def _attach_urls(self, documents: List[dict]) -> List[DocumentResponse]:
        results = []
        for doc in documents:
            doc['url'] = self.get_file_url(doc['storage_path'])
            results.append(DocumentResponse(**doc))
        return results

    def get_project_documents(self, project_id: UUID) -> List[DocumentResponse]:
        documents = document_repository.get_documents_by_project(project_id)
        return self._attach_urls(documents)

    def get_document_metadata(self, document_id: UUID) -> DocumentResponse:
        doc = document_repository.get_document(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        doc['url'] = self.get_file_url(doc['storage_path'])
        return DocumentResponse(**doc)

    def delete_document(self, document_id: UUID, user_id: UUID) -> bool:
        doc = document_repository.get_document(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        # Verify permissions
        from .repository import MOCK_USER_ID
        if doc['uploader_id'] != str(user_id):
            if str(user_id) == MOCK_USER_ID:
                pass
            else:
                proj = supabase.table("projects").select("owner_id").eq("id", doc['project_id']).execute()
                if not proj.data or proj.data[0]['owner_id'] != str(user_id):
                    raise HTTPException(status_code=403, detail="Not authorized to delete this document")

        # Remove from storage
        if str(user_id) != MOCK_USER_ID:
            try:
                supabase.storage.from_("attachments").remove([doc['storage_path']])
            except Exception:
                pass # ignore storage delete errors

        return document_repository.delete_document(document_id)

    async def upload_document(
        self,
        project_id: UUID,
        uploader_id: UUID,
        file: UploadFile
    ) -> DocumentResponse:
        file_bytes = await file.read()
        # Storing under a 'documents/' prefix in the 'attachments' bucket
        storage_path = f"documents/{project_id}/{uploader_id}/{file.filename}"

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
                storage_path = f"documents/{project_id}/{uploader_id}/{int(time.time())}_{file.filename}"
                supabase.storage.from_("attachments").upload(
                    path=storage_path,
                    file=file_bytes,
                    file_options={"content-type": file.content_type}
                )

        data = DocumentCreate(
            project_id=project_id,
            file_name=file.filename,
            file_size=len(file_bytes),
            content_type=file.content_type,
            storage_path=storage_path
        )

        doc = document_repository.create_document(uploader_id, data)
        doc['url'] = self.get_file_url(storage_path)
        return DocumentResponse(**doc)

document_service = DocumentService()

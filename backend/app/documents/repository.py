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


_MOCK_CHUNKS_DB: List[dict] = []

class DocumentChunkRepository:
    def _is_mock_document(self, document_id: UUID) -> bool:
        return any(str(d["id"]) == str(document_id) for d in _MOCK_DOCUMENTS_DB)

    def delete_chunks_by_document(self, document_id: UUID) -> bool:
        global _MOCK_CHUNKS_DB
        if self._is_mock_document(document_id):
            _MOCK_CHUNKS_DB = [c for c in _MOCK_CHUNKS_DB if str(c["document_id"]) != str(document_id)]
            return True
        
        try:
            response = supabase.table("document_chunks").delete().eq("document_id", str(document_id)).execute()
            return True
        except Exception as e:
            err_msg = str(e)
            if any(term in err_msg for term in ["document_chunks", "42P01", "PGRST205", "PGRST204", "cache"]):
                _MOCK_CHUNKS_DB = [c for c in _MOCK_CHUNKS_DB if str(c["document_id"]) != str(document_id)]
                return True
            raise e

    def create_chunks(self, document_id: UUID, chunks: List[dict]) -> List[dict]:
        self.delete_chunks_by_document(document_id)
        
        is_mock = self._is_mock_document(document_id)
        now = datetime.now(timezone.utc).isoformat()
        
        results = []
        for c in chunks:
            payload = {
                "document_id": str(document_id),
                "chunk_index": c["chunk_index"],
                "page": c["page"],
                "text": c["text"],
                "char_count": c["char_count"],
                "token_estimate": c["token_estimate"]
            }
            if is_mock:
                payload["id"] = str(uuid4())
                payload["created_at"] = now
                _MOCK_CHUNKS_DB.append(payload)
                results.append(payload)
            else:
                results.append(payload)
                
        if is_mock:
            return results
            
        if not results:
            return []
            
        try:
            response = supabase.table("document_chunks").insert(results).execute()
            if response.data:
                return response.data
            raise Exception("Failed to insert document chunks")
        except Exception as e:
            err_msg = str(e)
            if any(term in err_msg for term in ["document_chunks", "42P01", "PGRST205", "PGRST204", "cache"]):
                fallback_results = []
                for res in results:
                    res["id"] = str(uuid4())
                    res["created_at"] = now
                    _MOCK_CHUNKS_DB.append(res)
                    fallback_results.append(res)
                print("\n" + "="*80)
                print("WARNING: 'document_chunks' table does not exist in Supabase database.")
                print("Using in-memory mock fallback to ensure system remains operational.")
                print("To fix this, please run database/document_chunks_schema.sql on your Supabase dashboard.")
                print("="*80 + "\n")
                return fallback_results
            raise e

    def get_chunks_by_document(self, document_id: UUID) -> List[dict]:
        if self._is_mock_document(document_id):
            return [
                c for c in _MOCK_CHUNKS_DB
                if str(c["document_id"]) == str(document_id)
            ]
            
        try:
            response = supabase.table("document_chunks")\
                .select("*")\
                .eq("document_id", str(document_id))\
                .order("chunk_index", desc=False)\
                .execute()
            return response.data
        except Exception as e:
            err_msg = str(e)
            if any(term in err_msg for term in ["document_chunks", "42P01", "PGRST205", "PGRST204", "cache"]):
                return [
                    c for c in _MOCK_CHUNKS_DB
                    if str(c["document_id"]) == str(document_id)
                ]
            raise e

document_chunk_repository = DocumentChunkRepository()


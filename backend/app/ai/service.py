from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime, timezone
from fastapi import HTTPException

from app.database.client import supabase
from .models import DocumentAnalysisResponse

_MOCK_ANALYSIS_DB: List[dict] = []

class AIDocumentService:
    def _is_mock_document(self, document_id: UUID) -> bool:
        from app.documents.repository import _MOCK_DOCUMENTS_DB
        return any(str(d["id"]) == str(document_id) for d in _MOCK_DOCUMENTS_DB)

    def initialize_analysis(self, document_id: UUID) -> dict:
        is_mock = self._is_mock_document(document_id)
        now = datetime.now(timezone.utc).isoformat()
        
        doc_exists = False
        if is_mock:
            doc_exists = True
        else:
            from app.documents.repository import document_repository
            doc = document_repository.get_document(document_id)
            if doc:
                doc_exists = True
                
        if not doc_exists:
            raise HTTPException(status_code=404, detail="Document not found")

        payload = {
            "document_id": str(document_id),
            "status": "Pending",
            "executive_summary": None,
            "objectives": None,
            "deliverables": None,
            "timeline": None,
            "risks": None,
            "error_message": None,
            "updated_at": now
        }

        if is_mock:
            for idx, item in enumerate(_MOCK_ANALYSIS_DB):
                if str(item["document_id"]) == str(document_id):
                    payload["id"] = item["id"]
                    payload["created_at"] = item["created_at"]
                    _MOCK_ANALYSIS_DB[idx] = payload
                    return payload
            payload["id"] = str(uuid4())
            payload["created_at"] = now
            _MOCK_ANALYSIS_DB.append(payload)
            return payload

        try:
            res = supabase.table("document_analysis").select("*").eq("document_id", str(document_id)).execute()
            if res.data:
                payload["id"] = res.data[0]["id"]
                payload["created_at"] = res.data[0]["created_at"]
                update_res = supabase.table("document_analysis").update(payload).eq("document_id", str(document_id)).execute()
                return update_res.data[0]
            else:
                payload["id"] = str(uuid4())
                payload["created_at"] = now
                insert_res = supabase.table("document_analysis").insert(payload).execute()
                return insert_res.data[0]
        except Exception as e:
            err_msg = str(e)
            if any(term in err_msg for term in ["document_analysis", "42P01", "PGRST205", "PGRST204", "cache"]):
                for idx, item in enumerate(_MOCK_ANALYSIS_DB):
                    if str(item["document_id"]) == str(document_id):
                        payload["id"] = item["id"]
                        payload["created_at"] = item["created_at"]
                        _MOCK_ANALYSIS_DB[idx] = payload
                        return payload
                payload["id"] = str(uuid4())
                payload["created_at"] = now
                _MOCK_ANALYSIS_DB.append(payload)
                return payload
            raise e

    def get_analysis(self, document_id: UUID) -> Optional[dict]:
        is_mock = self._is_mock_document(document_id)
        if is_mock:
            for item in _MOCK_ANALYSIS_DB:
                if str(item["document_id"]) == str(document_id):
                    return item
            return None

        try:
            res = supabase.table("document_analysis").select("*").eq("document_id", str(document_id)).execute()
            if res.data:
                return res.data[0]
            return None
        except Exception as e:
            err_msg = str(e)
            if any(term in err_msg for term in ["document_analysis", "42P01", "PGRST205", "PGRST204", "cache"]):
                for item in _MOCK_ANALYSIS_DB:
                    if str(item["document_id"]) == str(document_id):
                        return item
                return None
            raise e

    def update_status(self, document_id: UUID, status: str):
        is_mock = self._is_mock_document(document_id)
        now = datetime.now(timezone.utc).isoformat()
        
        if is_mock:
            for item in _MOCK_ANALYSIS_DB:
                if str(item["document_id"]) == str(document_id):
                    item["status"] = status
                    item["updated_at"] = now
            return

        try:
            supabase.table("document_analysis").update({
                "status": status,
                "updated_at": now
            }).eq("document_id", str(document_id)).execute()
        except Exception as e:
            err_msg = str(e)
            if any(term in err_msg for term in ["document_analysis", "42P01", "PGRST205", "PGRST204", "cache"]):
                for item in _MOCK_ANALYSIS_DB:
                    if str(item["document_id"]) == str(document_id):
                        item["status"] = status
                        item["updated_at"] = now
                return
            raise e

    def save_analysis_result(self, document_id: UUID, status: str, summary_data: dict = None, error_message: str = None):
        is_mock = self._is_mock_document(document_id)
        now = datetime.now(timezone.utc).isoformat()
        
        payload = {
            "status": status,
            "updated_at": now
        }
        if status == "Completed" and summary_data:
            payload["executive_summary"] = summary_data.get("executive_summary")
            payload["objectives"] = summary_data.get("objectives")
            payload["deliverables"] = summary_data.get("deliverables")
            payload["timeline"] = summary_data.get("timeline")
            payload["risks"] = summary_data.get("risks")
            payload["error_message"] = None
        elif status == "Failed":
            payload["error_message"] = error_message
            
        if is_mock:
            for item in _MOCK_ANALYSIS_DB:
                if str(item["document_id"]) == str(document_id):
                    item.update(payload)
            return

        try:
            supabase.table("document_analysis").update(payload).eq("document_id", str(document_id)).execute()
        except Exception as e:
            err_msg = str(e)
            if any(term in err_msg for term in ["document_analysis", "42P01", "PGRST205", "PGRST204", "cache"]):
                for item in _MOCK_ANALYSIS_DB:
                    if str(item["document_id"]) == str(document_id):
                        item.update(payload)
                return
            raise e

    async def run_analysis(self, document_id: UUID):
        self.update_status(document_id, "Analyzing")
        
        try:
            from app.documents.repository import document_chunk_repository
            chunks = document_chunk_repository.get_chunks_by_document(document_id)
            if not chunks:
                from app.documents.service import document_service
                from app.documents.schemas import ChunkConfiguration
                await document_service.chunk_document(document_id, ChunkConfiguration())
                chunks = document_chunk_repository.get_chunks_by_document(document_id)
                
            if not chunks:
                raise ValueError("Document has no text content to analyze")
                
            combined_text = "\n\n".join([c["text"] for c in chunks])
            
            from .summarizer import document_summarizer
            summary_data = document_summarizer.summarize_content(combined_text)
            
            self.save_analysis_result(document_id, "Completed", summary_data)
        except Exception as e:
            self.save_analysis_result(document_id, "Failed", error_message=str(e))

ai_document_service = AIDocumentService()

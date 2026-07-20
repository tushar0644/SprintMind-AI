from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone
from app.database.client import supabase

# In-memory mock stores for unit tests
_MOCK_CONVERSATIONS: List[Dict[str, Any]] = []
_MOCK_MESSAGES: List[Dict[str, Any]] = []
_MOCK_LOGS: List[Dict[str, Any]] = []
_MOCK_JOBS: List[Dict[str, Any]] = []

class AIRepository:
    def _is_mock_user(self, user_id: UUID) -> bool:
        return str(user_id) == "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"

    # --- Conversations Repository ---

    def create_conversation(
        self, user_id: UUID, project_id: UUID, title: str, tool_type: str, payload: dict
    ) -> Dict[str, Any]:
        user_id = UUID(str(user_id))
        project_id = UUID(str(project_id))
        
        if self._is_mock_user(user_id):
            conv = {
                "id": str(uuid4()),
                "user_id": str(user_id),
                "project_id": str(project_id),
                "title": title,
                "tool_type": tool_type,
                "payload": payload,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            _MOCK_CONVERSATIONS.append(conv)
            return conv

        res = supabase.table("ai_conversations").insert({
            "user_id": str(user_id),
            "project_id": str(project_id),
            "title": title,
            "tool_type": tool_type,
            "payload": payload
        }).execute()
        
        if not res.data:
            raise ValueError("Failed to create conversation in database.")
        return res.data[0]

    def get_conversations(self, user_id: UUID, project_id: Optional[UUID] = None) -> List[Dict[str, Any]]:
        user_id = UUID(str(user_id))
        if self._is_mock_user(user_id):
            convs = [c for c in _MOCK_CONVERSATIONS if c["user_id"] == str(user_id)]
            if project_id:
                convs = [c for c in convs if c["project_id"] == str(project_id)]
            return sorted(convs, key=lambda x: x["created_at"], reverse=True)

        query = supabase.table("ai_conversations").select("*").eq("user_id", str(user_id))
        if project_id:
            query = query.eq("project_id", str(project_id))
        res = query.order("created_at", desc=True).execute()
        return res.data or []

    def get_conversation(self, conversation_id: UUID, user_id: UUID) -> Optional[Dict[str, Any]]:
        user_id = UUID(str(user_id))
        conversation_id = UUID(str(conversation_id))
        
        if self._is_mock_user(user_id):
            for c in _MOCK_CONVERSATIONS:
                if c["id"] == str(conversation_id) and c["user_id"] == str(user_id):
                    return c
            return None

        res = supabase.table("ai_conversations").select("*").eq("id", str(conversation_id)).eq("user_id", str(user_id)).execute()
        if not res.data:
            return None
        return res.data[0]

    def delete_conversation(self, conversation_id: UUID, user_id: UUID) -> bool:
        user_id = UUID(str(user_id))
        conversation_id = UUID(str(conversation_id))
        
        if self._is_mock_user(user_id):
            global _MOCK_CONVERSATIONS, _MOCK_MESSAGES
            # cascade simulation
            initial_count = len(_MOCK_CONVERSATIONS)
            _MOCK_CONVERSATIONS = [c for c in _MOCK_CONVERSATIONS if not (c["id"] == str(conversation_id) and c["user_id"] == str(user_id))]
            _MOCK_MESSAGES = [m for m in _MOCK_MESSAGES if m["conversation_id"] != str(conversation_id)]
            return len(_MOCK_CONVERSATIONS) < initial_count

        res = supabase.table("ai_conversations").delete().eq("id", str(conversation_id)).eq("user_id", str(user_id)).execute()
        return len(res.data) > 0

    # --- Messages Repository ---

    def create_message(self, conversation_id: UUID, role: str, content: str) -> Dict[str, Any]:
        conversation_id = UUID(str(conversation_id))
        
        # Check if conversation is in mock store first
        is_mock = False
        for c in _MOCK_CONVERSATIONS:
            if c["id"] == str(conversation_id):
                is_mock = True
                break
                
        if is_mock:
            msg = {
                "id": str(uuid4()),
                "conversation_id": str(conversation_id),
                "role": role,
                "content": content,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            _MOCK_MESSAGES.append(msg)
            return msg

        res = supabase.table("ai_messages").insert({
            "conversation_id": str(conversation_id),
            "role": role,
            "content": content
        }).execute()
        
        if not res.data:
            raise ValueError("Failed to create message in database.")
        return res.data[0]

    def get_messages(self, conversation_id: UUID, user_id: UUID) -> List[Dict[str, Any]]:
        user_id = UUID(str(user_id))
        conversation_id = UUID(str(conversation_id))
        
        # Verify ownership
        conv = self.get_conversation(conversation_id, user_id)
        if not conv:
            return []

        if self._is_mock_user(user_id):
            msgs = [m for m in _MOCK_MESSAGES if m["conversation_id"] == str(conversation_id)]
            return sorted(msgs, key=lambda x: x["created_at"])

        res = supabase.table("ai_messages").select("*").eq("conversation_id", str(conversation_id)).order("created_at").execute()
        return res.data or []

    # --- Logs Repository ---

    def create_log(
        self, user_id: UUID, feature: str, latency_ms: int, token_usage: int, error_occurred: bool
    ) -> Dict[str, Any]:
        user_id = UUID(str(user_id))
        if self._is_mock_user(user_id):
            log = {
                "id": str(uuid4()),
                "user_id": str(user_id),
                "feature": feature,
                "latency_ms": latency_ms,
                "token_usage": token_usage,
                "error_occurred": error_occurred,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            _MOCK_LOGS.append(log)
            return log

        res = supabase.table("ai_logs").insert({
            "user_id": str(user_id),
            "feature": feature,
            "latency_ms": latency_ms,
            "token_usage": token_usage,
            "error_occurred": error_occurred
        }).execute()
        
        if not res.data:
            raise ValueError("Failed to write log in database.")
        return res.data[0]

    def get_analytics(self, user_id: UUID) -> Dict[str, Any]:
        user_id = UUID(str(user_id))
        
        if self._is_mock_user(user_id):
            logs = [l for l in _MOCK_LOGS if l["user_id"] == str(user_id)]
        else:
            res = supabase.table("ai_logs").select("*").eq("user_id", str(user_id)).execute()
            logs = res.data or []

        total_requests = len(logs)
        if total_requests == 0:
            return {
                "total_requests": 0,
                "total_tokens": 0,
                "average_latency_ms": 0,
                "success_rate": 100.0,
                "feature_distribution": {},
                "latency_by_feature": {},
                "tokens_by_feature": {}
            }

        total_tokens = sum(l["token_usage"] for l in logs)
        avg_latency = sum(l["latency_ms"] for l in logs) / total_requests
        successful_requests = sum(1 for l in logs if not l["error_occurred"])
        success_rate = (successful_requests / total_requests) * 100.0

        # Group by feature
        feature_dist: Dict[str, int] = {}
        feature_latency: Dict[str, List[int]] = {}
        feature_tokens: Dict[str, int] = {}

        for l in logs:
            feat = l["feature"]
            feature_dist[feat] = feature_dist.get(feat, 0) + 1
            feature_tokens[feat] = feature_tokens.get(feat, 0) + l["token_usage"]
            if feat not in feature_latency:
                feature_latency[feat] = []
            feature_latency[feat].append(l["latency_ms"])

        avg_latency_by_feature = {
            feat: sum(lats) / len(lats) for feat, lats in feature_latency.items()
        }

        return {
            "total_requests": total_requests,
            "total_tokens": total_tokens,
            "average_latency_ms": round(avg_latency, 1),
            "success_rate": round(success_rate, 1),
            "feature_distribution": feature_dist,
            "latency_by_feature": avg_latency_by_feature,
            "tokens_by_feature": feature_tokens
        }

    # --- Background Jobs Repository ---

    def create_job(
        self, user_id: UUID, project_id: Optional[UUID], job_type: str, payload: dict
    ) -> Dict[str, Any]:
        user_id = UUID(str(user_id))
        proj_id_str = str(project_id) if project_id else None
        
        if self._is_mock_user(user_id):
            job = {
                "id": str(uuid4()),
                "user_id": str(user_id),
                "project_id": proj_id_str,
                "job_type": job_type,
                "status": "pending",
                "payload": payload,
                "result": None,
                "error": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            _MOCK_JOBS.append(job)
            return job

        res = supabase.table("background_jobs").insert({
            "user_id": str(user_id),
            "project_id": proj_id_str,
            "job_type": job_type,
            "status": "pending",
            "payload": payload
        }).execute()
        
        if not res.data:
            raise ValueError("Failed to create background job in database.")
        return res.data[0]

    def update_job_status(
        self, job_id: UUID, status: str, result: Optional[dict] = None, error: Optional[str] = None
    ) -> Dict[str, Any]:
        job_id = UUID(str(job_id))
        
        # Check mock jobs first
        is_mock = False
        for j in _MOCK_JOBS:
            if j["id"] == str(job_id):
                is_mock = True
                j["status"] = status
                j["result"] = result
                j["error"] = error
                j["updated_at"] = datetime.now(timezone.utc).isoformat()
                return j

        update_payload = {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if result is not None:
            update_payload["result"] = result
        if error is not None:
            update_payload["error"] = error

        res = supabase.table("background_jobs").update(update_payload).eq("id", str(job_id)).execute()
        if not res.data:
            raise ValueError("Failed to update background job status.")
        return res.data[0]

    def get_job(self, job_id: UUID, user_id: UUID) -> Optional[Dict[str, Any]]:
        user_id = UUID(str(user_id))
        job_id = UUID(str(job_id))
        
        if self._is_mock_user(user_id):
            for j in _MOCK_JOBS:
                if j["id"] == str(job_id) and j["user_id"] == str(user_id):
                    return j
            return None

        res = supabase.table("background_jobs").select("*").eq("id", str(job_id)).eq("user_id", str(user_id)).execute()
        if not res.data:
            return None
        return res.data[0]

    def get_jobs(self, user_id: UUID) -> List[Dict[str, Any]]:
        user_id = UUID(str(user_id))
        if self._is_mock_user(user_id):
            jobs = [j for j in _MOCK_JOBS if j["user_id"] == str(user_id)]
            return sorted(jobs, key=lambda x: x["created_at"], reverse=True)

        res = supabase.table("background_jobs").select("*").eq("user_id", str(user_id)).order("created_at", desc=True).execute()
        return res.data or []

_repository_instance = AIRepository()

def get_ai_repository() -> AIRepository:
    return _repository_instance


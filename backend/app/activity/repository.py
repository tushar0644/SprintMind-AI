from typing import List, Optional, Tuple, Dict
from uuid import UUID, uuid4
from datetime import datetime, timezone
from app.database.client import supabase, verify_supabase_connection
from app.activity.schemas import ActivityLogResponse

_MOCK_ACTIVITIES_DB: List[Dict] = []
MOCK_USER_ID = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"

class ActivityLogRepository:
    def _use_mock(self, project_id: Optional[UUID] = None, user_id: Optional[UUID] = None) -> bool:
        if not verify_supabase_connection():
            return True
        if user_id and str(user_id) == MOCK_USER_ID:
            return True
        if project_id:
            from app.projects.repository import _MOCK_DB
            if any(p["id"] == str(project_id) for p in _MOCK_DB):
                return True
        return False

    def create(
        self,
        project_id: UUID,
        user_id: Optional[UUID],
        action: str,
        entity_type: str,
        entity_id: Optional[UUID] = None,
        details: Optional[dict] = None
    ) -> ActivityLogResponse:
        project_id_str = str(project_id)
        user_id_str = str(user_id) if user_id else None
        entity_id_str = str(entity_id) if entity_id else None
        
        # Determine if we are mocking based on test env
        is_mock = self._use_mock(project_id=project_id, user_id=user_id)
        
        if is_mock:
            now = datetime.now(timezone.utc)
            new_log = {
                "id": str(uuid4()),
                "project_id": project_id_str,
                "user_id": user_id_str,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id_str,
                "details": details or {},
                "created_at": now,
                "user_display_name": "Mock User" if user_id_str else "System"
            }
            _MOCK_ACTIVITIES_DB.append(new_log)
            return self._build_mock_response(new_log)
            
        # Live Database Insert
        res = supabase.table("activity_logs").insert({
            "project_id": project_id_str,
            "user_id": user_id_str,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id_str,
            "details": details or {}
        }).execute()
        
        if not res.data:
            raise ValueError("Failed to log activity.")
            
        user_name = "System"
        if user_id_str:
            profile_res = supabase.table("user_profiles").select("display_name").eq("id", user_id_str).execute()
            if profile_res.data:
                user_name = profile_res.data[0].get("display_name", "User")
                
        return self._build_db_response(res.data[0], user_name)

    def list_for_project(
        self,
        project_id: Optional[UUID],
        page: int = 1,
        limit: int = 20,
        owner_id: Optional[UUID] = None
    ) -> Tuple[List[ActivityLogResponse], int]:
        project_id_str = str(project_id) if project_id else None
        owner_id_str = str(owner_id) if owner_id else None
        
        from app.projects.repository import _MOCK_DB
        is_mock = self._use_mock(project_id=project_id, user_id=owner_id)
        
        if is_mock:
            if project_id_str:
                filtered = [a for a in _MOCK_ACTIVITIES_DB if a["project_id"] == project_id_str]
            else:
                my_proj_ids = [p["id"] for p in _MOCK_DB if p["owner_id"] == owner_id_str]
                filtered = [a for a in _MOCK_ACTIVITIES_DB if a["project_id"] in my_proj_ids]
                
            filtered = sorted(filtered, key=lambda x: x["created_at"], reverse=True)
            total = len(filtered)
            
            start = (page - 1) * limit
            end = start + limit
            paginated = filtered[start:end]
            
            return [self._build_mock_response(a) for a in paginated], total
            
        try:
            if owner_id_str:
                my_projects_res = supabase.table("projects").select("id").eq("owner_id", owner_id_str).execute()
                allowed_project_ids = [p["id"] for p in my_projects_res.data]
            else:
                allowed_project_ids = []
                
            if project_id_str:
                if owner_id_str and project_id_str not in allowed_project_ids:
                    return [], 0
                filter_project_ids = [project_id_str]
            else:
                filter_project_ids = allowed_project_ids
                
            if not filter_project_ids:
                return [], 0
                
            count_res = supabase.table("activity_logs")\
                .select("id", count="exact")\
                .in_("project_id", filter_project_ids)\
                .execute()
            total_count = count_res.count if count_res.count is not None else 0
            
            list_res = supabase.table("activity_logs")\
                .select("*")\
                .in_("project_id", filter_project_ids)\
                .order("created_at", desc=True)\
                .range((page - 1) * limit, page * limit - 1)\
                .execute()
                
            if not list_res.data:
                return [], total_count
                
            user_ids = list(set([a["user_id"] for a in list_res.data if a.get("user_id")]))
            profiles_map = {}
            if user_ids:
                profiles_res = supabase.table("user_profiles").select("id, display_name").in_("id", user_ids).execute()
                profiles_map = {p["id"]: p["display_name"] for p in profiles_res.data}
                
            results = [
                self._build_db_response(a, profiles_map.get(a.get("user_id")))
                for a in list_res.data
            ]
            return results, total_count
        except Exception:
            return [], 0

    def _build_db_response(self, raw: dict, user_name: Optional[str] = None) -> ActivityLogResponse:
        return ActivityLogResponse(
            id=UUID(raw["id"]),
            project_id=UUID(raw["project_id"]),
            user_id=UUID(raw["user_id"]) if raw.get("user_id") else None,
            action=raw["action"],
            entity_type=raw["entity_type"],
            entity_id=UUID(raw["entity_id"]) if raw.get("entity_id") else None,
            details=raw.get("details") or {},
            created_at=datetime.fromisoformat(raw["created_at"].replace("Z", "+00:00")),
            user_display_name=user_name or "System"
        )

    def _build_mock_response(self, raw: dict) -> ActivityLogResponse:
        created_val = raw["created_at"]
        return ActivityLogResponse(
            id=UUID(raw["id"]),
            project_id=UUID(raw["project_id"]),
            user_id=UUID(raw["user_id"]) if raw.get("user_id") else None,
            action=raw["action"],
            entity_type=raw["entity_type"],
            entity_id=UUID(raw["entity_id"]) if raw.get("entity_id") else None,
            details=raw.get("details") or {},
            created_at=created_val if isinstance(created_val, datetime) else datetime.fromisoformat(created_val),
            user_display_name=raw.get("user_display_name") or "System"
        )

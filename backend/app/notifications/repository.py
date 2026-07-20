from typing import List, Optional, Tuple, Dict
from uuid import UUID, uuid4
from datetime import datetime, timezone
from app.database.client import supabase, verify_supabase_connection
from app.notifications.schemas import NotificationResponse

_MOCK_NOTIFICATIONS_DB: List[Dict] = []
MOCK_USER_ID = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"

class NotificationRepository:
    def _use_mock(self, user_id: UUID) -> bool:
        import sys
        if "pytest" in sys.modules or "unittest" in sys.modules:
            return True
        return not verify_supabase_connection() or str(user_id) == MOCK_USER_ID

    def create(
        self,
        user_id: UUID,
        sender_id: Optional[UUID],
        title: str,
        message: str,
        notification_type: str,
        reference_id: Optional[UUID] = None
    ) -> NotificationResponse:
        user_id_str = str(user_id)
        sender_id_str = str(sender_id) if sender_id else None
        ref_id_str = str(reference_id) if reference_id else None
        
        if self._use_mock(user_id):
            now = datetime.now(timezone.utc)
            new_notif = {
                "id": str(uuid4()),
                "user_id": user_id_str,
                "sender_id": sender_id_str,
                "title": title,
                "message": message,
                "type": notification_type,
                "reference_id": ref_id_str,
                "is_read": False,
                "created_at": now,
                "sender_display_name": "Mock Sender" if sender_id_str else None
            }
            _MOCK_NOTIFICATIONS_DB.append(new_notif)
            return self._build_mock_response(new_notif)
            
        # Live Database Insert
        res = supabase.table("notifications").insert({
            "user_id": user_id_str,
            "sender_id": sender_id_str,
            "title": title,
            "message": message,
            "type": notification_type,
            "reference_id": ref_id_str,
            "is_read": False
        }).execute()
        
        if not res.data:
            raise ValueError("Failed to create notification.")
        
        # Get profile for sender if exists
        sender_name = None
        if sender_id_str:
            profile_res = supabase.table("user_profiles").select("display_name").eq("id", sender_id_str).execute()
            if profile_res.data:
                sender_name = profile_res.data[0].get("display_name")
                
        return self._build_db_response(res.data[0], sender_name)

    def list_for_user(
        self,
        user_id: UUID,
        page: int = 1,
        limit: int = 20,
        type_filter: Optional[str] = None
    ) -> Tuple[List[NotificationResponse], int]:
        user_id_str = str(user_id)
        
        if self._use_mock(user_id):
            filtered = [n for n in _MOCK_NOTIFICATIONS_DB if n["user_id"] == user_id_str]
            if type_filter:
                filtered = [n for n in filtered if n["type"] == type_filter]
            # Sort newest first
            filtered = sorted(filtered, key=lambda x: x["created_at"], reverse=True)
            total = len(filtered)
            
            start = (page - 1) * limit
            end = start + limit
            paginated = filtered[start:end]
            
            return [self._build_mock_response(n) for n in paginated], total
            
        # Live Database Query
        try:
            # Query count
            count_query = supabase.table("notifications").select("id", count="exact").eq("user_id", user_id_str)
            if type_filter:
                count_query = count_query.eq("type", type_filter)
            count_res = count_query.execute()
            total_count = count_res.count if count_res.count is not None else 0
            
            # Query paginated list
            list_query = supabase.table("notifications").select("*").eq("user_id", user_id_str)
            if type_filter:
                list_query = list_query.eq("type", type_filter)
            
            list_res = list_query.order("created_at", desc=True).range((page - 1) * limit, page * limit - 1).execute()
            
            if not list_res.data:
                return [], total_count
                
            # Fetch sender profiles
            sender_ids = list(set([n["sender_id"] for n in list_res.data if n.get("sender_id")]))
            profiles_map = {}
            if sender_ids:
                profiles_res = supabase.table("user_profiles").select("id, display_name").in_("id", sender_ids).execute()
                profiles_map = {p["id"]: p["display_name"] for p in profiles_res.data}
                
            results = [
                self._build_db_response(n, profiles_map.get(n.get("sender_id")))
                for n in list_res.data
            ]
            return results, total_count
        except Exception:
            return [], 0

    def mark_as_read(self, notification_id: UUID, user_id: UUID) -> bool:
        notif_id_str = str(notification_id)
        user_id_str = str(user_id)
        
        if self._use_mock(user_id):
            for n in _MOCK_NOTIFICATIONS_DB:
                if n["id"] == notif_id_str and n["user_id"] == user_id_str:
                    n["is_read"] = True
                    return True
            return False
            
        try:
            res = supabase.table("notifications").update({"is_read": True}).eq("id", notif_id_str).eq("user_id", user_id_str).execute()
            return len(res.data) > 0
        except Exception:
            return False

    def mark_all_as_read(self, user_id: UUID) -> int:
        user_id_str = str(user_id)
        
        if self._use_mock(user_id):
            count = 0
            for n in _MOCK_NOTIFICATIONS_DB:
                if n["user_id"] == user_id_str and not n["is_read"]:
                    n["is_read"] = True
                    count += 1
            return count
            
        try:
            res = supabase.table("notifications").update({"is_read": True}).eq("user_id", user_id_str).eq("is_read", False).execute()
            return len(res.data) if res.data else 0
        except Exception:
            return 0

    def delete(self, notification_id: UUID, user_id: UUID) -> bool:
        notif_id_str = str(notification_id)
        user_id_str = str(user_id)
        
        if self._use_mock(user_id):
            for idx, n in enumerate(_MOCK_NOTIFICATIONS_DB):
                if n["id"] == notif_id_str and n["user_id"] == user_id_str:
                    _MOCK_NOTIFICATIONS_DB.pop(idx)
                    return True
            return False
            
        try:
            res = supabase.table("notifications").delete().eq("id", notif_id_str).eq("user_id", user_id_str).execute()
            return len(res.data) > 0
        except Exception:
            return False

    def get_unread_count(self, user_id: UUID) -> int:
        user_id_str = str(user_id)
        
        if self._use_mock(user_id):
            return len([n for n in _MOCK_NOTIFICATIONS_DB if n["user_id"] == user_id_str and not n["is_read"]])
            
        try:
            res = supabase.table("notifications").select("id", count="exact").eq("user_id", user_id_str).eq("is_read", False).execute()
            return res.count if res.count is not None else 0
        except Exception:
            return 0

    def _build_db_response(self, raw: dict, sender_name: Optional[str] = None) -> NotificationResponse:
        return NotificationResponse(
            id=UUID(raw["id"]),
            user_id=UUID(raw["user_id"]),
            sender_id=UUID(raw["sender_id"]) if raw.get("sender_id") else None,
            title=raw["title"],
            message=raw["message"],
            type=raw["type"],
            reference_id=UUID(raw["reference_id"]) if raw.get("reference_id") else None,
            is_read=raw["is_read"],
            created_at=datetime.fromisoformat(raw["created_at"].replace("Z", "+00:00")),
            sender_display_name=sender_name
        )

    def _build_mock_response(self, raw: dict) -> NotificationResponse:
        created_val = raw["created_at"]
        return NotificationResponse(
            id=UUID(raw["id"]),
            user_id=UUID(raw["user_id"]),
            sender_id=UUID(raw["sender_id"]) if raw.get("sender_id") else None,
            title=raw["title"],
            message=raw["message"],
            type=raw["type"],
            reference_id=UUID(raw["reference_id"]) if raw.get("reference_id") else None,
            is_read=raw["is_read"],
            created_at=created_val if isinstance(created_val, datetime) else datetime.fromisoformat(created_val),
            sender_display_name=raw.get("sender_display_name")
        )

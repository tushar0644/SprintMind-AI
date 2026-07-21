from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone

from app.database.client import supabase

MOCK_USER_ID = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"

# In-memory fallback store, used exclusively for mock/test users.
_MOCK_DASHBOARD_DB: List[Dict[str, Any]] = []


class DashboardRepository:
    def _is_mock_user(self, owner_id: UUID) -> bool:
        return str(owner_id) == MOCK_USER_ID

    def get_latest_snapshot(self, project_id: UUID, owner_id: UUID) -> Optional[Dict[str, Any]]:
        project_id = UUID(str(project_id))
        owner_id = UUID(str(owner_id))

        if self._is_mock_user(owner_id):
            matches = [s for s in _MOCK_DASHBOARD_DB if s["project_id"] == str(project_id)]
            if matches:
                return sorted(matches, key=lambda x: x.get("created_at", ""), reverse=True)[0]
            return None

        res = (
            supabase.table("project_dashboard_snapshots")
            .select("*")
            .eq("project_id", str(project_id))
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None

    def save_snapshot(
        self,
        project_id: UUID,
        owner_id: UUID,
        health_score: float,
        status: str,
        risk_count: int,
        velocity: float,
        completion: float,
    ) -> Dict[str, Any]:
        project_id = UUID(str(project_id))
        owner_id = UUID(str(owner_id))
        now = datetime.now(timezone.utc).isoformat()

        payload = {
            "id": str(uuid4()),
            "project_id": str(project_id),
            "owner_id": str(owner_id),
            "health_score": float(health_score),
            "status": status,
            "risk_count": risk_count,
            "velocity": float(velocity),
            "completion": float(completion),
            "created_at": now,
            "updated_at": now,
        }

        if self._is_mock_user(owner_id):
            _MOCK_DASHBOARD_DB[:] = [s for s in _MOCK_DASHBOARD_DB if s["project_id"] != str(project_id)]
            _MOCK_DASHBOARD_DB.append(payload)
            return payload

        res = supabase.table("project_dashboard_snapshots").insert(payload).execute()
        if res.data:
            return res.data[0]
        raise Exception("Failed to insert dashboard snapshot")

    def clear(self) -> None:
        _MOCK_DASHBOARD_DB.clear()


dashboard_repository = DashboardRepository()

from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone

from app.database.client import supabase

MOCK_USER_ID = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"

# In-memory fallback store, used exclusively for mock/test users.
_MOCK_ESTIMATION_DB: List[Dict[str, Any]] = []


class EstimationRepository:
    def _is_mock_user(self, owner_id: UUID) -> bool:
        return str(owner_id) == MOCK_USER_ID

    def get_by_project(self, project_id: UUID, owner_id: UUID) -> Optional[Dict[str, Any]]:
        project_id = UUID(str(project_id))
        owner_id = UUID(str(owner_id))

        if self._is_mock_user(owner_id):
            matches = [e for e in _MOCK_ESTIMATION_DB if e["project_id"] == str(project_id)]
            if matches:
                # Return most recently updated/created estimation
                return sorted(matches, key=lambda x: x.get("created_at", ""), reverse=True)[0]
            return None

        res = (
            supabase.table("project_estimations")
            .select("*")
            .eq("project_id", str(project_id))
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None

    def create_or_update(
        self,
        project_id: UUID,
        owner_id: UUID,
        estimated_start_date: datetime,
        estimated_end_date: datetime,
        estimated_duration_days: int,
        average_velocity: float,
        confidence: float,
    ) -> Dict[str, Any]:
        project_id = UUID(str(project_id))
        owner_id = UUID(str(owner_id))
        now = datetime.now(timezone.utc).isoformat()

        start_str = (
            estimated_start_date.isoformat()
            if isinstance(estimated_start_date, datetime)
            else str(estimated_start_date)
        )
        end_str = (
            estimated_end_date.isoformat()
            if isinstance(estimated_end_date, datetime)
            else str(estimated_end_date)
        )

        payload = {
            "id": str(uuid4()),
            "project_id": str(project_id),
            "owner_id": str(owner_id),
            "estimated_start_date": start_str,
            "estimated_end_date": end_str,
            "estimated_duration_days": estimated_duration_days,
            "average_velocity": float(average_velocity),
            "confidence": float(confidence),
            "created_at": now,
            "updated_at": now,
        }

        if self._is_mock_user(owner_id):
            # Replace existing for this project or add new
            _MOCK_ESTIMATION_DB[:] = [e for e in _MOCK_ESTIMATION_DB if e["project_id"] != str(project_id)]
            _MOCK_ESTIMATION_DB.append(payload)
            return payload

        res = supabase.table("project_estimations").insert(payload).execute()
        if res.data:
            return res.data[0]
        raise Exception("Failed to insert estimation record")

    def clear(self) -> None:
        _MOCK_ESTIMATION_DB.clear()


estimation_repository = EstimationRepository()

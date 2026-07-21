from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone

from app.database.client import supabase

MOCK_USER_ID = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"

# In-memory fallback store, mirrors the pattern used for project_epics
# (used for mock/E2E users and transparently when the real "sprints" table
# has not been migrated yet in the connected Supabase project).
_MOCK_SPRINT_DB: List[Dict[str, Any]] = []

MISSING_TABLE_MARKERS = ["sprints", "42P01", "PGRST205", "PGRST204"]


class SprintRepository:
    def _is_mock_user(self, owner_id: UUID) -> bool:
        return str(owner_id) == MOCK_USER_ID

    def get_by_project(self, project_id: UUID, owner_id: UUID) -> List[Dict[str, Any]]:
        project_id = UUID(str(project_id))
        owner_id = UUID(str(owner_id))

        if self._is_mock_user(owner_id):
            rows = [s for s in _MOCK_SPRINT_DB if s["project_id"] == str(project_id)]
            return sorted(rows, key=lambda s: s["sprint_number"])

        try:
            res = (
                supabase.table("sprints")
                .select("*")
                .eq("project_id", str(project_id))
                .order("sprint_number")
                .execute()
            )
            return res.data or []
        except Exception as e:
            if any(term in str(e) for term in MISSING_TABLE_MARKERS):
                rows = [s for s in _MOCK_SPRINT_DB if s["project_id"] == str(project_id)]
                return sorted(rows, key=lambda s: s["sprint_number"])
            raise e

    def clear_by_project(self, project_id: UUID, owner_id: UUID) -> None:
        project_id = UUID(str(project_id))
        owner_id = UUID(str(owner_id))

        _MOCK_SPRINT_DB[:] = [s for s in _MOCK_SPRINT_DB if s["project_id"] != str(project_id)]

        if self._is_mock_user(owner_id):
            return

        try:
            supabase.table("sprints").delete().eq("project_id", str(project_id)).execute()
        except Exception as e:
            if not any(term in str(e) for term in MISSING_TABLE_MARKERS):
                raise e

    def create(
        self,
        project_id: UUID,
        owner_id: UUID,
        sprint_number: int,
        name: str,
        capacity: int,
        total_points: int,
        status: str = "planned",
    ) -> Dict[str, Any]:
        project_id = UUID(str(project_id))
        owner_id = UUID(str(owner_id))
        now = datetime.now(timezone.utc).isoformat()
        payload = {
            "id": str(uuid4()),
            "project_id": str(project_id),
            "owner_id": str(owner_id),
            "sprint_number": sprint_number,
            "name": name,
            "capacity": capacity,
            "total_points": total_points,
            "status": status,
            "created_at": now,
            "updated_at": now,
        }

        if self._is_mock_user(owner_id):
            _MOCK_SPRINT_DB.append(payload)
            return payload

        try:
            res = supabase.table("sprints").insert(payload).execute()
            if res.data:
                return res.data[0]
            raise Exception("Failed to insert sprint")
        except Exception as e:
            if any(term in str(e) for term in MISSING_TABLE_MARKERS):
                _MOCK_SPRINT_DB.append(payload)
                return payload
            raise e


sprint_repository = SprintRepository()

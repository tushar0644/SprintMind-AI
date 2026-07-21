from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone

from app.database.client import supabase

MOCK_USER_ID = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"

# In-memory fallback store, used exclusively for mock/test users.
_MOCK_RISK_DB: List[Dict[str, Any]] = []


class RiskRepository:
    def _is_mock_user(self, owner_id: UUID) -> bool:
        return str(owner_id) == MOCK_USER_ID

    def get_by_project(self, project_id: UUID, owner_id: UUID) -> List[Dict[str, Any]]:
        project_id = UUID(str(project_id))
        owner_id = UUID(str(owner_id))

        if self._is_mock_user(owner_id):
            rows = [r for r in _MOCK_RISK_DB if r["project_id"] == str(project_id)]
            return sorted(rows, key=lambda x: x.get("created_at", ""), reverse=True)

        res = (
            supabase.table("project_risks")
            .select("*")
            .eq("project_id", str(project_id))
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []

    def replace_project_risks(
        self,
        project_id: UUID,
        owner_id: UUID,
        risks: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Replaces stored project risks for a given project with fresh analysis results.
        """
        project_id = UUID(str(project_id))
        owner_id = UUID(str(owner_id))
        now = datetime.now(timezone.utc).isoformat()

        prepared_records = []
        for r in risks:
            prepared_records.append({
                "id": str(uuid4()),
                "project_id": str(project_id),
                "owner_id": str(owner_id),
                "severity": r.get("severity", "medium"),
                "category": r.get("category", "workload"),
                "title": r.get("title", "Detected Risk"),
                "description": r.get("description", ""),
                "affected_sprint": r.get("affected_sprint") or r.get("affectedSprint"),
                "affected_tasks": r.get("affected_tasks") or r.get("affectedTasks") or [],
                "recommendation": r.get("recommendation", ""),
                "confidence": float(r.get("confidence", 0.85)),
                "created_at": now,
                "updated_at": now,
            })

        if self._is_mock_user(owner_id):
            _MOCK_RISK_DB[:] = [r for r in _MOCK_RISK_DB if r["project_id"] != str(project_id)]
            _MOCK_RISK_DB.extend(prepared_records)
            return prepared_records

        # Delete old risks first
        supabase.table("project_risks").delete().eq("project_id", str(project_id)).execute()
        if prepared_records:
            res = supabase.table("project_risks").insert(prepared_records).execute()
            return res.data or prepared_records
        return []

    def clear(self) -> None:
        _MOCK_RISK_DB.clear()


risk_repository = RiskRepository()

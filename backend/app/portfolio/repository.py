from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone

from app.database.client import supabase

MOCK_USER_ID = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"

# In-memory fallback store, used exclusively for mock/test users.
_MOCK_PORTFOLIO_DB: List[Dict[str, Any]] = []


class PortfolioRepository:
    def _is_mock_user(self, owner_id: UUID) -> bool:
        return str(owner_id) == MOCK_USER_ID

    def save_portfolio_snapshot(
        self,
        owner_id: UUID,
        total_projects: int,
        average_health_score: float,
        portfolio_status: str,
        total_risks: int,
    ) -> Dict[str, Any]:
        owner_id = UUID(str(owner_id))
        now = datetime.now(timezone.utc).isoformat()
        payload = {
            "id": str(uuid4()),
            "owner_id": str(owner_id),
            "total_projects": total_projects,
            "average_health_score": float(average_health_score),
            "portfolio_status": portfolio_status,
            "total_risks": total_risks,
            "created_at": now,
        }

        if self._is_mock_user(owner_id):
            _MOCK_PORTFOLIO_DB.append(payload)
            return payload

        res = supabase.table("portfolio_snapshots").insert(payload).execute()
        if res.data:
            return res.data[0]
        raise Exception("Failed to insert portfolio snapshot")


portfolio_repository = PortfolioRepository()

from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone

from app.database.client import supabase
from app.meetings.schemas import MeetingResponse, ActionItemSchema, DecisionSchema, BlockerSchema

MOCK_USER_ID = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"

# In-memory fallback store, used exclusively for mock/test users.
_MOCK_MEETINGS_DB: List[Dict[str, Any]] = []


class MeetingRepository:
    def _is_mock_user(self, owner_id: UUID) -> bool:
        return str(owner_id) == MOCK_USER_ID

    def create_meeting(
        self,
        meeting_data: MeetingResponse,
    ) -> MeetingResponse:
        owner_id = UUID(str(meeting_data.owner_id))
        project_id = UUID(str(meeting_data.project_id))

        payload = meeting_data.model_dump(mode="json")
        payload["id"] = str(meeting_data.id)
        payload["project_id"] = str(project_id)
        payload["owner_id"] = str(owner_id)

        if self._is_mock_user(owner_id):
            _MOCK_MEETINGS_DB.append(payload)
            return meeting_data

        # Live Supabase insert
        db_payload = {
            "id": str(meeting_data.id),
            "project_id": str(project_id),
            "owner_id": str(owner_id),
            "title": meeting_data.title,
            "notes": meeting_data.notes,
            "summary": meeting_data.summary,
            "recommendations": meeting_data.recommendations,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        res = supabase.table("meetings").insert(db_payload).execute()

        # Insert sub-tables if created
        if res.data:
            m_id = res.data[0]["id"]

            if meeting_data.action_items:
                items = [
                    {
                        "id": str(uuid4()),
                        "meeting_id": m_id,
                        "title": ai.title,
                        "assignee": ai.assignee,
                        "due_date": ai.due_date.isoformat() if ai.due_date else None,
                        "priority": ai.priority,
                        "matched_task_id": str(ai.matched_task_id) if ai.matched_task_id else None,
                        "is_suggested_new": ai.is_suggested_new,
                    }
                    for ai in meeting_data.action_items
                ]
                supabase.table("meeting_action_items").insert(items).execute()

            if meeting_data.decisions:
                decs = [
                    {
                        "id": str(uuid4()),
                        "meeting_id": m_id,
                        "decision_text": d.decision_text,
                        "context": d.context,
                    }
                    for d in meeting_data.decisions
                ]
                supabase.table("meeting_decisions").insert(decs).execute()

            if meeting_data.blockers:
                blks = [
                    {
                        "id": str(uuid4()),
                        "meeting_id": m_id,
                        "description": b.description,
                        "affected_task_id": str(b.affected_task_id) if b.affected_task_id else None,
                    }
                    for b in meeting_data.blockers
                ]
                supabase.table("meeting_blockers").insert(blks).execute()

        return meeting_data

    def get_by_project(self, project_id: UUID, owner_id: UUID) -> List[MeetingResponse]:
        project_id = UUID(str(project_id))
        owner_id = UUID(str(owner_id))

        if self._is_mock_user(owner_id):
            matches = [
                m for m in _MOCK_MEETINGS_DB
                if m.get("project_id") == str(project_id) and m.get("owner_id") == str(owner_id)
            ]
            return [MeetingResponse(**m) for m in matches]

        try:
            res = supabase.table("meetings").select("*").eq("project_id", str(project_id)).execute()
            if res.data:
                results: List[MeetingResponse] = []
                for row in res.data:
                    m_id = row["id"]
                    # Fetch action items, decisions, blockers
                    items_res = supabase.table("meeting_action_items").select("*").eq("meeting_id", m_id).execute()
                    decs_res = supabase.table("meeting_decisions").select("*").eq("meeting_id", m_id).execute()
                    blks_res = supabase.table("meeting_blockers").select("*").eq("meeting_id", m_id).execute()

                    action_items = [ActionItemSchema(**item) for item in (items_res.data or [])]
                    decisions = [DecisionSchema(**d) for d in (decs_res.data or [])]
                    blockers = [BlockerSchema(**b) for b in (blks_res.data or [])]

                    m_resp = MeetingResponse(
                        id=UUID(row["id"]),
                        project_id=UUID(row["project_id"]),
                        owner_id=UUID(row["owner_id"]),
                        title=row["title"],
                        notes=row["notes"],
                        summary=row.get("summary") or "",
                        action_items=action_items,
                        decisions=decisions,
                        blockers=blockers,
                        recommendations=row.get("recommendations") or [],
                        created_at=row.get("created_at") or datetime.now(timezone.utc),
                    )
                    results.append(m_resp)
                return results
            return []
        except Exception:
            return []

    def get_by_id(self, meeting_id: UUID, owner_id: UUID) -> Optional[MeetingResponse]:
        meeting_id = UUID(str(meeting_id))
        owner_id = UUID(str(owner_id))

        if self._is_mock_user(owner_id):
            matches = [
                m for m in _MOCK_MEETINGS_DB
                if m.get("id") == str(meeting_id) and m.get("owner_id") == str(owner_id)
            ]
            if matches:
                return MeetingResponse(**matches[0])
            return None

        try:
            res = supabase.table("meetings").select("*").eq("id", str(meeting_id)).execute()
            if res.data:
                row = res.data[0]
                m_id = row["id"]
                items_res = supabase.table("meeting_action_items").select("*").eq("meeting_id", m_id).execute()
                decs_res = supabase.table("meeting_decisions").select("*").eq("meeting_id", m_id).execute()
                blks_res = supabase.table("meeting_blockers").select("*").eq("meeting_id", m_id).execute()

                return MeetingResponse(
                    id=UUID(row["id"]),
                    project_id=UUID(row["project_id"]),
                    owner_id=UUID(row["owner_id"]),
                    title=row["title"],
                    notes=row["notes"],
                    summary=row.get("summary") or "",
                    action_items=[ActionItemSchema(**item) for item in (items_res.data or [])],
                    decisions=[DecisionSchema(**d) for d in (decs_res.data or [])],
                    blockers=[BlockerSchema(**b) for b in (blks_res.data or [])],
                    recommendations=row.get("recommendations") or [],
                    created_at=row.get("created_at") or datetime.now(timezone.utc),
                )
            return None
        except Exception:
            return None


meeting_repository = MeetingRepository()

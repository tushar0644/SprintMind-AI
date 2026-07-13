from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone
from app.database.client import supabase
from app.tasks.schemas import TaskCreate, TaskUpdate, TaskResponse

# In-memory mock database for unit tests and E2E mock token users
_MOCK_TASK_DB = []

MOCK_USER_ID = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"


class TaskRepository:
    def _is_mock_user(self, user_id: UUID) -> bool:
        return str(user_id) == MOCK_USER_ID

    def get_by_id(self, task_id: UUID) -> Optional[TaskResponse]:
        task_id = UUID(str(task_id))
        # Search mock database first
        for t in _MOCK_TASK_DB:
            if t.id == task_id and t.deleted_at is None:
                return t

        # Database query
        try:
            res = supabase.table("tasks").select("*").eq("id", str(task_id)).is_("deleted_at", "null").execute()
            if not res.data:
                return None
            return TaskResponse.model_validate(res.data[0])
        except Exception:
            return None

    def get_all_by_project(self, project_id: UUID, owner_id: UUID) -> List[TaskResponse]:
        project_id = UUID(str(project_id))
        owner_id = UUID(str(owner_id))

        if self._is_mock_user(owner_id):
            return [
                t for t in _MOCK_TASK_DB
                if t.project_id == project_id and t.owner_id == owner_id and t.deleted_at is None
            ]

        try:
            res = (
                supabase.table("tasks")
                .select("*")
                .eq("project_id", str(project_id))
                .eq("owner_id", str(owner_id))
                .is_("deleted_at", "null")
                .order("created_at")
                .execute()
            )
            return [TaskResponse.model_validate(t) for t in res.data]
        except Exception:
            return []

    def get_all_by_owner(self, owner_id: UUID) -> List[TaskResponse]:
        owner_id = UUID(str(owner_id))

        if self._is_mock_user(owner_id):
            return [t for t in _MOCK_TASK_DB if t.owner_id == owner_id and t.deleted_at is None]

        try:
            res = (
                supabase.table("tasks")
                .select("*")
                .eq("owner_id", str(owner_id))
                .is_("deleted_at", "null")
                .order("created_at")
                .execute()
            )
            return [TaskResponse.model_validate(t) for t in res.data]
        except Exception:
            return []

    def create(self, owner_id: UUID, task_data: TaskCreate) -> TaskResponse:
        owner_id = UUID(str(owner_id))
        project_id = UUID(str(task_data.project_id))

        if self._is_mock_user(owner_id):
            # Check project existence in mock database
            from app.projects.repository import _MOCK_DB
            project_exists = any(
                p.id == project_id and p.owner_id == owner_id and p.deleted_at is None
                for p in _MOCK_DB
            )
            if not project_exists:
                raise ValueError("Project not found or access denied.")

            new_task = TaskResponse(
                id=uuid4(),
                project_id=project_id,
                owner_id=owner_id,
                title=task_data.title,
                description=task_data.description,
                status=task_data.status or "todo",
                priority=task_data.priority or "medium",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                deleted_at=None
            )
            _MOCK_TASK_DB.append(new_task)
            return new_task

        # Database verification: Check project existence and ownership
        try:
            proj_res = (
                supabase.table("projects")
                .select("id")
                .eq("id", str(project_id))
                .eq("owner_id", str(owner_id))
                .is_("deleted_at", "null")
                .execute()
            )
            if not proj_res.data:
                raise ValueError("Project not found or access denied.")
        except Exception as e:
            if isinstance(e, ValueError):
                raise e
            raise ValueError("Failed to verify project ownership in database.")

        res = supabase.table("tasks").insert({
            "project_id": str(project_id),
            "owner_id": str(owner_id),
            "title": task_data.title,
            "description": task_data.description,
            "status": task_data.status or "todo",
            "priority": task_data.priority or "medium",
        }).execute()

        if not res.data:
            raise ValueError("Failed to create task in database.")
        return TaskResponse.model_validate(res.data[0])

    def update(self, task_id: UUID, task_data: TaskUpdate) -> Optional[TaskResponse]:
        task_id = UUID(str(task_id))

        # Update in mock database
        for t in _MOCK_TASK_DB:
            if t.id == task_id and t.deleted_at is None:
                if task_data.title is not None:
                    t.title = task_data.title
                if task_data.description is not None:
                    t.description = task_data.description
                if task_data.status is not None:
                    t.status = task_data.status
                if task_data.priority is not None:
                    t.priority = task_data.priority
                t.updated_at = datetime.now(timezone.utc)
                return t

        # Database update
        current = self.get_by_id(task_id)
        if not current:
            return None

        update_payload = {}
        if task_data.title is not None:
            update_payload["title"] = task_data.title
        if task_data.description is not None:
            update_payload["description"] = task_data.description
        if task_data.status is not None:
            update_payload["status"] = task_data.status
        if task_data.priority is not None:
            update_payload["priority"] = task_data.priority
        update_payload["updated_at"] = datetime.now(timezone.utc).isoformat()

        res = supabase.table("tasks").update(update_payload).eq("id", str(task_id)).execute()
        if not res.data:
            return None
        return TaskResponse.model_validate(res.data[0])

    def delete(self, task_id: UUID) -> bool:
        task_id = UUID(str(task_id))

        # Soft-delete in mock database
        for t in _MOCK_TASK_DB:
            if t.id == task_id and t.deleted_at is None:
                t.deleted_at = datetime.now(timezone.utc)
                return True

        # Database soft delete
        try:
            res = supabase.table("tasks").update({
                "deleted_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", str(task_id)).execute()
            return len(res.data) > 0
        except Exception:
            return False

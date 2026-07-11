from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone
from app.database.client import supabase
from app.projects.schemas import ProjectCreate, ProjectUpdate, ProjectResponse

# In-memory mock database for unit tests and E2E mock token users
_MOCK_DB = []

class ProjectRepository:
    def _is_mock_user(self, user_id: UUID) -> bool:
        return str(user_id) == "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"

    def get_by_id(self, project_id: UUID) -> Optional[ProjectResponse]:
        project_id = UUID(str(project_id))
        # Search mock database first
        for p in _MOCK_DB:
            if p.id == project_id and p.deleted_at is None:
                return p

        # Database query
        try:
            res = supabase.table("projects").select("*").eq("id", str(project_id)).is_("deleted_at", "null").execute()
            if not res.data:
                return None
            return ProjectResponse.model_validate(res.data[0])
        except Exception:
            return None

    def get_all_by_owner(self, owner_id: UUID) -> List[ProjectResponse]:
        owner_id = UUID(str(owner_id))
        # If mock user, return mock database values
        if self._is_mock_user(owner_id):
            return [p for p in _MOCK_DB if p.owner_id == owner_id and p.deleted_at is None]

        # Database query
        try:
            res = supabase.table("projects").select("*").eq("owner_id", str(owner_id)).is_("deleted_at", "null").order("created_at").execute()
            return [ProjectResponse.model_validate(p) for p in res.data]
        except Exception:
            return []

    def create(self, owner_id: UUID, project_data: ProjectCreate) -> ProjectResponse:
        owner_id = UUID(str(owner_id))
        # Check if project name is unique for this owner
        if self._is_mock_user(owner_id):
            for p in _MOCK_DB:
                if p.owner_id == owner_id and p.name == project_data.name and p.deleted_at is None:
                    raise ValueError("A project with this name already exists in your workspace.")
            
            new_proj = ProjectResponse(
                id=uuid4(),
                owner_id=owner_id,
                name=project_data.name,
                description=project_data.description,
                status=project_data.status or "active",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                deleted_at=None
            )
            _MOCK_DB.append(new_proj)
            return new_proj

        # Check unique constraint in database
        existing = supabase.table("projects").select("id").eq("owner_id", str(owner_id)).eq("name", project_data.name).is_("deleted_at", "null").execute()
        if existing.data:
            raise ValueError("A project with this name already exists in your workspace.")

        res = supabase.table("projects").insert({
            "owner_id": str(owner_id),
            "name": project_data.name,
            "description": project_data.description,
            "status": project_data.status or "active"
        }).execute()
        if not res.data:
            raise ValueError("Failed to create project in database.")
        return ProjectResponse.model_validate(res.data[0])

    def update(self, project_id: UUID, project_data: ProjectUpdate) -> Optional[ProjectResponse]:
        project_id = UUID(str(project_id))
        # Search mock database
        for p in _MOCK_DB:
            if p.id == project_id and p.deleted_at is None:
                if project_data.name and project_data.name != p.name:
                    for op in _MOCK_DB:
                        if op.owner_id == p.owner_id and op.name == project_data.name and op.deleted_at is None:
                            raise ValueError("A project with this name already exists in your workspace.")
                
                if project_data.name is not None:
                    p.name = project_data.name
                if project_data.description is not None:
                    p.description = project_data.description
                if project_data.status is not None:
                    p.status = project_data.status
                p.updated_at = datetime.now(timezone.utc)
                return p

        # Database update
        current = self.get_by_id(project_id)
        if not current:
            return None

        if project_data.name and project_data.name != current.name:
            existing = supabase.table("projects").select("id").eq("owner_id", str(current.owner_id)).eq("name", project_data.name).is_("deleted_at", "null").execute()
            if existing.data:
                raise ValueError("A project with this name already exists in your workspace.")

        update_data = {}
        if project_data.name is not None:
            update_data["name"] = project_data.name
        if project_data.description is not None:
            update_data["description"] = project_data.description
        if project_data.status is not None:
            update_data["status"] = project_data.status
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        res = supabase.table("projects").update(update_data).eq("id", str(project_id)).execute()
        if not res.data:
            return None
        return ProjectResponse.model_validate(res.data[0])

    def delete(self, project_id: UUID) -> bool:
        project_id = UUID(str(project_id))
        # Check mock database
        for p in _MOCK_DB:
            if p.id == project_id and p.deleted_at is None:
                p.deleted_at = datetime.now(timezone.utc)
                return True

        # Database soft delete
        try:
            res = supabase.table("projects").update({
                "deleted_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", str(project_id)).execute()
            return len(res.data) > 0
        except Exception:
            return False

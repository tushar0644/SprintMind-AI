from typing import List, Optional
from uuid import UUID
from app.projects.schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from app.projects.repository import ProjectRepository

from app.activity.service import ActivityLogService

class ProjectService:
    def __init__(self, repository: ProjectRepository, activity_service: ActivityLogService):
        self.repository = repository
        self.activity_service = activity_service

    def get_project(self, project_id: UUID) -> Optional[ProjectResponse]:
        """
        Fetch a project by its unique ID.
        """
        return self.repository.get_by_id(project_id)

    def get_owner_projects(self, owner_id: UUID) -> List[ProjectResponse]:
        """
        Fetch all projects owned by a user.
        """
        return self.repository.get_all_by_owner(owner_id)

    def create_project(self, owner_id: UUID, project_data: ProjectCreate) -> ProjectResponse:
        """
        Validate and create a new project.
        """
        project = self.repository.create(owner_id, project_data)
        self.activity_service.create_activity(
            project_id=project.id,
            user_id=owner_id,
            action="project_created",
            entity_type="project",
            entity_id=project.id,
            details={"name": project.name}
        )
        return project

    def update_project(self, project_id: UUID, project_data: ProjectUpdate) -> Optional[ProjectResponse]:
        """
        Validate and update an existing project.
        """
        return self.repository.update(project_id, project_data)

    def delete_project(self, project_id: UUID) -> bool:
        """
        Remove a project by ID.
        """
        return self.repository.delete(project_id)

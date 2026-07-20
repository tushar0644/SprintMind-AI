from fastapi import Depends
from app.projects.repository import ProjectRepository
from app.projects.service import ProjectService

from app.activity.dependencies import get_activity_log_service
from app.activity.service import ActivityLogService

def get_project_repository() -> ProjectRepository:
    """
    Dependency provider for the project repository instance.
    """
    return ProjectRepository()

def get_project_service(
    repository: ProjectRepository = Depends(get_project_repository),
    activity_service: ActivityLogService = Depends(get_activity_log_service)
) -> ProjectService:
    """
    Dependency provider for the project service instance.
    """
    return ProjectService(repository, activity_service)

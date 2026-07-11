from fastapi import Depends
from app.projects.repository import ProjectRepository
from app.projects.service import ProjectService

def get_project_repository() -> ProjectRepository:
    """
    Dependency provider for the project repository instance.
    """
    return ProjectRepository()

def get_project_service(
    repository: ProjectRepository = Depends(get_project_repository)
) -> ProjectService:
    """
    Dependency provider for the project service instance.
    """
    return ProjectService(repository)

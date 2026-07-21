from fastapi import Depends

from app.sprints.repository import SprintRepository
from app.sprints.service import SprintPlanner
from app.projects.dependencies import get_project_repository
from app.projects.repository import ProjectRepository
from app.tasks.dependencies import get_task_repository
from app.tasks.repository import TaskRepository


def get_sprint_repository() -> SprintRepository:
    """
    Dependency provider for the sprint repository instance.
    """
    return SprintRepository()


def get_sprint_planner(
    sprint_repository: SprintRepository = Depends(get_sprint_repository),
    task_repository: TaskRepository = Depends(get_task_repository),
    project_repository: ProjectRepository = Depends(get_project_repository),
) -> SprintPlanner:
    """
    Dependency provider for the sprint planner service instance.
    """
    return SprintPlanner(project_repository, task_repository, sprint_repository)

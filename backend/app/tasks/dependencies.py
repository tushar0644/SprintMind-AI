from fastapi import Depends
from app.tasks.repository import TaskRepository
from app.tasks.service import TaskService


def get_task_repository() -> TaskRepository:
    """
    Dependency provider for the task repository instance.
    """
    return TaskRepository()


def get_task_service(
    repository: TaskRepository = Depends(get_task_repository)
) -> TaskService:
    """
    Dependency provider for the task service instance.
    """
    return TaskService(repository)

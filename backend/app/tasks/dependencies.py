from fastapi import Depends
from app.tasks.repository import TaskRepository
from app.tasks.service import TaskService


from app.projects.dependencies import get_project_repository
from app.projects.repository import ProjectRepository
from app.notifications.dependencies import get_notification_service
from app.notifications.service import NotificationService
from app.activity.dependencies import get_activity_log_service
from app.activity.service import ActivityLogService

def get_task_repository() -> TaskRepository:
    """
    Dependency provider for the task repository instance.
    """
    return TaskRepository()


def get_task_service(
    repository: TaskRepository = Depends(get_task_repository),
    project_repository: ProjectRepository = Depends(get_project_repository),
    notification_service: NotificationService = Depends(get_notification_service),
    activity_service: ActivityLogService = Depends(get_activity_log_service)
) -> TaskService:
    """
    Dependency provider for the task service instance.
    """
    return TaskService(repository, project_repository, notification_service, activity_service)

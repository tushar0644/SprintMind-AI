from fastapi import Depends
from app.comments.repository import CommentRepository
from app.comments.service import CommentService
from app.tasks.repository import TaskRepository
from app.tasks.dependencies import get_task_repository
from app.projects.repository import ProjectRepository
from app.projects.dependencies import get_project_repository

from app.notifications.dependencies import get_notification_service
from app.notifications.service import NotificationService
from app.activity.dependencies import get_activity_log_service
from app.activity.service import ActivityLogService

def get_comment_repository() -> CommentRepository:
    return CommentRepository()

def get_comment_service(
    repository: CommentRepository = Depends(get_comment_repository),
    task_repository: TaskRepository = Depends(get_task_repository),
    project_repository: ProjectRepository = Depends(get_project_repository),
    notification_service: NotificationService = Depends(get_notification_service),
    activity_service: ActivityLogService = Depends(get_activity_log_service)
) -> CommentService:
    return CommentService(repository, task_repository, project_repository, notification_service, activity_service)

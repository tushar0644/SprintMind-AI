from fastapi import Depends
from app.notifications.repository import NotificationRepository
from app.notifications.service import NotificationService

def get_notification_repository() -> NotificationRepository:
    return NotificationRepository()

def get_notification_service(
    repository: NotificationRepository = Depends(get_notification_repository)
) -> NotificationService:
    return NotificationService(repository)

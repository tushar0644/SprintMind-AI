from typing import List, Optional, Tuple
from uuid import UUID
from app.notifications.schemas import NotificationResponse
from app.notifications.repository import NotificationRepository

class NotificationService:
    def __init__(self, repository: NotificationRepository):
        self.repository = repository

    def create_notification(
        self,
        user_id: UUID,
        sender_id: Optional[UUID],
        title: str,
        message: str,
        notification_type: str,
        reference_id: Optional[UUID] = None
    ) -> NotificationResponse:
        return self.repository.create(user_id, sender_id, title, message, notification_type, reference_id)

    def list_notifications(
        self,
        user_id: UUID,
        page: int = 1,
        limit: int = 20,
        type_filter: Optional[str] = None
    ) -> Tuple[List[NotificationResponse], int]:
        return self.repository.list_for_user(user_id, page, limit, type_filter)

    def mark_notification_as_read(self, notification_id: UUID, user_id: UUID) -> bool:
        return self.repository.mark_as_read(notification_id, user_id)

    def mark_all_notifications_as_read(self, user_id: UUID) -> int:
        return self.repository.mark_all_as_read(user_id)

    def delete_notification(self, notification_id: UUID, user_id: UUID) -> bool:
        return self.repository.delete(notification_id, user_id)

    def get_unread_count(self, user_id: UUID) -> int:
        return self.repository.get_unread_count(user_id)

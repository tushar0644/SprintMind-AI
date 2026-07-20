from pydantic import BaseModel, Field, UUID4
from typing import Optional, List
from datetime import datetime

class NotificationResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    sender_id: Optional[UUID4] = None
    title: str
    message: str
    type: str # 'task', 'project', 'ai', 'comment'
    reference_id: Optional[UUID4] = None
    is_read: bool
    created_at: datetime
    sender_display_name: Optional[str] = None

    class Config:
        from_attributes = True

class PaginatedNotificationsResponse(BaseModel):
    notifications: List[NotificationResponse]
    total_count: int
    page: int
    limit: int

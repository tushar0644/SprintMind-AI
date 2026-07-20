from pydantic import BaseModel, Field, UUID4
from typing import Optional, List, Dict, Any
from datetime import datetime

class ActivityLogResponse(BaseModel):
    id: UUID4
    project_id: UUID4
    user_id: Optional[UUID4] = None
    action: str # 'project_created', 'task_created', 'task_updated', 'comment_added', 'reply_added', 'ai_generation'
    entity_type: str # 'project', 'task', 'comment', 'ai'
    entity_id: Optional[UUID4] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime
    user_display_name: Optional[str] = None

    class Config:
        from_attributes = True

class PaginatedActivityLogsResponse(BaseModel):
    activities: List[ActivityLogResponse]
    total_count: int
    page: int
    limit: int

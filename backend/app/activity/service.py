from typing import List, Optional, Tuple
from uuid import UUID
from app.activity.schemas import ActivityLogResponse
from app.activity.repository import ActivityLogRepository

class ActivityLogService:
    def __init__(self, repository: ActivityLogRepository):
        self.repository = repository

    def create_activity(
        self,
        project_id: UUID,
        user_id: Optional[UUID],
        action: str,
        entity_type: str,
        entity_id: Optional[UUID] = None,
        details: Optional[dict] = None
    ) -> ActivityLogResponse:
        return self.repository.create(project_id, user_id, action, entity_type, entity_id, details)

    def list_activities(
        self,
        project_id: Optional[UUID],
        page: int = 1,
        limit: int = 20,
        owner_id: Optional[UUID] = None
    ) -> Tuple[List[ActivityLogResponse], int]:
        return self.repository.list_for_project(project_id, page, limit, owner_id)

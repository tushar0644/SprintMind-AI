from fastapi import Depends
from app.activity.repository import ActivityLogRepository
from app.activity.service import ActivityLogService

def get_activity_log_repository() -> ActivityLogRepository:
    return ActivityLogRepository()

def get_activity_log_service(
    repository: ActivityLogRepository = Depends(get_activity_log_repository)
) -> ActivityLogService:
    return ActivityLogService(repository)

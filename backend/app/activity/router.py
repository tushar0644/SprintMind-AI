from fastapi import APIRouter, Depends, HTTPException, Query, status
from uuid import UUID
from app.services.auth import get_current_user
from app.activity.schemas import PaginatedActivityLogsResponse
from app.activity.service import ActivityLogService
from app.activity.dependencies import get_activity_log_service

router = APIRouter(prefix="/projects", tags=["Activity Timeline"])

@router.get("/{project_id}/activity", response_model=PaginatedActivityLogsResponse)
def list_activities(
    project_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user = Depends(get_current_user),
    service: ActivityLogService = Depends(get_activity_log_service)
) -> PaginatedActivityLogsResponse:
    proj_id = None
    if project_id != "all":
        try:
            proj_id = UUID(project_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid project ID format.")
            
    activities, total = service.list_activities(proj_id, page, limit, current_user.id)
    return PaginatedActivityLogsResponse(
        activities=activities,
        total_count=total,
        page=page,
        limit=limit
    )

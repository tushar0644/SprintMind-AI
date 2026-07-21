from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from app.services.auth import get_current_user
from app.projects.service import ProjectService
from app.projects.dependencies import get_project_service
from app.dashboard.schemas import ProjectDashboardResponse
from app.dashboard.aggregator import DashboardAggregator, dashboard_aggregator

router = APIRouter(prefix="/projects", tags=["AI Health Dashboard"])


def get_dashboard_aggregator() -> DashboardAggregator:
    return dashboard_aggregator


@router.get("/{project_id}/dashboard", response_model=ProjectDashboardResponse)
async def get_project_dashboard(
    project_id: UUID,
    current_user = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service),
    aggregator: DashboardAggregator = Depends(get_dashboard_aggregator),
):
    """
    Returns unified executive project health dashboard including 0-100 health score,
    status classification, risk summary, sprint metrics, capacity utilization,
    predicted timeline finish dates, upcoming milestones, and deterministic recommendations.
    """
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    project = service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    if str(project.owner_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Access denied.")

    return aggregator.generate_dashboard(owner_id=UUID(str(user_id)), project_id=project_id)

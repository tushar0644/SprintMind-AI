from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from app.services.auth import get_current_user
from app.projects.service import ProjectService
from app.projects.dependencies import get_project_service
from app.risks.schemas import RiskAnalysisResponse
from app.risks.analyzer import RiskAnalyzer, risk_analyzer

router = APIRouter(prefix="/projects", tags=["AI Risk Analysis"])


def get_risk_analyzer() -> RiskAnalyzer:
    return risk_analyzer


@router.post("/{project_id}/risks/analyze", response_model=RiskAnalysisResponse)
async def analyze_project_risks(
    project_id: UUID,
    current_user = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service),
    analyzer: RiskAnalyzer = Depends(get_risk_analyzer),
):
    """
    Triggers AI Risk Analysis engine for a project, analyzing dependency bottlenecks,
    workload distribution, capacity margins, and timeline slippage.
    """
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    project = service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    if str(project.owner_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Access denied.")

    return analyzer.analyze_project(owner_id=UUID(str(user_id)), project_id=project_id)


@router.get("/{project_id}/risks", response_model=RiskAnalysisResponse)
async def get_project_risks(
    project_id: UUID,
    current_user = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service),
    analyzer: RiskAnalyzer = Depends(get_risk_analyzer),
):
    """
    Retrieves latest detected risk analysis report for a project.
    """
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    project = service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    if str(project.owner_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Access denied.")

    return analyzer.get_project_risks(owner_id=UUID(str(user_id)), project_id=project_id)

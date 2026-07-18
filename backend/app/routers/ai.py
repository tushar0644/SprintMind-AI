from fastapi import APIRouter, Depends, status
from app.services.ai_service import AIService, get_ai_service
from app.schemas.ai import (
    SprintPlanRequest, SprintPlanResponse,
    ProjectHealthRequest, ProjectHealthResponse,
    PrioritizeRequest, PrioritizeResponse,
    MeetingNotesRequest, MeetingNotesResponse,
    DailyStandupRequest, DailyStandupResponse,
    RiskAnalysisRequest, RiskAnalysisResponse
)

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/sprint-plan", response_model=SprintPlanResponse, status_code=status.HTTP_200_OK)
def post_sprint_plan(
    payload: SprintPlanRequest,
    ai_service: AIService = Depends(get_ai_service)
) -> SprintPlanResponse:
    plan = ai_service.generate_sprint_plan(payload.project_context, payload.objectives)
    return SprintPlanResponse(plan=plan)

@router.post("/project-health", response_model=ProjectHealthResponse, status_code=status.HTTP_200_OK)
def post_project_health(
    payload: ProjectHealthRequest,
    ai_service: AIService = Depends(get_ai_service)
) -> ProjectHealthResponse:
    analysis = ai_service.analyze_project_health(payload.project_details, payload.tasks)
    return ProjectHealthResponse(analysis=analysis)

@router.post("/prioritize", response_model=PrioritizeResponse, status_code=status.HTTP_200_OK)
def post_prioritize(
    payload: PrioritizeRequest,
    ai_service: AIService = Depends(get_ai_service)
) -> PrioritizeResponse:
    prioritization = ai_service.prioritize_tasks(payload.tasks)
    return PrioritizeResponse(prioritization=prioritization)

@router.post("/meeting-notes", response_model=MeetingNotesResponse, status_code=status.HTTP_200_OK)
def post_meeting_notes(
    payload: MeetingNotesRequest,
    ai_service: AIService = Depends(get_ai_service)
) -> MeetingNotesResponse:
    summary = ai_service.summarize_meeting_notes(payload.transcript)
    return MeetingNotesResponse(summary=summary)

@router.post("/daily-standup", response_model=DailyStandupResponse, status_code=status.HTTP_200_OK)
def post_daily_standup(
    payload: DailyStandupRequest,
    ai_service: AIService = Depends(get_ai_service)
) -> DailyStandupResponse:
    report = ai_service.generate_daily_standup(payload.completed, payload.planned, payload.blockers)
    return DailyStandupResponse(report=report)

@router.post("/risk-analysis", response_model=RiskAnalysisResponse, status_code=status.HTTP_200_OK)
def post_risk_analysis(
    payload: RiskAnalysisRequest,
    ai_service: AIService = Depends(get_ai_service)
) -> RiskAnalysisResponse:
    analysis = ai_service.analyze_risks(payload.project_scope, payload.timeline)
    return RiskAnalysisResponse(analysis=analysis)

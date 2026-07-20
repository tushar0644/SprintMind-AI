import time
from fastapi import APIRouter, Depends, status, BackgroundTasks, HTTPException
from typing import List, Optional
from uuid import UUID
from app.services.ai_service import AIService, get_ai_service
from app.database.ai_repository import AIRepository, get_ai_repository
from app.services.job_service import AIJobService, get_job_service
from app.services.auth import get_current_user
from app.config.logging import logger
from app.schemas.ai import (
    SprintPlanRequest, SprintPlanResponse,
    ProjectHealthRequest, ProjectHealthResponse,
    PrioritizeRequest, PrioritizeResponse,
    MeetingNotesRequest, MeetingNotesResponse,
    DailyStandupRequest, DailyStandupResponse,
    RiskAnalysisRequest, RiskAnalysisResponse,
    AIConversationResponse, AIConversationDetailResponse,
    AIMessageResponse, BackgroundJobSubmit, BackgroundJobResponse,
    AIAnalyticsResponse
)

router = APIRouter(prefix="/ai", tags=["AI"])

def _log_sync_run(
    repository: AIRepository,
    user_id: UUID,
    project_id: Optional[UUID],
    tool_type: str,
    title: str,
    prompt: str,
    output: str,
    latency_ms: int,
    payload: dict
):
    try:
        conv = repository.create_conversation(
            user_id=user_id,
            project_id=project_id or UUID("00000000-0000-0000-0000-000000000000"), # Default fallback
            title=f"{title} - {time.strftime('%Y-%m-%d %H:%M')}",
            tool_type=tool_type,
            payload=payload
        )
        repository.create_message(conv["id"], "user", prompt)
        repository.create_message(conv["id"], "assistant", output)
        
        # Estimate tokens
        tokens = (len(prompt) + len(output)) // 4
        
        repository.create_log(
            user_id=user_id,
            feature=tool_type,
            latency_ms=latency_ms,
            token_usage=tokens,
            error_occurred=False
        )
    except Exception as e:
        logger.error(f"Error logging sync AI run: {str(e)}", exc_info=True)

@router.post("/sprint-plan", response_model=SprintPlanResponse, status_code=status.HTTP_200_OK)
def post_sprint_plan(
    payload: SprintPlanRequest,
    project_id: Optional[UUID] = None,
    ai_service: AIService = Depends(get_ai_service),
    repository: AIRepository = Depends(get_ai_repository),
    current_user = Depends(get_current_user)
) -> SprintPlanResponse:
    start_time = time.time()
    plan = ai_service.generate_sprint_plan(payload.project_context, payload.objectives)
    latency_ms = int((time.time() - start_time) * 1000)
    
    prompt = f"Context: {payload.project_context}\nObjectives: {payload.objectives}"
    _log_sync_run(
        repository, current_user.id, project_id, "sprint-plan",
        "Sprint Planner", prompt, plan, latency_ms, payload.model_dump()
    )
    return SprintPlanResponse(plan=plan)

@router.post("/project-health", response_model=ProjectHealthResponse, status_code=status.HTTP_200_OK)
def post_project_health(
    payload: ProjectHealthRequest,
    project_id: Optional[UUID] = None,
    ai_service: AIService = Depends(get_ai_service),
    repository: AIRepository = Depends(get_ai_repository),
    current_user = Depends(get_current_user)
) -> ProjectHealthResponse:
    start_time = time.time()
    analysis = ai_service.analyze_project_health(payload.project_details, payload.tasks)
    latency_ms = int((time.time() - start_time) * 1000)
    
    prompt = f"Details: {payload.project_details}\nTasks Count: {len(payload.tasks)}"
    _log_sync_run(
        repository, current_user.id, project_id, "project-health",
        "Project Health Analyzer", prompt, analysis, latency_ms, payload.model_dump()
    )
    return ProjectHealthResponse(analysis=analysis)

@router.post("/prioritize", response_model=PrioritizeResponse, status_code=status.HTTP_200_OK)
def post_prioritize(
    payload: PrioritizeRequest,
    project_id: Optional[UUID] = None,
    ai_service: AIService = Depends(get_ai_service),
    repository: AIRepository = Depends(get_ai_repository),
    current_user = Depends(get_current_user)
) -> PrioritizeResponse:
    start_time = time.time()
    prioritization = ai_service.prioritize_tasks(payload.tasks)
    latency_ms = int((time.time() - start_time) * 1000)
    
    prompt = f"Tasks count: {len(payload.tasks)}"
    _log_sync_run(
        repository, current_user.id, project_id, "prioritize",
        "Task Prioritizer", prompt, prioritization, latency_ms, payload.model_dump()
    )
    return PrioritizeResponse(prioritization=prioritization)

@router.post("/meeting-notes", response_model=MeetingNotesResponse, status_code=status.HTTP_200_OK)
def post_meeting_notes(
    payload: MeetingNotesRequest,
    project_id: Optional[UUID] = None,
    ai_service: AIService = Depends(get_ai_service),
    repository: AIRepository = Depends(get_ai_repository),
    current_user = Depends(get_current_user)
) -> MeetingNotesResponse:
    start_time = time.time()
    summary = ai_service.summarize_meeting_notes(payload.transcript)
    latency_ms = int((time.time() - start_time) * 1000)
    
    prompt = f"Transcript length: {len(payload.transcript)}"
    _log_sync_run(
        repository, current_user.id, project_id, "meeting-notes",
        "Meeting Summarizer", prompt, summary, latency_ms, payload.model_dump()
    )
    return MeetingNotesResponse(summary=summary)

@router.post("/daily-standup", response_model=DailyStandupResponse, status_code=status.HTTP_200_OK)
def post_daily_standup(
    payload: DailyStandupRequest,
    project_id: Optional[UUID] = None,
    ai_service: AIService = Depends(get_ai_service),
    repository: AIRepository = Depends(get_ai_repository),
    current_user = Depends(get_current_user)
) -> DailyStandupResponse:
    start_time = time.time()
    report = ai_service.generate_daily_standup(payload.completed, payload.planned, payload.blockers)
    latency_ms = int((time.time() - start_time) * 1000)
    
    prompt = f"Completed: {len(payload.completed)}, Planned: {len(payload.planned)}, Blockers: {len(payload.blockers)}"
    _log_sync_run(
        repository, current_user.id, project_id, "daily-standup",
        "Daily Standup Reporter", prompt, report, latency_ms, payload.model_dump()
    )
    return DailyStandupResponse(report=report)

@router.post("/risk-analysis", response_model=RiskAnalysisResponse, status_code=status.HTTP_200_OK)
def post_risk_analysis(
    payload: RiskAnalysisRequest,
    project_id: Optional[UUID] = None,
    ai_service: AIService = Depends(get_ai_service),
    repository: AIRepository = Depends(get_ai_repository),
    current_user = Depends(get_current_user)
) -> RiskAnalysisResponse:
    start_time = time.time()
    analysis = ai_service.analyze_risks(payload.project_scope, payload.timeline)
    latency_ms = int((time.time() - start_time) * 1000)
    
    prompt = f"Scope: {payload.project_scope}\nTimeline: {payload.timeline}"
    _log_sync_run(
        repository, current_user.id, project_id, "risk-analysis",
        "Risk Analyzer", prompt, analysis, latency_ms, payload.model_dump()
    )
    return RiskAnalysisResponse(analysis=analysis)


# --- v1.1 History Endpoints ---

@router.get("/history", response_model=List[AIConversationResponse])
def get_history(
    project_id: Optional[UUID] = None,
    repository: AIRepository = Depends(get_ai_repository),
    current_user = Depends(get_current_user)
) -> List[AIConversationResponse]:
    return repository.get_conversations(current_user.id, project_id)

@router.get("/history/{conversation_id}", response_model=AIConversationDetailResponse)
def get_history_detail(
    conversation_id: UUID,
    repository: AIRepository = Depends(get_ai_repository),
    current_user = Depends(get_current_user)
) -> AIConversationDetailResponse:
    conv = repository.get_conversation(conversation_id, current_user.id)
    if not conv:
        raise HTTPException(status_code=404, detail="AI Conversation not found.")
    messages = repository.get_messages(conversation_id, current_user.id)
    return AIConversationDetailResponse(conversation=conv, messages=messages)

@router.delete("/history/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_item(
    conversation_id: UUID,
    repository: AIRepository = Depends(get_ai_repository),
    current_user = Depends(get_current_user)
):
    success = repository.delete_conversation(conversation_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="AI Conversation not found.")
    return

@router.post("/history/{conversation_id}/regenerate", response_model=BackgroundJobResponse)
def post_regenerate_history(
    conversation_id: UUID,
    background_tasks: BackgroundTasks,
    repository: AIRepository = Depends(get_ai_repository),
    job_service: AIJobService = Depends(get_job_service),
    current_user = Depends(get_current_user)
) -> BackgroundJobResponse:
    conv = repository.get_conversation(conversation_id, current_user.id)
    if not conv:
        raise HTTPException(status_code=404, detail="AI Conversation not found.")
    
    # Extract project ID and payload to start a new job
    proj_id = conv.get("project_id")
    proj_uuid = UUID(proj_id) if proj_id and proj_id != "00000000-0000-0000-0000-000000000000" else UUID("00000000-0000-0000-0000-000000000000")
    tool_type = conv.get("tool_type", "sprint-plan")
    payload = conv.get("payload", {})
    
    job = job_service.submit_job(current_user.id, proj_uuid, tool_type, payload, background_tasks)
    return BackgroundJobResponse.model_validate(job)


# --- v1.1 Background Jobs Endpoints ---

@router.post("/jobs", response_model=BackgroundJobResponse, status_code=status.HTTP_202_ACCEPTED)
def post_submit_job(
    payload: BackgroundJobSubmit,
    background_tasks: BackgroundTasks,
    job_service: AIJobService = Depends(get_job_service),
    current_user = Depends(get_current_user)
) -> BackgroundJobResponse:
    job = job_service.submit_job(
        current_user.id, payload.project_id, payload.tool_type, payload.payload, background_tasks
    )
    return BackgroundJobResponse.model_validate(job)

@router.get("/jobs", response_model=List[BackgroundJobResponse])
def get_jobs_list(
    repository: AIRepository = Depends(get_ai_repository),
    current_user = Depends(get_current_user)
) -> List[BackgroundJobResponse]:
    return repository.get_jobs(current_user.id)

@router.get("/jobs/{job_id}", response_model=BackgroundJobResponse)
def get_job_status(
    job_id: UUID,
    repository: AIRepository = Depends(get_ai_repository),
    current_user = Depends(get_current_user)
) -> BackgroundJobResponse:
    job = repository.get_job(job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Background job not found.")
    return BackgroundJobResponse.model_validate(job)


# --- v1.1 Analytics Endpoint ---

@router.get("/analytics", response_model=AIAnalyticsResponse)
def get_ai_analytics(
    repository: AIRepository = Depends(get_ai_repository),
    current_user = Depends(get_current_user)
) -> AIAnalyticsResponse:
    data = repository.get_analytics(current_user.id)
    return AIAnalyticsResponse(**data)

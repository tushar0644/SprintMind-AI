from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from typing import List, Optional

from app.services.auth import get_current_user
from app.projects.service import ProjectService
from app.projects.dependencies import get_project_service
from app.meetings.schemas import MeetingAnalyzeRequest, MeetingResponse
from app.meetings.analyzer import MeetingAnalyzer, meeting_analyzer
from app.meetings.repository import MeetingRepository, meeting_repository

router = APIRouter(tags=["AI Meeting Assistant"])


def get_meeting_analyzer() -> MeetingAnalyzer:
    return meeting_analyzer


def get_meeting_repository() -> MeetingRepository:
    return meeting_repository


@router.post("/projects/{project_id}/meetings/analyze", response_model=MeetingResponse)
async def analyze_project_meeting(
    project_id: UUID,
    request: MeetingAnalyzeRequest,
    current_user = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service),
    analyzer: MeetingAnalyzer = Depends(get_meeting_analyzer),
):
    """
    Analyzes raw meeting notes, produces executive summary, extracts action items,
    decisions, blockers, risks, maps items to existing/new tasks, and generates recommendations.
    """
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    project = service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    if str(project.owner_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Access denied.")

    return analyzer.analyze_meeting(owner_id=UUID(str(user_id)), project_id=project_id, request=request)


@router.get("/projects/{project_id}/meetings", response_model=List[MeetingResponse])
async def list_project_meetings(
    project_id: UUID,
    current_user = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service),
    repository: MeetingRepository = Depends(get_meeting_repository),
):
    """
    Lists all analyzed meetings for a project.
    """
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    project = service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    if str(project.owner_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Access denied.")

    return repository.get_by_project(project_id=project_id, owner_id=UUID(str(user_id)))


@router.get("/meetings/{meeting_id}", response_model=MeetingResponse)
async def get_meeting_by_id(
    meeting_id: UUID,
    current_user = Depends(get_current_user),
    repository: MeetingRepository = Depends(get_meeting_repository),
):
    """
    Retrieves meeting details by meeting ID.
    """
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    meeting = repository.get_by_id(meeting_id=meeting_id, owner_id=UUID(str(user_id)))
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")

    return meeting

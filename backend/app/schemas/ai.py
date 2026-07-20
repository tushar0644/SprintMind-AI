from pydantic import BaseModel, Field
from uuid import UUID
from typing import List, Optional, Dict, Any
from datetime import datetime

class SprintPlanRequest(BaseModel):
    project_context: str = Field(..., description="Details and context of the project")
    objectives: str = Field(..., description="Key objectives to hit this sprint")

class SprintPlanResponse(BaseModel):
    plan: str

class ProjectHealthRequest(BaseModel):
    project_details: str = Field(..., description="Project baseline detail")
    tasks: List[Dict[str, Any]] = Field(default=[], description="List of tasks in the project")

class ProjectHealthResponse(BaseModel):
    analysis: str

class PrioritizeRequest(BaseModel):
    tasks: List[Dict[str, Any]] = Field(..., description="List of tasks to categorize/prioritize")

class PrioritizeResponse(BaseModel):
    prioritization: str

class MeetingNotesRequest(BaseModel):
    transcript: str = Field(..., description="Raw meeting conversation text transcript")

class MeetingNotesResponse(BaseModel):
    summary: str

class DailyStandupRequest(BaseModel):
    completed: List[str] = Field(default=[], description="Tasks completed yesterday")
    planned: List[str] = Field(default=[], description="Tasks planned for today")
    blockers: List[str] = Field(default=[], description="Blockers/impediments")

class DailyStandupResponse(BaseModel):
    report: str

class RiskAnalysisRequest(BaseModel):
    project_scope: str = Field(..., description="Description of the project scope")
    timeline: str = Field(..., description="Details about timeline, dates, milestones")

class RiskAnalysisResponse(BaseModel):
    analysis: str


# --- SprintMind AI v1.1 Persistence, History, Background Jobs & Analytics Schemas ---

class AIMessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class AIConversationResponse(BaseModel):
    id: UUID
    project_id: Optional[UUID] = None
    user_id: UUID
    title: str
    tool_type: Optional[str]
    payload: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AIConversationDetailResponse(BaseModel):
    conversation: AIConversationResponse
    messages: List[AIMessageResponse]

class BackgroundJobSubmit(BaseModel):
    tool_type: str = Field(..., description="The type of AI helper tool (sprint-plan, project-health, prioritize, meeting-notes, daily-standup, risk-analysis)")
    project_id: UUID = Field(..., description="Project workspace context ID")
    payload: Dict[str, Any] = Field(..., description="Input payload matching request schema for that tool")

class BackgroundJobResponse(BaseModel):
    id: UUID
    user_id: UUID
    project_id: Optional[UUID] = None
    job_type: str
    status: str
    payload: Optional[Dict[str, Any]]
    result: Optional[Dict[str, Any]]
    error: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AIAnalyticsResponse(BaseModel):
    total_requests: int
    total_tokens: int
    average_latency_ms: float
    success_rate: float
    feature_distribution: Dict[str, int]
    latency_by_feature: Dict[str, float]
    tokens_by_feature: Dict[str, int]

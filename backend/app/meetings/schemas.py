from pydantic import BaseModel, Field, UUID4
from typing import List, Optional
from datetime import datetime, timezone


class MeetingAnalyzeRequest(BaseModel):
    title: str = Field(..., description="Meeting title or topic")
    notes: str = Field(..., description="Raw meeting notes, transcript, or bullet points")


class ActionItemSchema(BaseModel):
    id: Optional[UUID4] = None
    title: str
    assignee: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str = "medium"  # low, medium, high, urgent
    story_points: Optional[int] = 3
    matched_task_id: Optional[UUID4] = None
    is_suggested_new: bool = True


class DecisionSchema(BaseModel):
    id: Optional[UUID4] = None
    decision_text: str
    context: Optional[str] = None


class BlockerSchema(BaseModel):
    id: Optional[UUID4] = None
    description: str
    affected_task_id: Optional[UUID4] = None


class MeetingRiskSchema(BaseModel):
    risk_title: str
    severity: str = "medium"  # low, medium, high, critical
    category: str = "dependency"


class TaskMapResultSchema(BaseModel):
    action_item_title: str
    status: str  # "matched" or "suggested_new"
    matched_task_id: Optional[UUID4] = None
    matched_task_title: Optional[str] = None
    confidence: float = 1.0


class MeetingResponse(BaseModel):
    id: UUID4
    project_id: UUID4
    owner_id: UUID4
    title: str
    notes: str
    summary: str
    action_items: List[ActionItemSchema] = Field(default_factory=list)
    decisions: List[DecisionSchema] = Field(default_factory=list)
    blockers: List[BlockerSchema] = Field(default_factory=list)
    risks: List[MeetingRiskSchema] = Field(default_factory=list)
    task_mappings: List[TaskMapResultSchema] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        from_attributes = True

from enum import Enum
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class WorkflowStep(str, Enum):
    REQUIREMENTS_ANALYSIS = "REQUIREMENTS_ANALYSIS"
    PROJECT_GENERATION = "PROJECT_GENERATION"
    EPIC_GENERATION = "EPIC_GENERATION"
    STORY_GENERATION = "STORY_GENERATION"
    SPRINT_PLANNING = "SPRINT_PLANNING"
    TIMELINE_ESTIMATION = "TIMELINE_ESTIMATION"
    RISK_ANALYSIS = "RISK_ANALYSIS"


class WorkflowStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class StepResult(BaseModel):
    step: WorkflowStep
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    latency_seconds: float = 0.0
    provider: Optional[str] = "gemini"


class WorkflowState(BaseModel):
    workflow_id: str
    current_step: Optional[WorkflowStep] = None
    completed_steps: List[WorkflowStep] = Field(default_factory=list)
    failed_step: Optional[WorkflowStep] = None
    status: WorkflowStatus = WorkflowStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = Field(default_factory=dict)
    pipeline_steps: List[WorkflowStep] = Field(default_factory=list)
    results: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None

from pydantic import BaseModel, Field, UUID4
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.risks.schemas import RiskItem
from app.estimation.schemas import ProjectMilestone, SprintTimelineEntry


class HealthScoreDetails(BaseModel):
    score: float = Field(..., description="Project health score from 0.0 to 100.0")
    status: str = Field(..., description="Health status: healthy, warning, critical")
    summary: str = Field(..., description="High-level health summary text")


class RiskSummary(BaseModel):
    total_risks: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class SprintProgressSummary(BaseModel):
    total_sprints: int = 0
    active_sprint: Optional[int] = None
    completion_percentage: float = 0.0
    total_points: int = 0
    completed_points: int = 0


class CapacitySummary(BaseModel):
    average_capacity: float = 0.0
    total_points: int = 0
    capacity_utilization: float = 0.0
    overloaded_sprints_count: int = 0


class TimelineSummary(BaseModel):
    estimated_start_date: datetime
    estimated_end_date: datetime
    estimated_duration_days: int
    confidence: float


class ProjectDashboardResponse(BaseModel):
    project_id: UUID4
    health_score: float
    status: str
    health_details: HealthScoreDetails
    risk_summary: RiskSummary
    active_risks: List[RiskItem] = Field(default_factory=list)
    completed_tasks: int = 0
    remaining_tasks: int = 0
    total_tasks: int = 0
    sprint_progress: SprintProgressSummary
    velocity: float = 0.0
    capacity: CapacitySummary
    timeline: TimelineSummary
    estimated_finish: datetime
    upcoming_milestones: List[ProjectMilestone] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

from pydantic import BaseModel, Field, UUID4
from typing import List, Optional
from datetime import datetime


class SprintTimelineEntry(BaseModel):
    sprint_id: Optional[UUID4] = None
    sprint_number: int = Field(..., description="Sequential sprint order, starting at 1")
    name: str = Field(..., description="Sprint display name")
    start_date: datetime = Field(..., description="Estimated sprint start date")
    end_date: datetime = Field(..., description="Estimated sprint end date")
    duration_days: int = Field(14, description="Sprint duration in calendar days")
    total_points: int = Field(0, description="Total story points allocated to sprint")
    task_count: int = Field(0, description="Total number of tasks in sprint")
    status: str = Field("planned", description="Sprint status")


class ProjectMilestone(BaseModel):
    name: str = Field(..., description="Milestone name e.g. MVP Completion, Beta, RC, Production Release")
    target_date: datetime = Field(..., description="Target completion date for milestone")
    sprint_number: int = Field(..., description="Sprint number when milestone is achieved")
    completion_percentage: float = Field(..., description="Cumulative project completion percentage")
    description: str = Field(..., description="Milestone description and scope")


class ProjectTimelineResponse(BaseModel):
    project_id: UUID4
    project_start: datetime
    project_finish: datetime
    estimated_duration_days: int
    sprint_dates: List[SprintTimelineEntry] = Field(default_factory=list)
    milestones: List[ProjectMilestone] = Field(default_factory=list)
    team_velocity: float
    confidence: float

    class Config:
        from_attributes = True


class ProjectEstimationResponse(BaseModel):
    id: Optional[UUID4] = None
    project_id: UUID4
    estimated_start_date: datetime
    estimated_end_date: datetime
    estimated_duration_days: int
    average_velocity: float
    confidence: float
    sprints_count: int = 0
    total_points: int = 0
    sprint_dates: List[SprintTimelineEntry] = Field(default_factory=list)
    milestones: List[ProjectMilestone] = Field(default_factory=list)
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

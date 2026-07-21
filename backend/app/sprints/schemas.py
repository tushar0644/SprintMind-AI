from pydantic import BaseModel, Field, UUID4
from typing import List, Optional
from datetime import datetime

from app.tasks.schemas import TaskResponse

VALID_SPRINT_STATUSES = ("planned", "active", "completed")


class PlanSprintsRequest(BaseModel):
    capacity: int = Field(20, ge=1, le=1000, description="Maximum story points allowed per sprint")


class SprintResponse(BaseModel):
    id: UUID4
    project_id: UUID4
    sprint_number: int = Field(..., description="Sequential sprint order, starting at 1")
    name: str
    capacity: int
    total_points: int
    status: str = Field("planned", description="Sprint status")
    tasks: List[TaskResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PlanSprintsResponse(BaseModel):
    project_id: UUID4
    capacity: int
    sprints_count: int
    tasks_scheduled: int
    tasks_unscheduled: int = Field(0, description="Tasks skipped due to unresolved/cyclic dependencies")
    sprints: List[SprintResponse]

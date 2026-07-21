from pydantic import BaseModel, Field, UUID4, field_validator
from typing import Optional, List
from datetime import datetime

VALID_STATUSES = ("todo", "in_progress", "done", "cancelled")
VALID_PRIORITIES = ("low", "medium", "high", "urgent")


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(None, max_length=2000, description="Task description")
    status: str = Field("todo", description="Task status")
    priority: str = Field("medium", description="Task priority")
    epic_id: Optional[UUID4] = Field(None, description="Associated project epic ID")
    story_points: Optional[int] = Field(1, description="Story point estimate")
    checklist: Optional[List[str]] = Field(default_factory=list, description="Task checklist items")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_STATUSES)}")
        return v

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v):
        if v not in VALID_PRIORITIES:
            raise ValueError(f"Priority must be one of: {', '.join(VALID_PRIORITIES)}")
        return v


class TaskCreate(TaskBase):
    project_id: UUID4
    assignee_id: Optional[UUID4] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[str] = Field(None)
    priority: Optional[str] = Field(None)
    assignee_id: Optional[UUID4] = None
    epic_id: Optional[UUID4] = Field(None)
    story_points: Optional[int] = Field(None)
    checklist: Optional[List[str]] = Field(None)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is not None and v not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_STATUSES)}")
        return v

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v):
        if v is not None and v not in VALID_PRIORITIES:
            raise ValueError(f"Priority must be one of: {', '.join(VALID_PRIORITIES)}")
        return v


class TaskResponse(TaskBase):
    id: UUID4
    project_id: UUID4
    owner_id: UUID4
    assignee_id: Optional[UUID4] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "project_id": "e2da1bfa-873c-42b7-a5eb-0683a6b57912",
                "owner_id": "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c",
                "title": "Implement authentication middleware",
                "description": "Add JWT validation to all protected endpoints.",
                "status": "in_progress",
                "priority": "high",
                "created_at": "2026-07-11T12:00:00Z",
                "updated_at": "2026-07-11T12:00:00Z",
                "deleted_at": None
            }
        }


DefinitionOfDone = True

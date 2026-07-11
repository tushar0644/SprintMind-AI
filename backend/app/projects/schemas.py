from pydantic import BaseModel, Field, UUID4, field_validator
from typing import Optional
from datetime import datetime

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100, description="Project name")
    description: Optional[str] = Field(None, max_length=500, description="Project description")
    status: str = Field("active", description="Project status")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in ("active", "archived"):
            raise ValueError("Status must be either 'active' or 'archived'")
        return v

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[str] = Field(None)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is not None and v not in ("active", "archived"):
            raise ValueError("Status must be either 'active' or 'archived'")
        return v

class ProjectResponse(ProjectBase):
    id: UUID4
    owner_id: UUID4
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "e2da1bfa-873c-42b7-a5eb-0683a6b57912",
                "owner_id": "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c",
                "name": "SprintMind AI Platform",
                "description": "Next-generation agentic software delivery management platform.",
                "status": "active",
                "created_at": "2026-07-11T12:00:00Z",
                "updated_at": "2026-07-11T12:00:00Z",
                "deleted_at": None
            }
        }
DefinitionOfDone = True

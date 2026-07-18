from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

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

from pydantic import BaseModel, Field, UUID4
from typing import List, Optional
from datetime import datetime, timezone


class RiskItem(BaseModel):
    id: Optional[str] = None
    project_id: Optional[UUID4] = None
    title: str = Field(..., description="Short descriptive title of detected risk")
    description: str = Field(..., description="Detailed explanation of risk condition and impact")
    severity: str = Field(..., description="Risk severity level: low, medium, high, critical")
    category: str = Field(..., description="Risk category: dependency, workload, schedule")
    affected_sprint: Optional[int] = Field(None, alias="affectedSprint", description="Affected sprint number if applicable")
    affected_tasks: List[str] = Field(default_factory=list, alias="affectedTasks", description="List of affected task titles or IDs")
    recommendation: str = Field(..., description="Actionable recommendation to mitigate the risk")
    confidence: float = Field(0.85, description="Confidence score of risk detection (0.0 to 1.0)")
    created_at: Optional[datetime] = Field(None, alias="createdAt", description="Detection timestamp")

    class Config:
        populate_by_name = True
        from_attributes = True


class RiskAnalysisResponse(BaseModel):
    project_id: UUID4
    total_risks: int
    critical_risks_count: int
    high_risks_count: int
    medium_risks_count: int
    low_risks_count: int
    risks: List[RiskItem] = Field(default_factory=list)
    analyzed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        from_attributes = True

from pydantic import BaseModel, Field, UUID4
from typing import List, Optional
from datetime import datetime, timezone


class PortfolioProjectCard(BaseModel):
    id: UUID4
    name: str
    status: str
    health_score: float
    health_status: str
    risk_count: int
    critical_risks_count: int
    completion_percentage: float
    velocity: float
    estimated_finish: Optional[datetime] = None


class HealthDistribution(BaseModel):
    healthy: int = 0
    warning: int = 0
    critical: int = 0


class PortfolioSummary(BaseModel):
    total_projects: int = 0
    average_health_score: float = 100.0
    portfolio_status: str = "healthy"
    total_risks: int = 0
    critical_risks_count: int = 0
    total_tasks: int = 0
    completed_tasks: int = 0
    overall_completion_percentage: float = 0.0


class PortfolioMilestone(BaseModel):
    project_id: UUID4
    project_name: str
    milestone_name: str
    target_date: datetime
    sprint_number: int
    completion_percentage: float
    description: str


class PortfolioDashboardResponse(BaseModel):
    summary: PortfolioSummary
    project_cards: List[PortfolioProjectCard] = Field(default_factory=list)
    projects_requiring_attention: List[PortfolioProjectCard] = Field(default_factory=list)
    upcoming_milestones: List[PortfolioMilestone] = Field(default_factory=list)
    health_distribution: HealthDistribution
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        from_attributes = True

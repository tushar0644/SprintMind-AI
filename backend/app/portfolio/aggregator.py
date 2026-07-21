from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timezone
import statistics

from app.projects.repository import ProjectRepository
from app.dashboard.aggregator import DashboardAggregator, dashboard_aggregator as global_dashboard_aggregator
from app.portfolio.schemas import (
    PortfolioDashboardResponse,
    PortfolioSummary,
    PortfolioProjectCard,
    HealthDistribution,
    PortfolioMilestone,
)


class PortfolioAggregator:
    """
    Aggregates project metrics, health scores, risk counts, sprint completion %,
    velocities, and milestone timelines across all workspace projects into an executive
    AI Portfolio Dashboard.
    """

    def __init__(
        self,
        project_repo: Optional[ProjectRepository] = None,
        dash_aggregator: Optional[DashboardAggregator] = None,
    ):
        self.project_repo = project_repo or ProjectRepository()
        self.dashboard_aggregator = dash_aggregator or global_dashboard_aggregator

    def generate_portfolio_dashboard(
        self,
        owner_id: UUID,
    ) -> PortfolioDashboardResponse:
        """
        Calculates and returns full AI Portfolio Dashboard.
        """
        owner_id = UUID(str(owner_id))
        projects = self.project_repo.get_all_by_owner(owner_id)

        if not projects:
            return PortfolioDashboardResponse(
                summary=PortfolioSummary(
                    total_projects=0,
                    average_health_score=100.0,
                    portfolio_status="healthy",
                    total_risks=0,
                    critical_risks_count=0,
                    total_tasks=0,
                    completed_tasks=0,
                    overall_completion_percentage=0.0,
                ),
                project_cards=[],
                projects_requiring_attention=[],
                upcoming_milestones=[],
                health_distribution=HealthDistribution(healthy=0, warning=0, critical=0),
                generated_at=datetime.now(timezone.utc),
            )

        project_cards: List[PortfolioProjectCard] = []
        all_milestones: List[PortfolioMilestone] = []

        healthy_count = 0
        warning_count = 0
        critical_count = 0

        total_portfolio_risks = 0
        total_portfolio_critical_risks = 0
        total_portfolio_tasks = 0
        completed_portfolio_tasks = 0
        health_scores: List[float] = []

        for p in projects:
            p_id = UUID(str(p.id))
            dash = self.dashboard_aggregator.generate_dashboard(owner_id=owner_id, project_id=p_id)

            h_score = float(dash.health_score)
            h_status = str(dash.status)
            health_scores.append(h_score)

            # Health Distribution Counts
            if h_status == "healthy":
                healthy_count += 1
            elif h_status == "warning":
                warning_count += 1
            else:
                critical_count += 1

            total_portfolio_risks += dash.risk_summary.total_risks
            total_portfolio_critical_risks += dash.risk_summary.critical
            total_portfolio_tasks += dash.total_tasks
            completed_portfolio_tasks += dash.completed_tasks

            card = PortfolioProjectCard(
                id=p_id,
                name=p.name,
                status=p.status,
                health_score=h_score,
                health_status=h_status,
                risk_count=dash.risk_summary.total_risks,
                critical_risks_count=dash.risk_summary.critical,
                completion_percentage=dash.sprint_progress.completion_percentage,
                velocity=dash.velocity,
                estimated_finish=dash.estimated_finish,
            )
            project_cards.append(card)

            # Collect Upcoming Milestones
            for m in dash.upcoming_milestones:
                all_milestones.append(
                    PortfolioMilestone(
                        project_id=p_id,
                        project_name=p.name,
                        milestone_name=m.name,
                        target_date=m.target_date,
                        sprint_number=m.sprint_number,
                        completion_percentage=m.completion_percentage,
                        description=m.description,
                    )
                )

        # Average Health Score & Portfolio Status
        avg_health = round(statistics.mean(health_scores), 1) if health_scores else 100.0
        if avg_health >= 80.0:
            portfolio_status = "healthy"
        elif avg_health >= 60.0:
            portfolio_status = "warning"
        else:
            portfolio_status = "critical"

        overall_completion = (
            round((completed_portfolio_tasks / total_portfolio_tasks) * 100.0, 1)
            if total_portfolio_tasks > 0
            else 0.0
        )

        summary = PortfolioSummary(
            total_projects=len(projects),
            average_health_score=avg_health,
            portfolio_status=portfolio_status,
            total_risks=total_portfolio_risks,
            critical_risks_count=total_portfolio_critical_risks,
            total_tasks=total_portfolio_tasks,
            completed_tasks=completed_portfolio_tasks,
            overall_completion_percentage=overall_completion,
        )

        # Rank Project Cards by health_score (descending)
        ranked_project_cards = sorted(project_cards, key=lambda c: c.health_score, reverse=True)

        # Projects Requiring Attention (health_score < 80 or status != 'healthy'), ranked ascending (worst first)
        attention_projects = sorted(
            [c for c in project_cards if c.health_score < 80.0 or c.health_status != "healthy"],
            key=lambda c: c.health_score,
        )

        # Sort Milestones by target_date ascending
        sorted_milestones = sorted(all_milestones, key=lambda m: m.target_date)

        return PortfolioDashboardResponse(
            summary=summary,
            project_cards=ranked_project_cards,
            projects_requiring_attention=attention_projects,
            upcoming_milestones=sorted_milestones,
            health_distribution=HealthDistribution(
                healthy=healthy_count,
                warning=warning_count,
                critical=critical_count,
            ),
            generated_at=datetime.now(timezone.utc),
        )


portfolio_aggregator = PortfolioAggregator()

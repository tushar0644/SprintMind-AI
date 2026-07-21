from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timezone

from app.tasks.repository import TaskRepository
from app.sprints.repository import SprintRepository, sprint_repository
from app.estimation.estimator import ProjectEstimator, project_estimator
from app.risks.analyzer import RiskAnalyzer, risk_analyzer
from app.dashboard.health import HealthScoreCalculator, health_score_calculator
from app.dashboard.metrics import MetricsCalculator, metrics_calculator
from app.dashboard.repository import DashboardRepository, dashboard_repository
from app.dashboard.schemas import (
    ProjectDashboardResponse,
    RiskSummary,
    TimelineSummary,
)


class DashboardAggregator:
    """
    Aggregates project tasks, sprint plan, velocity estimation, and AI risk analysis
    into a unified executive health dashboard with deterministic recommendations.
    """

    def __init__(
        self,
        task_repo: Optional[TaskRepository] = None,
        sprint_repo: Optional[SprintRepository] = None,
        estimator: Optional[ProjectEstimator] = None,
        analyzer: Optional[RiskAnalyzer] = None,
        health_calc: Optional[HealthScoreCalculator] = None,
        metrics_calc: Optional[MetricsCalculator] = None,
        dashboard_repo: Optional[DashboardRepository] = None,
    ):
        self.task_repo = task_repo or TaskRepository()
        self.sprint_repo = sprint_repo or sprint_repository
        self.estimator = estimator or project_estimator
        self.analyzer = analyzer or risk_analyzer
        self.health_calc = health_calc or health_score_calculator
        self.metrics_calc = metrics_calc or metrics_calculator
        self.dashboard_repo = dashboard_repo or dashboard_repository

    def generate_dashboard(
        self,
        owner_id: UUID,
        project_id: UUID,
    ) -> ProjectDashboardResponse:
        """
        Orchestrates full dashboard data collection, health score computation,
        recommendation generation, and snapshot persistence.
        """
        owner_id = UUID(str(owner_id))
        project_id = UUID(str(project_id))

        # 1. Fetch data components
        tasks, _ = self.task_repo.list_tasks(owner_id=owner_id, project_id=project_id)
        sprints = self.sprint_repo.get_by_project(project_id, owner_id)
        timeline_res = self.estimator.get_timeline(owner_id=owner_id, project_id=project_id)
        risk_res = self.analyzer.get_project_risks(owner_id=owner_id, project_id=project_id)

        # 2. Compute metrics
        comp_tasks, rem_tasks, total_tasks = self.metrics_calc.compute_task_metrics(tasks)
        sprint_prog = self.metrics_calc.compute_sprint_progress(sprints)
        cap_summary = self.metrics_calc.compute_capacity_summary(sprints)

        risk_counts = {
            "critical": risk_res.critical_risks_count,
            "high": risk_res.high_risks_count,
            "medium": risk_res.medium_risks_count,
            "low": risk_res.low_risks_count,
        }

        # 3. Compute Health Score
        health_details = self.health_calc.calculate_health_score(
            risk_counts=risk_counts,
            completion_percentage=sprint_prog.completion_percentage,
            overloaded_sprints_count=cap_summary.overloaded_sprints_count,
            confidence=timeline_res.confidence,
            velocity=timeline_res.team_velocity,
        )

        # 4. Deterministic Recommendation Engine
        recommendations = self._generate_recommendations(
            risk_res=risk_res,
            cap_summary=cap_summary,
            confidence=timeline_res.confidence,
            velocity=timeline_res.team_velocity,
            tasks=tasks,
        )

        # 5. Timeline summary
        timeline_summary = TimelineSummary(
            estimated_start_date=timeline_res.project_start,
            estimated_end_date=timeline_res.project_finish,
            estimated_duration_days=timeline_res.estimated_duration_days,
            confidence=timeline_res.confidence,
        )

        # 6. Save Dashboard Snapshot
        self.dashboard_repo.save_snapshot(
            project_id=project_id,
            owner_id=owner_id,
            health_score=health_details.score,
            status=health_details.status,
            risk_count=risk_res.total_risks,
            velocity=timeline_res.team_velocity,
            completion=sprint_prog.completion_percentage,
        )

        return ProjectDashboardResponse(
            project_id=project_id,
            health_score=health_details.score,
            status=health_details.status,
            health_details=health_details,
            risk_summary=RiskSummary(
                total_risks=risk_res.total_risks,
                critical=risk_res.critical_risks_count,
                high=risk_res.high_risks_count,
                medium=risk_res.medium_risks_count,
                low=risk_res.low_risks_count,
            ),
            active_risks=risk_res.risks,
            completed_tasks=comp_tasks,
            remaining_tasks=rem_tasks,
            total_tasks=total_tasks,
            sprint_progress=sprint_prog,
            velocity=timeline_res.team_velocity,
            capacity=cap_summary,
            timeline=timeline_summary,
            estimated_finish=timeline_res.project_finish,
            upcoming_milestones=timeline_res.milestones,
            recommendations=recommendations,
            created_at=datetime.now(timezone.utc),
        )

    def _generate_recommendations(
        self,
        risk_res: Any,
        cap_summary: Any,
        confidence: float,
        velocity: float,
        tasks: List[Any],
    ) -> List[str]:
        """
        Generates deterministic actionable recommendations based on project state.
        """
        recs: List[str] = []

        # Rule 1: Scope reduction for overloaded sprints
        if cap_summary.overloaded_sprints_count > 0 or cap_summary.capacity_utilization > 95.0:
            recs.append("Reduce sprint scope by deferring low-priority tasks to subsequent sprints.")

        # Rule 2: Oversized tasks
        has_oversized = any(
            "Oversized Task" in r.title for r in getattr(risk_res, "risks", [])
        ) or any(int(getattr(t, "story_points", 1) if not isinstance(t, dict) else t.get("story_points", 1) or 1) >= 8 for t in tasks)
        if has_oversized:
            recs.append("Split oversized tasks estimated at >= 8 story points into smaller manageable user stories.")

        # Rule 3: Dependency bottlenecks
        has_bottlenecks = any(
            "Bottleneck" in r.title or "Circular" in r.title for r in getattr(risk_res, "risks", [])
        )
        if has_bottlenecks:
            recs.append("Resolve dependency bottlenecks by re-ordering prerequisite tasks and breaking circular deadlocks.")

        # Rule 4: Capacity increases
        if velocity > cap_summary.average_capacity and cap_summary.average_capacity > 0:
            recs.append("Increase sprint capacity limit to match the team's higher demonstrated velocity.")

        # Rule 5: Estimation confidence
        if confidence < 0.80:
            recs.append("Improve estimation confidence by detailing task story point estimates and resolving prerequisites.")

        # Fallback if no issues identified
        if not recs:
            recs.append("Maintain current sprint velocity and continue regular milestone tracking.")

        return recs


dashboard_aggregator = DashboardAggregator()

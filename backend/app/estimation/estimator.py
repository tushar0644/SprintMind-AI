from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timezone

from app.sprints.repository import SprintRepository, sprint_repository
from app.estimation.velocity import VelocityCalculator, velocity_calculator
from app.estimation.timeline import TimelinePredictor, timeline_predictor
from app.estimation.milestones import MilestoneGenerator, milestone_generator
from app.estimation.repository import EstimationRepository, estimation_repository
from app.estimation.schemas import (
    ProjectEstimationResponse,
    ProjectTimelineResponse,
    SprintTimelineEntry,
    ProjectMilestone,
)


class ProjectEstimator:
    """
    Combines Sprint Plan, Capacity, Velocity, and Calendar Timeline predictions to
    generate comprehensive resource estimations and release milestone targets.
    """

    def __init__(
        self,
        sprint_repo: Optional[SprintRepository] = None,
        velocity_calc: Optional[VelocityCalculator] = None,
        timeline_pred: Optional[TimelinePredictor] = None,
        milestone_gen: Optional[MilestoneGenerator] = None,
        estimation_repo: Optional[EstimationRepository] = None,
    ):
        self.sprint_repo = sprint_repo or sprint_repository
        self.velocity_calc = velocity_calc or velocity_calculator
        self.timeline_pred = timeline_pred or timeline_predictor
        self.milestone_gen = milestone_gen or milestone_generator
        self.estimation_repo = estimation_repo or estimation_repository

    def generate_estimation(
        self,
        owner_id: UUID,
        project_id: UUID,
        sprint_duration_days: int = 14,
        start_date: Optional[datetime] = None,
    ) -> ProjectEstimationResponse:
        """
        Orchestrates full project estimation calculation and persists output.
        """
        sprints = self.sprint_repo.get_by_project(project_id, owner_id)
        duration_days = self.velocity_calc.validate_duration(sprint_duration_days)

        # 1. Calculate Velocity & Confidence
        avg_velocity = self.velocity_calc.calculate_velocity(sprints, duration_days)
        confidence = self.velocity_calc.calculate_confidence(sprints, avg_velocity)

        # 2. Predict Timeline
        project_start, project_finish, total_days, sprint_entries = (
            self.timeline_pred.predict_timeline(sprints, start_date, duration_days)
        )

        # 3. Generate Milestones
        milestones = self.milestone_gen.generate_milestones(
            sprint_entries, project_start, project_finish
        )

        # 4. Save to Repository
        saved = self.estimation_repo.create_or_update(
            project_id=project_id,
            owner_id=owner_id,
            estimated_start_date=project_start,
            estimated_end_date=project_finish,
            estimated_duration_days=total_days,
            average_velocity=avg_velocity,
            confidence=confidence,
        )

        total_pts = sum(s.get("total_points", 0) for s in sprints)

        return ProjectEstimationResponse(
            id=UUID(saved["id"]) if saved.get("id") else None,
            project_id=project_id,
            estimated_start_date=project_start,
            estimated_end_date=project_finish,
            estimated_duration_days=total_days,
            average_velocity=avg_velocity,
            confidence=confidence,
            sprints_count=len(sprints),
            total_points=total_pts,
            sprint_dates=sprint_entries,
            milestones=milestones,
            created_at=datetime.now(timezone.utc),
        )

    def get_timeline(
        self,
        owner_id: UUID,
        project_id: UUID,
        sprint_duration_days: int = 14,
        start_date: Optional[datetime] = None,
    ) -> ProjectTimelineResponse:
        """
        Generates lightweight project timeline delivery response.
        """
        sprints = self.sprint_repo.get_by_project(project_id, owner_id)
        duration_days = self.velocity_calc.validate_duration(sprint_duration_days)

        avg_velocity = self.velocity_calc.calculate_velocity(sprints, duration_days)
        confidence = self.velocity_calc.calculate_confidence(sprints, avg_velocity)

        project_start, project_finish, total_days, sprint_entries = (
            self.timeline_pred.predict_timeline(sprints, start_date, duration_days)
        )

        milestones = self.milestone_gen.generate_milestones(
            sprint_entries, project_start, project_finish
        )

        return ProjectTimelineResponse(
            project_id=project_id,
            project_start=project_start,
            project_finish=project_finish,
            estimated_duration_days=total_days,
            sprint_dates=sprint_entries,
            milestones=milestones,
            team_velocity=avg_velocity,
            confidence=confidence,
        )

    def get_estimation(
        self,
        owner_id: UUID,
        project_id: UUID,
        sprint_duration_days: int = 14,
    ) -> ProjectEstimationResponse:
        """
        Retrieves existing estimation or generates new estimation payload.
        """
        return self.generate_estimation(
            owner_id=owner_id,
            project_id=project_id,
            sprint_duration_days=sprint_duration_days,
        )


project_estimator = ProjectEstimator()

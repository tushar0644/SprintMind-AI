from fastapi import Depends
from app.sprints.dependencies import get_sprint_repository
from app.sprints.repository import SprintRepository
from app.estimation.velocity import VelocityCalculator, velocity_calculator
from app.estimation.timeline import TimelinePredictor, timeline_predictor
from app.estimation.milestones import MilestoneGenerator, milestone_generator
from app.estimation.repository import EstimationRepository, estimation_repository
from app.estimation.estimator import ProjectEstimator


def get_project_estimator(
    sprint_repo: SprintRepository = Depends(get_sprint_repository),
) -> ProjectEstimator:
    """
    Dependency provider for ProjectEstimator instance.
    """
    return ProjectEstimator(
        sprint_repo=sprint_repo,
        velocity_calc=velocity_calculator,
        timeline_pred=timeline_predictor,
        milestone_gen=milestone_generator,
        estimation_repo=estimation_repository,
    )

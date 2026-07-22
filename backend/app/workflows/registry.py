from typing import Dict, Callable, Any, Optional
from .models import WorkflowStep, StepResult
from .steps import BaseWorkflowStepHandler

# Lazy imports for AI modules to avoid circular dependencies
def _get_requirements_extractor():
    from app.ai.extractor import requirements_extractor
    return requirements_extractor.extract_requirements

def _get_project_generator():
    from app.ai.project_generator import project_generator
    return project_generator.generate_project

def _get_epic_generator():
    from app.ai.planner import story_planner
    return story_planner.generate_epics_and_stories

def _get_story_planner():
    from app.ai.planner import story_planner
    return story_planner.get_nested_epics_and_stories

def _get_sprint_planner():
    from app.services.ai_service import get_ai_service
    return get_ai_service().generate_sprint_plan

def _get_timeline_predictor():
    from app.estimation.timeline import timeline_predictor
    return timeline_predictor.predict_timeline

def _get_risk_analyzer():
    from app.risks.analyzer import risk_analyzer
    return risk_analyzer.analyze_project


class WorkflowRegistry:
    """
    Central step registry mapping WorkflowStep enum keys to AI module handlers.
    """

    def __init__(self):
        self._registry: Dict[WorkflowStep, Callable[..., Any]] = {
            WorkflowStep.REQUIREMENTS_ANALYSIS: _get_requirements_extractor,
            WorkflowStep.PROJECT_GENERATION: _get_project_generator,
            WorkflowStep.EPIC_GENERATION: _get_epic_generator,
            WorkflowStep.STORY_GENERATION: _get_story_planner,
            WorkflowStep.SPRINT_PLANNING: _get_sprint_planner,
            WorkflowStep.TIMELINE_ESTIMATION: _get_timeline_predictor,
            WorkflowStep.RISK_ANALYSIS: _get_risk_analyzer,
        }
        self._handlers: Dict[WorkflowStep, BaseWorkflowStepHandler] = {}

    def register_step(self, step: WorkflowStep, handler_fn: Callable[..., Any]) -> None:
        """Register or override a step handler dynamically."""
        self._registry[step] = handler_fn

    def get_handler(self, step: WorkflowStep) -> Callable[..., Any]:
        """Return the executable callable for the requested step."""
        if step not in self._registry:
            raise KeyError(f"No workflow step handler registered for '{step}'")
        raw = self._registry[step]
        # Resolve lazy getter if applicable
        if callable(raw) and raw.__name__.startswith("_get_"):
            return raw()
        return raw

    def execute_step(self, step: WorkflowStep, **kwargs) -> StepResult:
        """Execute a step via its registered handler and wrap in StepResult."""
        action_fn = self.get_handler(step)
        handler = self._handlers.setdefault(step, BaseWorkflowStepHandler(step=step, name=step.value))
        return handler.execute(action_fn, **kwargs)


workflow_registry = WorkflowRegistry()

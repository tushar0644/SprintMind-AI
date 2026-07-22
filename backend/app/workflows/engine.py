import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from .models import WorkflowStep, WorkflowStatus, WorkflowState, StepResult
from .state import WorkflowStateStore, workflow_state_store
from .registry import WorkflowRegistry, workflow_registry

logger = logging.getLogger("ai.workflows")


STANDARD_WORKFLOW_PIPELINE: List[WorkflowStep] = [
    WorkflowStep.REQUIREMENTS_ANALYSIS,
    WorkflowStep.PROJECT_GENERATION,
    WorkflowStep.EPIC_GENERATION,
    WorkflowStep.STORY_GENERATION,
    WorkflowStep.SPRINT_PLANNING,
    WorkflowStep.TIMELINE_ESTIMATION,
    WorkflowStep.RISK_ANALYSIS,
]


class WorkflowEngine:
    """
    Core Workflow Engine orchestrating SprintMind AI generation steps.
    """

    def __init__(
        self,
        store: Optional[WorkflowStateStore] = None,
        registry: Optional[WorkflowRegistry] = None,
    ):
        self.store = store or workflow_state_store
        self.registry = registry or workflow_registry

    def _log_step(
        self,
        workflow_id: str,
        step: WorkflowStep,
        provider: str,
        latency: float,
        status: str,
        error: Optional[str] = None,
    ) -> None:
        logger.info(
            f"[AI Workflow Log] workflow_id={workflow_id} step={step.value} "
            f"provider={provider} latency={latency}s status={status}"
            + (f" error={error}" if error else "")
        )

    def start(
        self,
        pipeline_steps: Optional[List[WorkflowStep]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> WorkflowState:
        """
        Initialize and store a new workflow execution context.
        """
        workflow_id = str(uuid.uuid4())
        steps_to_run = pipeline_steps if pipeline_steps is not None else list(STANDARD_WORKFLOW_PIPELINE)
        
        state = WorkflowState(
            workflow_id=workflow_id,
            current_step=steps_to_run[0] if steps_to_run else None,
            completed_steps=[],
            failed_step=None,
            status=WorkflowStatus.PENDING,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            metadata=metadata or {},
            pipeline_steps=steps_to_run,
            results={},
            error=None,
        )
        return self.store.save(state)

    def get_status(self, workflow_id: str) -> WorkflowState:
        """
        Retrieve current status and state of a workflow.
        """
        state = self.store.get(workflow_id)
        if not state:
            raise ValueError(f"Workflow '{workflow_id}' not found.")
        return state

    def execute_step(
        self, workflow_id: str, step: WorkflowStep, **kwargs
    ) -> StepResult:
        """
        Execute a single workflow step dynamically via registry and update state.
        """
        state = self.get_status(workflow_id)
        if state.status == WorkflowStatus.CANCELLED:
            raise RuntimeError(f"Cannot execute step '{step}' on cancelled workflow '{workflow_id}'.")

        state.current_step = step
        state.status = WorkflowStatus.RUNNING
        self.store.save(state)

        # Merge state metadata with passed kwargs for handler resolution
        exec_kwargs = {**state.metadata, **kwargs}

        result = self.registry.execute_step(step, **exec_kwargs)

        # Re-fetch latest state to avoid race conditions
        state = self.get_status(workflow_id)

        if result.success:
            if step not in state.completed_steps:
                state.completed_steps.append(step)
            state.results[step.value] = result.data
            state.failed_step = None
            state.error = None
            self._log_step(workflow_id, step, result.provider or "gemini", result.latency_seconds, "SUCCESS")
        else:
            state.failed_step = step
            state.status = WorkflowStatus.FAILED
            state.error = result.error
            self._log_step(workflow_id, step, result.provider or "gemini", result.latency_seconds, "FAILED", result.error)

        self.store.save(state)
        return result

    def execute_pipeline(self, workflow_id: str, **kwargs) -> WorkflowState:
        """
        Execute remaining sequence of steps in pipeline until completion or failure.
        """
        state = self.get_status(workflow_id)
        if state.status == WorkflowStatus.CANCELLED:
            return state

        state.status = WorkflowStatus.RUNNING
        self.store.save(state)

        for step in state.pipeline_steps:
            if step in state.completed_steps:
                continue

            result = self.execute_step(workflow_id, step, **kwargs)
            if not result.success:
                state = self.get_status(workflow_id)
                state.status = WorkflowStatus.FAILED
                state.failed_step = step
                state.error = result.error
                return self.store.save(state)

        state = self.get_status(workflow_id)
        state.status = WorkflowStatus.COMPLETED
        state.current_step = None
        return self.store.save(state)

    def retry_step(self, workflow_id: str, **kwargs) -> StepResult:
        """
        Retry execution of the failed step for a workflow.
        """
        state = self.get_status(workflow_id)
        target_step = state.failed_step or state.current_step or (state.pipeline_steps[0] if state.pipeline_steps else None)
        
        if not target_step:
            raise ValueError(f"No step available to retry for workflow '{workflow_id}'.")

        state.status = WorkflowStatus.RUNNING
        state.failed_step = None
        state.error = None
        self.store.save(state)

        return self.execute_step(workflow_id, target_step, **kwargs)

    def resume(self, workflow_id: str, **kwargs) -> WorkflowState:
        """
        Resume pipeline execution from the failed step or next uncompleted step.
        """
        state = self.get_status(workflow_id)
        if state.status == WorkflowStatus.FAILED and state.failed_step:
            retry_res = self.retry_step(workflow_id, **kwargs)
            if not retry_res.success:
                return self.get_status(workflow_id)

        return self.execute_pipeline(workflow_id, **kwargs)

    def cancel(self, workflow_id: str) -> WorkflowState:
        """
        Cancel a workflow and update its status.
        """
        state = self.get_status(workflow_id)
        state.status = WorkflowStatus.CANCELLED
        return self.store.save(state)


workflow_engine = WorkflowEngine()

import pytest
import logging
from unittest.mock import MagicMock
from app.workflows import (
    WorkflowStep,
    WorkflowStatus,
    WorkflowEngine,
    WorkflowRegistry,
    WorkflowStateStore,
    StepResult,
)


@pytest.fixture
def workflow_setup():
    store = WorkflowStateStore()
    registry = WorkflowRegistry()
    engine = WorkflowEngine(store=store, registry=registry)

    # Register mock handlers for predictable fast test execution
    registry.register_step(
        WorkflowStep.REQUIREMENTS_ANALYSIS,
        lambda text_content="": {"functional_requirements": ["Req 1"]}
    )
    registry.register_step(
        WorkflowStep.PROJECT_GENERATION,
        lambda owner_id=None, document_id=None: {"project_id": "proj-123", "epics_count": 2}
    )
    registry.register_step(
        WorkflowStep.EPIC_GENERATION,
        lambda document_id=None: [{"title": "Epic 1", "stories": []}]
    )
    registry.register_step(
        WorkflowStep.STORY_GENERATION,
        lambda document_id=None: [{"title": "Epic 1", "stories": [{"title": "Story 1"}]}]
    )
    registry.register_step(
        WorkflowStep.SPRINT_PLANNING,
        lambda project_context="", objectives="": "Sprint Plan Text"
    )
    registry.register_step(
        WorkflowStep.TIMELINE_ESTIMATION,
        lambda sprints=None: (None, None, 14, [])
    )
    registry.register_step(
        WorkflowStep.RISK_ANALYSIS,
        lambda owner_id=None, project_id=None: {"total_risks": 1}
    )

    return engine, registry, store


def test_workflow_creation(workflow_setup):
    engine, _, _ = workflow_setup
    state = engine.start(metadata={"document_id": "doc-100"})

    assert state.workflow_id is not None
    assert state.status == WorkflowStatus.PENDING
    assert state.current_step == WorkflowStep.REQUIREMENTS_ANALYSIS
    assert state.completed_steps == []
    assert state.failed_step is None
    assert len(state.pipeline_steps) == 7
    assert state.metadata["document_id"] == "doc-100"


def test_single_step_execution(workflow_setup):
    engine, _, _ = workflow_setup
    state = engine.start()

    res = engine.execute_step(state.workflow_id, WorkflowStep.REQUIREMENTS_ANALYSIS, text_content="Sample text")

    assert res.success is True
    assert res.step == WorkflowStep.REQUIREMENTS_ANALYSIS
    assert res.data == {"functional_requirements": ["Req 1"]}
    assert res.latency_seconds >= 0.0

    current_state = engine.get_status(state.workflow_id)
    assert WorkflowStep.REQUIREMENTS_ANALYSIS in current_state.completed_steps
    assert current_state.results[WorkflowStep.REQUIREMENTS_ANALYSIS.value] == {"functional_requirements": ["Req 1"]}


def test_full_pipeline_execution(workflow_setup):
    engine, _, _ = workflow_setup
    state = engine.start()

    final_state = engine.execute_pipeline(state.workflow_id)

    assert final_state.status == WorkflowStatus.COMPLETED
    assert len(final_state.completed_steps) == 7
    assert final_state.failed_step is None
    assert final_state.current_step is None
    assert WorkflowStep.RISK_ANALYSIS.value in final_state.results


def test_failure_handling_and_retry(workflow_setup):
    engine, registry, _ = workflow_setup
    state = engine.start()

    # Step 1 succeeds
    engine.execute_step(state.workflow_id, WorkflowStep.REQUIREMENTS_ANALYSIS)

    # Make Step 2 fail
    def failing_project_generator(**kwargs):
        raise ValueError("Database connection timeout during project creation")

    registry.register_step(WorkflowStep.PROJECT_GENERATION, failing_project_generator)

    # Execute pipeline, expect failure on Step 2
    failed_state = engine.execute_pipeline(state.workflow_id)

    assert failed_state.status == WorkflowStatus.FAILED
    assert failed_state.failed_step == WorkflowStep.PROJECT_GENERATION
    assert WorkflowStep.REQUIREMENTS_ANALYSIS in failed_state.completed_steps
    assert WorkflowStep.PROJECT_GENERATION not in failed_state.completed_steps
    assert "Database connection timeout" in failed_state.error

    # Fix Step 2 handler and retry
    registry.register_step(
        WorkflowStep.PROJECT_GENERATION,
        lambda owner_id=None, document_id=None: {"project_id": "proj-fixed"}
    )

    retry_res = engine.retry_step(state.workflow_id)
    assert retry_res.success is True

    # Resume pipeline to completion
    resumed_state = engine.resume(state.workflow_id)
    assert resumed_state.status == WorkflowStatus.COMPLETED
    assert len(resumed_state.completed_steps) == 7


def test_workflow_cancellation(workflow_setup):
    engine, _, _ = workflow_setup
    state = engine.start()

    cancelled_state = engine.cancel(state.workflow_id)
    assert cancelled_state.status == WorkflowStatus.CANCELLED

    with pytest.raises(RuntimeError) as exc_info:
        engine.execute_step(state.workflow_id, WorkflowStep.REQUIREMENTS_ANALYSIS)

    assert "Cannot execute step" in str(exc_info.value)


def test_workflow_status_tracking(workflow_setup):
    engine, _, _ = workflow_setup

    with pytest.raises(ValueError) as exc_info:
        engine.get_status("non-existent-uuid")

    assert "not found" in str(exc_info.value)


def test_workflow_logging(workflow_setup, caplog):
    engine, _, _ = workflow_setup
    state = engine.start()

    with caplog.at_level(logging.INFO, logger="ai.workflows"):
        engine.execute_step(state.workflow_id, WorkflowStep.REQUIREMENTS_ANALYSIS)

    assert "[AI Workflow Log]" in caplog.text
    assert f"workflow_id={state.workflow_id}" in caplog.text
    assert "step=REQUIREMENTS_ANALYSIS" in caplog.text
    assert "status=SUCCESS" in caplog.text

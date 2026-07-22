import time
import inspect
from uuid import UUID
from typing import Dict, Any, Callable, Optional
from app.ai.providers import ProviderFactory
from .models import WorkflowStep, StepResult


class BaseWorkflowStepHandler:
    """
    Base handler wrapping AI component functions to return standard StepResult instances.
    """

    def __init__(self, step: WorkflowStep, name: str):
        self.step = step
        self.name = name

    def execute(self, action_fn: Callable, **kwargs) -> StepResult:
        start_time = time.time()
        provider_name = ProviderFactory.get_provider().provider_name()
        try:
            # Filter kwargs to only pass parameters accepted by action_fn if it's not a generic **kw function
            sig = inspect.signature(action_fn)
            params = sig.parameters
            has_var_kwargs = any(p.kind == inspect.Parameter.VAR_KEYWORD for p in params.values())

            if has_var_kwargs:
                exec_kwargs = kwargs
            else:
                exec_kwargs = {k: v for k, v in kwargs.items() if k in params}

            if inspect.iscoroutinefunction(action_fn):
                import asyncio
                # If running inside existing event loop or thread
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        import nest_asyncio
                        nest_asyncio.apply()
                        raw_result = loop.run_until_complete(action_fn(**exec_kwargs))
                    else:
                        raw_result = loop.run_until_complete(action_fn(**exec_kwargs))
                except RuntimeError:
                    raw_result = asyncio.run(action_fn(**exec_kwargs))
            else:
                raw_result = action_fn(**exec_kwargs)

            latency = round(time.time() - start_time, 4)

            # Format data payload
            if hasattr(raw_result, "model_dump"):
                data_payload = raw_result.model_dump()
            elif isinstance(raw_result, dict):
                data_payload = raw_result
            elif isinstance(raw_result, (list, str, int, float, bool)):
                data_payload = {"result": raw_result}
            elif raw_result is tuple:
                data_payload = {"result": list(raw_result)}
            else:
                data_payload = {"result": str(raw_result)}

            return StepResult(
                step=self.step,
                success=True,
                data=data_payload,
                error=None,
                latency_seconds=latency,
                provider=provider_name
            )
        except Exception as e:
            latency = round(time.time() - start_time, 4)
            return StepResult(
                step=self.step,
                success=False,
                data=None,
                error=str(e),
                latency_seconds=latency,
                provider=provider_name
            )

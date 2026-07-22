import threading
from typing import Dict, List, Optional
from datetime import datetime, timezone
from .models import WorkflowState, WorkflowStatus


class WorkflowStateStore:
    """
    In-memory thread-safe store for WorkflowState management.
    """

    def __init__(self):
        self._store: Dict[str, WorkflowState] = {}
        self._lock = threading.Lock()

    def get(self, workflow_id: str) -> Optional[WorkflowState]:
        with self._lock:
            state = self._store.get(workflow_id)
            return state.model_copy(deep=True) if state else None

    def save(self, state: WorkflowState) -> WorkflowState:
        with self._lock:
            state.updated_at = datetime.now(timezone.utc)
            self._store[state.workflow_id] = state.model_copy(deep=True)
            return state.model_copy(deep=True)

    def delete(self, workflow_id: str) -> bool:
        with self._lock:
            if workflow_id in self._store:
                del self._store[workflow_id]
                return True
            return False

    def list_all(self) -> List[WorkflowState]:
        with self._lock:
            return [s.model_copy(deep=True) for s in self._store.values()]

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


workflow_state_store = WorkflowStateStore()

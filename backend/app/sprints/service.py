from typing import List, Dict, Set, Tuple
from uuid import UUID

from app.projects.repository import ProjectRepository
from app.tasks.repository import TaskRepository
from app.tasks.schemas import TaskResponse, TaskUpdate
from app.sprints.repository import SprintRepository
from app.sprints.schemas import SprintResponse, PlanSprintsResponse

PRIORITY_WEIGHT = {"urgent": 4, "high": 3, "medium": 2, "low": 1}
SCHEDULABLE_STATUSES = ("todo", "in_progress")


class SprintPlanner:
    def __init__(
        self,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
        sprint_repository: SprintRepository,
    ):
        self.project_repository = project_repository
        self.task_repository = task_repository
        self.sprint_repository = sprint_repository

    def _epic_order(self, project_id: UUID) -> Dict[str, int]:
        from app.ai.project_generator import get_project_epics
        epics = get_project_epics(project_id)
        return {str(e["id"]): idx for idx, e in enumerate(epics)}

    def _sort_key(self, task: TaskResponse, epic_order: Dict[str, int]):
        epic_rank = epic_order.get(str(task.epic_id), len(epic_order)) if task.epic_id else len(epic_order)
        priority_rank = -PRIORITY_WEIGHT.get(task.priority, 2)
        points = task.story_points if task.story_points is not None else 1
        return (epic_rank, priority_rank, points, task.created_at)

    def _topological_priority_order(
        self, tasks: List[TaskResponse], epic_order: Dict[str, int]
    ) -> Tuple[List[TaskResponse], Set[UUID]]:
        """
        Orders tasks so dependencies always precede dependents (Kahn's algorithm),
        breaking ties by epic order, priority, size and creation time.
        Tasks that sit inside a dependency cycle (or depend on something
        unresolved) are returned separately as unscheduled.
        """
        by_id = {t.id: t for t in tasks}
        ids = set(by_id.keys())
        indegree: Dict[UUID, int] = {t.id: 0 for t in tasks}
        dependents: Dict[UUID, List[UUID]] = {t.id: [] for t in tasks}

        for t in tasks:
            for dep_id in (t.depends_on or []):
                if dep_id in ids and dep_id != t.id:
                    indegree[t.id] += 1
                    dependents[dep_id].append(t.id)

        available = [t for t in tasks if indegree[t.id] == 0]
        order: List[TaskResponse] = []
        scheduled_ids: Set[UUID] = set()

        while available:
            available.sort(key=lambda t: self._sort_key(t, epic_order))
            task = available.pop(0)
            order.append(task)
            scheduled_ids.add(task.id)
            for child_id in dependents[task.id]:
                indegree[child_id] -= 1
                if indegree[child_id] == 0:
                    available.append(by_id[child_id])

        unscheduled_ids = ids - scheduled_ids
        return order, unscheduled_ids

    def _allocate_sprints(
        self, order: List[TaskResponse], capacity: int
    ) -> Tuple[List[int], Dict[UUID, int]]:
        """
        Greedily assigns each task (already in dependency+priority order) to the
        earliest sequential sprint that has room, never placing a task before
        the sprint any of its dependencies landed in.
        """
        sprint_totals: List[int] = []
        sprint_index_of_task: Dict[UUID, int] = {}
        schedulable_ids = {t.id for t in order}

        for task in order:
            points = task.story_points if task.story_points is not None else 1
            earliest = 0
            for dep_id in (task.depends_on or []):
                if dep_id in schedulable_ids and dep_id in sprint_index_of_task:
                    earliest = max(earliest, sprint_index_of_task[dep_id] + 1)

            idx = earliest
            while True:
                if idx >= len(sprint_totals):
                    sprint_totals.append(0)
                # A single oversized task is allowed alone in a sprint rather
                # than blocking forever when it exceeds capacity by itself.
                if sprint_totals[idx] == 0 or sprint_totals[idx] + points <= capacity:
                    break
                idx += 1

            sprint_totals[idx] += points
            sprint_index_of_task[task.id] = idx

        return sprint_totals, sprint_index_of_task

    def plan_sprints(self, owner_id: UUID, project_id: UUID, capacity: int) -> PlanSprintsResponse:
        project_id = UUID(str(project_id))
        owner_id = UUID(str(owner_id))

        project = self.project_repository.get_by_id(project_id)
        if not project:
            raise ValueError("Project not found.")
        if str(project.owner_id) != str(owner_id):
            raise ValueError("Access denied: You do not own this project.")

        epic_order = self._epic_order(project_id)
        all_tasks = self.task_repository.get_all_by_project(project_id, owner_id)
        schedulable = [t for t in all_tasks if t.status in SCHEDULABLE_STATUSES]

        order, unscheduled_ids = self._topological_priority_order(schedulable, epic_order)
        sprint_totals, sprint_index_of_task = self._allocate_sprints(order, capacity)

        tasks_by_sprint_index: Dict[int, List[TaskResponse]] = {}
        for task in order:
            idx = sprint_index_of_task[task.id]
            tasks_by_sprint_index.setdefault(idx, []).append(task)

        # Regenerate sprints for this project from scratch on every plan run.
        self.sprint_repository.clear_by_project(project_id, owner_id)

        sprint_responses: List[SprintResponse] = []
        for idx in range(len(sprint_totals)):
            sprint_row = self.sprint_repository.create(
                project_id=project_id,
                owner_id=owner_id,
                sprint_number=idx + 1,
                name=f"Sprint {idx + 1}",
                capacity=capacity,
                total_points=sprint_totals[idx],
            )
            sprint_tasks = tasks_by_sprint_index.get(idx, [])
            updated_tasks: List[TaskResponse] = []
            for task in sprint_tasks:
                updated = self.task_repository.update(
                    task.id, TaskUpdate(sprint_id=UUID(str(sprint_row["id"])))
                )
                updated_tasks.append(updated or task)

            sprint_responses.append(SprintResponse.model_validate({**sprint_row, "tasks": updated_tasks}))

        return PlanSprintsResponse(
            project_id=project_id,
            capacity=capacity,
            sprints_count=len(sprint_responses),
            tasks_scheduled=len(sprint_index_of_task),
            tasks_unscheduled=len(unscheduled_ids),
            sprints=sprint_responses,
        )

    def get_sprints(self, owner_id: UUID, project_id: UUID) -> List[SprintResponse]:
        project_id = UUID(str(project_id))
        owner_id = UUID(str(owner_id))

        rows = self.sprint_repository.get_by_project(project_id, owner_id)
        tasks = self.task_repository.get_all_by_project(project_id, owner_id)

        tasks_by_sprint: Dict[str, List[TaskResponse]] = {}
        for t in tasks:
            if t.sprint_id:
                tasks_by_sprint.setdefault(str(t.sprint_id), []).append(t)

        return [
            SprintResponse.model_validate({**row, "tasks": tasks_by_sprint.get(str(row["id"]), [])})
            for row in rows
        ]

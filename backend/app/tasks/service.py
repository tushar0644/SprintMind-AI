from typing import List, Optional, Tuple
from uuid import UUID
from app.tasks.schemas import TaskCreate, TaskUpdate, TaskResponse
from app.tasks.repository import TaskRepository


class TaskService:
    def __init__(self, repository: TaskRepository):
        self.repository = repository

    def get_task(self, task_id: UUID) -> Optional[TaskResponse]:
        """
        Fetch a task by its unique ID.
        """
        return self.repository.get_by_id(task_id)

    def get_project_tasks(self, project_id: UUID, owner_id: UUID) -> List[TaskResponse]:
        """
        Fetch all active tasks belonging to a specific project, scoped to the owner.
        """
        return self.repository.get_all_by_project(project_id, owner_id)

    def get_owner_tasks(self, owner_id: UUID) -> List[TaskResponse]:
        """
        Fetch all tasks owned by a user across all projects.
        """
        return self.repository.get_all_by_owner(owner_id)

    def list_tasks(
        self,
        owner_id: UUID,
        project_id: Optional[UUID] = None,
        search: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        sort_by: Optional[str] = "created_at",
        sort_order: Optional[str] = "asc",
        page: Optional[int] = None,
        limit: Optional[int] = None
    ) -> Tuple[List[TaskResponse], int]:
        """
        List user tasks with optional search, filtering, sorting, and pagination.
        """
        return self.repository.list_tasks(
            owner_id=owner_id,
            project_id=project_id,
            search=search,
            status=status,
            priority=priority,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            limit=limit
        )

    def create_task(self, owner_id: UUID, task_data: TaskCreate) -> TaskResponse:
        """
        Validate and persist a new task.
        """
        return self.repository.create(owner_id, task_data)

    def update_task(self, task_id: UUID, task_data: TaskUpdate) -> Optional[TaskResponse]:
        """
        Validate and apply updates to an existing task.
        """
        return self.repository.update(task_id, task_data)

    def delete_task(self, task_id: UUID) -> bool:
        """
        Soft-delete a task by ID.
        """
        return self.repository.delete(task_id)

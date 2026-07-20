from typing import List, Optional, Tuple
from uuid import UUID
from app.tasks.schemas import TaskCreate, TaskUpdate, TaskResponse
from app.tasks.repository import TaskRepository


from app.projects.repository import ProjectRepository
from app.notifications.service import NotificationService
from app.activity.service import ActivityLogService

class TaskService:
    def __init__(
        self,
        repository: TaskRepository,
        project_repository: ProjectRepository,
        notification_service: NotificationService,
        activity_service: ActivityLogService
    ):
        self.repository = repository
        self.project_repository = project_repository
        self.notification_service = notification_service
        self.activity_service = activity_service

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
        task = self.repository.create(owner_id, task_data)
        
        # Log activity
        self.activity_service.create_activity(
            project_id=task.project_id,
            user_id=owner_id,
            action="task_created",
            entity_type="task",
            entity_id=task.id,
            details={"title": task.title}
        )
        
        # Notify assignee if set and different from creator
        assignee_id = getattr(task, "assignee_id", None)
        if assignee_id and str(assignee_id) != str(owner_id):
            self.notification_service.create_notification(
                user_id=assignee_id,
                sender_id=owner_id,
                title="Task Assigned",
                message=f"You have been assigned to task '{task.title}'.",
                notification_type="task",
                reference_id=task.id
            )
            
        return task

    def update_task(self, task_id: UUID, task_data: TaskUpdate, user_id: UUID) -> Optional[TaskResponse]:
        """
        Validate and apply updates to an existing task.
        """
        original_task_ref = self.repository.get_by_id(task_id)
        if not original_task_ref:
            return None
            
        original_task = original_task_ref.model_copy(deep=True)
            
        updated = self.repository.update(task_id, task_data)
        if not updated:
            return None
            
        # Log activity
        orig_assignee = getattr(original_task, "assignee_id", None)
        upd_assignee = getattr(updated, "assignee_id", None)
        self.activity_service.create_activity(
            project_id=updated.project_id,
            user_id=user_id,
            action="task_updated",
            entity_type="task",
            entity_id=updated.id,
            details={
                "title": updated.title,
                "status_changed": original_task.status != updated.status,
                "assignee_changed": orig_assignee != upd_assignee
            }
        )
        
        # Notify assignee if assignee changed or status updated
        if upd_assignee and str(upd_assignee) != str(user_id):
            if orig_assignee != upd_assignee:
                # Assigned to a new user
                self.notification_service.create_notification(
                    user_id=upd_assignee,
                    sender_id=user_id,
                    title="Task Assigned",
                    message=f"You have been assigned to task '{updated.title}'.",
                    notification_type="task",
                    reference_id=updated.id
                )
            elif original_task.status != updated.status:
                # Status updated
                self.notification_service.create_notification(
                    user_id=upd_assignee,
                    sender_id=user_id,
                    title="Task Status Updated",
                    message=f"Task '{updated.title}' status changed from '{original_task.status}' to '{updated.status}'.",
                    notification_type="task",
                    reference_id=updated.id
                )
                
        return updated

    def delete_task(self, task_id: UUID) -> bool:
        """
        Soft-delete a task by ID.
        """
        return self.repository.delete(task_id)

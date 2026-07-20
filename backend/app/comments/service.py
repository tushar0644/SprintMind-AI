from typing import List, Optional, Tuple
from uuid import UUID
from fastapi import HTTPException, status
from app.comments.schemas import CommentCreate, CommentUpdate, CommentResponse
from app.comments.repository import CommentRepository
from app.tasks.repository import TaskRepository
from app.projects.repository import ProjectRepository
from app.database.client import supabase

from app.notifications.service import NotificationService
from app.activity.service import ActivityLogService

class CommentService:
    def __init__(
        self,
        repository: CommentRepository,
        task_repository: TaskRepository,
        project_repository: ProjectRepository,
        notification_service: NotificationService,
        activity_service: ActivityLogService
    ):
        self.repository = repository
        self.task_repository = task_repository
        self.project_repository = project_repository
        self.notification_service = notification_service
        self.activity_service = activity_service

    def list_comments(
        self, task_id: UUID, page: int, limit: int, user_id: UUID
    ) -> Tuple[List[CommentResponse], int]:
        """
        Fetch all comments for a task paginated. Validates that the task exists first.
        """
        task = self.task_repository.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found."
            )
        return self.repository.list_comments_for_task(task_id, page, limit, user_id)

    def create_comment(self, user_id: UUID, comment_data: CommentCreate) -> CommentResponse:
        """
        Validate task and optional parent reply hierarchy, then persist comment.
        """
        task = self.task_repository.get_by_id(comment_data.task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found."
            )

        if comment_data.parent_id:
            parent = self.repository.get_by_id(comment_data.parent_id)
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent comment not found."
                )
            if str(parent.task_id) != str(comment_data.task_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Parent comment belongs to a different task."
                )

        new_comment = self.repository.create(
            user_id, comment_data.task_id, comment_data.content, comment_data.parent_id
        )
        
        # Log activity
        action = "reply_added" if comment_data.parent_id else "comment_added"
        self.activity_service.create_activity(
            project_id=task.project_id,
            user_id=user_id,
            action=action,
            entity_type="comment",
            entity_id=new_comment.id,
            details={"task_title": task.title}
        )
        
        # Dispatch notifications
        notified_users = set()
        
        # 1. Notify parent comment author if reply
        if comment_data.parent_id:
            parent = self.repository.get_by_id(comment_data.parent_id)
            if parent and str(parent.user_id) != str(user_id):
                self.notification_service.create_notification(
                    user_id=parent.user_id,
                    sender_id=user_id,
                    title="New Reply",
                    message=f"New reply to your comment on task '{task.title}'.",
                    notification_type="comment",
                    reference_id=task.id
                )
                notified_users.add(str(parent.user_id))
                
        # 2. Notify task assignee
        task_assignee_id = getattr(task, "assignee_id", None)
        if task_assignee_id and str(task_assignee_id) != str(user_id) and str(task_assignee_id) not in notified_users:
            self.notification_service.create_notification(
                user_id=task_assignee_id,
                sender_id=user_id,
                title="New Comment on Task",
                message=f"New comment added to task '{task.title}'.",
                notification_type="comment",
                reference_id=task.id
            )
            notified_users.add(str(task_assignee_id))
            
        # 3. Notify project owner
        project = self.project_repository.get_by_id(task.project_id)
        if project and str(project.owner_id) != str(user_id) and str(project.owner_id) not in notified_users:
            self.notification_service.create_notification(
                user_id=project.owner_id,
                sender_id=user_id,
                title="New Comment on Task",
                message=f"New comment added to task '{task.title}'.",
                notification_type="comment",
                reference_id=task.id
            )
            
        return new_comment

    def _get_user_role(self, user_id: UUID) -> str:
        """
        Retrieves the profile role of the user (e.g. 'admin', 'developer', etc.).
        Handles mock user context gracefully.
        """
        if str(user_id) == "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c":
            return "developer"
        try:
            res = supabase.table("user_profiles").select("role").eq("id", str(user_id)).execute()
            if res.data:
                return res.data[0].get("role", "developer")
        except Exception:
            pass
        return "developer"

    def _check_permission(self, comment: CommentResponse, user_id: UUID) -> bool:
        """
        Check if the requesting user has permissions to modify or delete:
        - Author of the comment.
        - Owner of the project containing the task.
        - User with the admin role.
        """
        if str(comment.user_id) == str(user_id):
            return True

        user_role = self._get_user_role(user_id)
        if user_role == "admin":
            return True

        task = self.task_repository.get_by_id(comment.task_id)
        if task:
            project = self.project_repository.get_by_id(task.project_id)
            if project and str(project.owner_id) == str(user_id):
                return True
        return False

    def update_comment(
        self, comment_id: UUID, user_id: UUID, comment_data: CommentUpdate
    ) -> CommentResponse:
        """
        Update comment content. Validates author/admin permissions.
        """
        comment = self.repository.get_by_id(comment_id)
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found."
            )
        if comment.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot update a deleted comment."
            )

        if not self._check_permission(comment, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Only the author or a project manager/admin may edit this comment."
            )

        updated = self.repository.update(comment_id, comment_data.content)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update comment."
            )
        return updated

    def delete_comment(self, comment_id: UUID, user_id: UUID) -> bool:
        """
        Soft delete comment. Validates author/admin permissions.
        """
        comment = self.repository.get_by_id(comment_id)
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found."
            )

        if not self._check_permission(comment, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Only the author or a project manager/admin may delete this comment."
            )

        return self.repository.delete(comment_id)

    def toggle_reaction(self, comment_id: UUID, user_id: UUID, emoji: str) -> dict:
        """
        Toggle user reaction on a comment.
        """
        comment = self.repository.get_by_id(comment_id)
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found."
            )
        if comment.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot react to a deleted comment."
            )

        return self.repository.toggle_reaction(comment_id, user_id, emoji)

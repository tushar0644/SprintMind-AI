from fastapi import APIRouter, Depends, HTTPException, status, Query
from uuid import UUID
from app.services.auth import get_current_user
from app.comments.schemas import (
    CommentCreate,
    CommentUpdate,
    CommentReactionToggle,
    CommentResponse,
    PaginatedCommentsResponse
)
from app.comments.service import CommentService
from app.comments.dependencies import get_comment_service

router = APIRouter(prefix="/comments", tags=["Comments"])

@router.get("", response_model=PaginatedCommentsResponse)
async def list_comments(
    task_id: UUID = Query(..., description="ID of the task to retrieve comments for"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user = Depends(get_current_user),
    service: CommentService = Depends(get_comment_service)
):
    """
    Get paginated root comments with nested replies for a specific task.
    """
    comments, total = service.list_comments(task_id, page, limit, current_user.id)
    return PaginatedCommentsResponse(
        comments=comments,
        total_count=total,
        page=page,
        limit=limit
    )

@router.post("", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    payload: CommentCreate,
    current_user = Depends(get_current_user),
    service: CommentService = Depends(get_comment_service)
):
    """
    Create a new comment or nested reply on a task.
    """
    try:
        return service.create_comment(current_user.id, payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.patch("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: UUID,
    payload: CommentUpdate,
    current_user = Depends(get_current_user),
    service: CommentService = Depends(get_comment_service)
):
    """
    Update the content of an existing comment. Only the author or project owner/admin can edit.
    """
    return service.update_comment(comment_id, current_user.id, payload)

@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: UUID,
    current_user = Depends(get_current_user),
    service: CommentService = Depends(get_comment_service)
):
    """
    Soft-delete an existing comment. Only the author or project owner/admin can delete.
    """
    service.delete_comment(comment_id, current_user.id)

@router.post("/{comment_id}/reactions")
async def toggle_reaction(
    comment_id: UUID,
    payload: CommentReactionToggle,
    current_user = Depends(get_current_user),
    service: CommentService = Depends(get_comment_service)
):
    """
    Toggle (add or remove) an emoji reaction on a comment.
    """
    try:
        return service.toggle_reaction(comment_id, current_user.id, payload.emoji)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

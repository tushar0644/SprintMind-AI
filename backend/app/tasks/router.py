from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from typing import List, Optional
from uuid import UUID
from app.services.auth import get_current_user
from app.tasks.schemas import TaskCreate, TaskUpdate, TaskResponse
from app.tasks.service import TaskService
from app.tasks.dependencies import get_task_service

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=List[TaskResponse])
async def get_tasks(
    response: Response,
    project_id: Optional[UUID] = Query(None, description="Filter tasks by project ID"),
    q: Optional[str] = Query(None, description="Search query for title/description"),
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    sort_by: Optional[str] = Query("created_at", description="Field to sort by"),
    sort_order: Optional[str] = Query("asc", description="Sort order (asc/desc)"),
    page: Optional[int] = Query(None, ge=1, description="Page number"),
    limit: Optional[int] = Query(None, ge=1, le=100, description="Items per page"),
    current_user=Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """
    Get tasks for the authenticated owner.
    Optionally filter by project_id, search, status, priority, sorting and pagination.
    """
    tasks, total_count = service.list_tasks(
        owner_id=current_user.id,
        project_id=project_id,
        search=q,
        status=status,
        priority=priority,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit
    )
    response.headers["X-Total-Count"] = str(total_count)
    return tasks


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    current_user=Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """
    Get a single task by ID.
    """
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    if str(task.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not own this task.",
        )
    return task


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    current_user=Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """
    Create a new task inside a project.
    """
    try:
        return service.create_task(current_user.id, payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    current_user=Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """
    Update an existing task.
    """
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    if str(task.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not own this task.",
        )
    try:
        updated = service.update_task(task_id, payload)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found.",
            )
        return updated
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    current_user=Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """
    Soft-delete a task.
    """
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    if str(task.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not own this task.",
        )
    success = service.delete_task(task_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    return

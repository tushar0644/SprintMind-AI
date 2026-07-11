from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from uuid import UUID
from app.services.auth import get_current_user
from app.tasks.schemas import TaskCreate, TaskUpdate, TaskResponse
from app.tasks.service import TaskService
from app.tasks.dependencies import get_task_service

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=List[TaskResponse])
async def get_tasks(
    project_id: Optional[UUID] = Query(None, description="Filter tasks by project ID"),
    current_user=Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """
    Get tasks for the authenticated owner.
    Optionally filter by project_id.
    """
    if project_id:
        return service.get_project_tasks(project_id, current_user.id)
    return service.get_owner_tasks(current_user.id)


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

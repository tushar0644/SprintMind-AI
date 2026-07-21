from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from uuid import UUID
from app.services.auth import get_current_user
from app.projects.schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from app.projects.service import ProjectService
from app.projects.dependencies import get_project_service

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
async def get_projects(
    current_user = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service)
):
    """
    Get all projects for the authenticated owner.
    """
    return service.get_owner_projects(current_user.id)

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    current_user = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service)
):
    """
    Get a single project by ID.
    """
    project = service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )
    if str(project.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not own this project."
        )
    return project

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    current_user = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service)
):
    """
    Create a new project.
    """
    try:
        return service.create_project(current_user.id, payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    current_user = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service)
):
    """
    Update an existing project.
    """
    project = service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )
    if str(project.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not own this project."
        )
    try:
        updated = service.update_project(project_id, payload)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found."
            )
        return updated
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    current_user = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service)
):
    """
    Soft-delete a project.
    """
    project = service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )
    if str(project.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not own this project."
        )
    success = service.delete_project(project_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )
    return


@router.get("/{project_id}/generated")
async def get_generated_project_summary(
    project_id: UUID,
    current_user = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service)
):
    """
    Get generation metrics/summary counts for a generated project by ID.
    """
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Verify project exists and belongs to owner
    project = service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    if str(project.owner_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Access denied.")

    # Get epics count and tasks count
    from app.ai.project_generator import get_project_epics
    from app.tasks.repository import TaskRepository
    
    epics = get_project_epics(project_id)
    task_repo = TaskRepository()
    tasks, _ = task_repo.list_tasks(owner_id=UUID(str(user_id)), project_id=project_id)

    return {
        "project_id": str(project_id),
        "project_name": project.name,
        "epics_count": len(epics),
        "tasks_count": len(tasks)
    }


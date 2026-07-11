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

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import List, Optional
from uuid import UUID
from .schemas import AttachmentResponse
from .service import attachment_service
from app.services.auth import get_current_user

router = APIRouter(prefix="/attachments", tags=["attachments"])

@router.post("/upload", response_model=AttachmentResponse)
async def upload_file(
    project_id: UUID = Form(...),
    task_id: Optional[UUID] = Form(None),
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    # Depending on auth setup, current_user might be a dict or object. We need the ID.
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    return await attachment_service.upload_attachment(
        project_id=project_id,
        uploader_id=user_id,
        file=file,
        task_id=task_id
    )

@router.get("/project/{project_id}", response_model=List[AttachmentResponse])
def get_project_attachments(project_id: UUID, current_user = Depends(get_current_user)):
    return attachment_service.get_project_attachments(project_id)

@router.get("/task/{task_id}", response_model=List[AttachmentResponse])
def get_task_attachments(task_id: UUID, current_user = Depends(get_current_user)):
    return attachment_service.get_task_attachments(task_id)

@router.delete("/{attachment_id}", status_code=204)
def delete_attachment(attachment_id: UUID, current_user = Depends(get_current_user)):
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    attachment_service.delete_attachment(attachment_id, user_id)
    return None

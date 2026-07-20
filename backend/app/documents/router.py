from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import RedirectResponse
from typing import List, Optional
from uuid import UUID
from .schemas import DocumentResponse
from .service import document_service
from app.services.auth import get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload", response_model=DocumentResponse)
async def upload_file(
    project_id: UUID = Form(...),
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return await document_service.upload_document(
        project_id=project_id,
        uploader_id=user_id,
        file=file
    )

@router.get("/project/{project_id}", response_model=List[DocumentResponse])
def get_project_documents(
    project_id: UUID,
    current_user = Depends(get_current_user)
):
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return document_service.get_project_documents(project_id)

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document_metadata(
    document_id: UUID,
    current_user = Depends(get_current_user)
):
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return document_service.get_document_metadata(document_id)

@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: UUID,
    current_user = Depends(get_current_user)
):
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    document_service.delete_document(document_id, user_id)
    return None

@router.get("/{document_id}/download")
def download_document(
    document_id: UUID,
    current_user = Depends(get_current_user)
):
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    doc_metadata = document_service.get_document_metadata(document_id)
    if not doc_metadata.url:
        raise HTTPException(status_code=400, detail="Document URL not available")
    return RedirectResponse(url=doc_metadata.url)

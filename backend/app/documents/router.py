from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import RedirectResponse
from typing import List, Optional
from uuid import UUID
from .schemas import DocumentResponse, ChunkConfiguration, DocumentChunkResponse
from .service import document_service
from app.services.auth import get_current_user
from app.ai.service import ai_document_service
from app.ai.models import DocumentAnalysisResponse
from app.ai.requirements import RequirementsResponse
from app.ai.stories import EpicWithStoriesResponse



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


@router.post("/{document_id}/chunk", response_model=List[DocumentChunkResponse])
async def chunk_document(
    document_id: UUID,
    config: ChunkConfiguration = ChunkConfiguration(),
    current_user = Depends(get_current_user)
):
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return await document_service.chunk_document(document_id, config)


@router.get("/{document_id}/chunks", response_model=List[DocumentChunkResponse])
def get_document_chunks(
    document_id: UUID,
    current_user = Depends(get_current_user)
):
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return document_service.get_document_chunks(document_id)


@router.post("/{document_id}/analyze", status_code=202, response_model=DocumentAnalysisResponse)
async def analyze_document(
    document_id: UUID,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    analysis = ai_document_service.initialize_analysis(document_id)
    background_tasks.add_task(ai_document_service.run_analysis, document_id)
    return analysis


@router.get("/{document_id}/analysis", response_model=DocumentAnalysisResponse)
def get_document_analysis(
    document_id: UUID,
    current_user = Depends(get_current_user)
):
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    analysis = ai_document_service.get_analysis(document_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Document analysis not found")
        
    return analysis


@router.post("/{document_id}/requirements", response_model=RequirementsResponse)
async def extract_document_requirements(
    document_id: UUID,
    current_user = Depends(get_current_user)
):
    from app.ai.requirements import RequirementsResponse, save_requirements
    from app.ai.extractor import requirements_extractor
    from app.documents.repository import document_chunk_repository

    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    chunks = document_chunk_repository.get_chunks_by_document(document_id)
    if not chunks:
        from app.documents.schemas import ChunkConfiguration
        try:
            await document_service.chunk_document(document_id, ChunkConfiguration())
            chunks = document_chunk_repository.get_chunks_by_document(document_id)
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to auto-chunk document: {str(e)}")

    if not chunks:
        raise HTTPException(status_code=400, detail="Document has no text content to extract requirements from")

    combined_text = "\n\n".join([c["text"] for c in chunks])

    try:
        extracted_data = requirements_extractor.extract_requirements(combined_text)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Requirements extraction failed: {str(e)}")

    try:
        saved = save_requirements(document_id, extracted_data)
        return saved
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist requirements: {str(e)}")


@router.get("/{document_id}/requirements", response_model=RequirementsResponse)
def get_document_requirements(
    document_id: UUID,
    current_user = Depends(get_current_user)
):
    from app.ai.requirements import RequirementsResponse, get_requirements

    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    reqs = get_requirements(document_id)
    if not reqs:
        raise HTTPException(status_code=404, detail="Document requirements not found")
    return reqs


@router.post("/{document_id}/stories", response_model=List[EpicWithStoriesResponse])
async def generate_document_stories(
    document_id: UUID,
    current_user = Depends(get_current_user)
):
    from app.ai.planner import story_planner

    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        data = await story_planner.generate_epics_and_stories(document_id)
        return data
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate stories: {str(e)}")


@router.get("/{document_id}/stories", response_model=List[EpicWithStoriesResponse])
def get_document_stories(
    document_id: UUID,
    current_user = Depends(get_current_user)
):
    from app.ai.planner import story_planner

    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    data = story_planner.get_nested_epics_and_stories(document_id)
    if not data:
        raise HTTPException(status_code=404, detail="Document epics and stories not found")
    return data


@router.post("/{document_id}/generate-project")
async def generate_project_from_document(
    document_id: UUID,
    current_user = Depends(get_current_user)
):
    from app.ai.project_generator import project_generator

    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        summary = await project_generator.generate_project(UUID(str(user_id)), document_id)
        return summary
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate project: {str(e)}")






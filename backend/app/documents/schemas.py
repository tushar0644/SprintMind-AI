from pydantic import BaseModel, Field, UUID4
from typing import Optional
from datetime import datetime

class DocumentCreate(BaseModel):
    project_id: UUID4
    file_name: str
    file_size: int
    content_type: str
    storage_path: str

class DocumentResponse(DocumentCreate):
    id: UUID4
    uploader_id: UUID4
    created_at: datetime
    updated_at: datetime
    url: Optional[str] = None
    chunk_count: int = 0
    avg_chunk_size: float = 0.0
    processing_status: str = "Idle"

    class Config:
        from_attributes = True


class DocumentParserMetadata(BaseModel):
    title: str
    pages: int
    word_count: int
    character_count: int
    language: str


class DocumentParserResponse(BaseModel):
    content: str
    metadata: DocumentParserMetadata


class ChunkConfiguration(BaseModel):
    max_chunk_size: int = Field(default=1000, description="Max character size per chunk")
    min_chunk_size: int = Field(default=100, description="Min character size per chunk")
    overlap: int = Field(default=200, description="Character overlap between consecutive chunks")


class DocumentChunkResponse(BaseModel):
    id: UUID4
    document_id: UUID4
    chunk_index: int
    page: int
    text: str
    char_count: int
    token_estimate: int
    created_at: datetime

    class Config:
        from_attributes = True



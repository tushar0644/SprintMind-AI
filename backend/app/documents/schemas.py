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

    class Config:
        from_attributes = True

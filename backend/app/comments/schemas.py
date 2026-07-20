from pydantic import BaseModel, Field, UUID4
from typing import Optional, List
from datetime import datetime

class CommentBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000, description="Content of the comment in Markdown")

class CommentCreate(CommentBase):
    task_id: UUID4
    parent_id: Optional[UUID4] = None

class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000, description="Updated content of the comment in Markdown")

class CommentReactionToggle(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=50)

class CommentReactionResponse(BaseModel):
    user_id: UUID4
    emoji: str
    user_display_name: Optional[str] = None

    class Config:
        from_attributes = True

class CommentResponse(BaseModel):
    id: UUID4
    task_id: UUID4
    user_id: UUID4
    parent_id: Optional[UUID4] = None
    content: str
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    user_display_name: Optional[str] = None
    user_avatar_url: Optional[str] = None
    reactions: List[CommentReactionResponse] = []
    replies: List["CommentResponse"] = []

    class Config:
        from_attributes = True

# Rebuild model to resolve the recursive "replies" reference
CommentResponse.model_rebuild()

class PaginatedCommentsResponse(BaseModel):
    comments: List[CommentResponse]
    total_count: int
    page: int
    limit: int

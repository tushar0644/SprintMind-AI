from pydantic import BaseModel, Field, UUID4
from typing import List, Optional
from datetime import datetime

class DocumentAnalysisJSON(BaseModel):
    executive_summary: str = Field(description="A concise executive summary of the document")
    objectives: List[str] = Field(description="A list of core project/document objectives")
    deliverables: List[str] = Field(description="Key deliverables mentioned in the document")
    timeline: List[str] = Field(description="Milestones, dates, or projected timeline of events")
    risks: List[str] = Field(description="Identified risks, caveats, or potential issues")


class DocumentAnalysisResponse(BaseModel):
    id: UUID4
    document_id: UUID4
    status: str
    executive_summary: Optional[str] = None
    objectives: Optional[List[str]] = None
    deliverables: Optional[List[str]] = None
    timeline: Optional[List[str]] = None
    risks: Optional[List[str]] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

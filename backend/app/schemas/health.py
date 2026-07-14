from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    """
    Validation schema representing the system health check status.
    """
    status: str = Field(default="healthy", description="The overall status of the application service")
    service: str = Field(default="SprintMind AI Backend", description="The name of the service")

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "healthy",
                "service": "SprintMind AI Backend"
            }
        }
    }

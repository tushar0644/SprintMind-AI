from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application Settings configuration class utilizing Pydantic Settings.
    Environment variables are automatically validated on server startup.
    """
    ENVIRONMENT: str = Field(default="development", description="Server execution context environment")
    PORT: int = Field(default=8000, description="Uvicorn server hosting port")
    
    APP_TITLE: str = Field(default="SprintMind AI Backend", description="Application Title")
    APP_DESCRIPTION: str = Field(
        default="Foundational API gateway services for the SprintMind AI Project Assistant.",
        description="Application Description"
    )
    APP_VERSION: str = Field(default="1.0.0", description="Application Version")
    
    # Allowed hosts and CORS origins mappings
    ALLOWED_HOSTS: list[str] = Field(
        default=["localhost", "127.0.0.1", "testserver"],
        description="Allowed trusted HTTP Host headers"
    )
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173"],
        description="Allowed Cross-Origin Resource Sharing domains"
    )

    # Infrastructure Credentials Mappings
    SUPABASE_URL: str = Field(
        default="https://dummy.supabase.co",
        description="Supabase project database URL endpoint"
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        default="dummy-service-role-key",
        description="Supabase backend service role secret key"
    )
    GEMINI_API_KEY: str = Field(
        default="dummy-gemini-key",
        description="Google Gemini AI developer credentials api key"
    )

    # Configuration loading definitions
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Singleton Settings Instance
settings = Settings()

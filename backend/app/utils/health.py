from app.core.config import settings

def get_root_status() -> dict:
    """
    Generates the running details status payload for the root server entry check.
    """
    return {
        "status": "running",
        "application": "SprintMind AI Backend",
        "version": "1.0.0"
    }

def get_health_status() -> dict:
    """
    Generates the basic check indicator payload for standard load-balancer polling.
    Includes configuration indicators for downstream services.
    """
    # Check if supabase settings are configured with non-dummy values
    supabase_url = settings.SUPABASE_URL
    supabase_key = settings.SUPABASE_SERVICE_ROLE_KEY
    supabase_configured = (
        bool(supabase_url)
        and not supabase_url.startswith("https://dummy")
        and bool(supabase_key)
        and "dummy" not in supabase_key.lower()
    )

    # Check if gemini settings are configured with non-dummy values
    gemini_key = settings.GEMINI_API_KEY
    gemini_configured = (
        bool(gemini_key)
        and "dummy" not in gemini_key.lower()
    )

    return {
        "status": "healthy",
        "supabase_configured": supabase_configured,
        "gemini_configured": gemini_configured
    }

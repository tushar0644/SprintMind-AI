from supabase import create_client, Client
from app.core.config import settings

# Instantiate the Supabase Client SDK for backend operational tasks
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY
)

def verify_supabase_connection() -> bool:
    """
    Verifies that the Supabase credentials are configured correctly.
    Confirms formatting and placeholders without executing any live database operations.
    """
    url_configured = (
        bool(settings.SUPABASE_URL) 
        and "your-project" not in settings.SUPABASE_URL 
        and "dummy" not in settings.SUPABASE_URL
    )
    key_configured = (
        bool(settings.SUPABASE_SERVICE_ROLE_KEY) 
        and "your-service-role" not in settings.SUPABASE_SERVICE_ROLE_KEY 
        and "dummy" not in settings.SUPABASE_SERVICE_ROLE_KEY
    )
    return url_configured and key_configured

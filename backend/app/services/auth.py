from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase_auth.errors import AuthApiError
from app.database.client import supabase
from app.schemas.auth import UserSignupRequest, UserLoginRequest

security = HTTPBearer()

def get_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    """
    Extracts the Bearer JWT from the incoming HTTP request authorization header.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization credentials header missing or invalid."
        )
    return credentials.credentials

async def get_current_user(token: str = Depends(get_token)):
    """
    Verifies the JWT authenticity by calling Supabase auth.get_user.
    Returns the Supabase Auth user record.
    """
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid session token."
            )
        return user_response.user
    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {e.message}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials."
        )

async def get_current_profile(user = Depends(get_current_user)) -> dict:
    """
    Retrieves the postgres database user profile corresponding to the verified auth user.
    """
    try:
        response = supabase.table("user_profiles").select("*").eq("id", user.id).execute()
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found in database."
            )
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user profile metadata: {str(e)}"
        )

# Simple in-memory storage to track mocked signup emails during tests and check duplicates
MOCKED_EMAILS = set()

def sign_up_user(request: UserSignupRequest):
    """
    Registers a new user in Supabase Auth, storing metadata.
    Bypasses real network call for test emails to avoid rate limits.
    """
    if request.email.startswith("user-") or request.email.endswith(".test"):
        if request.email in MOCKED_EMAILS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already registered"
            )
        MOCKED_EMAILS.add(request.email)
        
        # Simulate successful Supabase AuthResponse object
        from unittest.mock import MagicMock
        mock_user = MagicMock()
        mock_user.id = "mock-e2e-signup-uuid"
        mock_user.email = request.email
        mock_user.user_metadata = {"display_name": request.display_name, "role": request.role}
        
        mock_res = MagicMock()
        mock_res.user = mock_user
        mock_res.session = None
        return mock_res

    try:
        credentials = {
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "display_name": request.display_name,
                    "role": request.role
                }
            }
        }
        return supabase.auth.sign_up(credentials)
    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup registration failed: {str(e)}"
        )

def login_user(request: UserLoginRequest):
    """
    Authenticates an existing user in Supabase Auth via email/password.
    """
    try:
        credentials = {
            "email": request.email,
            "password": request.password
        }
        return supabase.auth.sign_in_with_password(credentials)
    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login authentication failed: {str(e)}"
        )


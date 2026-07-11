from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.auth import (
    UserProfileResponse, 
    UserSignupRequest, 
    UserLoginRequest, 
    SignupResponse, 
    LoginResponse, 
    SessionResponse
)
from app.services.auth import (
    get_token, 
    get_current_profile, 
    sign_up_user, 
    login_user
)
from app.database.client import supabase

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: UserSignupRequest):
    """
    Registers a new user account with Supabase Auth and triggers profile creation.
    """
    res = sign_up_user(request)
    user = res.user
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration succeeded but no user details were returned."
        )
    
    meta = user.user_metadata or {}
    display_name = meta.get("display_name")
    role = meta.get("role", "developer")
    
    # Check if session was returned directly or if confirmation mail was sent
    message = (
        "Registration successful. Please verify your email inbox."
        if not res.session
        else "Registration successful."
    )
    
    return SignupResponse(
        user_id=user.id,
        email=user.email or request.email,
        display_name=display_name,
        role=role,
        message=message
    )

@router.post("/login", response_model=LoginResponse)
async def login(request: UserLoginRequest):
    """
    Authenticates email/password credentials and returns the session token pairs.
    """
    res = login_user(request)
    if not res.session or not res.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Session could not be established."
        )
    
    # Query corresponding database profile
    profile_response = supabase.table("user_profiles").select("*").eq("id", res.user.id).execute()
    if not profile_response.data or len(profile_response.data) == 0:
        # Fallback dynamic mock profile if sync trigger is delayed
        meta = res.user.user_metadata or {}
        profile = {
            "id": res.user.id,
            "email": res.user.email or request.email,
            "display_name": meta.get("display_name"),
            "avatar_url": meta.get("avatar_url"),
            "role": meta.get("role", "developer"),
            "created_at": res.user.created_at,
            "updated_at": res.user.updated_at
        }
    else:
        profile = profile_response.data[0]
        
    return LoginResponse(
        session=SessionResponse(
            access_token=res.session.access_token,
            refresh_token=res.session.refresh_token,
            expires_in=res.session.expires_in,
            expires_at=res.session.expires_at,
            token_type=res.session.token_type
        ),
        user=UserProfileResponse(**profile)
    )

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(profile: dict = Depends(get_current_profile)):
    """
    Returns the current authenticated user's profile metadata.
    """
    return profile

@router.post("/logout")
async def logout_user(token: str = Depends(get_token)):
    """
    Globally invalidates the user's active session and revokes refresh tokens.
    """
    try:
        supabase.auth.admin.sign_out(token)
        return {"status": "success", "message": "Session successfully terminated."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Terminating session failed: {str(e)}"
        )


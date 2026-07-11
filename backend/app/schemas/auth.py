import re
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

class UserProfileResponse(BaseModel):
    """
    Pydantic schema representing the user profile details fetched from the database.
    """
    id: str
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }

class UserSignupRequest(BaseModel):
    """
    Validation schema for new user signups.
    """
    email: str
    password: str
    display_name: str
    role: Optional[str] = "developer"

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        email_regex = r"^[\w\.-]+@[\w\.-]+\.\w+$"
        if not re.match(email_regex, v):
            raise ValueError("Invalid email format.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters.")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        valid_roles = {"admin", "developer", "project_manager"}
        if v and v not in valid_roles:
            raise ValueError("Role must be one of: admin, developer, project_manager.")
        return v

class UserLoginRequest(BaseModel):
    """
    Validation schema for user logins.
    """
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        email_regex = r"^[\w\.-]+@[\w\.-]+\.\w+$"
        if not re.match(email_regex, v):
            raise ValueError("Invalid email format.")
        return v

class SessionResponse(BaseModel):
    """
    Map of active session token pairs returned on login.
    """
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    expires_at: Optional[int] = None

class LoginResponse(BaseModel):
    """
    Standard successful login payload containing user details and token session.
    """
    session: SessionResponse
    user: UserProfileResponse

class SignupResponse(BaseModel):
    """
    Standard successful registration response payload.
    """
    user_id: str
    email: str
    display_name: Optional[str]
    role: str
    message: str


import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app
from app.services.auth import get_token, get_current_user, get_current_profile

client = TestClient(app)

def test_get_me_unauthorized_no_token():
    """
    Verifies that requesting the current user profile without an Authorization header returns 401.
    """
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_get_me_unauthorized_invalid_token():
    """
    Verifies that calling /me with an invalid token returns 401.
    """
    async def mock_get_current_user():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token."
        )

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        response = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid-token"})
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid session token."
    finally:
        app.dependency_overrides.clear()

def test_get_me_profile_not_found():
    """
    Verifies that if the auth token is valid but the profile is missing in the database, returns 404.
    """
    async def mock_get_current_profile():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found in database."
        )

    app.dependency_overrides[get_current_profile] = mock_get_current_profile
    try:
        response = client.get("/api/auth/me", headers={"Authorization": "Bearer valid-token"})
        assert response.status_code == 404
        assert response.json()["detail"] == "User profile not found in database."
    finally:
        app.dependency_overrides.clear()

def test_get_me_success():
    """
    Verifies that a valid session and profile returns a successful 200 payload.
    """
    mock_profile = {
        "id": "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c",
        "email": "developer@sprintmind.ai",
        "display_name": "Senior Developer",
        "avatar_url": "https://avatar.com/dev.png",
        "role": "developer",
        "created_at": "2026-07-11T12:00:00Z",
        "updated_at": "2026-07-11T12:05:00Z"
    }

    app.dependency_overrides[get_current_profile] = lambda: mock_profile
    try:
        response = client.get("/api/auth/me", headers={"Authorization": "Bearer valid-token"})
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == mock_profile["id"]
        assert data["email"] == mock_profile["email"]
        assert data["display_name"] == mock_profile["display_name"]
        assert data["role"] == mock_profile["role"]
    finally:
        app.dependency_overrides.clear()

def test_logout_success():
    """
    Verifies that calling /logout terminates the session and returns status: success.
    """
    app.dependency_overrides[get_token] = lambda: "mocked-valid-token"
    
    with patch("app.routers.auth.supabase.auth.admin.sign_out") as mock_sign_out:
        response = client.post("/api/auth/logout", headers={"Authorization": "Bearer mocked-valid-token"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "terminated" in data["message"].lower()
        mock_sign_out.assert_called_once_with("mocked-valid-token")
        
    app.dependency_overrides.clear()

def test_logout_failure():
    """
    Verifies that if Supabase throws an exception during logout, returns 500 error.
    """
    app.dependency_overrides[get_token] = lambda: "mocked-valid-token"
    
    with patch("app.routers.auth.supabase.auth.admin.sign_out", side_effect=Exception("Connection failed")):
        response = client.post("/api/auth/logout", headers={"Authorization": "Bearer mocked-valid-token"})
        assert response.status_code == 500
        assert "Terminating session failed" in response.json()["detail"]
        
    app.dependency_overrides.clear()

def test_signup_validation_errors():
    """
    Verifies that calling /signup with invalid fields returns 422 validation errors.
    """
    # Invalid email
    response = client.post("/api/auth/signup", json={
        "email": "bad-email",
        "password": "validpassword",
        "display_name": "Test User"
    })
    assert response.status_code == 422
    assert "email" in response.json()["detail"][0]["loc"]

    # Short password
    response = client.post("/api/auth/signup", json={
        "email": "test@sprintmind.ai",
        "password": "123",
        "display_name": "Test User"
    })
    assert response.status_code == 422
    assert "password" in response.json()["detail"][0]["loc"]

    # Invalid role
    response = client.post("/api/auth/signup", json={
        "email": "test@sprintmind.ai",
        "password": "validpassword",
        "display_name": "Test User",
        "role": "bad-role"
    })
    assert response.status_code == 422

def test_signup_success_no_session():
    """
    Verifies that signup returns a registration instructions message if email confirmation is active.
    """
    from unittest.mock import MagicMock
    mock_res = MagicMock()
    mock_res.user.id = "mock-uuid"
    mock_res.user.email = "test@sprintmind.ai"
    mock_res.user.user_metadata = {"display_name": "Test User", "role": "developer"}
    mock_res.session = None

    with patch("app.routers.auth.sign_up_user", return_value=mock_res):
        response = client.post("/api/auth/signup", json={
            "email": "test@sprintmind.ai",
            "password": "validpassword",
            "display_name": "Test User"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == "mock-uuid"
        assert "verify your email" in data["message"].lower()

def test_login_validation_errors():
    """
    Verifies that calling /login with invalid inputs returns 422 error.
    """
    # Invalid email
    response = client.post("/api/auth/login", json={
        "email": "bad-email",
        "password": "somepassword"
    })
    assert response.status_code == 422

def test_login_success():
    """
    Verifies that successful login returns access and refresh tokens and profile.
    """
    from unittest.mock import MagicMock
    mock_res = MagicMock()
    mock_res.user.id = "mock-uuid"
    mock_res.session.access_token = "access-token-123"
    mock_res.session.refresh_token = "refresh-token-123"
    mock_res.session.expires_in = 3600
    mock_res.session.expires_at = 1780000000
    mock_res.session.token_type = "bearer"

    mock_profile_result = MagicMock()
    mock_profile_result.data = [{
        "id": "mock-uuid",
        "email": "test@sprintmind.ai",
        "display_name": "Test User",
        "avatar_url": None,
        "role": "developer",
        "created_at": "2026-07-11T12:00:00Z",
        "updated_at": "2026-07-11T12:00:00Z"
    }]

    with patch("app.routers.auth.login_user", return_value=mock_res), \
         patch("app.routers.auth.supabase.table") as mock_table:
        mock_table.return_value.select.return_value.eq.return_value.execute.return_value = mock_profile_result
        
        response = client.post("/api/auth/login", json={
            "email": "test@sprintmind.ai",
            "password": "validpassword"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["session"]["access_token"] == "access-token-123"
        assert data["user"]["id"] == "mock-uuid"
        assert data["user"]["display_name"] == "Test User"
        assert data["user"]["role"] == "developer"


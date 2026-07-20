import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from app.main import app
from app.services.auth import get_current_user
from app.database.ai_repository import (
    _MOCK_CONVERSATIONS, _MOCK_MESSAGES, _MOCK_LOGS, _MOCK_JOBS
)

client = TestClient(app)

class MockUser:
    id = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
    email = "user-test@sprintmind.ai"

@pytest.fixture(autouse=True)
def clean_mock_stores_and_mock_auth():
    _MOCK_CONVERSATIONS.clear()
    _MOCK_MESSAGES.clear()
    _MOCK_LOGS.clear()
    _MOCK_JOBS.clear()
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()
    _MOCK_CONVERSATIONS.clear()
    _MOCK_MESSAGES.clear()
    _MOCK_LOGS.clear()
    _MOCK_JOBS.clear()

def test_api_versioning_aliases():
    """
    Verifies that the same endpoint is reachable via both /api/ai/sprint-plan and /api/v1/ai/sprint-plan
    """
    payload = {
        "project_context": "Testing versioning",
        "objectives": "Verify both route versions are active"
    }
    
    # 1. Test legacy /api/... prefix
    res_legacy = client.post("/api/ai/sprint-plan", json=payload)
    assert res_legacy.status_code == 200
    
    # 2. Test v1 /api/v1/... prefix
    res_v1 = client.post("/api/v1/ai/sprint-plan", json=payload)
    assert res_v1.status_code == 200

def test_auth_enforced_when_no_dependency_override():
    """
    Verifies that requests to AI endpoints are rejected with 401 when get_current_user is not overridden
    and no authentication token is provided in the headers.
    """
    # Remove overrides for this test
    app.dependency_overrides.clear()
    
    try:
        res = client.get("/api/ai/history")
        assert res.status_code == 401
        
        res = client.post("/api/ai/sprint-plan", json={"project_context": "x", "objectives": "y"})
        assert res.status_code == 401
    finally:
        # Re-apply override for other tests
        app.dependency_overrides[get_current_user] = lambda: MockUser()

def test_ai_history_crud_flow():
    """
    Verifies that executing tools logs conversations and allows list, get, and delete operations.
    """
    # 1. Trigger sprint planner
    payload = {
        "project_context": "Verify history persistence",
        "objectives": "Log conversation rows"
    }
    client.post("/api/ai/sprint-plan", json=payload)
    
    # 2. Check history list
    res_list = client.get("/api/ai/history")
    assert res_list.status_code == 200
    history = res_list.json()
    assert len(history) == 1
    assert history[0]["tool_type"] == "sprint-plan"
    conv_id = history[0]["id"]
    
    # 3. Check details
    res_detail = client.get(f"/api/ai/history/{conv_id}")
    assert res_detail.status_code == 200
    details = res_detail.json()
    assert details["conversation"]["id"] == conv_id
    assert len(details["messages"]) == 2
    assert details["messages"][0]["role"] == "user"
    assert details["messages"][1]["role"] == "assistant"
    
    # 4. Check delete
    res_delete = client.delete(f"/api/ai/history/{conv_id}")
    assert res_delete.status_code == 204
    
    # 5. Verify list is empty now
    res_list_after = client.get("/api/ai/history")
    assert len(res_list_after.json()) == 0

def test_background_jobs_polling_flow():
    """
    Verifies submitting background job, listing it, and querying status/result.
    """
    payload = {
        "tool_type": "sprint-plan",
        "project_id": str(uuid4()),
        "payload": {
            "project_context": "Background Job Verification Context",
            "objectives": "Test polling loop"
        }
    }
    
    # 1. Submit job
    res_submit = client.post("/api/ai/jobs", json=payload)
    assert res_submit.status_code == 202
    job = res_submit.json()
    assert job["job_type"] == "sprint-plan"
    assert job["status"] in ("pending", "running", "completed")
    job_id = job["id"]
    
    # 2. List jobs
    res_list = client.get("/api/ai/jobs")
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1
    assert res_list.json()[0]["id"] == job_id
    
    # 3. Retrieve specific status
    res_status = client.get(f"/api/ai/jobs/{job_id}")
    assert res_status.status_code == 200
    assert res_status.json()["id"] == job_id

def test_analytics_dashboard_metrics():
    """
    Verifies that running AI tasks adds records in ai_logs and computes analytics summaries.
    """
    # Run a few AI endpoints to generate logs
    payload = {"project_context": "Building an AI module", "objectives": "Generate clean code"}
    client.post("/api/ai/sprint-plan", json=payload)
    
    payload_health = {"project_details": "Dashboard module", "tasks": []}
    client.post("/api/ai/project-health", json=payload_health)
    
    # Check analytics endpoint
    res_analytics = client.get("/api/ai/analytics")
    assert res_analytics.status_code == 200
    stats = res_analytics.json()
    assert stats["total_requests"] == 2
    assert "sprint-plan" in stats["feature_distribution"]
    assert "project-health" in stats["feature_distribution"]
    assert stats["success_rate"] == 100.0

def test_monitoring_health_endpoint():
    """
    Verifies connection verification check.
    """
    res = client.get("/api/monitoring/health")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "supabase_connection" in data
    assert "gemini_api" in data

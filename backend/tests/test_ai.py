from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_sprint_plan_endpoint():
    response = client.post(
        "/api/ai/sprint-plan",
        json={"project_context": "Building an AI module", "objectives": "Generate clean architecture code"}
    )
    assert response.status_code == 200
    assert "plan" in response.json()
    assert "[Mock Gemini Mode" in response.json()["plan"]

def test_project_health_endpoint():
    response = client.post(
        "/api/ai/project-health",
        json={"project_details": "Critical dashboard module", "tasks": [{"title": "Setup router", "status": "todo"}]}
    )
    assert response.status_code == 200
    assert "analysis" in response.json()
    assert "[Mock Gemini Mode" in response.json()["analysis"]

def test_prioritize_endpoint():
    response = client.post(
        "/api/ai/prioritize",
        json={"tasks": [{"id": "1", "title": "Setup router", "priority": "high"}]}
    )
    assert response.status_code == 200
    assert "prioritization" in response.json()
    assert "[Mock Gemini Mode" in response.json()["prioritization"]

def test_meeting_notes_endpoint():
    response = client.post(
        "/api/ai/meeting-notes",
        json={"transcript": "JD said we need a new route. PM agreed."}
    )
    assert response.status_code == 200
    assert "summary" in response.json()
    assert "[Mock Gemini Mode" in response.json()["summary"]

def test_daily_standup_endpoint():
    response = client.post(
        "/api/ai/daily-standup",
        json={"completed": ["Setup routes"], "planned": ["Write tests"], "blockers": ["Need api key"]}
    )
    assert response.status_code == 200
    assert "report" in response.json()
    assert "[Mock Gemini Mode" in response.json()["report"]

def test_risk_analysis_endpoint():
    response = client.post(
        "/api/ai/risk-analysis",
        json={"project_scope": "Building SprintMind AI Assistant", "timeline": "Due by Friday"}
    )
    assert response.status_code == 200
    assert "analysis" in response.json()
    assert "[Mock Gemini Mode" in response.json()["analysis"]

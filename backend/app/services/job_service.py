import time
from uuid import UUID, uuid4
from datetime import datetime, timezone
from fastapi import BackgroundTasks, Depends
from app.services.ai_service import AIService, get_ai_service
from app.database.ai_repository import AIRepository, get_ai_repository
from app.database.client import supabase

from app.config.logging import logger

def _estimate_tokens(prompt: str, response: str) -> int:
    # A standard rule of thumb: 1 token ~= 4 characters for English text
    return (len(prompt) + len(response)) // 4

async def run_ai_job(
    job_id: UUID,
    user_id: UUID,
    project_id: UUID,
    tool_type: str,
    payload: dict,
    ai_service: AIService,
    repository: AIRepository
):
    logger.info(f"Starting background AI job {job_id} for user {user_id}")
    repository.update_job_status(job_id, "running")
    
    start_time = time.time()
    error_occurred = False
    output = ""
    prompt = ""
    title = ""
    
    try:
        if tool_type == "sprint-plan":
            title = "Sprint Planner"
            project_context = payload.get("project_context", "")
            objectives = payload.get("objectives", "")
            prompt = f"Context: {project_context}\nObjectives: {objectives}"
            output = ai_service.generate_sprint_plan(project_context, objectives)
            
        elif tool_type == "project-health":
            title = "Project Health Analyzer"
            project_details = payload.get("project_details", "")
            tasks = payload.get("tasks", [])
            prompt = f"Details: {project_details}\nTasks Count: {len(tasks)}"
            output = ai_service.analyze_project_health(project_details, tasks)
            
        elif tool_type == "prioritize":
            title = "Task Prioritizer"
            tasks = payload.get("tasks", [])
            prompt = f"Tasks to prioritize: {len(tasks)}"
            output = ai_service.prioritize_tasks(tasks)
            
        elif tool_type == "meeting-notes":
            title = "Meeting Summarizer"
            transcript = payload.get("transcript", "")
            prompt = f"Transcript length: {len(transcript)}"
            output = ai_service.summarize_meeting_notes(transcript)
            
        elif tool_type == "daily-standup":
            title = "Daily Standup Reporter"
            completed = payload.get("completed", [])
            planned = payload.get("planned", [])
            blockers = payload.get("blockers", [])
            prompt = f"Completed: {len(completed)}, Planned: {len(planned)}, Blockers: {len(blockers)}"
            output = ai_service.generate_daily_standup(completed, planned, blockers)
            
        elif tool_type == "risk-analysis":
            title = "Risk Analyzer"
            project_scope = payload.get("project_scope", "")
            timeline = payload.get("timeline", "")
            prompt = f"Scope: {project_scope}\nTimeline: {timeline}"
            output = ai_service.analyze_risks(project_scope, timeline)
            
        else:
            raise ValueError(f"Unknown tool type: {tool_type}")

        # Save to conversations & messages
        conv = repository.create_conversation(
            user_id=user_id,
            project_id=project_id,
            title=f"{title} - {datetime_now_str()}",
            tool_type=tool_type,
            payload=payload
        )
        
        repository.create_message(conv["id"], "user", prompt)
        repository.create_message(conv["id"], "assistant", output)
        
        latency_ms = int((time.time() - start_time) * 1000)
        tokens = _estimate_tokens(prompt, output)
        
        # Log execution
        repository.create_log(
            user_id=user_id,
            feature=tool_type,
            latency_ms=latency_ms,
            token_usage=tokens,
            error_occurred=False
        )
        
        repository.update_job_status(
            job_id=job_id,
            status="completed",
            result={"conversation_id": conv["id"], "output": output}
        )
        logger.info(f"Successfully completed background AI job {job_id}")

        # Send notification and log activity for success
        is_mock = str(user_id) == "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
        tool_name_map = {
            "sprint-plan": "Sprint Planner",
            "project-health": "Project Health Analyzer",
            "prioritize": "Task Prioritizer",
            "meeting-notes": "Meeting Summarizer",
            "daily-standup": "Daily Standup Reporter",
            "risk-analysis": "Risk Analyzer"
        }
        tool_label = tool_name_map.get(tool_type, "AI Tool")

        if is_mock:
            from app.notifications.repository import _MOCK_NOTIFICATIONS_DB
            from app.activity.repository import _MOCK_ACTIVITIES_DB
            _MOCK_NOTIFICATIONS_DB.append({
                "id": str(uuid4()),
                "user_id": str(user_id),
                "sender_id": None,
                "title": "AI Operation Completed",
                "message": f"Your AI job for tool '{tool_label}' has completed successfully.",
                "type": "ai",
                "reference_id": str(project_id) if project_id and str(project_id) != "00000000-0000-0000-0000-000000000000" else None,
                "is_read": False,
                "created_at": datetime.now(timezone.utc),
                "sender_display_name": None
            })
            if project_id and str(project_id) != "00000000-0000-0000-0000-000000000000":
                _MOCK_ACTIVITIES_DB.append({
                    "id": str(uuid4()),
                    "project_id": str(project_id),
                    "user_id": str(user_id),
                    "action": "ai_generation",
                    "entity_type": "ai",
                    "entity_id": str(job_id),
                    "details": {"tool_type": tool_type, "status": "completed"},
                    "created_at": datetime.now(timezone.utc),
                    "user_display_name": "Mock User"
                })
        else:
            supabase.table("notifications").insert({
                "user_id": str(user_id),
                "sender_id": None,
                "title": "AI Operation Completed",
                "message": f"Your AI job for tool '{tool_label}' has completed successfully.",
                "type": "ai",
                "reference_id": str(project_id) if project_id and str(project_id) != "00000000-0000-0000-0000-000000000000" else None,
                "is_read": False
            }).execute()
            if project_id and str(project_id) != "00000000-0000-0000-0000-000000000000":
                supabase.table("activity_logs").insert({
                    "project_id": str(project_id),
                    "user_id": str(user_id),
                    "action": "ai_generation",
                    "entity_type": "ai",
                    "entity_id": str(job_id),
                    "details": {"tool_type": tool_type, "status": "completed"}
                }).execute()
        
    except Exception as e:
        logger.error(f"Error running background AI job {job_id}: {str(e)}", exc_info=True)
        latency_ms = int((time.time() - start_time) * 1000)
        
        repository.create_log(
            user_id=user_id,
            feature=tool_type,
            latency_ms=latency_ms,
            token_usage=0,
            error_occurred=True
        )
        
        repository.update_job_status(
            job_id=job_id,
            status="failed",
            error=str(e)
        )

        # Send notification and log activity for failure
        is_mock = str(user_id) == "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"
        tool_name_map = {
            "sprint-plan": "Sprint Planner",
            "project-health": "Project Health Analyzer",
            "prioritize": "Task Prioritizer",
            "meeting-notes": "Meeting Summarizer",
            "daily-standup": "Daily Standup Reporter",
            "risk-analysis": "Risk Analyzer"
        }
        tool_label = tool_name_map.get(tool_type, "AI Tool")

        if is_mock:
            from app.notifications.repository import _MOCK_NOTIFICATIONS_DB
            from app.activity.repository import _MOCK_ACTIVITIES_DB
            _MOCK_NOTIFICATIONS_DB.append({
                "id": str(uuid4()),
                "user_id": str(user_id),
                "sender_id": None,
                "title": "AI Operation Failed",
                "message": f"Your AI job for tool '{tool_label}' failed: {str(e)}",
                "type": "ai",
                "reference_id": str(project_id) if project_id and str(project_id) != "00000000-0000-0000-0000-000000000000" else None,
                "is_read": False,
                "created_at": datetime.now(timezone.utc),
                "sender_display_name": None
            })
            if project_id and str(project_id) != "00000000-0000-0000-0000-000000000000":
                _MOCK_ACTIVITIES_DB.append({
                    "id": str(uuid4()),
                    "project_id": str(project_id),
                    "user_id": str(user_id),
                    "action": "ai_generation",
                    "entity_type": "ai",
                    "entity_id": str(job_id),
                    "details": {"tool_type": tool_type, "status": "failed", "error": str(e)},
                    "created_at": datetime.now(timezone.utc),
                    "user_display_name": "Mock User"
                })
        else:
            supabase.table("notifications").insert({
                "user_id": str(user_id),
                "sender_id": None,
                "title": "AI Operation Failed",
                "message": f"Your AI job for tool '{tool_label}' failed: {str(e)}",
                "type": "ai",
                "reference_id": str(project_id) if project_id and str(project_id) != "00000000-0000-0000-0000-000000000000" else None,
                "is_read": False
            }).execute()
            if project_id and str(project_id) != "00000000-0000-0000-0000-000000000000":
                supabase.table("activity_logs").insert({
                    "project_id": str(project_id),
                    "user_id": str(user_id),
                    "action": "ai_generation",
                    "entity_type": "ai",
                    "entity_id": str(job_id),
                    "details": {"tool_type": tool_type, "status": "failed", "error": str(e)}
                }).execute()

def datetime_now_str() -> str:
    return time.strftime("%Y-%m-%d %H:%M")

class AIJobService:
    def __init__(self, ai_service: AIService, repository: AIRepository):
        self.ai_service = ai_service
        self.repository = repository

    def submit_job(
        self,
        user_id: UUID,
        project_id: UUID,
        tool_type: str,
        payload: dict,
        background_tasks: BackgroundTasks
    ) -> dict:
        job = self.repository.create_job(user_id, project_id, tool_type, payload)
        background_tasks.add_task(
            run_ai_job,
            UUID(job["id"]),
            user_id,
            project_id,
            tool_type,
            payload,
            self.ai_service,
            self.repository
        )
        return job

_job_service_instance = None

def get_job_service(
    ai_service: AIService = Depends(get_ai_service),
    repository: AIRepository = Depends(get_ai_repository)
) -> AIJobService:
    global _job_service_instance
    if _job_service_instance is None:
        _job_service_instance = AIJobService(ai_service, repository)
    return _job_service_instance

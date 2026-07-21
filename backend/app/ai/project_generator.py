from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import List, Dict, Any

from app.projects.repository import ProjectRepository
from app.tasks.repository import TaskRepository
from app.ai.mapper import project_mapper

# In-memory database for project epics, used exclusively for mock/test users.
_MOCK_PROJECT_EPICS_DB: List[Dict[str, Any]] = []


def get_project_epics(project_id: UUID) -> List[Dict[str, Any]]:
    from app.projects.repository import _MOCK_DB
    is_mock = any(str(p.id) == str(project_id) and str(p.owner_id) == "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c" for p in _MOCK_DB)
    if is_mock:
        return [e for e in _MOCK_PROJECT_EPICS_DB if str(e["project_id"]) == str(project_id)]

    from app.database.client import supabase
    res = supabase.table("project_epics").select("*").eq("project_id", str(project_id)).execute()
    return res.data or []


def save_project_epic(project_id: UUID, title: str, description: str) -> Dict[str, Any]:
    from app.projects.repository import _MOCK_DB
    is_mock = any(str(p.id) == str(project_id) and str(p.owner_id) == "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c" for p in _MOCK_DB)
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "id": str(uuid4()),
        "project_id": str(project_id),
        "title": title,
        "description": description,
        "created_at": now,
        "updated_at": now
    }
    if is_mock:
        _MOCK_PROJECT_EPICS_DB.append(payload)
        return payload

    from app.database.client import supabase
    res = supabase.table("project_epics").insert(payload).execute()
    if res.data:
        return res.data[0]
    raise Exception("Failed to insert project epic")


class ProjectGenerator:
    def __init__(self):
        self.project_repo = ProjectRepository()
        self.task_repo = TaskRepository()

    async def generate_project(self, owner_id: UUID, document_id: UUID) -> Dict[str, Any]:
        # 1. Fetch document
        from app.documents.repository import document_repository
        doc = document_repository.get_document(document_id)
        if not doc:
            raise ValueError("Document not found.")

        # Fetch analysis
        from app.ai.service import ai_document_service
        analysis = ai_document_service.get_analysis(document_id) or {}

        # Fetch epics and stories
        from app.ai.planner import story_planner
        raw_stories = story_planner.get_nested_epics_and_stories(document_id)
        if not raw_stories:
            raw_stories = await story_planner.generate_epics_and_stories(document_id)

        # 2. Prevent duplicate project generation
        from app.projects.repository import _MOCK_DB
        for p in _MOCK_DB:
            if str(p.owner_id) == str(owner_id) and p.generated_from_document_id == document_id and p.deleted_at is None:
                raise ValueError("Project already generated for this document.")

        try:
            from app.database.client import supabase
            res = supabase.table("projects").select("id").eq("generated_from_document_id", str(document_id)).is_("deleted_at", "null").execute()
            if res.data:
                raise ValueError("Project already generated for this document.")
        except Exception as e:
            if "Project already generated" in str(e):
                raise e

        # 3. Perform mapping
        project_input = project_mapper.map_document_to_project_input(doc["file_name"], analysis, document_id)
        mapped_structure = project_mapper.map_epics_and_stories(raw_stories)

        # 4. Start Transaction with Rollback Support
        from app.projects.schemas import ProjectCreate
        from app.tasks.schemas import TaskCreate
        
        created_project = None
        created_epics = []
        created_tasks = []

        try:
            # Create Project
            proj_create = ProjectCreate(
                name=project_input["name"],
                description=project_input["description"],
                status=project_input["status"],
                generated_from_document_id=project_input["generated_from_document_id"]
            )
            created_project = self.project_repo.create(owner_id, proj_create)

            # Create Epics and Tasks
            for epic in mapped_structure:
                epic_db = save_project_epic(created_project.id, epic["title"], epic["description"])
                created_epics.append(epic_db)

                for story in epic["stories"]:
                    task_input = TaskCreate(
                        project_id=created_project.id,
                        title=story["title"],
                        description=story["description"],
                        priority=story["priority"],
                        epic_id=UUID(epic_db["id"]),
                        story_points=story["story_points"],
                        checklist=story["checklist"]
                    )
                    task_db = self.task_repo.create(owner_id, task_input)
                    created_tasks.append(task_db)

            return {
                "project_id": str(created_project.id),
                "project_name": created_project.name,
                "epics_count": len(created_epics),
                "tasks_count": len(created_tasks)
            }

        except Exception as e:
            # ROLLBACK
            print(f"Project Generation failed: {str(e)}. Triggering rollback...")
            
            # Delete created tasks
            from app.tasks.repository import _MOCK_TASK_DB
            created_task_ids = [str(t.id) for t in created_tasks]
            _MOCK_TASK_DB[:] = [item for item in _MOCK_TASK_DB if str(item.id) not in created_task_ids]
            
            for t in created_tasks:
                try:
                    from app.database.client import supabase
                    supabase.table("tasks").delete().eq("id", str(t.id)).execute()
                except:
                    pass

            # Delete created epics
            global _MOCK_PROJECT_EPICS_DB
            created_epic_ids = [str(ep["id"]) for ep in created_epics]
            _MOCK_PROJECT_EPICS_DB[:] = [item for item in _MOCK_PROJECT_EPICS_DB if str(item["id"]) not in created_epic_ids]
            
            for ep in created_epics:
                try:
                    from app.database.client import supabase
                    supabase.table("project_epics").delete().eq("id", str(ep["id"])).execute()
                except:
                    pass

            # Delete created project
            if created_project:
                from app.projects.repository import _MOCK_DB
                _MOCK_DB[:] = [item for item in _MOCK_DB if str(item.id) != str(created_project.id)]
                try:
                    from app.database.client import supabase
                    supabase.table("projects").delete().eq("id", str(created_project.id)).execute()
                except:
                    pass

            raise e


project_generator = ProjectGenerator()

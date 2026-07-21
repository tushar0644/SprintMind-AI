from typing import Dict, Any, List
from uuid import UUID

def normalize_priority(prio_str: str) -> str:
    val = str(prio_str).lower().strip()
    if val in ["high", "medium", "low", "urgent"]:
        return val
    return "medium"

class ProjectMapper:
    def map_document_to_project_input(self, file_name: str, analysis: Dict[str, Any], document_id: UUID) -> Dict[str, Any]:
        proj_name = file_name
        for ext in [".txt", ".pdf", ".md", ".docx"]:
            if proj_name.lower().endswith(ext):
                proj_name = proj_name[:-len(ext)]
        
        # Strip other potential paths
        proj_name = proj_name.split("/")[-1].split("\\")[-1]
        
        desc = ""
        if analysis and isinstance(analysis, dict):
            desc = analysis.get("executive_summary", "") or ""
            
        if not desc:
            desc = f"Automatically generated project from {file_name}"
            
        return {
            "name": proj_name,
            "description": desc[:500],
            "status": "active",
            "generated_from_document_id": document_id
        }

    def map_epics_and_stories(self, raw_epics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        mapped = []
        for epic in raw_epics:
            stories = []
            for story in epic.get("stories", []):
                stories.append({
                    "title": story.get("title", "Untitled Story"),
                    "description": story.get("description", ""),
                    "checklist": story.get("acceptance_criteria", []),
                    "priority": normalize_priority(story.get("priority", "medium")),
                    "story_points": story.get("story_points", 1)
                })
            mapped.append({
                "title": epic.get("title", "Untitled Epic"),
                "description": epic.get("description", ""),
                "stories": stories
            })
        return mapped

project_mapper = ProjectMapper()

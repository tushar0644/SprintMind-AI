import json
import re
from typing import List, Dict, Any
from uuid import UUID

from app.services.ai_service import get_ai_service
from .epics import save_epic, get_epics, delete_epics_by_document
from .stories import save_story, get_stories
from .requirements import get_requirements, save_requirements
from .extractor import requirements_extractor

STORY_GENERATION_PROMPT = """You are an Agile Product Owner AI. Based on the following structured requirements, assumptions, and risks, generate a set of Epics and nested User Stories for the project.

For each Epic, generate:
- Title
- Description

For each User Story within the Epic, generate:
- Title
- Description (using the standard format: "As a ..., I want ..., So that ...")
- Acceptance Criteria (list of strings, minimum 2 criteria)
- Suggested Priority (must be one of: "High", "Medium", "Low")
- Story Point Estimate (Fibonacci scale estimate, e.g. 1, 2, 3, 5, 8)

Return ONLY a valid JSON object matching the following structure. Do NOT wrap the JSON in markdown code blocks (like ```json ... ```) or add any other text. Return raw JSON text.

JSON Structure:
{{
  "epics": [
    {{
      "title": "Epic Title",
      "description": "Epic Description",
      "stories": [
        {{
          "title": "Story Title",
          "description": "As a ..., I want ..., So that ...",
          "acceptance_criteria": ["Criteria 1", "Criteria 2"],
          "priority": "High",
          "story_points": 3
        }},
        ...
      ]
    }},
    ...
  ]
}}

Structured Requirements:
{requirements_json}
"""


class StoryPlanner:
    def __init__(self):
        self.ai_service = get_ai_service()

    def _get_mock_epics_and_stories(self) -> Dict[str, Any]:
        return {
            "epics": [
                {
                    "title": "[Mock] Document Intelligence Integration",
                    "description": "Establish core processing pipelines, parsing algorithms, and semantic chunking for uploaded project documents.",
                    "stories": [
                        {
                            "title": "[Mock] Parse Multi-Format Documents",
                            "description": "As a developer, I want to parse files of PDF and text formats, so that their content is extracted accurately.",
                            "acceptance_criteria": [
                                "System extracts text content successfully from standard text documents.",
                                "System handles file size validation and throws readable errors for empty files."
                            ],
                            "priority": "High",
                            "story_points": 5
                        },
                        {
                            "title": "[Mock] Build Semantic Chunker Engine",
                            "description": "As a project manager, I want to split document texts into paragraphs preserving context, so that Gemini gets accurate chunk data.",
                            "acceptance_criteria": [
                                "Paragraphs are grouped based on proximity and token length.",
                                "Overlapping window prevents lost context between chunks."
                            ],
                            "priority": "Medium",
                            "story_points": 3
                        }
                    ]
                },
                {
                    "title": "[Mock] AI Agile Artifacts Generation",
                    "description": "Provide automatic translation of document content into structured plans, requirements, and user stories.",
                    "stories": [
                        {
                            "title": "[Mock] Extract Requirements with Gemini",
                            "description": "As an agile analyst, I want to automatically parse requirements into six functional categories, so that manual review is minimized.",
                            "acceptance_criteria": [
                                "Displays functional, non-functional, business rules, assumptions, dependencies, and risks.",
                                "Renders Collapsible lists for easy consumption."
                            ],
                            "priority": "High",
                            "story_points": 3
                        },
                        {
                            "title": "[Mock] Generate Collapsible Story Map",
                            "description": "As a developer, I want to view epics and nested user stories inside the document preview modal, so that I can copy them for backlog planning.",
                            "acceptance_criteria": [
                                "User stories show acceptance criteria and story point estimates.",
                                "Epics can be expanded and collapsed in the tree view."
                            ],
                            "priority": "Medium",
                            "story_points": 5
                        }
                    ]
                }
            ]
        }

    async def generate_epics_and_stories(self, document_id: UUID) -> List[Dict[str, Any]]:
        # 1. Fetch requirements. If they don't exist, generate them first!
        reqs = get_requirements(document_id)
        if not reqs:
            from app.documents.repository import document_chunk_repository
            chunks = document_chunk_repository.get_chunks_by_document(document_id)
            if not chunks:
                from app.documents.service import document_service
                from app.documents.schemas import ChunkConfiguration
                await document_service.chunk_document(document_id, ChunkConfiguration())
                chunks = document_chunk_repository.get_chunks_by_document(document_id)
            
            if not chunks:
                raise ValueError("Document has no text content to extract requirements from")
                
            combined_text = "\n\n".join([c["text"] for c in chunks])
            extracted_reqs = requirements_extractor.extract_requirements(combined_text)
            reqs = save_requirements(document_id, extracted_reqs)

        # 2. Call Gemini to generate stories
        enabled = getattr(self.ai_service, "enabled", False)
        
        reqs_clean = {
            "functional_requirements": reqs.get("functional_requirements", []),
            "non_functional_requirements": reqs.get("non_functional_requirements", []),
            "business_rules": reqs.get("business_rules", []),
            "assumptions": reqs.get("assumptions", []),
            "dependencies": reqs.get("dependencies", []),
            "risks": reqs.get("risks", [])
        }
        requirements_str = json.dumps(reqs_clean, indent=2)
        prompt = STORY_GENERATION_PROMPT.format(requirements_json=requirements_str)

        if not enabled:
            generated_data = self._get_mock_epics_and_stories()
        else:
            try:
                raw_response = getattr(self.ai_service, "_call_gemini")(prompt, "fallback")
                
                # Check if it returned a mock response prefix
                if raw_response.startswith("[Mock Gemini Mode]"):
                    generated_data = self._get_mock_epics_and_stories()
                else:
                    # Clean markdown wrappers
                    cleaned = raw_response.strip()
                    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.MULTILINE)
                    cleaned = re.sub(r"```$", "", cleaned, flags=re.MULTILINE)
                    cleaned = cleaned.strip()
                    generated_data = json.loads(cleaned)
            except Exception as e:
                print(f"StoryPlanner failed: {str(e)}. Falling back to mock epics/stories.")
                generated_data = self._get_mock_epics_and_stories()

        # 3. Cascadingly persist Epics and Stories
        delete_epics_by_document(document_id)
        
        epics_list = generated_data.get("epics", [])
        for epic in epics_list:
            epic_db = save_epic(
                document_id=document_id,
                title=epic.get("title", "Untitled Epic"),
                description=epic.get("description", "")
            )
            stories_list = epic.get("stories", [])
            for story in stories_list:
                save_story(
                    epic_id=epic_db["id"],
                    document_id=document_id,
                    title=story.get("title", "Untitled Story"),
                    description=story.get("description", "As a user, I want features, so that I get value."),
                    acceptance_criteria=story.get("acceptance_criteria", []),
                    priority=story.get("priority", "Medium"),
                    story_points=story.get("story_points", 1)
                )

        # 4. Return nested structure
        return self.get_nested_epics_and_stories(document_id)

    def get_nested_epics_and_stories(self, document_id: UUID) -> List[Dict[str, Any]]:
        epics = get_epics(document_id)
        stories = get_stories(document_id)
        
        # Group stories by epic_id
        stories_by_epic = {}
        for s in stories:
            epic_id_str = str(s["epic_id"])
            if epic_id_str not in stories_by_epic:
                stories_by_epic[epic_id_str] = []
            stories_by_epic[epic_id_str].append(s)

        # Nest stories inside epics
        result = []
        for e in epics:
            epic_copy = dict(e)
            epic_id_str = str(e["id"])
            epic_copy["stories"] = stories_by_epic.get(epic_id_str, [])
            result.append(epic_copy)
            
        return result


story_planner = StoryPlanner()

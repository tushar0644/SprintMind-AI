import json
import re
from typing import Dict, Any, Optional
from app.ai.providers import ProviderFactory, AIProvider, AIProviderError
from app.services.ai_service import get_ai_service
from app.ai.validators import validate_requirements_dict
from app.ai.requirements import RequirementsExtractionJSON

REQUIREMENTS_EXTRACTION_PROMPT = """You are an AI Requirements Engineer. Extract a structured set of software requirements, business rules, assumptions, dependencies, and risks from the provided document content.

Return ONLY a valid JSON object matching the following structure. Do NOT wrap the JSON in markdown code blocks (like ```json ... ```) or add any other text. Return raw JSON text.

JSON Structure:
{{
  "functional_requirements": ["Requirement 1", "Requirement 2", ...],
  "non_functional_requirements": ["Requirement 1", "Requirement 2", ...],
  "business_rules": ["Rule 1", "Rule 2", ...],
  "assumptions": ["Assumption 1", "Assumption 2", ...],
  "dependencies": ["Dependency 1", "Dependency 2", ...],
  "risks": ["Risk 1", "Risk 2", ...]
}}

Document Content:
{content}
"""


class RequirementsExtractor:
    def __init__(self, provider: Optional[AIProvider] = None):
        self.provider = provider or ProviderFactory.get_provider()
        self.ai_service = get_ai_service()

    def _get_mock_requirements(self) -> Dict[str, Any]:
        return {
            "functional_requirements": [
                "[Mock] Users shall upload documents in PDF, TXT, or markdown formats.",
                "[Mock] The system shall parse and split documents into semantic chunks.",
                "[Mock] The AI engine shall analyze document chunks to extract structured summaries and requirements."
            ],
            "non_functional_requirements": [
                "[Mock] The backend API shall process requirements extraction prompts within 5 seconds.",
                "[Mock] The application shall comply with OAuth2/JWT auth token requirements."
            ],
            "business_rules": [
                "[Mock] Only authorized project members can upload, view, or analyze documents.",
                "[Mock] Gemini API quota usage must be tracked and logged per project."
            ],
            "assumptions": [
                "[Mock] Uploaded documents are in English and contain plain text or standard layouts.",
                "[Mock] The Supabase DB service is responsive and active."
            ],
            "dependencies": [
                "[Mock] Google Generative AI (Gemini Flash v1.5 API)",
                "[Mock] Supabase database client and schema definition mapping"
            ],
            "risks": [
                "[Mock] Gemini API quota limit exhaustion leading to service degradation.",
                "[Mock] Storage bucket permission misconfigurations preventing file downloads."
            ]
        }

    def extract_requirements(self, text_content: str) -> Dict[str, Any]:
        if not text_content or not text_content.strip():
            raise ValueError("Document content is empty")

        enabled = getattr(self.ai_service, "enabled", False) or self.provider.health_check()
        if not enabled:
            return self._get_mock_requirements()

        prompt = REQUIREMENTS_EXTRACTION_PROMPT.format(content=text_content)

        try:
            raw_response = self.provider.generate(prompt)

            if raw_response.startswith("[Mock Gemini Mode]") or raw_response.startswith("[Mock Gemini Provider]"):
                return self._get_mock_requirements()

            cleaned = raw_response.strip()
            cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.MULTILINE)
            cleaned = re.sub(r"```$", "", cleaned, flags=re.MULTILINE)
            cleaned = cleaned.strip()

            parsed = json.loads(cleaned)

            if not validate_requirements_dict(parsed):
                validated = RequirementsExtractionJSON(**parsed)
                return validated.model_dump()

            return parsed
        except (AIProviderError, json.JSONDecodeError, Exception) as e:
            print(f"RequirementsExtractor failed: {str(e)}. Falling back to mock requirements.")
            return self._get_mock_requirements()


requirements_extractor = RequirementsExtractor()

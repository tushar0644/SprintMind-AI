import json
import re
from typing import Dict, Any, Optional
from app.ai.providers import ProviderFactory, AIProvider, AIProviderError
from app.services.ai_service import get_ai_service
from .prompts import DOCUMENT_ANALYSIS_PROMPT
from .models import DocumentAnalysisJSON

class DocumentSummarizer:
    def __init__(self, provider: Optional[AIProvider] = None):
        self.provider = provider or ProviderFactory.get_provider()
        self.ai_service = get_ai_service()

    def _get_mock_analysis(self) -> Dict[str, Any]:
        return {
            "executive_summary": "[Mock] SprintMind AI is a state-of-the-art agile management platform featuring automated document intelligence and chunking capabilities.",
            "objectives": [
                "[Mock] Build a parsing and semantic chunking foundation",
                "[Mock] Integrate LLM document summarization capabilities",
                "[Mock] Implement automated visual test verification suites"
            ],
            "deliverables": [
                "[Mock] Document parser abstraction",
                "[Mock] Semantic chunker database schemas",
                "[Mock] Rest API router endpoints for chunking and analysis",
                "[Mock] Documents page split-pane AI analysis dashboard"
            ],
            "timeline": [
                "[Mock] Phase 1: Parsing Foundation (Completed)",
                "[Mock] Phase 2: Semantic Chunking (Completed)",
                "[Mock] Phase 3: AI Document Intelligence (In Progress)"
            ],
            "risks": [
                "[Mock] Gemini API quota limitation under load",
                "[Mock] Supabase DB schema cache synchronization issues",
                "[Mock] Large document context window overflow"
            ]
        }

    def summarize_content(self, text_content: str) -> Dict[str, Any]:
        if not text_content or not text_content.strip():
            raise ValueError("Document content is empty")

        enabled = getattr(self.ai_service, "enabled", False) or self.provider.health_check()
        prompt = DOCUMENT_ANALYSIS_PROMPT.format(content=text_content)

        if not enabled:
            return self._get_mock_analysis()

        try:
            raw_response = self.provider.generate(prompt)

            if raw_response.startswith("[Mock Gemini Mode]") or raw_response.startswith("[Mock Gemini Provider]"):
                return self._get_mock_analysis()

            cleaned = raw_response.strip()
            cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.MULTILINE)
            cleaned = re.sub(r"```$", "", cleaned, flags=re.MULTILINE)
            cleaned = cleaned.strip()

            parsed = json.loads(cleaned)
            validated = DocumentAnalysisJSON(**parsed)
            return validated.model_dump()
        except (AIProviderError, json.JSONDecodeError, Exception) as e:
            print(f"Summarizer failed: {str(e)}. Falling back to mock summary.")
            return self._get_mock_analysis()

document_summarizer = DocumentSummarizer()

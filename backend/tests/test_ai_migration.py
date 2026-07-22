import pytest
import os
import glob
from app.services.ai_service import get_ai_service, StandardAIService
from app.ai.summarizer import document_summarizer
from app.ai.extractor import requirements_extractor
from app.ai.planner import story_planner
from app.ai.providers import ProviderFactory, GeminiProvider

def test_ai_services_consume_provider_factory():
    """Verify all AI service singletons consume ProviderFactory instances."""
    ai_service = get_ai_service()
    assert isinstance(ai_service, StandardAIService)
    assert isinstance(ai_service.provider, GeminiProvider)

    assert isinstance(document_summarizer.provider, GeminiProvider)
    assert isinstance(requirements_extractor.provider, GeminiProvider)
    assert isinstance(story_planner.provider, GeminiProvider)

def test_no_direct_generativeai_imports_in_app():
    """
    Verify that google.generativeai / genai is NOT directly imported 
    anywhere in backend/app outside of the app/ai/providers/ package.
    """
    backend_app_dir = os.path.join(os.path.dirname(__file__), "..", "app")
    python_files = glob.glob(os.path.join(backend_app_dir, "**", "*.py"), recursive=True)

    illegal_imports = []
    for filepath in python_files:
        norm_path = os.path.normpath(filepath)
        # Skip app/ai/providers/ directory files
        if "providers" in norm_path.split(os.sep):
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            if "google.generativeai" in content or "import genai" in content or "from genai" in content:
                illegal_imports.append(filepath)

    assert len(illegal_imports) == 0, f"Found direct Gemini SDK imports outside app/ai/providers: {illegal_imports}"

def test_ai_services_execution_flow():
    """Verify legacy service interface methods continue to execute through provider transport."""
    ai_service = get_ai_service()

    sprint_plan = ai_service.generate_sprint_plan("Project Context", "Objectives")
    assert "[Mock Gemini" in sprint_plan or "mock response" in sprint_plan

    health = ai_service.analyze_project_health("Details", [{"title": "Task 1", "status": "Done"}])
    assert "[Mock Gemini" in health or "mock response" in health


import abc
from typing import List, Dict, Any, Optional
from app.ai.providers import ProviderFactory, AIProvider, AIProviderError

class AIService(abc.ABC):
    @abc.abstractmethod
    def generate_sprint_plan(self, project_context: str, objectives: str) -> str:
        pass

    @abc.abstractmethod
    def analyze_project_health(self, project_details: str, tasks: List[Dict[str, Any]]) -> str:
        pass

    @abc.abstractmethod
    def prioritize_tasks(self, tasks: List[Dict[str, Any]]) -> str:
        pass

    @abc.abstractmethod
    def summarize_meeting_notes(self, transcript: str) -> str:
        pass

    @abc.abstractmethod
    def generate_daily_standup(self, completed: List[str], planned: List[str], blockers: List[str]) -> str:
        pass

    @abc.abstractmethod
    def analyze_risks(self, project_scope: str, timeline: str) -> str:
        pass


class StandardAIService(AIService):
    """
    Standard AIService implementation consuming the configured AIProvider interface.
    """

    def __init__(self, provider: Optional[AIProvider] = None):
        self.provider = provider or ProviderFactory.get_provider()

    @property
    def enabled(self) -> bool:
        health = self.provider.health_check()
        return health.get("available", False) if isinstance(health, dict) else bool(health)

    def _generate_with_fallback(self, prompt: str) -> str:
        if not self.enabled:
            return f"[Mock Gemini Mode] mock response for prompt: {prompt[:60]}..."
        try:
            return self.provider.generate(prompt)
        except AIProviderError as e:
            return f"[Mock Gemini Mode (Fallback due to error: {str(e)})] mock response for: {prompt[:60]}..."
        except Exception as e:
            return f"[Mock Gemini Mode (Fallback due to error: {str(e)})] mock response for: {prompt[:60]}..."

    def generate_sprint_plan(self, project_context: str, objectives: str) -> str:
        prompt = (
            f"As an agile project manager AI, generate a comprehensive sprint plan for a project with the "
            f"following context:\n\n{project_context}\n\nObjectives:\n\n{objectives}\n\nInclude a list of "
            f"suggested sprint tasks, duration, estimates, and risk mitigations."
        )
        return self._generate_with_fallback(prompt)

    def analyze_project_health(self, project_details: str, tasks: List[Dict[str, Any]]) -> str:
        task_summary = "\n".join([f"- {t.get('title')} ({t.get('status')})" for t in tasks])
        prompt = (
            f"As an AI Project Controller, analyze the health status of a project with these details:\n"
            f"{project_details}\n\nTask list:\n{task_summary}\n\nIdentify bottlenecks, task density, status "
            f"distribution, and suggest corrective actions."
        )
        return self._generate_with_fallback(prompt)

    def prioritize_tasks(self, tasks: List[Dict[str, Any]]) -> str:
        task_summary = "\n".join([f"- ID: {t.get('id')}, Title: {t.get('title')}, Priority: {t.get('priority')}" for t in tasks])
        prompt = (
            f"As a product owner AI, evaluate and prioritize the following backlog tasks:\n\n"
            f"{task_summary}\n\nRank them according to urgency/importance, and explain the reasoning."
        )
        return self._generate_with_fallback(prompt)

    def summarize_meeting_notes(self, transcript: str) -> str:
        prompt = (
            f"Summarize the following meeting notes and transcribe action items, owners, and decisions "
            f"from the raw text:\n\n{transcript}"
        )
        return self._generate_with_fallback(prompt)

    def generate_daily_standup(self, completed: List[str], planned: List[str], blockers: List[str]) -> str:
        completed_str = "\n".join([f"- {c}" for c in completed])
        planned_str = "\n".join([f"- {p}" for p in planned])
        blockers_str = "\n".join([f"- {b}" for b in blockers])
        prompt = (
            f"Structure a professional, clean Daily Standup update message from the following logs:\n\n"
            f"Yesterday:\n{completed_str}\n\nToday's Plan:\n{planned_str}\n\nBlockers:\n{blockers_str}"
        )
        return self._generate_with_fallback(prompt)

    def analyze_risks(self, project_scope: str, timeline: str) -> str:
        prompt = (
            f"Assess the timeline, scope creep, resource constraints, and risk vectors for the following:\n\n"
            f"Scope:\n{project_scope}\n\nTimeline:\n{timeline}\n\nProvide likelihood, impact, and mitigation strategies."
        )
        return self._generate_with_fallback(prompt)


_service_instance = StandardAIService()

def get_ai_service() -> AIService:
    return _service_instance

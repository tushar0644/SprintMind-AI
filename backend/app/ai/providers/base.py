import abc
from typing import Dict, Any

class AIProviderError(Exception):
    """Base exception for AI provider operations."""
    pass

class AIProviderTimeoutError(AIProviderError):
    """Raised when an AI provider call times out."""
    pass

class AIProviderAPIKeyError(AIProviderError):
    """Raised when an AI provider API key is missing or invalid."""
    pass

class AIProvider(abc.ABC):
    """
    Abstract interface for AI Providers (SprintMind AI v4.0).
    Standardizes interface methods across LLM backends.
    """
    @abc.abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        """Execute a text generation prompt and return raw text response."""
        pass

    @abc.abstractmethod
    def generate_json(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Execute a generation prompt and parse response into JSON object/dict."""
        pass

    @abc.abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """
        Verify API connectivity, credentials, and model health.
        Returns dictionary with keys: available (bool), provider (str), model (str), latency (float), error (Optional[str]).
        """
        pass

    @abc.abstractmethod
    def provider_name(self) -> str:
        """Return the unique provider string name (e.g. 'gemini')."""
        pass

    @abc.abstractmethod
    def model_name(self) -> str:
        """Return the active model name string (e.g. 'gemini-1.5-flash')."""
        pass

import pytest
import logging
from unittest.mock import MagicMock, patch
from app.core.config import settings
from app.ai.providers import (
    AIProvider,
    GeminiProvider,
    ProviderFactory,
    log_ai_request,
    AIProviderError,
    AIProviderTimeoutError,
    AIProviderAPIKeyError,
)

def test_ai_provider_interface():
    """Verify GeminiProvider implements AIProvider ABC and respects configuration defaults."""
    provider = GeminiProvider()
    assert isinstance(provider, AIProvider)
    assert provider.provider_name() == "gemini"
    assert provider.model_name() == settings.AI_MODEL

def test_gemini_provider_structured_health_check():
    """Verify health_check returns structured diagnostic dictionary."""
    provider = GeminiProvider(api_key="dummy-gemini-key")
    health = provider.health_check()
    assert isinstance(health, dict)
    assert health["available"] is False
    assert health["provider"] == "gemini"
    assert health["model"] == settings.AI_MODEL
    assert "disabled" in health["error"].lower() or "unconfigured" in health["error"].lower()

def test_gemini_provider_mock_generation():
    """Verify GeminiProvider generates fallback response in test context."""
    provider = GeminiProvider(api_key="dummy-gemini-key")
    res = provider.generate("Test prompt for Gemini")
    assert "[Mock Gemini Provider]" in res

    with pytest.raises(AIProviderError) as exc_info:
        provider.generate("")
    assert "Prompt content cannot be empty" in str(exc_info.value)

def test_gemini_provider_retry_and_backoff():
    """Verify retry policy attempts max_retries before raising mapped AIProviderError."""
    provider = GeminiProvider(api_key="valid-test-key-12345")
    provider._enabled = True
    provider._model = MagicMock()
    provider._model.generate_content.side_effect = Exception("Internal 500 server error")

    with patch("time.sleep") as mock_sleep:
        with pytest.raises(AIProviderError) as exc_info:
            provider._execute_with_retry("Retry test prompt", max_retries=3, timeout_seconds=10.0)

        assert "failed after 3 attempt(s)" in str(exc_info.value)
        assert mock_sleep.call_count == 2

def test_gemini_provider_exception_mapping_api_key():
    """Verify API key authentication errors map to AIProviderAPIKeyError without retrying."""
    provider = GeminiProvider(api_key="invalid-key")
    provider._enabled = True
    provider._model = MagicMock()
    provider._model.generate_content.side_effect = Exception("API_KEY_INVALID: Invalid API Key provided")

    with patch("time.sleep") as mock_sleep:
        with pytest.raises(AIProviderAPIKeyError) as exc_info:
            provider._execute_with_retry("Auth test prompt", max_retries=3)

        assert "authentication error" in str(exc_info.value)
        assert mock_sleep.call_count == 0  # Should fail fast without retrying

def test_gemini_provider_exception_mapping_timeout():
    """Verify timeout errors map to AIProviderTimeoutError."""
    provider = GeminiProvider(api_key="valid-key")
    provider._enabled = True
    provider._model = MagicMock()
    provider._model.generate_content.side_effect = TimeoutError("Deadline exceeded waiting for response")

    with pytest.raises(AIProviderTimeoutError) as exc_info:
        provider._execute_with_retry("Timeout prompt", max_retries=1, timeout_seconds=0.1)

    assert "timed out" in str(exc_info.value)

def test_provider_factory_default():
    """Verify ProviderFactory resolves configured default provider."""
    provider = ProviderFactory.get_provider()
    assert isinstance(provider, GeminiProvider)
    assert provider.provider_name() == "gemini"

def test_provider_factory_explicit():
    """Verify ProviderFactory returns provider for explicit provider string."""
    provider = ProviderFactory.get_provider("gemini")
    assert isinstance(provider, GeminiProvider)

def test_provider_factory_dynamic_registration():
    """Verify dynamic registration of custom AIProvider subclasses in ProviderFactory."""
    class DummyCustomProvider(AIProvider):
        def generate(self, prompt: str, **kwargs) -> str:
            return "custom"
        def generate_json(self, prompt: str, **kwargs) -> dict:
            return {}
        def health_check(self) -> dict:
            return {"available": True, "provider": "custom", "model": "custom-v1", "latency": 0.0, "error": None}
        def provider_name(self) -> str:
            return "custom"
        def model_name(self) -> str:
            return "custom-v1"

    ProviderFactory.register_provider("custom", DummyCustomProvider)
    instance = ProviderFactory.get_provider("custom")
    assert isinstance(instance, DummyCustomProvider)
    assert instance.provider_name() == "custom"

def test_provider_factory_unsupported():
    """Verify ProviderFactory raises ValueError for unregistered providers."""
    with pytest.raises(ValueError) as exc_info:
        ProviderFactory.get_provider("unsupported_provider_xyz")
    assert "Unsupported AI provider 'unsupported_provider_xyz'" in str(exc_info.value)

def test_ai_provider_logging(caplog):
    """Verify telemetry logging helper formats structured payload."""
    with caplog.at_level(logging.INFO, logger="ai.providers"):
        payload = log_ai_request(
            provider="gemini",
            model="gemini-1.5-flash",
            latency=0.1234,
            request_id="req-9999",
            retry_count=1,
            prompt_tokens=10,
            completion_tokens=20,
            success=True,
            extra_meta={"test_id": "123"}
        )
        assert payload["request_id"] == "req-9999"
        assert payload["provider"] == "gemini"
        assert payload["model"] == "gemini-1.5-flash"
        assert payload["latency_seconds"] == 0.1234
        assert payload["retry_count"] == 1
        assert payload["total_tokens"] == 30
        assert payload["success"] is True
        assert payload["metadata"]["test_id"] == "123"
        assert "[AI Provider Log] request_id=req-9999" in caplog.text

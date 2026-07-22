import pytest
import logging
from app.ai.providers import (
    AIProvider,
    GeminiProvider,
    ProviderFactory,
    log_ai_request,
    AIProviderError,
)

def test_ai_provider_interface():
    """Verify GeminiProvider implements AIProvider ABC."""
    provider = GeminiProvider()
    assert isinstance(provider, AIProvider)
    assert provider.provider_name() == "gemini"
    assert provider.model_name() == "gemini-1.5-flash"

def test_gemini_provider_mock_generation():
    """Verify GeminiProvider generates raw text and json in test/mock context."""
    provider = GeminiProvider(api_key="dummy-gemini-key")
    assert provider.health_check() is False  # dummy key is disabled

    # Test text generation
    res = provider.generate("Test prompt for Gemini")
    assert "[Mock Gemini Provider]" in res

    # Test empty prompt error
    with pytest.raises(AIProviderError):
        provider.generate("")

def test_provider_factory_default():
    """Verify ProviderFactory returns GeminiProvider by default."""
    provider = ProviderFactory.get_provider()
    assert isinstance(provider, GeminiProvider)
    assert provider.provider_name() == "gemini"

def test_provider_factory_explicit():
    """Verify ProviderFactory returns GeminiProvider for explicit name."""
    provider = ProviderFactory.get_provider("gemini")
    assert isinstance(provider, GeminiProvider)

def test_provider_factory_unsupported():
    """Verify ProviderFactory rejects unsupported providers."""
    with pytest.raises(ValueError) as exc_info:
        ProviderFactory.get_provider("openai")
    assert "Unsupported AI provider 'openai'" in str(exc_info.value)

def test_ai_provider_logging(caplog):
    """Verify logging helper formats telemetry log dictionary."""
    with caplog.at_level(logging.INFO, logger="ai.providers"):
        payload = log_ai_request(
            provider="gemini",
            model="gemini-1.5-flash",
            latency=0.1234,
            prompt_tokens=10,
            completion_tokens=20,
            extra_meta={"test_id": "123"}
        )
        assert payload["provider"] == "gemini"
        assert payload["model"] == "gemini-1.5-flash"
        assert payload["latency_seconds"] == 0.1234
        assert payload["total_tokens"] == 30
        assert payload["metadata"]["test_id"] == "123"
        assert "[AI Provider Log] provider=gemini model=gemini-1.5-flash" in caplog.text

# AI Provider Architecture Specification (SprintMind AI v4.0)

## Overview

The AI Provider Architecture decouples high-level business capabilities (story planning, requirements extraction, document summarization, risk analysis) from the underlying Large Language Model (LLM) vendor implementations. 

In Phase 1.4, **Google Gemini** (`GeminiProvider`) serves as the primary and default active LLM backend. The architecture is engineered so that future providers (e.g. Claude, OpenAI, Local models) can be integrated by implementing the abstract interface without modifying business domain services or API contracts.

---

## Key Components

### 1. `AIProvider` Abstract Interface
Defined in `app/ai/providers/base.py`, `AIProvider` establishes the unified contract for all LLM backends:

```python
class AIProvider(abc.ABC):
    @abc.abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        """Execute a text generation prompt and return raw text response."""
        pass

    @abc.abstractmethod
    def generate_json(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Execute a generation prompt and parse response into JSON dict."""
        pass

    @abc.abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Verify API connectivity, credentials, and model health."""
        pass

    @abc.abstractmethod
    def provider_name(self) -> str:
        """Return the unique provider string name (e.g. 'gemini')."""
        pass

    @abc.abstractmethod
    def model_name(self) -> str:
        """Return the active model name string (e.g. 'gemini-1.5-flash')."""
        pass
```

---

### 2. Provider Factory (`ProviderFactory`)
Defined in `app/ai/providers/factory.py`, the `ProviderFactory` manages instantiation and dynamic provider registration:

```python
from app.ai.providers import ProviderFactory

# Resolve default provider configured in settings (AI_PROVIDER)
provider = ProviderFactory.get_provider()

# Dynamically register custom provider implementations
ProviderFactory.register_provider("custom", CustomProviderClass)
```

---

### 3. Unified Configuration
All AI provider settings are centralized in `app.core.config.Settings`:

| Field | Type | Default | Description |
|---|---|---|---|
| `AI_PROVIDER` | `str` | `"gemini"` | Active AI provider key |
| `AI_MODEL` | `str` | `"gemini-1.5-flash"` | Active model identifier |
| `AI_TIMEOUT` | `float` | `30.0` | Per-request timeout in seconds |
| `AI_MAX_RETRIES` | `int` | `3` | Maximum retry attempts for transient errors |
| `GEMINI_API_KEY` | `str` | `"dummy-gemini-key"` | Developer API Key |

---

### 4. Exception Hierarchy & Exception Mapping
To keep business services isolated from vendor SDKs, all raw provider exceptions are caught inside the provider implementation and mapped to the standard exception hierarchy defined in `app/ai/providers/base.py`:

```
AIProviderError (Base exception)
├── AIProviderTimeoutError (Timed out requests / deadline exceeded)
└── AIProviderAPIKeyError (Invalid API keys / authentication failures)
```

*Rule*: No vendor SDK exceptions (such as `google.api_core.exceptions` or `genai` errors) bubble past the provider boundary.

---

### 5. Retry Policy & Exponential Backoff
Retry logic is strictly centralized inside the provider implementation (`GeminiProvider._execute_with_retry`). Business services must **never** implement custom retry loops.

- **Strategy**: Exponential backoff (`delay = 0.5 * (2 ** (attempt - 1))`).
- **Retryable Errors**: Transient network errors, rate limit quotas (429), 5xx server errors.
- **Non-Retryable Errors**: Authentication errors (`AIProviderAPIKeyError`), bad request parameters (400), invalid empty prompts.

---

### 6. Health Checks & Diagnostic Verification
`provider.health_check()` returns a structured diagnostic dictionary:

```json
{
  "available": true,
  "provider": "gemini",
  "model": "gemini-1.5-flash",
  "latency": 0.0012,
  "error": null
}
```

---

### 7. Telemetry & Request Logging
Every request executed through `AIProvider` emits structured telemetry logs via `log_ai_request()` in `app/ai/providers/logging.py`:

- `request_id`: Unique UUID4 identifier for request tracing
- `provider`: Active provider name (`"gemini"`)
- `model`: Active model name (`"gemini-1.5-flash"`)
- `latency_seconds`: Measured wall-clock latency
- `retry_count`: Number of retries executed before completion
- `prompt_tokens`, `completion_tokens`, `total_tokens`: Usage metrics
- `success`: Boolean execution status
- `error`: Error message string if failed

---

## How to Add a New AI Provider

When adding a new provider in future phases:

1. Create a new module under `app/ai/providers/` (e.g. `app/ai/providers/openai.py`).
2. Subclass `AIProvider` and implement all abstract methods (`generate`, `generate_json`, `health_check`, `provider_name`, `model_name`).
3. Wrap all vendor API calls with exception mapping to `AIProviderError`, `AIProviderTimeoutError`, and `AIProviderAPIKeyError`.
4. Register the new provider class with `ProviderFactory.register_provider("openai", OpenAIProvider)` inside `app/ai/providers/__init__.py`.
5. Update `Settings` in `app/core/config.py` if new credentials/keys are needed.

---

## Testing Strategy

Unit test coverage for the provider framework is maintained under `backend/tests/`:

- `tests/test_ai_providers.py`: Verifies provider interface compliance, factory resolution, health checks, retry/exponential backoff policy, exception mapping, and telemetry logging.
- `tests/test_ai_migration.py`: Verifies zero vendor SDK leakage outside `app/ai/providers/` package and full service transport integration.

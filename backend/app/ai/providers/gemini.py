import json
import re
import time
from typing import Dict, Any, Optional
import google.generativeai as genai

from app.core.config import settings
from .base import (
    AIProvider,
    AIProviderError,
    AIProviderTimeoutError,
    AIProviderAPIKeyError,
)
from .logging import log_ai_request

class GeminiProvider(AIProvider):
    """
    Google Gemini implementation of the AIProvider interface.
    Handles API initialization, prompt execution, retry logic, timeout handling,
    exception mapping, and response parsing.
    """

    def __init__(self, api_key: Optional[str] = None, model_name_str: str = "gemini-1.5-flash"):
        self._model_name = model_name_str
        self._api_key = api_key or getattr(settings, "GEMINI_API_KEY", "")
        self._enabled = False
        self._model = None

        if self._api_key and self._api_key != "dummy-gemini-key":
            try:
                genai.configure(api_key=self._api_key)
                self._model = genai.GenerativeModel(self._model_name)
                self._enabled = True
            except Exception:
                self._enabled = False

    def provider_name(self) -> str:
        return "gemini"

    def model_name(self) -> str:
        return self._model_name

    def health_check(self) -> bool:
        if not self._enabled or not self._model:
            return False
        return True

    def _execute_with_retry(
        self, prompt: str, max_retries: int = 3, timeout_seconds: float = 30.0, **kwargs
    ) -> str:
        if not self.health_check():
            # In local/mock mode, return a deterministic mock fallback
            return f"[Mock Gemini Provider] Response for prompt: {prompt[:60]}..."

        start_time = time.time()
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                response = self._model.generate_content(prompt)
                elapsed = time.time() - start_time

                prompt_tokens = 0
                completion_tokens = 0
                total_tokens = 0
                if hasattr(response, "usage_metadata") and response.usage_metadata:
                    prompt_tokens = getattr(response.usage_metadata, "prompt_token_count", 0)
                    completion_tokens = getattr(response.usage_metadata, "candidates_token_count", 0)
                    total_tokens = getattr(response.usage_metadata, "total_token_count", 0)

                log_ai_request(
                    provider=self.provider_name(),
                    model=self.model_name(),
                    latency=elapsed,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                )

                if hasattr(response, "text") and response.text:
                    return response.text
                return str(response)

            except Exception as e:
                last_error = e
                elapsed = time.time() - start_time
                if elapsed > timeout_seconds:
                    raise AIProviderTimeoutError(
                        f"Gemini API request timed out after {elapsed:.2f}s: {str(e)}"
                    ) from e
                if attempt < max_retries:
                    time.sleep(0.1 * (2 ** (attempt - 1)))

        raise AIProviderError(f"Gemini API request failed after {max_retries} attempts: {str(last_error)}") from last_error

    def generate(self, prompt: str, **kwargs) -> str:
        if not prompt or not prompt.strip():
            raise AIProviderError("Prompt content cannot be empty")
        return self._execute_with_retry(prompt, **kwargs)

    def generate_json(self, prompt: str, **kwargs) -> Dict[str, Any]:
        raw_text = self.generate(prompt, **kwargs)

        cleaned_text = raw_text.strip()
        if "```json" in cleaned_text:
            match = re.search(r"```json\s*(.*?)\s*```", cleaned_text, re.DOTALL)
            if match:
                cleaned_text = match.group(1)
        elif "```" in cleaned_text:
            match = re.search(r"```\s*(.*?)\s*```", cleaned_text, re.DOTALL)
            if match:
                cleaned_text = match.group(1)

        try:
            return json.loads(cleaned_text)
        except json.JSONDecodeError as err:
            raise AIProviderError(
                f"Failed to parse JSON response from Gemini Provider: {str(err)}. Content: {raw_text[:200]}"
            ) from err

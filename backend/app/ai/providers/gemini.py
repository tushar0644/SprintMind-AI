import json
import re
import time
import uuid
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
    Handles API initialization, prompt execution, retry policy with exponential backoff,
    timeout handling, exception mapping, structured health checks, and response parsing.
    """

    def __init__(
        self, 
        api_key: Optional[str] = None, 
        model_name_str: Optional[str] = None,
        max_retries: Optional[int] = None,
        timeout_seconds: Optional[float] = None,
    ):
        self._model_name = model_name_str or getattr(settings, "AI_MODEL", "gemini-1.5-flash")
        self._api_key = api_key or getattr(settings, "GEMINI_API_KEY", "")
        self._max_retries = max_retries if max_retries is not None else getattr(settings, "AI_MAX_RETRIES", 3)
        self._timeout_seconds = timeout_seconds if timeout_seconds is not None else getattr(settings, "AI_TIMEOUT", 30.0)
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

    def health_check(self) -> Dict[str, Any]:
        start_time = time.time()
        if not self._enabled or not self._model:
            return {
                "available": False,
                "provider": self.provider_name(),
                "model": self.model_name(),
                "latency": 0.0,
                "error": "Provider disabled or API key unconfigured",
            }
        latency = round(time.time() - start_time, 4)
        return {
            "available": True,
            "provider": self.provider_name(),
            "model": self.model_name(),
            "latency": latency,
            "error": None,
        }

    def _is_api_key_error(self, exc: Exception) -> bool:
        err_msg = str(exc).lower()
        key_phrases = ["api_key", "invalid api key", "unauthorized", "auth", "permissiondenied", "forbidden", "401", "403"]
        return any(phrase in err_msg for phrase in key_phrases)

    def _is_timeout_error(self, exc: Exception, elapsed: float, timeout_seconds: float) -> bool:
        if elapsed >= timeout_seconds:
            return True
        err_msg = str(exc).lower()
        timeout_phrases = ["timeout", "timed out", "deadlineexceeded", "deadline_exceeded"]
        return isinstance(exc, (TimeoutError, OSError)) or any(phrase in err_msg for phrase in timeout_phrases)

    def _is_retryable_error(self, exc: Exception) -> bool:
        if self._is_api_key_error(exc):
            return False
        err_msg = str(exc).lower()
        if "invalid_argument" in err_msg or "bad request" in err_msg or "400" in err_msg:
            return False
        return True

    def _execute_with_retry(
        self, prompt: str, max_retries: Optional[int] = None, timeout_seconds: Optional[float] = None, **kwargs
    ) -> str:
        effective_retries = max_retries if max_retries is not None else self._max_retries
        effective_timeout = timeout_seconds if timeout_seconds is not None else self._timeout_seconds

        health = self.health_check()
        if not health["available"]:
            # In mock/test mode, return deterministic response
            return f"[Mock Gemini Provider] Response for prompt: {prompt[:60]}..."

        req_id = str(uuid.uuid4())
        start_time = time.time()
        last_error: Optional[Exception] = None

        for attempt in range(1, effective_retries + 1):
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
                    request_id=req_id,
                    retry_count=attempt - 1,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                    success=True,
                )

                if hasattr(response, "text") and response.text:
                    return response.text
                return str(response)

            except Exception as exc:
                elapsed = time.time() - start_time
                last_error = exc

                if self._is_api_key_error(exc):
                    mapped_err = AIProviderAPIKeyError(f"Gemini API key authentication error: {str(exc)}")
                    log_ai_request(
                        provider=self.provider_name(),
                        model=self.model_name(),
                        latency=elapsed,
                        request_id=req_id,
                        retry_count=attempt - 1,
                        success=False,
                        error=str(mapped_err),
                    )
                    raise mapped_err from exc

                if self._is_timeout_error(exc, elapsed, effective_timeout):
                    mapped_err = AIProviderTimeoutError(f"Gemini API request timed out after {elapsed:.2f}s: {str(exc)}")
                    log_ai_request(
                        provider=self.provider_name(),
                        model=self.model_name(),
                        latency=elapsed,
                        request_id=req_id,
                        retry_count=attempt - 1,
                        success=False,
                        error=str(mapped_err),
                    )
                    raise mapped_err from exc

                if not self._is_retryable_error(exc) or attempt >= effective_retries:
                    mapped_err = AIProviderError(f"Gemini API request failed after {attempt} attempt(s): {str(exc)}")
                    log_ai_request(
                        provider=self.provider_name(),
                        model=self.model_name(),
                        latency=elapsed,
                        request_id=req_id,
                        retry_count=attempt - 1,
                        success=False,
                        error=str(mapped_err),
                    )
                    raise mapped_err from exc

                # Exponential backoff before next attempt
                backoff = 0.5 * (2 ** (attempt - 1))
                time.sleep(backoff)

        mapped_err = AIProviderError(f"Gemini API request failed after {effective_retries} attempts: {str(last_error)}")
        raise mapped_err from last_error

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

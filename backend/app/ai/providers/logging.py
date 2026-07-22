import logging
import uuid
from typing import Dict, Any, Optional

logger = logging.getLogger("ai.providers")

def log_ai_request(
    provider: str,
    model: str,
    latency: float,
    request_id: Optional[str] = None,
    retry_count: int = 0,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    total_tokens: int = 0,
    success: bool = True,
    error: Optional[str] = None,
    extra_meta: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Reusable telemetry logging utility for AI provider operations.
    Logs structured request telemetry including latency, retries, token usage, and status.
    """
    req_id = request_id or str(uuid.uuid4())
    calc_total = total_tokens if total_tokens > 0 else (prompt_tokens + completion_tokens)
    log_payload = {
        "request_id": req_id,
        "provider": provider,
        "model": model,
        "latency_seconds": round(latency, 4),
        "retry_count": retry_count,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": calc_total,
        "success": success,
        "error": error,
    }
    if extra_meta:
        log_payload["metadata"] = extra_meta

    status_str = "SUCCESS" if success else f"FAILURE ({error})"
    logger.info(
        f"[AI Provider Log] request_id={req_id} provider={provider} model={model} "
        f"status={status_str} latency={log_payload['latency_seconds']}s "
        f"retries={retry_count} tokens={log_payload['total_tokens']} "
        f"(prompt={prompt_tokens}, completion={completion_tokens})"
    )
    return log_payload


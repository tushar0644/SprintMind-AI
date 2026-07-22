import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("ai.providers")

def log_ai_request(
    provider: str,
    model: str,
    latency: float,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    total_tokens: int = 0,
    extra_meta: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Reusable logging utility for AI provider operations.
    Logs structured telemetry including latency and token metrics.
    """
    calc_total = total_tokens if total_tokens > 0 else (prompt_tokens + completion_tokens)
    log_payload = {
        "provider": provider,
        "model": model,
        "latency_seconds": round(latency, 4),
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": calc_total,
    }
    if extra_meta:
        log_payload["metadata"] = extra_meta

    logger.info(
        f"[AI Provider Log] provider={provider} model={model} "
        f"latency={log_payload['latency_seconds']}s "
        f"tokens={log_payload['total_tokens']} "
        f"(prompt={prompt_tokens}, completion={completion_tokens})"
    )
    return log_payload

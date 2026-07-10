def get_root_status() -> dict:
    """
    Generates the running details status payload for the root server entry check.
    """
    return {
        "status": "running",
        "application": "SprintMind AI Backend",
        "version": "1.0.0"
    }

def get_health_status() -> dict:
    """
    Generates the basic check indicator payload for standard load-balancer polling.
    """
    return {
        "status": "healthy"
    }

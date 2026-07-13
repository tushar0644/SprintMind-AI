import logging
import logging.config
import sys
import contextvars

# Thread-safe request ID context variable
request_id_ctx_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

class RequestIDFilter(logging.Filter):
    def filter(self, record):
        # Inject the request_id attribute into every log record
        record.request_id = request_id_ctx_var.get()
        return True

# Production-grade logging configuration mapping stdout and stderr handlers
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {
            "()": RequestIDFilter
        }
    },
    "formatters": {
        "standard": {
            "format": "%(asctime)s [%(levelname)s] [%(request_id)s] %(name)s: %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S"
        },
        "detailed": {
            "format": "%(asctime)s [%(levelname)s] [%(request_id)s] %(name)s (%(filename)s:%(lineno)d): %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S"
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
            "formatter": "standard",
            "filters": ["request_id"],
            "stream": sys.stdout
        },
        "error_console": {
            "class": "logging.StreamHandler",
            "level": "ERROR",
            "formatter": "detailed",
            "filters": ["request_id"],
            "stream": sys.stderr
        }
    },
    "loggers": {
        "sprintmind": {
            "handlers": ["console", "error_console"],
            "level": "INFO",
            "propagate": False
        }
    }
}

def configure_logging() -> logging.Logger:
    """
    Applies the logging dict configuration and instantiates the core logger.
    """
    logging.config.dictConfig(LOGGING_CONFIG)
    app_logger = logging.getLogger("sprintmind")
    app_logger.info("Structured console loggers initialized.")
    return app_logger

# Logger Instance Export
logger = configure_logging()

import logging
import logging.config
import sys

# Production-grade logging configuration mapping stdout and stderr handlers
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S"
        },
        "detailed": {
            "format": "%(asctime)s [%(levelname)s] %(name)s (%(filename)s:%(lineno)d): %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S"
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
            "formatter": "standard",
            "stream": sys.stdout
        },
        "error_console": {
            "class": "logging.StreamHandler",
            "level": "ERROR",
            "formatter": "detailed",
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

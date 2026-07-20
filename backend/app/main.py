# ==============================================================================
# SprintMind AI Backend
# Current Phase: Project Foundation
# Only infrastructure is enabled.
# Business modules will be added incrementally during future implementation phases.
# ==============================================================================

import time
from contextlib import asynccontextmanager
import uuid
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.encoders import jsonable_encoder
# from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.config.logging import logger, request_id_ctx_var
from app.schemas.health import HealthResponse
from app.utils.health import get_root_status, get_health_status
from app.routers.api import api_router

# 1. Lifespan Event Context Handlers
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages startup and shutdown lifecycles for the FastAPI application.
    """
    logger.info(
        f"Starting {settings.APP_TITLE} v{settings.APP_VERSION} "
        f"[Env: {settings.ENVIRONMENT}] [Port: {settings.PORT}]"
    )
    yield
    logger.info(f"Shutting down {settings.APP_TITLE} API Gateway and closing active streams...")

# 2. Instantiate core FastAPI Application Gateway
_is_production = settings.ENVIRONMENT == "production"
app = FastAPI(
    title=settings.APP_TITLE,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json"
)

# 3. Mount Middlewares
# Trusted Hosts Header Validation Middleware (Disabled for local development phase)
# app.add_middleware(
#     TrustedHostMiddleware,
#     allowed_hosts=settings.ALLOWED_HOSTS
# )


# Cross-Origin Resource Sharing (CORS) Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Custom Http Request-Response Performance Logging Middleware
@app.middleware("http")
async def log_http_transactions(request: Request, call_next):
    # Retrieve request ID from client or generate a new one
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    token = request_id_ctx_var.set(request_id)
    
    start_time = time.time()
    logger.info(f"Incoming: {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        
        # Log standard completion
        logger.info(
            f"Finished: {request.method} {request.url.path} "
            f"-> Status: {response.status_code} [Latency: {duration_ms:.2f}ms]"
        )
        
        # Explicit warning hook for slow requests exceeding 2.0 seconds
        if duration_ms > 2000.0:
            logger.warning(
                f"SLOW TRANSACTION WARNING: {request.method} {request.url.path} "
                f"took {duration_ms:.2f}ms (threshold: 2000.00ms)"
            )
            
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as exc:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(
            f"Transaction Failed: {request.method} {request.url.path} "
            f"-> Exception: {str(exc)} [Latency: {duration_ms:.2f}ms]"
        )
        raise exc
    finally:
        request_id_ctx_var.reset(token)

# 4. Global Exception Handler Registry
def get_cors_headers(request: Request) -> dict:
    origin = request.headers.get("origin")
    if origin and (origin in settings.CORS_ORIGINS or "*" in settings.CORS_ORIGINS):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    return {}

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    Standardizes HTTP exceptions to return detail and request_id.
    """
    headers = getattr(exc, "headers", None) or {}
    headers = {**headers, **get_cors_headers(request)}
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": jsonable_encoder(exc.detail),
            "request_id": request_id_ctx_var.get()
        },
        headers=headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Standardizes validation exceptions to return errors detail and request_id.
    """
    headers = get_cors_headers(request)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": jsonable_encoder(exc.errors()),
            "request_id": request_id_ctx_var.get()
        },
        headers=headers
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catches unhandled errors globally, preventing server stack trace leakages to clients.
    """
    logger.error(f"Global unhandled error captured: {str(exc)}", exc_info=True)
    headers = get_cors_headers(request)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected server error occurred.",
            "request_id": request_id_ctx_var.get()
        },
        headers=headers
    )

# 5. Core Foundational Routes
@app.get("/", tags=["Health"])
def read_root():
    """
    Public entrypoint status verification endpoint.
    """
    return get_root_status()

@app.get("/health", response_model=HealthResponse, tags=["Health"])
def read_health() -> HealthResponse:
    """
    Standard load-balancer health-check polling endpoint.
    """
    return HealthResponse(**get_health_status())

@app.get("/api/monitoring/health", tags=["Health"])
def read_monitoring_health():
    """
    Detailed monitoring health-check verifying active DB and AI service connections.
    """
    from app.database.client import verify_supabase_connection
    from app.services.ai_service import get_ai_service
    
    supabase_ok = verify_supabase_connection()
    ai_service = get_ai_service()
    gemini_ok = getattr(ai_service, "enabled", False)
    
    overall_status = "healthy" if (supabase_ok and gemini_ok) else "degraded"
    
    return {
        "status": overall_status,
        "supabase_connection": "connected" if supabase_ok else "disconnected",
        "gemini_api": "ready" if gemini_ok else "not_configured_or_failed",
        "timestamp": time.time()
    }

# 6. Register Modular Aggregate Routing
# Future Modules
# - Authentication
# - Projects
# - Tasks
# - Sprint
# - AI
# - Analytics
# - Automation
#
app.include_router(api_router)


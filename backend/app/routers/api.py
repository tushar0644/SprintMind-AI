from fastapi import APIRouter
from app.routers import (
    auth,
    projects,
    tasks,
    sprints,
    meetings,
    ai,
    analytics,
    automation,
    reports,
    comments,
    notifications,
    activity
)
from app.attachments.router import router as attachments_router

# 1. Router for V1 API endpoints (accessible under /api/v1/...)
api_router_v1 = APIRouter(prefix="/v1")
api_router_v1.include_router(auth.router)
api_router_v1.include_router(projects.router)
api_router_v1.include_router(tasks.router)
api_router_v1.include_router(sprints.router)
api_router_v1.include_router(meetings.router)
api_router_v1.include_router(ai.router)
api_router_v1.include_router(analytics.router)
api_router_v1.include_router(automation.router)
api_router_v1.include_router(reports.router)
api_router_v1.include_router(comments.router)
api_router_v1.include_router(notifications.router)
api_router_v1.include_router(activity.router)
api_router_v1.include_router(attachments_router)

# 2. Router for Legacy API endpoints (accessible under /api/...)
api_router_legacy = APIRouter()
api_router_legacy.include_router(auth.router)
api_router_legacy.include_router(projects.router)
api_router_legacy.include_router(tasks.router)
api_router_legacy.include_router(sprints.router)
api_router_legacy.include_router(meetings.router)
api_router_legacy.include_router(ai.router)
api_router_legacy.include_router(analytics.router)
api_router_legacy.include_router(automation.router)
api_router_legacy.include_router(reports.router)
api_router_legacy.include_router(comments.router)
api_router_legacy.include_router(notifications.router)
api_router_legacy.include_router(activity.router)
api_router_legacy.include_router(attachments_router)

# 3. Combined API Router mounted in main.py under prefix "/api"
api_router = APIRouter(prefix="/api")
api_router.include_router(api_router_v1)
api_router.include_router(api_router_legacy)

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
)

# Root v1 api gateway router mapping submodules modularly
api_router = APIRouter(prefix="/api/v1")

# Mount plug-and-play feature modules
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(sprints.router)
api_router.include_router(meetings.router)
api_router.include_router(ai.router)
api_router.include_router(analytics.router)
api_router.include_router(automation.router)
api_router.include_router(reports.router)

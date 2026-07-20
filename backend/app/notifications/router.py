from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from uuid import UUID
from app.services.auth import get_current_user
from app.notifications.schemas import PaginatedNotificationsResponse
from app.notifications.service import NotificationService
from app.notifications.dependencies import get_notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=PaginatedNotificationsResponse)
def list_notifications(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    type: Optional[str] = Query(None, description="Filter by notification type"),
    current_user = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
) -> PaginatedNotificationsResponse:
    notifs, total = service.list_notifications(current_user.id, page, limit, type)
    return PaginatedNotificationsResponse(
        notifications=notifs,
        total_count=total,
        page=page,
        limit=limit
    )

@router.get("/unread-count")
def get_unread_count(
    current_user = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
) -> dict:
    count = service.get_unread_count(current_user.id)
    return {"unread_count": count}

@router.patch("/{notification_id}/read")
def mark_as_read(
    notification_id: UUID,
    current_user = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
) -> dict:
    success = service.mark_notification_as_read(notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return {"success": True}

@router.post("/read-all")
def mark_all_as_read(
    current_user = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
) -> dict:
    count = service.mark_all_notifications_as_read(current_user.id)
    return {"success": True, "marked_count": count}

@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: UUID,
    current_user = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    success = service.delete_notification(notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return

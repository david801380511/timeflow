from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime
from backend.database import get_db
from backend.models.notification_models import (
    NotificationRule, Notification, NotificationPreference,
    create_default_notification_rules
)
from backend.routes.auth_routes import get_current_user

router = APIRouter()


@router.get("/api/notifications")
async def get_notifications(
    request: Request,
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get user's notifications"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    query = db.query(Notification).filter(Notification.user_id == user.id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    notifications = query.order_by(Notification.delivered_at.desc()).limit(limit).all()
    
    return [{
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "notification_type": n.notification_type,
        "priority": n.priority,
        "is_read": n.is_read,
        "is_dismissed": n.is_dismissed,
        "delivered_at": n.delivered_at.isoformat(),
        "action_url": n.action_url,
        "action_text": n.action_text,
        "assignment_id": n.assignment_id,
        "calendar_block_id": n.calendar_block_id
    } for n in notifications]


@router.get("/api/notifications/unread-count")
async def get_unread_count(request: Request, db: Session = Depends(get_db)):
    """Get count of unread notifications"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    count = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False,
        Notification.is_dismissed == False
    ).count()
    
    return {"count": count}


@router.post("/api/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()
    
    return {"status": "success"}


@router.post("/api/notifications/{notification_id}/dismiss")
async def dismiss_notification(
    notification_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Dismiss a notification"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_dismissed = True
    db.commit()
    
    return {"status": "success"}


@router.post("/api/notifications/mark-all-read")
async def mark_all_read(request: Request, db: Session = Depends(get_db)):
    """Mark all notifications as read"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False
    ).update({"is_read": True, "read_at": datetime.utcnow()})
    
    db.commit()
    
    return {"status": "success"}


@router.delete("/api/notifications/{notification_id}")
async def delete_notification(
    notification_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Delete a notification"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    
    return {"status": "success"}


# Notification Rules Management

@router.get("/api/notification-rules")
async def get_notification_rules(request: Request, db: Session = Depends(get_db)):
    """Get user's notification rules"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    rules = db.query(NotificationRule).filter(
        NotificationRule.user_id == user.id
    ).all()
    
    return [{
        "id": r.id,
        "name": r.name,
        "rule_type": r.rule_type,
        "is_enabled": r.is_enabled,
        "trigger_time": r.trigger_time,
        "trigger_unit": r.trigger_unit,
        "message_template": r.message_template,
        "priority": r.priority,
        "only_on_days": r.only_on_days,
        "time_range_start": r.time_range_start,
        "time_range_end": r.time_range_end
    } for r in rules]


@router.post("/api/notification-rules")
async def create_notification_rule(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new notification rule"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    rule = NotificationRule(
        user_id=user.id,
        name=payload.get("name"),
        rule_type=payload.get("rule_type"),
        trigger_time=payload.get("trigger_time"),
        trigger_unit=payload.get("trigger_unit", "minutes"),
        message_template=payload.get("message_template"),
        priority=payload.get("priority", "medium"),
        is_enabled=payload.get("is_enabled", True),
        only_on_days=payload.get("only_on_days"),
        time_range_start=payload.get("time_range_start"),
        time_range_end=payload.get("time_range_end")
    )
    
    db.add(rule)
    db.commit()
    db.refresh(rule)
    
    return {
        "id": rule.id,
        "name": rule.name,
        "status": "created"
    }


@router.put("/api/notification-rules/{rule_id}")
async def update_notification_rule(
    rule_id: int,
    payload: dict,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update a notification rule"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    rule = db.query(NotificationRule).filter(
        NotificationRule.id == rule_id,
        NotificationRule.user_id == user.id
    ).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    # Update fields
    if "name" in payload:
        rule.name = payload["name"]
    if "is_enabled" in payload:
        rule.is_enabled = payload["is_enabled"]
    if "trigger_time" in payload:
        rule.trigger_time = payload["trigger_time"]
    if "trigger_unit" in payload:
        rule.trigger_unit = payload["trigger_unit"]
    if "message_template" in payload:
        rule.message_template = payload["message_template"]
    if "priority" in payload:
        rule.priority = payload["priority"]
    if "only_on_days" in payload:
        rule.only_on_days = payload["only_on_days"]
    if "time_range_start" in payload:
        rule.time_range_start = payload["time_range_start"]
    if "time_range_end" in payload:
        rule.time_range_end = payload["time_range_end"]
    
    rule.updated_at = datetime.utcnow()
    db.commit()
    
    return {"status": "success"}


@router.delete("/api/notification-rules/{rule_id}")
async def delete_notification_rule(
    rule_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Delete a notification rule"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    rule = db.query(NotificationRule).filter(
        NotificationRule.id == rule_id,
        NotificationRule.user_id == user.id
    ).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    db.delete(rule)
    db.commit()
    
    return {"status": "success"}


# Notification Preferences

@router.get("/api/notification-preferences")
async def get_notification_preferences(request: Request, db: Session = Depends(get_db)):
    """Get user's notification preferences"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user.id
    ).first()
    
    if not prefs:
        # Create default preferences
        prefs = NotificationPreference(user_id=user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    
    return {
        "notifications_enabled": prefs.notifications_enabled,
        "quiet_hours_enabled": prefs.quiet_hours_enabled,
        "quiet_hours_start": prefs.quiet_hours_start,
        "quiet_hours_end": prefs.quiet_hours_end,
        "in_app_enabled": prefs.in_app_enabled,
        "email_enabled": prefs.email_enabled,
        "deadline_notifications": prefs.deadline_notifications,
        "study_session_notifications": prefs.study_session_notifications,
        "break_notifications": prefs.break_notifications,
        "achievement_notifications": prefs.achievement_notifications,
        "streak_notifications": prefs.streak_notifications,
        "max_notifications_per_hour": prefs.max_notifications_per_hour
    }


@router.put("/api/notification-preferences")
async def update_notification_preferences(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update user's notification preferences"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user.id
    ).first()
    
    if not prefs:
        prefs = NotificationPreference(user_id=user.id)
        db.add(prefs)
    
    # Update fields
    if "notifications_enabled" in payload:
        prefs.notifications_enabled = payload["notifications_enabled"]
    if "quiet_hours_enabled" in payload:
        prefs.quiet_hours_enabled = payload["quiet_hours_enabled"]
    if "quiet_hours_start" in payload:
        prefs.quiet_hours_start = payload["quiet_hours_start"]
    if "quiet_hours_end" in payload:
        prefs.quiet_hours_end = payload["quiet_hours_end"]
    if "deadline_notifications" in payload:
        prefs.deadline_notifications = payload["deadline_notifications"]
    if "study_session_notifications" in payload:
        prefs.study_session_notifications = payload["study_session_notifications"]
    if "break_notifications" in payload:
        prefs.break_notifications = payload["break_notifications"]
    if "achievement_notifications" in payload:
        prefs.achievement_notifications = payload["achievement_notifications"]
    if "streak_notifications" in payload:
        prefs.streak_notifications = payload["streak_notifications"]
    
    prefs.updated_at = datetime.utcnow()
    db.commit()
    
    return {"status": "success"}

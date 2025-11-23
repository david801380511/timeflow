from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class NotificationRule(Base):
    """Notification rules define when and how users receive reminders"""
    __tablename__ = "notification_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Rule details
    name = Column(String(100), nullable=False)
    rule_type = Column(String(50), nullable=False)  # 'deadline', 'study_session', 'break_reminder', 'streak'
    is_enabled = Column(Boolean, default=True)
    
    # Timing configuration
    trigger_time = Column(Integer, nullable=False)  # Minutes before event (e.g., 60 for 1 hour before)
    trigger_unit = Column(String(20), default='minutes')  # 'minutes', 'hours', 'days'
    
    # Message customization
    message_template = Column(Text, nullable=True)
    notification_method = Column(String(50), default='in_app')  # 'in_app', 'email', 'both'
    priority = Column(String(20), default='medium')  # 'low', 'medium', 'high'
    
    # Conditions
    only_on_days = Column(String(100), nullable=True)  # Comma-separated days: 'mon,tue,wed'
    time_range_start = Column(Integer, nullable=True)  # Hour (0-23)
    time_range_end = Column(Integer, nullable=True)  # Hour (0-23)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="notification_rules", foreign_keys=[user_id])
    notifications = relationship("Notification", back_populates="rule", cascade="all, delete-orphan")


class Notification(Base):
    """Individual notifications sent to users"""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    rule_id = Column(Integer, ForeignKey('notification_rules.id'), nullable=True)
    
    # Notification details
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False)  # 'deadline', 'study_session', 'break', 'achievement', 'streak'
    priority = Column(String(20), default='medium')
    
    # Related entities
    assignment_id = Column(Integer, ForeignKey('assignments.id'), nullable=True)
    calendar_block_id = Column(Integer, ForeignKey('calendar_blocks.id'), nullable=True)
    
    # Status
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    delivered_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
    
    # Action link (optional)
    action_url = Column(String(500), nullable=True)
    action_text = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="notifications", foreign_keys=[user_id])
    rule = relationship("NotificationRule", back_populates="notifications")
    assignment = relationship("Assignment", backref="notifications", foreign_keys=[assignment_id])
    calendar_block = relationship("CalendarBlock", backref="notifications", foreign_keys=[calendar_block_id])


class NotificationPreference(Base):
    """User preferences for notification delivery"""
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    
    # Global settings
    notifications_enabled = Column(Boolean, default=True)
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(Integer, default=22)  # 10 PM
    quiet_hours_end = Column(Integer, default=8)  # 8 AM
    
    # Notification channels
    in_app_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=False)
    email_address = Column(String(200), nullable=True)
    
    # Notification types
    deadline_notifications = Column(Boolean, default=True)
    study_session_notifications = Column(Boolean, default=True)
    break_notifications = Column(Boolean, default=True)
    achievement_notifications = Column(Boolean, default=True)
    streak_notifications = Column(Boolean, default=True)
    
    # Frequency settings
    max_notifications_per_hour = Column(Integer, default=5)
    digest_mode = Column(Boolean, default=False)  # Batch notifications
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="notification_preference", foreign_keys=[user_id])


def create_default_notification_rules(user_id: int, db):
    """Create default notification rules for a new user"""
    default_rules = [
        {
            "name": "Assignment Due Soon",
            "rule_type": "deadline",
            "trigger_time": 1,
            "trigger_unit": "days",
            "message_template": "⏰ Reminder: '{assignment_name}' is due in {time_remaining}!",
            "priority": "high",
            "is_enabled": True
        },
        {
            "name": "Assignment Due Today",
            "rule_type": "deadline",
            "trigger_time": 2,
            "trigger_unit": "hours",
            "message_template": "🚨 Urgent: '{assignment_name}' is due in {time_remaining}!",
            "priority": "high",
            "is_enabled": True
        },
        {
            "name": "Study Session Starting",
            "rule_type": "study_session",
            "trigger_time": 15,
            "trigger_unit": "minutes",
            "message_template": "📚 Your study session for '{assignment_name}' starts in {time_remaining}",
            "priority": "medium",
            "is_enabled": True
        },
        {
            "name": "Break Time Reminder",
            "rule_type": "break_reminder",
            "trigger_time": 0,
            "trigger_unit": "minutes",
            "message_template": "☕ Time for a break! You've been studying for {duration}",
            "priority": "medium",
            "is_enabled": True
        },
        {
            "name": "Streak at Risk",
            "rule_type": "streak",
            "trigger_time": 20,
            "trigger_unit": "hours",
            "message_template": "🔥 Don't break your {streak_days}-day streak! Complete a study session today.",
            "priority": "medium",
            "is_enabled": True,
            "time_range_start": 18,  # Only notify in evening
            "time_range_end": 22
        }
    ]
    
    for rule_data in default_rules:
        rule = NotificationRule(user_id=user_id, **rule_data)
        db.add(rule)
    
    # Create default notification preferences
    preferences = NotificationPreference(user_id=user_id)
    db.add(preferences)
    
    db.commit()

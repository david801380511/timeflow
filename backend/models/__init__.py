from backend.database import Base, engine, SessionLocal
from sqlalchemy.orm import relationship

# Import all models
from .user_models import User, Achievement, UserAchievement
from .models import Assignment, UserSettings, BreakActivity, StudySession, create_tables
from .calendar_models import CalendarBlock
from .limit_models import DailyLimitSetting
from .sprint_models import Sprint, Task
from .notification_models import NotificationRule, Notification, NotificationPreference, create_default_notification_rules
from .music_models import Playlist, Track, UserCustomTrack
from .time_models import TimeMethod, UserMethodPreference, WorkSession

def setup_relationships():
    """Set up all model relationships to avoid circular imports"""
    # User - Playlist relationship (already defined in models with backref)
    
    # User - UserMethodPreference relationship
    if not hasattr(User, 'method_preference'):
        User.method_preference = relationship(
            "UserMethodPreference", 
            back_populates="user", 
            uselist=False,
            cascade="all, delete-orphan"
        )
    
    if hasattr(UserMethodPreference, 'user'):
        UserMethodPreference.user = relationship("User", back_populates="method_preference")
    
    # UserMethodPreference - TimeMethod relationship
    if hasattr(UserMethodPreference, 'method'):
        UserMethodPreference.method = relationship("TimeMethod", lazy='joined')

# Call this function after all models are imported
setup_relationships()

__all__ = [
    'Base', 'engine', 'SessionLocal',
    'Assignment', 'UserSettings', 'BreakActivity', 'StudySession',
    'CalendarBlock', 'DailyLimitSetting', 'Sprint', 'Task',
    'User', 'Achievement', 'UserAchievement',
    'NotificationRule', 'Notification', 'NotificationPreference',
    'Playlist', 'Track', 'TimeMethod', 'UserMethodPreference', 'WorkSession',
    'UserCustomTrack',
    'create_default_notification_rules', 'create_tables', 'setup_relationships'
]

from backend.database import Base, engine, SessionLocal
from .user_models import User, Achievement, UserAchievement  # Import user models FIRST
from .models import Assignment, UserSettings, BreakActivity, StudySession, create_tables
from .calendar_models import CalendarBlock
from .limit_models import DailyLimitSetting
from .sprint_models import Sprint, Task
from .notification_models import NotificationRule, Notification, NotificationPreference, create_default_notification_rules

__all__ = [
    'Base', 'engine', 'SessionLocal',
    'Assignment', 'UserSettings', 'BreakActivity', 'StudySession',
    'CalendarBlock', 'DailyLimitSetting', 'Sprint', 'Task',
    'User', 'Achievement', 'UserAchievement',
    'NotificationRule', 'Notification', 'NotificationPreference',
    'create_default_notification_rules',
    'create_tables'
]

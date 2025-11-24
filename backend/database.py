from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./timeflow.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db():
    """Initialize the database by importing all models and creating tables."""
    # Import all models to ensure they are registered with SQLAlchemy
    from backend.models.user_models import User, Achievement, UserAchievement
    from backend.models.time_models import TimeMethod, UserMethodPreference, WorkSession, TimeMethodType
    from backend.models.music_models import Track, Playlist, TrackSourceType, UserCustomTrack
    from backend.models.calendar_models import CalendarBlock
    from backend.models.notification_models import NotificationRule, Notification, NotificationPreference
    from backend.models.limit_models import DailyLimitSetting
    from backend.models.sprint_models import Sprint, Task
    
    # Create all tables
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency to get DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
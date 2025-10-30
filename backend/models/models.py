from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from typing import List

# Create SQLite database in the current directory
SQLALCHEMY_DATABASE_URL = "sqlite:///./timeflow.db"

# Create the SQLAlchemy engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Create a SessionLocal class for database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a base class for models
Base = declarative_base()

class UserSettings(Base):
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    work_interval = Column(Integer, default=25)  # in minutes
    short_break = Column(Integer, default=5)     # in minutes
    long_break = Column(Integer, default=15)     # in minutes
    short_breaks_before_long = Column(Integer, default=3)
    auto_start_breaks = Column(Boolean, default=True)
    auto_start_pomodoros = Column(Boolean, default=True)
    long_break_delay = Column(Integer, default=15)  # minutes before suggesting long break activities
    
    # Relationships
    break_activities = relationship("BreakActivity", back_populates="settings")

class BreakActivity(Base):
    __tablename__ = "break_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    activity_type = Column(String(20), nullable=False)  # 'short' or 'long'
    duration = Column(Integer)  # in minutes, null for flexible duration
    settings_id = Column(Integer, ForeignKey('user_settings.id'))
    
    # Relationships
    settings = relationship("UserSettings", back_populates="break_activities")

class StudySession(Base):
    __tablename__ = "study_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_time = Column(DateTime)
    session_type = Column(String(20), nullable=False)  # 'work', 'short_break', 'long_break'
    assignment_id = Column(Integer, ForeignKey('assignments.id'), nullable=True)
    
    # Relationships
    assignment = relationship("Assignment", back_populates="study_sessions")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=False)
    estimated_time = Column(Integer, nullable=False)  # in minutes
    time_spent = Column(Integer, default=0)  # in minutes
    priority = Column(Integer, default=2)  # 1=high, 2=medium, 3=low
    completed = Column(Boolean, default=False)

    # Sprint/Task fields
    sprint = Column(String(100), nullable=True)  # Sprint name
    assignee = Column(String(100), nullable=True)  # Person assigned
    status = Column(String(20), default='new')  # new, in_progress, completed, blocked

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    study_sessions = relationship("StudySession", back_populates="assignment")

# Create all tables
def create_tables():
    Base.metadata.create_all(bind=engine)
    
    # Create default user settings if they don't exist
    db = SessionLocal()
    try:
        settings = db.query(UserSettings).first()
        if not settings:
            default_settings = UserSettings()
            db.add(default_settings)
            
            # Add default break activities
            default_activities = [
                {"name": "Stretch", "type": "short", "duration": 5},
                {"name": "Take a walk", "type": "short", "duration": 5},
                {"name": "Quick meditation", "type": "short", "duration": 5},
                {"name": "Free time", "type": "long", "duration": 15},
                {"name": "Exercise", "type": "long", "duration": 30},
                {"name": "Video games", "type": "long", "duration": 30},
                {"name": "Watch a show", "type": "long", "duration": 30},
                {"name": "Read for fun", "type": "long", "duration": 30}
            ]
            
            for activity in default_activities:
                db.add(BreakActivity(
                    name=activity["name"],
                    activity_type=activity["type"],
                    duration=activity["duration"],
                    settings=default_settings
                ))
            
            db.commit()
    except Exception as e:
        print(f"Error creating default settings: {e}")
        db.rollback()
    finally:
        db.close()

# Call this function to create tables when this module is imported
create_tables()

from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..database import Base

class TimeMethodType(enum.Enum):
    POMODORO = "pomodoro"
    FIFTY_TWO_SEVENTEEN = "52-17"
    FLOWTIME = "flowtime"
    ULTRADIAN = "ultradian"

class TimeMethod(Base):
    """Available time management methods"""
    __tablename__ = "time_methods"
    
    id = Column(Integer, primary_key=True, index=True)
    method_type = Column(Enum(TimeMethodType), unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)
    work_duration = Column(Integer)  # minutes, None for variable (Flowtime)
    break_duration = Column(Integer)  # minutes
    long_break_duration = Column(Integer, nullable=True)  # for Pomodoro
    cycles_before_long_break = Column(Integer, nullable=True)  # for Pomodoro
    is_variable = Column(Boolean, default=False)  # True for Flowtime

class UserMethodPreference(Base):
    """User's selected time management method"""
    __tablename__ = "user_method_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    method_id = Column(Integer, ForeignKey("time_methods.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="method_preference")
    method = relationship("TimeMethod")

class WorkSession(Base):
    """Record of completed work sessions for recommendations"""
    __tablename__ = "work_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    method_id = Column(Integer, ForeignKey("time_methods.id"), nullable=False)
    planned_duration = Column(Integer)  # minutes
    actual_duration = Column(Integer)  # minutes
    completed = Column(Boolean, default=False)
    interruptions = Column(Integer, default=0)
    focus_score = Column(Float, nullable=True)  # 0.0-1.0
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="work_sessions")
    method = relationship("TimeMethod")

# Update User model relationships
# class User:
#     # ... existing fields ...
#     method_preference = relationship("UserMethodPreference", back_populates="user", uselist=False)
#     work_sessions = relationship("WorkSession", back_populates="user")

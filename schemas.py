from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Break Activity Models
class BreakActivityBase(BaseModel):
    name: str
    description: Optional[str] = None
    activity_type: str  # 'short' or 'long'
    duration: Optional[int] = None  # in minutes

class BreakActivityCreate(BreakActivityBase):
    pass

class BreakActivity(BreakActivityBase):
    id: int
    settings_id: int
    
    class Config:
        orm_mode = True

# User Settings Models
class UserSettingsBase(BaseModel):
    work_interval: int = 25  # in minutes
    short_break: int = 5     # in minutes
    long_break: int = 15     # in minutes
    short_breaks_before_long: int = 3
    auto_start_breaks: bool = True
    auto_start_pomodoros: bool = True
    long_break_delay: int = 15  # minutes before suggesting long break activities

class UserSettingsCreate(UserSettingsBase):
    pass

class UserSettings(UserSettingsBase):
    id: int
    break_activities: List[BreakActivity] = []
    
    class Config:
        orm_mode = True

# Study Session Models
class StudySessionBase(BaseModel):
    session_type: str  # 'work', 'short_break', 'long_break'
    assignment_id: Optional[int] = None

class StudySessionCreate(StudySessionBase):
    pass

class StudySession(StudySessionBase):
    id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    
    class Config:
        orm_mode = True

# Assignment Models
class AssignmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    due_date: datetime
    estimated_time: int  # in minutes
    priority: int = 2  # 1=high, 2=medium, 3=low

class AssignmentCreate(AssignmentBase):
    pass

class Assignment(AssignmentBase):
    id: int
    time_spent: int = 0  # in minutes
    completed: bool = False
    created_at: datetime
    updated_at: datetime
    study_sessions: List[StudySession] = []
    
    class Config:
        orm_mode = True

# Timer State
class TimerState(BaseModel):
    is_running: bool = False
    is_break: bool = False
    is_long_break: bool = False
    time_remaining: int  # in seconds
    current_interval: int = 0
    total_intervals: int = 0
    current_activity: Optional[BreakActivity] = None

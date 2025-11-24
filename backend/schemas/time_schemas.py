from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class TimeMethodType(str, Enum):
    POMODORO = "pomodoro"
    FIFTY_TWO_SEVENTEEN = "52-17"
    FLOWTIME = "flowtime"
    ULTRADIAN = "ultradian"

class TimeMethodBase(BaseModel):
    method_type: TimeMethodType
    name: str
    description: Optional[str] = None
    work_duration: int = Field(..., gt=0, description="Duration in minutes")
    break_duration: int = Field(..., gt=0, description="Duration in minutes")
    long_break_duration: Optional[int] = Field(None, gt=0, description="Duration in minutes")
    cycles_before_long_break: Optional[int] = Field(None, gt=0, description="Number of cycles before a long break")
    is_variable: bool = False

class TimeMethodCreate(TimeMethodBase):
    pass

class TimeMethod(TimeMethodBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class WorkSessionBase(BaseModel):
    user_id: int
    method_id: int
    planned_duration: int = Field(..., gt=0, description="Planned duration in minutes")
    actual_duration: Optional[int] = Field(None, ge=0, description="Actual duration in minutes")
    completed: bool = False
    interruptions: int = 0
    focus_score: Optional[float] = Field(None, ge=0, le=1, description="Focus score from 0.0 to 1.0")
    started_at: datetime
    ended_at: Optional[datetime] = None

class WorkSessionCreate(WorkSessionBase):
    pass

class WorkSession(WorkSessionBase):
    id: int
    created_at: datetime
    method: TimeMethod

    class Config:
        orm_mode = True

class UserMethodPreferenceBase(BaseModel):
    method_id: int
    custom_work_duration: Optional[int] = Field(None, gt=0, description="Custom work duration in minutes")
    custom_break_duration: Optional[int] = Field(None, gt=0, description="Custom break duration in minutes")
    auto_start_breaks: bool = True
    auto_start_work: bool = False
    volume: float = Field(0.5, ge=0, le=1, description="Volume level from 0.0 to 1.0")

class UserMethodPreferenceCreate(UserMethodPreferenceBase):
    user_id: int

class UserMethodPreferenceUpdate(BaseModel):
    method_id: Optional[int] = None
    custom_work_duration: Optional[int] = Field(None, gt=0)
    custom_work_duration: Optional[int] = Field(None, gt=0)
    auto_start_breaks: Optional[bool] = None
    auto_start_work: Optional[bool] = None
    volume: Optional[float] = Field(None, ge=0, le=1)

class UserMethodPreference(UserMethodPreferenceBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    method: TimeMethod

    class Config:
        orm_mode = True

class TimeMethodRecommendation(BaseModel):
    method: TimeMethod
    confidence: float = Field(..., ge=0, le=1, description="Confidence score from 0.0 to 1.0")
    reason: str = Field(..., description="Explanation for the recommendation")

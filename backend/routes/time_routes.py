from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from ..database import get_db
from ..models.time_models import TimeMethod, UserMethodPreference, WorkSession, TimeMethodType
from ..schemas.time_schemas import (
    TimeMethod as TimeMethodSchema,
    WorkSession as WorkSessionSchema,
    WorkSessionCreate,
    UserMethodPreference as UserMethodPreferenceSchema,
    UserMethodPreferenceCreate,
    UserMethodPreferenceUpdate,
    TimeMethodRecommendation
)
from ..crud import time_crud
from ..core.dependencies import get_current_user
from ..models.user_models import User

router = APIRouter(prefix="/api/time", tags=["time"])

# Time Methods
@router.get("/methods", response_model=List[TimeMethodSchema])
def list_time_methods(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """
    Get all available time management methods
    """
    return time_crud.get_all_time_methods(db, skip=skip, limit=limit)

@router.get("/methods/{method_id}", response_model=TimeMethodSchema)
def get_time_method(method_id: int, db: Session = Depends(get_db)):
    """
    Get a specific time management method by ID
    """
    method = time_crud.get_time_method(db, method_id=method_id)
    if not method:
        raise HTTPException(status_code=404, detail="Time method not found")
    return method

# User Preferences
@router.get("/preferences", response_model=UserMethodPreferenceSchema)
def get_user_preference(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current user's time management preferences
    """
    preference = time_crud.get_user_preference(db, user_id=current_user.id)
    if not preference:
        # Return default preference if none exists
        default_method = time_crud.get_time_method_by_type(db, TimeMethodType.POMODORO)
        if not default_method:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Default time method not found"
            )
        
        preference = time_crud.create_user_preference(
            db,
            UserMethodPreferenceCreate(
                user_id=current_user.id,
                method_id=default_method.id,
                custom_work_duration=None,
                custom_break_duration=None,
                auto_start_breaks=True,
                auto_start_work=False,
                volume=0.7
            )
        )
    
    return preference

@router.put("/preferences", response_model=UserMethodPreferenceSchema)
def update_user_preference(
    preference_update: UserMethodPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current user's time management preferences
    """
    # Get existing preference or create a default one
    preference = time_crud.get_user_preference(db, user_id=current_user.id)
    
    if not preference:
        # Create a new preference if none exists
        default_method = time_crud.get_time_method_by_type(db, TimeMethodType.POMODORO)
        if not default_method:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Default time method not found"
            )
        
        preference = time_crud.create_user_preference(
            db,
            UserMethodPreferenceCreate(
                user_id=current_user.id,
                method_id=default_method.id,
                custom_work_duration=preference_update.custom_work_duration,
                custom_break_duration=preference_update.custom_break_duration,
                auto_start_breaks=preference_update.auto_start_breaks or True,
                auto_start_work=preference_update.auto_start_work or False,
                volume=preference_update.volume or 0.7
            )
        )
    else:
        # Update existing preference
        preference = time_crud.update_user_preference(
            db, 
            db_pref=preference, 
            preference=preference_update
        )
    
    return preference

# Work Sessions
@router.post("/sessions", response_model=WorkSessionSchema, status_code=status.HTTP_201_CREATED)
def create_work_session(
    session: WorkSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new work session record
    """
    # Verify the method exists
    method = time_crud.get_time_method(db, method_id=session.method_id)
    if not method:
        raise HTTPException(status_code=404, detail="Time method not found")
    
    # Create the session
    db_session = time_crud.create_work_session(
        db,
        WorkSessionCreate(
            user_id=current_user.id,
            **session.dict()
        )
    )
    
    return db_session

@router.get("/sessions", response_model=List[WorkSessionSchema])
def list_work_sessions(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current user's work sessions with optional date filtering
    """
    return time_crud.get_user_sessions(
        db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )

@router.get("/sessions/stats")
def get_work_session_stats(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get statistics about the user's work sessions
    """
    if days < 1 or days > 365:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Days must be between 1 and 365"
        )
    
    return time_crud.get_user_session_stats(db, user_id=current_user.id, days=days)

# Recommendations
@router.get("/recommendations", response_model=TimeMethodRecommendation)
def get_time_method_recommendation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a recommended time management method for the current user
    """
    recommendation = time_crud.recommend_time_method(db, user_id=current_user.id)
    
    if not recommendation or "method" not in recommendation:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate a recommendation"
        )
    
    return recommendation

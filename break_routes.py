from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

# Import using absolute paths
import models
import schemas
import crud
from database import get_db

router = APIRouter()

# Settings endpoints
@router.get("/settings/", response_model=schemas.UserSettings)
def read_settings(db: Session = Depends(get_db)):
    settings = crud.get_settings(db)
    if not settings:
        # Create default settings if they don't exist
        settings = crud.update_settings(db, schemas.UserSettingsCreate())
    return settings

@router.put("/settings/", response_model=schemas.UserSettings)
def update_user_settings(settings: schemas.UserSettingsCreate, db: Session = Depends(get_db)):
    return crud.update_settings(db, settings)

# Break activities endpoints
@router.get("/break-activities/", response_model=List[schemas.BreakActivity])
def list_break_activities(activity_type: str = None, db: Session = Depends(get_db)):
    return crud.get_break_activities(db, activity_type)

@router.post("/break-activities/", response_model=schemas.BreakActivity)
def create_break_activity(activity: schemas.BreakActivityCreate, db: Session = Depends(get_db)):
    return crud.create_break_activity(db, activity)

@router.delete("/break-activities/{activity_id}")
def delete_break_activity(activity_id: int, db: Session = Depends(get_db)):
    if not crud.delete_break_activity(db, activity_id):
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"message": "Activity deleted"}

# Study sessions endpoints
@router.post("/study-sessions/", response_model=schemas.StudySession)
def create_study_session(session: schemas.StudySessionCreate, db: Session = Depends(get_db)):
    return crud.create_study_session(db, session)

@router.post("/study-sessions/{session_id}/end", response_model=schemas.StudySession)
def end_study_session(session_id: int, db: Session = Depends(get_db)):
    session = crud.end_study_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

# Timer state endpoints
@router.get("/timer/state", response_model=schemas.TimerState)
def get_timer_state():
    # In a real app, you'd get this from a persistent store or WebSocket
    return {
        "is_running": False,
        "is_break": False,
        "is_long_break": False,
        "time_remaining": 0,
        "current_interval": 0,
        "total_intervals": 0
    }

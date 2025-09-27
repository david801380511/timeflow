from sqlalchemy.orm import Session
from datetime import datetime
import models
import schemas

def create_default_settings(db: Session):
    """Create default user settings if they don't exist"""
    default_settings = schemas.UserSettingsCreate(
        work_interval=25,
        short_break=5,
        long_break=15,
        short_breaks_before_long=3,
        auto_start_breaks=True,
        auto_start_pomodoros=True,
        long_break_delay=15
    )
    return update_settings(db, default_settings)

def create_default_break_activities(db: Session):
    """Create default break activities if they don't exist"""
    default_activities = [
        {"name": "Stretch", "description": "Do some light stretching", "activity_type": "short", "duration": 5},
        {"name": "Take a walk", "description": "Go for a short walk", "activity_type": "short", "duration": 5},
        {"name": "Quick meditation", "description": "Meditate for a few minutes", "activity_type": "short", "duration": 5},
        {"name": "Free time", "description": "Do something fun", "activity_type": "long", "duration": 15},
        {"name": "Exercise", "description": "Do some physical activity", "activity_type": "long", "duration": 30},
        {"name": "Video games", "description": "Play a quick game", "activity_type": "long", "duration": 30},
        {"name": "Watch a show", "description": "Watch an episode of something", "activity_type": "long", "duration": 30},
        {"name": "Read for fun", "description": "Read a book or article", "activity_type": "long", "duration": 30}
    ]
    
    # Only add default activities if none exist
    if not db.query(models.BreakActivity).first():
        for activity in default_activities:
            db_activity = models.BreakActivity(**activity)
            db.add(db_activity)
        db.commit()
    return db.query(models.BreakActivity).all()

def get_settings(db: Session):
    return db.query(models.UserSettings).first()

def update_settings(db: Session, settings: schemas.UserSettingsCreate):
    db_settings = db.query(models.UserSettings).first()
    if not db_settings:
        db_settings = models.UserSettings(**settings.dict())
        db.add(db_settings)
    else:
        for key, value in settings.dict().items():
            setattr(db_settings, key, value)
    db.commit()
    db.refresh(db_settings)
    return db_settings

def get_break_activities(db: Session, activity_type: str = None):
    query = db.query(models.BreakActivity)
    if activity_type:
        query = query.filter(models.BreakActivity.activity_type == activity_type)
    return query.all()

def create_break_activity(db: Session, activity: schemas.BreakActivityCreate):
    settings = get_settings(db)
    db_activity = models.BreakActivity(**activity.dict(), settings_id=settings.id)
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity

def delete_break_activity(db: Session, activity_id: int):
    activity = db.query(models.BreakActivity).filter(models.BreakActivity.id == activity_id).first()
    if activity:
        db.delete(activity)
        db.commit()
        return True
    return False

def create_study_session(db: Session, session: schemas.StudySessionCreate):
    db_session = models.StudySession(**session.dict())
    db.add(db_session)
    
    # If it's a work session, update the assignment's time_spent
    if session.session_type == 'work' and session.assignment_id:
        assignment = db.query(models.Assignment).filter(models.Assignment.id == session.assignment_id).first()
        if assignment:
            # For simplicity, we'll just increment by 1 minute for now
            # In a real app, you'd want to track the actual time spent
            assignment.time_spent = (assignment.time_spent or 0) + 1
    
    db.commit()
    db.refresh(db_session)
    return db_session

def end_study_session(db: Session, session_id: int):
    db_session = db.query(models.StudySession).filter(models.StudySession.id == session_id).first()
    if db_session:
        db_session.end_time = datetime.utcnow()
        db.commit()
        db.refresh(db_session)
    return db_session

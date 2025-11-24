from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from ..models.time_models import TimeMethod, UserMethodPreference, WorkSession, TimeMethodType
from ..schemas.time_schemas import TimeMethodCreate, WorkSessionBase, UserMethodPreferenceCreate, UserMethodPreferenceUpdate

def get_time_method(db: Session, method_id: int) -> Optional[TimeMethod]:
    """Get a time method by ID"""
    return db.query(TimeMethod).filter(TimeMethod.id == method_id).first()

def get_time_method_by_type(db: Session, method_type: TimeMethodType) -> Optional[TimeMethod]:
    """Get a time method by type"""
    return db.query(TimeMethod).filter(TimeMethod.method_type == method_type).first()

def get_all_time_methods(db: Session, skip: int = 0, limit: int = 100) -> List[TimeMethod]:
    """Get all time methods with pagination"""
    return db.query(TimeMethod).offset(skip).limit(limit).all()

def create_time_method(db: Session, method: TimeMethodCreate) -> TimeMethod:
    """Create a new time method"""
    db_method = TimeMethod(**method.dict())
    db.add(db_method)
    db.commit()
    db.refresh(db_method)
    return db_method

def get_user_preference(db: Session, user_id: int) -> Optional[UserMethodPreference]:
    """Get a user's time method preference"""
    return db.query(UserMethodPreference).filter(UserMethodPreference.user_id == user_id).first()

def create_user_preference(db: Session, preference: UserMethodPreferenceCreate) -> UserMethodPreference:
    """Create a new user preference"""
    db_pref = UserMethodPreference(**preference.dict())
    db.add(db_pref)
    db.commit()
    db.refresh(db_pref)
    return db_pref

def update_user_preference(
    db: Session, 
    db_pref: UserMethodPreference, 
    preference: UserMethodPreferenceUpdate
) -> UserMethodPreference:
    """Update a user's time method preference"""
    update_data = preference.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_pref, field, value)
    
    db_pref.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_pref)
    return db_pref

def create_work_session(db: Session, session: WorkSessionBase) -> WorkSession:
    """Create a new work session record"""
    db_session = WorkSession(**session.dict())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_user_sessions(
    db: Session, 
    user_id: int, 
    start_date: Optional[datetime] = None, 
    end_date: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0
) -> List[WorkSession]:
    """Get a user's work sessions with optional date filtering"""
    query = db.query(WorkSession).filter(WorkSession.user_id == user_id)
    
    if start_date:
        query = query.filter(WorkSession.started_at >= start_date)
    if end_date:
        query = query.filter(WorkSession.started_at <= end_date)
    
    return query.order_by(WorkSession.started_at.desc()).offset(offset).limit(limit).all()

def get_user_session_stats(
    db: Session, 
    user_id: int, 
    days: int = 30
) -> Dict[str, Any]:
    """Get user's work session statistics"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    sessions = get_user_sessions(db, user_id, start_date, end_date)
    
    if not sessions:
        return {
            "total_sessions": 0,
            "total_duration_minutes": 0,
            "avg_duration_minutes": 0,
            "completion_rate": 0,
            "preferred_method": None,
            "focus_score_avg": 0
        }
    
    completed_sessions = [s for s in sessions if s.completed]
    total_duration = sum(s.actual_duration or 0 for s in completed_sessions)
    
    # Get most used method
    method_counts = {}
    for s in sessions:
        method_counts[s.method_id] = method_counts.get(s.method_id, 0) + 1
    
    preferred_method_id = max(method_counts, key=method_counts.get) if method_counts else None
    preferred_method = get_time_method(db, preferred_method_id).name if preferred_method_id else None
    
    # Calculate focus score average (only for completed sessions with focus score)
    focus_scores = [s.focus_score for s in completed_sessions if s.focus_score is not None]
    avg_focus = sum(focus_scores) / len(focus_scores) if focus_scores else 0
    
    return {
        "total_sessions": len(sessions),
        "completed_sessions": len(completed_sessions),
        "total_duration_minutes": total_duration,
        "avg_duration_minutes": total_duration / len(completed_sessions) if completed_sessions else 0,
        "completion_rate": len(completed_sessions) / len(sessions) if sessions else 0,
        "preferred_method": preferred_method,
        "focus_score_avg": avg_focus
    }

def recommend_time_method(db: Session, user_id: int) -> Dict[str, Any]:
    """Recommend a time management method based on user's history and preferences"""
    # Get user's preference
    pref = get_user_preference(db, user_id)
    if pref and pref.method:
        return {
            "method": pref.method,
            "confidence": 0.9,
            "reason": "Based on your current preference"
        }
    
    # Get recent sessions (last 30 days)
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    sessions = get_user_sessions(db, user_id, start_date, end_date)
    
    if not sessions:
        # Default to Pomodoro for new users
        default_method = get_time_method_by_type(db, TimeMethodType.POMODORO)
        return {
            "method": default_method,
            "confidence": 0.7,
            "reason": "Great for getting started with time management"
        }
    
    # Analyze session data
    completed_sessions = [s for s in sessions if s.completed]
    if not completed_sessions:
        # If no completed sessions, suggest the most recent method tried
        recent_method = sessions[0].method
        return {
            "method": recent_method,
            "confidence": 0.6,
            "reason": "You've tried this method recently"
        }
    
    # Calculate success rate and focus for each method
    method_stats = {}
    for session in completed_sessions:
        method_id = session.method_id
        if method_id not in method_stats:
            method_stats[method_id] = {
                "count": 0,
                "total_focus": 0,
                "total_duration": 0,
                "completed": 0,
                "method": session.method
            }
        
        stats = method_stats[method_id]
        stats["count"] += 1
        stats["total_duration"] += session.actual_duration or 0
        
        if session.focus_score:
            stats["total_focus"] += session.focus_score
    
    # Find the best method based on focus score and completion rate
    best_method = None
    best_score = -1
    best_reason = ""
    
    for method_id, stats in method_stats.items():
        avg_focus = stats["total_focus"] / stats["count"] if stats["count"] > 0 else 0
        avg_duration = stats["total_duration"] / stats["count"] if stats["count"] > 0 else 0
        
        # Simple scoring: 60% focus, 40% duration (normalized)
        score = (avg_focus * 0.6) + (min(avg_duration / 60, 1) * 0.4)
        
        if score > best_score:
            best_score = score
            best_method = stats["method"]
            best_reason = f"Your focus score with this method is {avg_focus:.1f}/1.0"
    
    return {
        "method": best_method,
        "confidence": min(best_score, 0.95),  # Cap confidence at 0.95
        "reason": best_reason
    }

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from backend.database import get_db
from backend.models.limit_models import DailyLimitSetting
from backend.models.models import StudySession

router = APIRouter()

def _get_or_create_setting(db: Session) -> DailyLimitSetting:
    row = db.query(DailyLimitSetting).first()
    if not row:
        row = DailyLimitSetting(daily_limit_minutes=180)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row

@router.get("/limits/setting")
def get_limit_setting(db: Session = Depends(get_db)):
    row = _get_or_create_setting(db)
    return {"daily_limit_minutes": row.daily_limit_minutes}

@router.put("/limits/setting")
def set_limit_setting(payload: dict, db: Session = Depends(get_db)):
    minutes = payload.get("daily_limit_minutes")
    if not isinstance(minutes, int) or minutes <= 0 or minutes > 24*60:
        raise HTTPException(status_code=400, detail="daily_limit_minutes must be 1..1440 int")
    row = _get_or_create_setting(db)
    row.daily_limit_minutes = minutes
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"daily_limit_minutes": row.daily_limit_minutes}

@router.get("/limits/progress")
def daily_progress(date: str, db: Session = Depends(get_db)):
    """
    Return total minutes of study time for the given local date (YYYY-MM-DD),
    summing StudySession durations and including any currently-running sessions.
    """
    try:
        day = datetime.strptime(date, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")

    start = datetime.combine(day, datetime.min.time())
    end = datetime.combine(day, datetime.max.time())

    sessions = db.query(StudySession).filter(
        StudySession.start_time <= end,
        (StudySession.end_time == None) | (StudySession.end_time >= start)
    ).all()

    total_seconds = 0
    now = datetime.utcnow()
    for s in sessions:
        s_start = s.start_time
        s_end = s.end_time or now
        seg_start = max(s_start, start)
        seg_end = min(s_end, end)
        if seg_end > seg_start:
            total_seconds += (seg_end - seg_start).total_seconds()

    return {"minutes": int(total_seconds // 60)}

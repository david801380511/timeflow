from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from datetime import datetime
from backend.database import get_db
from backend.models.models import Assignment
from backend.models.calendar_models import CalendarBlock
from pathlib import Path

router = APIRouter()

# Use absolute templates dir (robust if working dir varies)
TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

@router.get("/calendar", response_class=HTMLResponse)
def calendar_page(request: Request):
    return templates.TemplateResponse("calendar.html", {"request": request})

@router.get("/api/calendar/blocks")
def list_blocks(start: str, end: str, db: Session = Depends(get_db)):
    """
    Return blocks between [start, end).
    Accepts naive 'YYYY-MM-DDTHH:MM:SS' (local) or ISO with 'Z' (UTC).
    """
    def parse_iso(s: str) -> datetime:
        if s.endswith("Z"):
            # treat as UTC, convert to naive by dropping tzinfo
            return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
        return datetime.fromisoformat(s)

    try:
        start_dt = parse_iso(start)
        end_dt = parse_iso(end)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid start/end format")

    rows = db.query(CalendarBlock).filter(
        CalendarBlock.end_datetime > start_dt,
        CalendarBlock.start_datetime < end_dt
    ).all()

    return [
        {
            "id": r.id,
            "title": r.title,
            "start": r.start_datetime.isoformat(),
            "end": r.end_datetime.isoformat(),
            "block_type": r.block_type,
            "assignment_id": r.assignment_id
        }
        for r in rows
    ]

@router.post("/api/calendar/blocks")
def create_block(payload: dict, db: Session = Depends(get_db)):
    required = ["title", "start", "end", "block_type"]
    for k in required:
        if k not in payload:
            raise HTTPException(status_code=400, detail=f"Missing field: {k}")

    def parse_iso(s: str) -> datetime:
        if s.endswith("Z"):
            return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
        return datetime.fromisoformat(s)

    try:
        start_dt = parse_iso(payload["start"])
        end_dt = parse_iso(payload["end"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid datetime format")
    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="end must be after start")

    block_type = payload["block_type"]
    if block_type not in ("busy", "study"):
        raise HTTPException(status_code=400, detail="block_type must be 'busy' or 'study'")

    assignment_id = payload.get("assignment_id")
    if assignment_id is not None:
        if not db.query(Assignment).filter(Assignment.id == assignment_id).first():
            raise HTTPException(status_code=404, detail="Assignment not found")

    # Overlap guard
    exists = db.query(CalendarBlock).filter(
        CalendarBlock.end_datetime > start_dt,
        CalendarBlock.start_datetime < end_dt
    ).first()
    if exists:
        raise HTTPException(status_code=409, detail="Overlaps an existing block")

    row = CalendarBlock(
        title=payload["title"],
        start_datetime=start_dt,
        end_datetime=end_dt,
        block_type=block_type,
        assignment_id=assignment_id
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}

@router.delete("/api/calendar/blocks/{block_id}")
def delete_block(block_id: int, db: Session = Depends(get_db)):
    row = db.query(CalendarBlock).get(block_id)
    if not row:
        raise HTTPException(status_code=404, detail="Block not found")
    db.delete(row)
    db.commit()
    return {"status": "ok"}

@router.get("/api/assignments")
def list_assignments(db: Session = Depends(get_db)):
    rows = db.query(Assignment).all()
    return [{"id": a.id, "name": a.name} for a in rows]

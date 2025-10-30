from fastapi import FastAPI, Request, Form, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from datetime import datetime
from sqlalchemy.orm import Session
from backend.models import models
from backend.schemas import schemas
from backend.database import get_db
from backend.routes.break_routes import router as break_router
from backend.routes.calendar_routes import router as calendar_router
from backend.routes.limit_routes import router as limit_router


app = FastAPI()
app.include_router(break_router, prefix="/api", tags=["break"])
app.include_router(calendar_router)
app.include_router(limit_router, prefix="/api", tags=["limits"])


templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request, db: Session = Depends(get_db)):
    assignments = db.query(models.Assignment).all()
    return templates.TemplateResponse("index.html", {
        "request": request, 
        "assignments": assignments
    })

@app.post("/assignments")
async def create_assignment(
    name: str = Form(...),
    due_date: str = Form(...),
    estimated_time: int = Form(...),
    description: str = Form(None),
    priority: int = Form(2),
    db: Session = Depends(get_db)
):
    try:
        # Check for duplicate assignment name
        existing = db.query(models.Assignment).filter(
            models.Assignment.name == name,
            models.Assignment.completed == False
        ).first()

        if existing:
            # Return error as JSON for better handling
            return JSONResponse(
                status_code=400,
                content={"error": f"Assignment '{name}' already exists. Please use a different name."}
            )

        # Convert string date to datetime
        due_date_obj = datetime.strptime(due_date, '%Y-%m-%dT%H:%M')

        # Create new assignment
        new_assignment = models.Assignment(
            name=name,
            due_date=due_date_obj,
            estimated_time=estimated_time,
            description=description,
            priority=priority
        )

        db.add(new_assignment)
        db.commit()
        return RedirectResponse(url="/", status_code=303)
    except Exception as e:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

# Add a route to serve the timer page
@app.get("/timer", response_class=HTMLResponse)
async def timer_page(request: Request):
    return templates.TemplateResponse("timer.html", {"request": request})

# Add a route to serve the settings page
@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    return templates.TemplateResponse("settings.html", {"request": request})

@app.get("/api/assignments")
async def get_assignments(db: Session = Depends(get_db)):
    """Get all assignments as JSON"""
    print("DEBUG: get_assignments called")
    assignments = db.query(models.Assignment).all()
    print(f"DEBUG: Found {len(assignments)} assignments")
    result = []
    for a in assignments:
        item = {
            "id": a.id,
            "name": a.name,
            "description": a.description if a.description else "",
            "due_date": a.due_date.isoformat() if a.due_date else None,
            "estimated_time": a.estimated_time if a.estimated_time else 0,
            "time_spent": a.time_spent if a.time_spent else 0,
            "priority": a.priority if a.priority else 2,
            "completed": a.completed if a.completed is not None else False,
            "sprint": a.sprint if a.sprint else "",
            "assignee": a.assignee if a.assignee else "",
            "status": a.status if a.status else "new"
        }
        print(f"DEBUG: Assignment {a.id}: {item}")
        result.append(item)
    print(f"DEBUG: Returning {len(result)} items")
    return JSONResponse(content=result)

@app.post("/api/assignments/{assignment_id}/delete")
async def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return {"status": "success", "message": "Assignment deleted"}

@app.post("/api/assignments/{assignment_id}/progress")
async def update_assignment_progress(
    assignment_id: int,
    progress_minutes: int = Form(...),
    db: Session = Depends(get_db)
):
    """Update assignment progress by adding minutes worked"""
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.time_spent = progress_minutes

    # Mark as completed if time spent >= estimated time
    if assignment.time_spent >= assignment.estimated_time:
        assignment.completed = True
        assignment.status = 'completed'
    elif assignment.time_spent > 0:
        assignment.status = 'in_progress'

    db.commit()
    return {
        "status": "success",
        "time_spent": assignment.time_spent,
        "estimated_time": assignment.estimated_time,
        "progress_percent": min(100, (assignment.time_spent / assignment.estimated_time * 100) if assignment.estimated_time > 0 else 0)
    }

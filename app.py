from fastapi import FastAPI, Request, Form, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from datetime import datetime
from sqlalchemy.orm import Session

# Import models in correct order
from backend.database import get_db, Base, engine
from backend.models import user_models  # Import user models first
from backend.models import models  # Then other models
from backend.schemas import schemas
from backend.routes.break_routes import router as break_router
from backend.routes.calendar_routes import router as calendar_router
from backend.routes.limit_routes import router as limit_router
from backend.routes.auth_routes import router as auth_router, get_current_user, check_and_award_achievements

# Create all tables now that all models are imported
Base.metadata.create_all(bind=engine)

# Initialize default achievements
user_models.create_default_achievements()

# Initialize default settings
models.create_tables()

app = FastAPI()
app.include_router(break_router, prefix="/api", tags=["break"])
app.include_router(calendar_router)
app.include_router(limit_router, prefix="/api", tags=["limits"])
app.include_router(auth_router, tags=["auth"])


templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request, db: Session = Depends(get_db)):
    try:
        user = get_current_user(request, db)
        if not user:
            return RedirectResponse(url="/login", status_code=302)

        # If user is logged in, show only their assignments
        assignments = db.query(models.Assignment).filter(
            models.Assignment.user_id == user.id
        ).all()
        
        # Debug: Print assignments to check for data issues
        print(f"Found {len(assignments)} assignments for user {user.username}")
        for a in assignments:
            print(f"Assignment: {a.name}, Due: {a.due_date} (Type: {type(a.due_date)})")

        return templates.TemplateResponse("index.html", {
            "request": request,
            "assignments": assignments,
            "user": user
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return HTMLResponse(content=f"<h1>Internal Server Error</h1><pre>{traceback.format_exc()}</pre>", status_code=500)

@app.post("/assignments")
async def create_assignment(
    request: Request,
    name: str = Form(...),
    due_date: str = Form(...),
    estimated_time: int = Form(...),
    time_unit: str = Form("minutes"),
    description: str = Form(None),
    priority: int = Form(2),
    db: Session = Depends(get_db)
):
    try:
        user = get_current_user(request, db)

        # Convert hours to minutes if needed
        if time_unit == "hours":
            estimated_time = estimated_time * 60

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
            priority=priority,
            user_id=user.id if user else None
        )

        db.add(new_assignment)
        db.commit()

        # Award achievements if user is logged in
        if user:
            check_and_award_achievements(user, db)

        return RedirectResponse(url="/", status_code=303)
    except Exception as e:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

# Add a route to serve the timer page
@app.get("/timer", response_class=HTMLResponse)
async def timer_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse("timer.html", {"request": request, "user": user})

# Add a route to serve the settings page
@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse("settings.html", {"request": request, "user": user})

# Assignments API endpoint is now in calendar_routes.py to avoid duplication

@app.get("/api/assignments/debug")
async def debug_assignments(db: Session = Depends(get_db)):
    """Debug endpoint to check assignment data"""
    assignments = db.query(models.Assignment).filter(models.Assignment.completed == False).all()
    result = []
    for a in assignments:
        result.append({
            "id": a.id,
            "name": a.name,
            "description": a.description or "",
            "due_date": a.due_date.isoformat() if a.due_date else None,
            "estimated_time": a.estimated_time or 0,
            "time_spent": a.time_spent or 0,
            "priority": a.priority or 2,
            "completed": a.completed if a.completed is not None else False,
        })
    return JSONResponse(content=result)

@app.get("/api/assignments/{assignment_id}")
async def get_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    return {
        "id": assignment.id,
        "name": assignment.name,
        "description": assignment.description or "",
        "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
        "estimated_time": assignment.estimated_time,
        "time_spent": assignment.time_spent,
        "priority": assignment.priority,
        "completed": assignment.completed
    }

@app.put("/api/assignments/{assignment_id}")
async def update_assignment(
    assignment_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    data = await request.json()
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    if "description" in data:
        assignment.description = data["description"]
    
    if "progress_percent" in data:
        percent = float(data["progress_percent"])
        # Calculate time spent based on percentage of estimated time
        # Ensure we don't exceed 100% logic if not desired, but user might want to track over-time?
        # User said "finished 25% already", implying percentage of completion.
        assignment.time_spent = int((percent / 100.0) * assignment.estimated_time)
        
        if percent >= 100:
            assignment.completed = True
            assignment.status = 'completed'
        elif percent > 0:
            assignment.completed = False
            assignment.status = 'in_progress'
        else:
            assignment.completed = False
            assignment.status = 'new'

    db.commit()
    return {"status": "success", "message": "Assignment updated"}

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
    request: Request,
    assignment_id: int,
    progress_minutes: int = Form(...),
    db: Session = Depends(get_db)
):
    """Update assignment progress by adding minutes worked"""
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    was_completed = assignment.completed
    assignment.time_spent = progress_minutes

    # Mark as completed if time spent >= estimated time
    if assignment.time_spent >= assignment.estimated_time:
        assignment.completed = True
        assignment.status = 'completed'
    elif assignment.time_spent > 0:
        assignment.status = 'in_progress'

    db.commit()

    # Award achievements if assignment was just completed
    if assignment.completed and not was_completed:
        user = get_current_user(request, db)
        if user:
            newly_awarded = check_and_award_achievements(user, db)

    return {
        "status": "success",
        "time_spent": assignment.time_spent,
        "estimated_time": assignment.estimated_time,
        "progress_percent": min(100, (assignment.time_spent / assignment.estimated_time * 100) if assignment.estimated_time > 0 else 0)
    }

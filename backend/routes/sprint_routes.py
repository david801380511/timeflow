from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from backend.database import get_db
from backend.models.sprint_models import Sprint, Task
from backend.models.models import Assignment
from pathlib import Path

router = APIRouter()

# Use absolute templates dir
TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Sprint endpoints
@router.get("/sprints", response_class=HTMLResponse)
def sprint_page(request: Request, db: Session = Depends(get_db)):
    """Render the sprint management page"""
    return templates.TemplateResponse("sprints.html", {"request": request})

@router.get("/api/sprints")
def list_sprints(db: Session = Depends(get_db)):
    """Get all sprints with their tasks"""
    sprints = db.query(Sprint).order_by(Sprint.created_at.desc()).all()
    result = []
    for sprint in sprints:
        sprint_data = {
            "id": sprint.id,
            "name": sprint.name,
            "description": sprint.description,
            "start_date": sprint.start_date.isoformat() if sprint.start_date else None,
            "end_date": sprint.end_date.isoformat() if sprint.end_date else None,
            "status": sprint.status,
            "created_at": sprint.created_at.isoformat(),
            "tasks": [
                {
                    "id": task.id,
                    "name": task.name,
                    "description": task.description,
                    "status": task.status,
                    "priority": task.priority,
                    "due_date": task.due_date.isoformat() if task.due_date else None,
                    "estimated_manpower": task.estimated_manpower,
                    "assignee": task.assignee,
                    "assignment_id": task.assignment_id
                }
                for task in sprint.tasks
            ]
        }
        result.append(sprint_data)
    return result

@router.post("/api/sprints")
def create_sprint(payload: dict, db: Session = Depends(get_db)):
    """Create a new sprint"""
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Sprint name is required")

    # Parse dates if provided
    start_date = None
    end_date = None
    if payload.get("start_date"):
        try:
            start_date = datetime.fromisoformat(payload["start_date"].replace("Z", "+00:00")).replace(tzinfo=None)
        except:
            pass
    if payload.get("end_date"):
        try:
            end_date = datetime.fromisoformat(payload["end_date"].replace("Z", "+00:00")).replace(tzinfo=None)
        except:
            pass

    sprint = Sprint(
        name=name,
        description=payload.get("description"),
        start_date=start_date,
        end_date=end_date,
        status=payload.get("status", "active")
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return {"id": sprint.id, "name": sprint.name, "status": sprint.status}

@router.put("/api/sprints/{sprint_id}")
def update_sprint(sprint_id: int, payload: dict, db: Session = Depends(get_db)):
    """Update a sprint"""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    if "name" in payload:
        sprint.name = payload["name"]
    if "description" in payload:
        sprint.description = payload["description"]
    if "status" in payload:
        sprint.status = payload["status"]
    if "start_date" in payload:
        try:
            sprint.start_date = datetime.fromisoformat(payload["start_date"].replace("Z", "+00:00")).replace(tzinfo=None)
        except:
            pass
    if "end_date" in payload:
        try:
            sprint.end_date = datetime.fromisoformat(payload["end_date"].replace("Z", "+00:00")).replace(tzinfo=None)
        except:
            pass

    db.commit()
    db.refresh(sprint)
    return {"id": sprint.id, "name": sprint.name, "status": sprint.status}

@router.delete("/api/sprints/{sprint_id}")
def delete_sprint(sprint_id: int, db: Session = Depends(get_db)):
    """Delete a sprint and all its tasks"""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    db.delete(sprint)
    db.commit()
    return {"status": "success", "message": "Sprint deleted"}

# Task endpoints
@router.get("/api/tasks")
def list_tasks(sprint_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all tasks, optionally filtered by sprint"""
    query = db.query(Task)
    if sprint_id is not None:
        query = query.filter(Task.sprint_id == sprint_id)

    tasks = query.order_by(Task.created_at.desc()).all()
    return [
        {
            "id": task.id,
            "name": task.name,
            "description": task.description,
            "status": task.status,
            "priority": task.priority,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "estimated_manpower": task.estimated_manpower,
            "assignee": task.assignee,
            "sprint_id": task.sprint_id,
            "assignment_id": task.assignment_id
        }
        for task in tasks
    ]

@router.post("/api/tasks")
def create_task(payload: dict, db: Session = Depends(get_db)):
    """Create a new task"""
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Task name is required")

    # Parse due date if provided
    due_date = None
    if payload.get("due_date"):
        try:
            due_date = datetime.fromisoformat(payload["due_date"].replace("Z", "+00:00")).replace(tzinfo=None)
        except:
            pass

    # Verify sprint exists if provided
    sprint_id = payload.get("sprint_id")
    if sprint_id:
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")

    # Verify assignment exists if provided
    assignment_id = payload.get("assignment_id")
    if assignment_id:
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")

    task = Task(
        name=name,
        description=payload.get("description"),
        status=payload.get("status", "new"),
        priority=payload.get("priority", 2),
        due_date=due_date,
        estimated_manpower=payload.get("estimated_manpower"),
        assignee=payload.get("assignee"),
        sprint_id=sprint_id,
        assignment_id=assignment_id
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"id": task.id, "name": task.name, "status": task.status}

@router.put("/api/tasks/{task_id}")
def update_task(task_id: int, payload: dict, db: Session = Depends(get_db)):
    """Update a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if "name" in payload:
        task.name = payload["name"]
    if "description" in payload:
        task.description = payload["description"]
    if "status" in payload:
        task.status = payload["status"]
    if "priority" in payload:
        task.priority = payload["priority"]
    if "estimated_manpower" in payload:
        task.estimated_manpower = payload["estimated_manpower"]
    if "assignee" in payload:
        task.assignee = payload["assignee"]
    if "sprint_id" in payload:
        task.sprint_id = payload["sprint_id"]
    if "assignment_id" in payload:
        task.assignment_id = payload["assignment_id"]
    if "due_date" in payload:
        try:
            task.due_date = datetime.fromisoformat(payload["due_date"].replace("Z", "+00:00")).replace(tzinfo=None)
        except:
            pass

    db.commit()
    db.refresh(task)
    return {"id": task.id, "name": task.name, "status": task.status}

@router.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"status": "success", "message": "Task deleted"}

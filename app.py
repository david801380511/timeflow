from fastapi import FastAPI, Request, Form, Depends
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, HTMLResponse
from datetime import datetime
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from break_routes import router as break_router

app = FastAPI()
app.include_router(break_router, prefix="/api", tags=["break"])

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
        return {"error": str(e)}

# Add a route to serve the timer page
@app.get("/timer", response_class=HTMLResponse)
async def timer_page(request: Request):
    return templates.TemplateResponse("timer.html", {"request": request})

# Add a route to serve the settings page
@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    return templates.TemplateResponse("settings.html", {"request": request})

from fastapi import FastAPI, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
from datetime import datetime
from models import SessionLocal, Assignment

app = FastAPI()
templates = Jinja2Templates(directory="templates")

@app.get("/")
async def index(request: Request):
    db = SessionLocal()
    assignments = db.query(Assignment).all()
    db.close()
    return templates.TemplateResponse("index.html", {"request": request, "assignments": assignments})

@app.post("/assignments")
async def create_assignment(
    name: str = Form(...),
    due_date: str = Form(...),
    estimated_time: int = Form(...),
    description: str = Form(...)
):
    db = SessionLocal()
    
    # Convert string date to datetime
    due_date_obj = datetime.strptime(due_date, '%Y-%m-%dT%H:%M')
    
    # Create new assignment
    new_assignment = Assignment(
        name=name,
        due_date=due_date_obj,
        estimated_time=estimated_time,
        description=description
    )
    
    db.add(new_assignment)
    db.commit()
    db.close()
    
    return RedirectResponse(url="/", status_code=303)

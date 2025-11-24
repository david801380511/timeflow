import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timedelta, date

from app import app
from backend.database import Base, get_db
from backend.models import models, user_models, calendar_models, limit_models

# Setup in-memory database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create default achievements manually for testing
    default_achievements = [
        {
            "name": "First Steps",
            "description": "Create your first assignment",
            "icon": "TARGET",
            "points": 10,
            "requirement_type": "assignments_created",
            "requirement_value": 1
        }
    ]
    for ach_data in default_achievements:
        achievement = user_models.Achievement(**ach_data)
        db.add(achievement)
    db.commit()
    
    yield db
    
    db.close()
    Base.metadata.drop_all(bind=engine)

class TestAuth:
    def test_signup_and_login(self, db_session):
        # Signup
        response = client.post("/signup", data={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
            "confirm_password": "password123"
        })
        assert response.status_code == 200
        assert response.json() == {"message": "Signup successful"}

        # Login
        response = client.post("/login", data={
            "username": "testuser",
            "password": "password123"
        }, follow_redirects=False)
        assert response.status_code == 200
        assert "session_token" in response.cookies
        assert response.json() == {"message": "Login successful"}

    def test_login_invalid_credentials(self, db_session):
        response = client.post("/login", data={
            "username": "wronguser",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        assert "Invalid username or password" in response.json()["error"]

    def test_logout(self, db_session):
        # Signup and Login first
        client.post("/signup", data={"username": "u", "email": "e@e.com", "password": "p", "confirm_password": "p"})
        client.post("/login", data={"username": "u", "password": "p"})
        
        response = client.get("/logout")
        assert response.status_code == 200
        assert response.url.path == "/login"
        assert "session_token" not in client.cookies

class TestAssignments:
    @pytest.fixture
    def auth_client(self, db_session):
        # Create user and login
        client.post("/signup", data={"username": "u", "email": "e@e.com", "password": "p", "confirm_password": "p"})
        client.post("/login", data={"username": "u", "password": "p"})
        return client

    def test_create_assignment(self, auth_client):
        response = auth_client.post("/assignments", data={
            "name": "Test HW",
            "due_date": "2025-12-01T10:00",
            "estimated_time": 60,
            "description": "Test Description",
            "priority": 1
        })
        assert response.status_code == 200 # Redirects to index
        
        # Verify in DB
        db = TestingSessionLocal()
        assignment = db.query(models.Assignment).first()
        assert assignment.name == "Test HW"
        assert assignment.estimated_time == 60
        db.close()

    def test_create_duplicate_assignment(self, auth_client):
        data = {
            "name": "Test HW",
            "due_date": "2025-12-01T10:00",
            "estimated_time": 60
        }
        auth_client.post("/assignments", data=data)
        response = auth_client.post("/assignments", data=data)
        assert response.status_code == 400
        assert "already exists" in response.json()["error"]

    def test_delete_assignment(self, auth_client):
        # Create
        auth_client.post("/assignments", data={
            "name": "To Delete",
            "due_date": "2025-12-01T10:00",
            "estimated_time": 60
        })
        
        db = TestingSessionLocal()
        assignment = db.query(models.Assignment).first()
        assignment_id = assignment.id
        db.close()

        # Delete
        response = auth_client.post(f"/api/assignments/{assignment_id}/delete")
        assert response.status_code == 200
        
        db = TestingSessionLocal()
        assert db.query(models.Assignment).count() == 0
        db.close()

    def test_update_progress(self, auth_client):
        # Create
        auth_client.post("/assignments", data={
            "name": "Progress Test",
            "due_date": "2025-12-01T10:00",
            "estimated_time": 100
        })
        
        db = TestingSessionLocal()
        assignment = db.query(models.Assignment).first()
        assignment_id = assignment.id
        db.close()

        # Update progress
        response = auth_client.post(f"/api/assignments/{assignment_id}/progress", data={
            "progress_minutes": 50
        })
        assert response.status_code == 200
        assert response.json()["time_spent"] == 50
        assert response.json()["progress_percent"] == 50.0

        # Complete it
        response = auth_client.post(f"/api/assignments/{assignment_id}/progress", data={
            "progress_minutes": 100
        })
        assert response.json()["progress_percent"] == 100.0
        
        db = TestingSessionLocal()
        assignment = db.query(models.Assignment).first()
        assert assignment.completed is True
        db.close()

class TestCalendar:
    def test_create_and_list_blocks(self, db_session):
        # Create block
        start = (datetime.now() + timedelta(hours=1)).isoformat()
        end = (datetime.now() + timedelta(hours=2)).isoformat()
        
        payload = {
            "title": "Study Block",
            "start": start,
            "end": end,
            "block_type": "study"
        }
        
        response = client.post("/api/calendar/blocks", json=payload)
        assert response.status_code == 200
        
        # List blocks
        response = client.get(f"/api/calendar/blocks?start={start}&end={end}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Study Block"

    def test_overlap_prevention(self, db_session):
        start = (datetime.now() + timedelta(hours=1)).isoformat()
        end = (datetime.now() + timedelta(hours=2)).isoformat()
        
        payload = {
            "title": "Block 1",
            "start": start,
            "end": end,
            "block_type": "study"
        }
        client.post("/api/calendar/blocks", json=payload)
        
        # Try overlapping block
        payload["title"] = "Block 2"
        response = client.post("/api/calendar/blocks", json=payload)
        assert response.status_code == 409
        assert "Overlaps" in response.json()["detail"]

class TestLimits:
    def test_get_and_set_limits(self, db_session):
        # Get default
        response = client.get("/api/limits/setting")
        assert response.status_code == 200
        assert "daily_limit_minutes" in response.json()
        
        # Set new limit
        response = client.put("/api/limits/setting", json={"daily_limit_minutes": 240})
        assert response.status_code == 200
        assert response.json()["daily_limit_minutes"] == 240
        
        # Verify persistence
        response = client.get("/api/limits/setting")
        assert response.json()["daily_limit_minutes"] == 240

class TestBreaks:
    def test_break_activities_crud(self, db_session):
        # Create
        payload = {
            "name": "Stretch",
            "duration_minutes": 5,
            "activity_type": "physical"
        }
        response = client.post("/api/break-activities/", json=payload)
        assert response.status_code == 200
        data = response.json()
        activity_id = data["id"]
        assert data["name"] == "Stretch"
        
        # List
        response = client.get("/api/break-activities/")
        assert response.status_code == 200
        assert len(response.json()) >= 1
        
        # Update
        payload["name"] = "Big Stretch"
        response = client.put(f"/api/break-activities/{activity_id}", json=payload)
        assert response.status_code == 200
        assert response.json()["name"] == "Big Stretch"
        
        # Delete
        response = client.delete(f"/api/break-activities/{activity_id}")
        assert response.status_code == 200
        
        # Verify deletion
        response = client.get("/api/break-activities/")
        # Note: Default activities might exist, so we check if our specific one is gone
        ids = [a["id"] for a in response.json()]
        assert activity_id not in ids

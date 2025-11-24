"""
Script to create a test user for automated testing.
This should be run during test setup or as part of the test environment initialization.
"""
import sys
import os
from pathlib import Path

# Add the project root to the Python path
project_root = str(Path(__file__).parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine, Base
from backend.models.user_models import User
import hashlib

def create_test_user(email: str = "test@example.com", password: str = "testpassword"):
    """Create a test user if it doesn't exist"""
    db = SessionLocal()
    try:
        # Check if user already exists
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"Test user {email} already exists")
            return
        
        # Create new user
        user = User(
            username="testuser",
            email=email,
            total_points=0,
            current_streak=0,
            longest_streak=0
        )
        user.set_password(password)
        
        db.add(user)
        db.commit()
        print(f"Created test user: {email}")
        
    except Exception as e:
        print(f"Error creating test user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Default test credentials
    TEST_EMAIL = os.getenv('TEST_EMAIL', 'test@example.com')
    TEST_PASSWORD = os.getenv('TEST_PASSWORD', 'testpassword')
    
    # Create test user
    create_test_user(TEST_EMAIL, TEST_PASSWORD)

import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import Base, SessionLocal, engine
from backend.models import models
from backend.crud import create_default_settings, create_default_break_activities

def init_db():
    # Create all tables
    Base.metadata.create_all(bind=engine)

def main():
    print("Initializing database...")
    
    # Create all tables
    init_db()

if __name__ == "__main__":
    main()

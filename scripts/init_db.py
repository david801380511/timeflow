import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import Base, SessionLocal, engine
from backend.models import models, user_models
from backend.crud import create_default_settings, create_default_break_activities

def init_db():
    # Create all tables
    Base.metadata.create_all(bind=engine)

def main():
    print("Initializing database...")
    
    # Create all tables
    init_db()
    
    # Populate initial data
    db = SessionLocal()
    try:
        print("Creating default settings...")
        create_default_settings(db)
        
        print("Creating default break activities...")
        create_default_break_activities(db)
        
        print("Creating default achievements...")
        # This function creates its own session
        user_models.create_default_achievements()
        
        print("Database initialization complete!")
    except Exception as e:
        print(f"Error initializing data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()

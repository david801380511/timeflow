import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, SessionLocal, engine
from models import *
from crud import create_default_settings, create_default_break_activities

def init_db():
    # Create all tables
    Base.metadata.create_all(bind=engine)

def main():
    print("Initializing database...")
    
    # Create all tables
    init_db()
    
    # Create a new session
    db = SessionLocal()
    
    try:
        # Create default settings
        print("Creating default settings...")
        create_default_settings(db)
        
        # Create default break activities
        print("Creating default break activities...")
        create_default_break_activities(db)
        
        print("Database initialization completed successfully!")
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

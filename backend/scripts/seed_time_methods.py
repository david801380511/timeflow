"""Seed default time methods and study tracks"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from backend.database import SessionLocal, engine, Base
from backend.models.time_models import TimeMethod, TimeMethodType, UserMethodPreference, WorkSession
from backend.models.music_models import Track, Playlist, TrackSourceType, UserCustomTrack
from backend.models.user_models import User
from passlib.context import CryptContext

# Create password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# Create a default user if it doesn't exist
def create_default_user(db: Session) -> User:
    """Create a default user if it doesn't exist"""
    user = db.query(User).filter_by(email="user@example.com").first()
    if not user:
        user = User(
            username="default_user",
            email="user@example.com",
            hashed_password=get_password_hash("password"),
            is_active=True,
            is_superuser=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def seed_time_methods(db: Session) -> None:
    """Seed default time management methods"""
    methods = [
        {
            "method_type": TimeMethodType.POMODORO,
            "name": "Pomodoro",
            "description": "25 minutes of focused work followed by a 5-minute break. Long break after 4 cycles.",
            "work_duration": 25,
            "break_duration": 5,
            "long_break_duration": 15,
            "cycles_before_long_break": 4,
            "is_variable": False
        },
        {
            "method_type": TimeMethodType.FIFTY_TWO_SEVENTEEN,
            "name": "52/17",
            "description": "52 minutes of work followed by a 17-minute break. Based on productivity research.",
            "work_duration": 52,
            "break_duration": 17,
            "long_break_duration": None,
            "cycles_before_long_break": None,
            "is_variable": False
        },
        {
            "method_type": TimeMethodType.FLOWTIME,
            "name": "Flowtime",
            "description": "Variable-length sessions based on your natural flow. Break when you lose focus.",
            "work_duration": None,
            "break_duration": None,
            "long_break_duration": None,
            "cycles_before_long_break": None,
            "is_variable": True
        },
        {
            "method_type": TimeMethodType.ULTRADIAN,
            "name": "Ultradian Rhythm",
            "description": "90-minute deep work cycles aligned with natural alertness rhythms. 20-minute breaks.",
            "work_duration": 90,
            "break_duration": 20,
            "long_break_duration": None,
            "cycles_before_long_break": None,
            "is_variable": False
        }
    ]
    
    for method_data in methods:
        method = db.query(TimeMethod).filter_by(method_type=method_data["method_type"]).first()
        if not method:
            method = TimeMethod(**method_data)
            db.add(method)
    
    db.commit()
    print("✓ Time methods seeded")

def seed_default_tracks(db: Session) -> None:
    """Seed default study music tracks"""
    tracks = [
        {
            "title": "Lofi Study Beats",
            "artist": "Study Music Collection",
            "duration": 1800,  # 30 minutes
            "source_type": TrackSourceType.DEFAULT,
            "url": "https://www.bensound.com/bensound-music/bensound-tenderness.mp3",
            "is_default": True,
            "metadata": {"genre": "Lofi", "bpm": 85, "mood": "Calm"}
        },
        {
            "title": "Focus Flow",
            "artist": "Concentration Sounds",
            "duration": 1800,  # 30 minutes
            "source_type": TrackSourceType.DEFAULT,
            "url": "https://www.bensound.com/bensound-music/bensound-relaxing.mp3",
            "is_default": True,
            "metadata": {"genre": "Ambient", "bpm": 70, "mood": "Focused"}
        },
        {
            "title": "Deep Focus",
            "artist": "Study Vibes",
            "duration": 3600,  # 1 hour
            "source_type": TrackSourceType.DEFAULT,
            "url": "https://www.bensound.com/bensound-music/bensound-slowmotion.mp3",
            "is_default": True,
            "metadata": {"genre": "Electronic", "bpm": 90, "mood": "Productive"}
        },
        {
            "title": "Piano Study Session",
            "artist": "Calm Piano",
            "duration": 3600,  # 1 hour
            "source_type": TrackSourceType.DEFAULT,
            "url": "https://www.bensound.com/bensound-music/bensound-pianomoment.mp3",
            "is_default": True,
            "metadata": {"genre": "Piano", "bpm": 60, "mood": "Relaxed"}
        },
        {
            "title": "Ambient Study",
            "artist": "Focus Flow",
            "duration": 5400,  # 1.5 hours
            "source_type": TrackSourceType.DEFAULT,
            "url": "https://www.bensound.com/bensound-music/bensound-creativeaminds.mp3",
            "is_default": True,
            "metadata": {"genre": "Ambient", "bpm": 65, "mood": "Calm"}
        }
    ]
    
    for track_data in tracks:
        track = db.query(Track).filter(
            Track.title == track_data["title"],
            Track.artist == track_data["artist"],
            Track.is_default == True
        ).first()
        
        if not track:
            track = Track(**track_data)
            db.add(track)
    
    db.commit()
    print("✓ Default tracks seeded")

    """Create a default playlist with all default tracks"""
    # Check if the default playlist already exists
    playlist = db.query(Playlist).filter_by(name="Default Study Mix").first()
    
    if not playlist:
        # Get all default tracks
        tracks = db.query(Track).filter(Track.is_default == True).all()
        
        if tracks:
            # Create the playlist
            playlist = Playlist(
                name="Default Study Mix",
                description="A mix of default study tracks",
                is_public=True,
                track_count=len(tracks),
                user_id=1  # Default user ID
            )
            db.add(playlist)
            
            # Add tracks to playlist
            for track in tracks:
                playlist.tracks.append(track)
            
            db.commit()
            print("✓ Default playlist created")

def run_seed() -> None:
    """Run all seed functions"""
    db = SessionLocal()
    try:
        print("Seeding database...")
        
        # Create tables if they don't exist
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        # Run seed functions
        print("Seeding time methods...")
        seed_time_methods(db)
        
        print("Seeding default tracks...")
        seed_default_tracks(db)
        
        print("Creating default playlist...")
        seed_default_playlist(db)
        
        print("\n✓ Database seeding completed successfully!")
    except Exception as e:
        print(f"\n✗ Error seeding database: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    # Run seeds
    run_seed()

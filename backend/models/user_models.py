from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base, engine
import hashlib

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)

    # Gamification fields
    total_points = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_activity_date = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    achievements = relationship("UserAchievement", back_populates="user")

    def set_password(self, password):
        """Simple password hashing (for class project - not production ready)"""
        self.password_hash = hashlib.sha256(password.encode()).hexdigest()

    def check_password(self, password):
        """Verify password"""
        return self.password_hash == hashlib.sha256(password.encode()).hexdigest()


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=False)
    icon = Column(String(50), default="🏆")  # Emoji or icon class
    points = Column(Integer, default=10)
    requirement_type = Column(String(50), nullable=False)  # e.g., 'first_assignment', 'streak_5', 'total_points_100'
    requirement_value = Column(Integer, default=1)

    # Relationships
    user_achievements = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    achievement_id = Column(Integer, ForeignKey('achievements.id'), nullable=False)
    earned_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")


def create_default_achievements():
    """Create default achievements for the gamification system"""
    from backend.models.models import SessionLocal

    db = SessionLocal()
    try:
        # Check if achievements already exist
        existing = db.query(Achievement).first()
        if existing:
            return

        default_achievements = [
            {
                "name": "First Steps",
                "description": "Create your first assignment",
                "icon": "TARGET",
                "points": 10,
                "requirement_type": "assignments_created",
                "requirement_value": 1
            },
            {
                "name": "Task Master",
                "description": "Complete your first assignment",
                "icon": "CHECK",
                "points": 20,
                "requirement_type": "assignments_completed",
                "requirement_value": 1
            },
            {
                "name": "On Fire!",
                "description": "Maintain a 3-day study streak",
                "icon": "FIRE",
                "points": 30,
                "requirement_type": "streak",
                "requirement_value": 3
            },
            {
                "name": "Dedicated Scholar",
                "description": "Maintain a 5-day study streak",
                "icon": "BOOK",
                "points": 50,
                "requirement_type": "streak",
                "requirement_value": 5
            },
            {
                "name": "Week Warrior",
                "description": "Maintain a 7-day study streak",
                "icon": "SWORD",
                "points": 75,
                "requirement_type": "streak",
                "requirement_value": 7
            },
            {
                "name": "Productivity Pro",
                "description": "Complete 5 assignments",
                "icon": "STAR",
                "points": 50,
                "requirement_type": "assignments_completed",
                "requirement_value": 5
            },
            {
                "name": "Time Manager",
                "description": "Complete 10 assignments",
                "icon": "CLOCK",
                "points": 100,
                "requirement_type": "assignments_completed",
                "requirement_value": 10
            },
            {
                "name": "Century Club",
                "description": "Earn 100 total points",
                "icon": "100",
                "points": 25,
                "requirement_type": "total_points",
                "requirement_value": 100
            },
            {
                "name": "Point Collector",
                "description": "Earn 500 total points",
                "icon": "GEM",
                "points": 50,
                "requirement_type": "total_points",
                "requirement_value": 500
            }
        ]

        for ach_data in default_achievements:
            achievement = Achievement(**ach_data)
            db.add(achievement)

        db.commit()
        print("Default achievements created successfully!")
    except Exception as e:
        print(f"Error creating default achievements: {e}")
        db.rollback()
    finally:
        db.close()

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from backend.models.models import Base, engine
from datetime import datetime

class Sprint(Base):
    """Represents a sprint/iteration for organizing work"""
    __tablename__ = "sprints"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    status = Column(String(20), default='active')  # 'active', 'completed', 'planned'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tasks = relationship("Task", back_populates="sprint", cascade="all, delete-orphan")

class Task(Base):
    """Represents a task within a sprint"""
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default='new')  # 'new', 'in_progress', 'completed', 'blocked'
    priority = Column(Integer, default=2)  # 1=high, 2=medium, 3=low

    # Task assignment fields
    due_date = Column(DateTime, nullable=True)
    estimated_manpower = Column(Integer, nullable=True)  # Estimated hours/points needed
    assignee = Column(String(100), nullable=True)  # Who is assigned to this task

    # Sprint relationship
    sprint_id = Column(Integer, ForeignKey('sprints.id'), nullable=True)
    sprint = relationship("Sprint", back_populates="tasks")

    # Assignment relationship (optional - link to assignment if task is related to an assignment)
    assignment_id = Column(Integer, ForeignKey('assignments.id'), nullable=True)
    assignment = relationship("Assignment", backref="tasks", foreign_keys=[assignment_id])

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

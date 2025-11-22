from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

class CalendarBlock(Base):
    __tablename__ = "calendar_blocks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    start_datetime = Column(DateTime, nullable=False)
    end_datetime = Column(DateTime, nullable=False)
    block_type = Column(String, nullable=False)  # 'busy' or 'study'
    assignment_id = Column(Integer, ForeignKey('assignments.id'), nullable=True)

    assignment = relationship("Assignment", backref="calendar_blocks", foreign_keys=[assignment_id])

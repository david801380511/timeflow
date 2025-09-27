from sqlalchemy import Column, Integer
from models import Base, engine  # reuse existing Base/engine

class DailyLimitSetting(Base):
    __tablename__ = "daily_limit_setting"
    id = Column(Integer, primary_key=True, index=True)
    daily_limit_minutes = Column(Integer, nullable=False, default=180)

Base.metadata.create_all(bind=engine)

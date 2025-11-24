from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path
import os

class Settings(BaseSettings):
    # Application settings
    PROJECT_NAME: str = "TimeFlow"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./timeflow.db")
    
    # File upload settings
    UPLOAD_FOLDER: str = str(Path(__file__).parent.parent / "uploads")
    MUSIC_UPLOAD_FOLDER: str = str(Path(UPLOAD_FOLDER) / "music")
    ALLOWED_EXTENSIONS: set = {"mp3", "wav", "ogg", "m4a"}
    MAX_CONTENT_LENGTH: int = 50 * 1024 * 1024  # 50MB max file size
    
    # CORS settings
    BACKEND_CORS_ORIGINS: list = ["*"]
    
    class Config:
        case_sensitive = True
        env_file = ".env"

# Create upload directories if they don't exist
os.makedirs(Settings().UPLOAD_FOLDER, exist_ok=True)
os.makedirs(Settings().MUSIC_UPLOAD_FOLDER, exist_ok=True)

settings = Settings()

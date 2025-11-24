from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
import sys
from pathlib import Path
from typing import Optional

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

# Create necessary directories
uploads_dir = project_root / "uploads"
music_uploads_dir = uploads_dir / "music"
os.makedirs(music_uploads_dir, exist_ok=True)

# Import routers after setting up paths
from backend.routes import music, time_routes, auth_routes, break_routes, calendar_routes, limit_routes, notification_routes
from backend.database import init_db, SessionLocal, Base, engine
from backend.scripts.seed_time_methods import seed_time_methods, seed_default_tracks

app = FastAPI(
    title="TimeFlow API",
    description="API for TimeFlow - A productivity and time management application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(time_routes.router)
app.include_router(music.router)
app.include_router(auth_routes.router)
app.include_router(break_routes.router)
app.include_router(calendar_routes.router)
app.include_router(limit_routes.router)
app.include_router(notification_routes.router)

# Serve static files (for uploaded music)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.get("/")
async def root():
    return {"message": "Welcome to TimeFlow API"}


# Create database tables and seed initial data
@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup"""
    try:
        # Initialize the database
        init_db()

        # Seed initial data
        db = SessionLocal()
        try:
            # Seed time management methods
            seed_time_methods()

            # Seed default tracks and playlist
            seed_default_tracks(db)

            print("\n=== TimeFlow API Started Successfully ===")
            print(f"Database: {engine.url}")
            print("\nAvailable endpoints:")
            print("  - GET    /api/time-methods/")
            print("  - GET    /api/time-methods/user-preferences?user_id=1")
            print("  - PUT    /api/time-methods/user-preferences")
            print("  - GET    /api/music/playlists?user_id=1")
            print("  - POST   /api/music/playlists")
            print("  - POST   /api/music/tracks/upload")
            print("  - GET    /api/music/playlists/{playlist_id}/tracks")
            print("  - DELETE /api/music/tracks/{track_id}")
            print("\nAPI documentation available at /docs or /redoc")
        except Exception as e:
            print(f"Error during startup: {e}")
        finally:
            db.close()
    except Exception as e:
        print(f"Failed to initialize database: {e}")
        raise


# Add a simple health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "TimeFlow API is running"}


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": f"An error occurred: {str(exc)}"},
    )
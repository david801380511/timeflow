import os
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.music_models import Playlist, Track
from ..schemas import music_schemas

router = APIRouter(
    prefix="/api/music",
    tags=["music"],
    responses={404: {"description": "Not found"}},
)

# Configuration
UPLOAD_FOLDER = "uploads/music"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@router.get("/playlists", response_model=List[music_schemas.Playlist])
def get_playlists(
    user_id: int,
    include_default: bool = True,
    db: Session = Depends(get_db)
):
    """Get user's playlists and optionally include default playlists"""
    query = db.query(Playlist).filter(
        (Playlist.user_id == user_id) | (Playlist.is_default == True)
    )
    
    if not include_default:
        query = query.filter(Playlist.user_id == user_id)
    
    return query.all()

@router.post("/playlists", response_model=music_schemas.Playlist)
def create_playlist(
    playlist: music_schemas.PlaylistCreate,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Create a new playlist"""
    db_playlist = Playlist(
        user_id=user_id,
        name=playlist.name,
        is_default=False
    )
    db.add(db_playlist)
    db.commit()
    db.refresh(db_playlist)
    return db_playlist

@router.post("/tracks/upload", response_model=music_schemas.Track)
async def upload_track(
    file: UploadFile = File(...),
    title: str = Form(...),
    artist: str = Form("Unknown"),
    playlist_id: int = Form(...),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Upload a new track"""
    # Verify playlist exists and belongs to user
    playlist = db.query(Playlist).filter(
        (Playlist.id == playlist_id) & 
        ((Playlist.user_id == user_id) | (Playlist.is_default == False))
    ).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found or access denied")
    
    # Save the file
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{int(datetime.utcnow().timestamp())}{file_ext}"
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create track record
    track = Track(
        title=title,
        artist=artist,
        source=file_path,
        duration=0,  # You might want to extract duration using a library like mutagen
        is_custom=True,
        playlist_id=playlist_id
    )
    
    db.add(track)
    db.commit()
    db.refresh(track)
    return track

@router.get("/playlists/{playlist_id}/tracks", response_model=List[music_schemas.Track])
def get_playlist_tracks(
    playlist_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get all tracks in a playlist"""
    playlist = db.query(Playlist).filter(
        (Playlist.id == playlist_id) & 
        ((Playlist.user_id == user_id) | (Playlist.is_default == True))
    ).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found or access denied")
    
    return playlist.tracks

@router.delete("/tracks/{track_id}")
def delete_track(
    track_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Delete a track"""
    track = db.query(Track).join(Playlist).filter(
        (Track.id == track_id) &
        ((Playlist.user_id == user_id) | (Playlist.is_default == False))
    ).first()
    
    if not track:
        raise HTTPException(status_code=404, detail="Track not found or access denied")
    
    # Delete the file
    try:
        if track.is_custom and os.path.exists(track.source):
            os.remove(track.source)
    except Exception as e:
        print(f"Error deleting file: {e}")
    
    db.delete(track)
    db.commit()
    return {"message": "Track deleted successfully"}

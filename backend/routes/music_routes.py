from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from pathlib import Path
import mimetypes

from ..database import get_db
from ..models.music_models import Track, Playlist, TrackSourceType
from ..schemas.music_schemas import (
    Track as TrackSchema,
    Playlist as PlaylistSchema,
    PlaylistCreate,
    PlaylistUpdate,
    UserCustomTrackCreate
)
from ..crud import music_crud
from ..core.dependencies import get_current_user, get_current_user_optional
from ..core.config import settings
from ..models.user_models import User

router = APIRouter(prefix="/api/music", tags=["music"])

# Tracks
@router.get("/tracks", response_model=List[TrackSchema])
def list_tracks(
    skip: int = 0,
    limit: int = 100,
    include_default: bool = True,
    include_custom: bool = True,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Get available tracks
    """
    # If no user is logged in, only return default tracks
    if not current_user:
        return music_crud.get_default_tracks(db, skip=skip, limit=limit)
    
    # Build query based on parameters
    query = db.query(Track)
    
    if include_default and include_custom:
        # Get both default and user's custom tracks
        if current_user:
            query = query.filter(
                (Track.is_default == True) | 
                (Track.source_type == TrackSourceType.UPLOAD) & 
                (Track.custom_track.has(user_id=current_user.id))
            )
        else:
            query = query.filter(Track.is_default == True)
    elif include_default:
        query = query.filter(Track.is_default == True)
    elif include_custom and current_user:
        query = query.filter(
            (Track.source_type == TrackSourceType.UPLOAD) & 
            (Track.custom_track.has(user_id=current_user.id))
        )
    else:
        return []
    
    return query.offset(skip).limit(limit).all()

@router.get("/tracks/{track_id}", response_model=TrackSchema)
def get_track(
    track_id: int,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Get a specific track by ID
    """
    track = music_crud.get_track(db, track_id=track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    # Check permissions for custom tracks
    if track.source_type == TrackSourceType.UPLOAD:
        if not current_user or (track.custom_track and track.custom_track.user_id != current_user.id and not track.custom_track.is_public):
            raise HTTPException(status_code=403, detail="Not authorized to access this track")
    
    return track

@router.get("/tracks/{track_id}/play")
def play_track(
    track_id: int,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Stream a track file
    """
    track = music_crud.get_track(db, track_id=track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    # Check permissions for custom tracks
    if track.source_type == TrackSourceType.UPLOAD:
        if not current_user or (track.custom_track and track.custom_track.user_id != current_user.id and not track.custom_track.is_public):
            raise HTTPException(status_code=403, detail="Not authorized to access this track")
        
        # For custom uploads, serve the file from the uploads directory
        file_path = Path(settings.UPLOAD_DIR) / track.custom_track.file_path
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Track file not found")
        
        # Determine content type
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if not mime_type:
            mime_type = "audio/mpeg"  # Default to MP3 if unknown
        
        return FileResponse(
            file_path,
            media_type=mime_type,
            filename=file_path.name
        )
    else:
        # For external tracks, redirect to the URL
        if not track.url:
            raise HTTPException(status_code=404, detail="Track URL not available")
        
        return {"url": track.url}

# Playlists
@router.get("/playlists", response_model=List[PlaylistSchema])
def list_playlists(
    include_public: bool = False,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Get the current user's playlists, optionally including public playlists from others
    """
    if not current_user:
        if not include_public:
            return []
        # Only get public playlists if no user is logged in
        return db.query(Playlist).filter(Playlist.is_public == True).all()
    
    return music_crud.get_user_playlists(db, user_id=current_user.id, include_public=include_public)

@router.post("/playlists", response_model=PlaylistSchema, status_code=status.HTTP_201_CREATED)
def create_playlist(
    playlist: PlaylistCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new playlist
    """
    # Verify all track IDs exist
    if playlist.track_ids:
        tracks = music_crud.get_tracks_by_ids(db, playlist.track_ids)
        if len(tracks) != len(playlist.track_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more track IDs are invalid"
            )
    
    return music_crud.create_playlist(db, playlist=playlist, user_id=current_user.id)

@router.get("/playlists/{playlist_id}", response_model=PlaylistSchema)
def get_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Get a specific playlist by ID
    """
    playlist = music_crud.get_playlist(db, playlist_id=playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Check permissions
    if not playlist.is_public and (not current_user or playlist.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this playlist")
    
    return playlist

@router.put("/playlists/{playlist_id}", response_model=PlaylistSchema)
def update_playlist(
    playlist_id: int,
    playlist_update: PlaylistUpdate,
    track_ids: Optional[List[int]] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a playlist
    """
    # Get the existing playlist
    db_playlist = music_crud.get_playlist(db, playlist_id=playlist_id)
    if not db_playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Check permissions
    if db_playlist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this playlist")
    
    # Verify all track IDs exist if provided
    if track_ids is not None:
        tracks = music_crud.get_tracks_by_ids(db, track_ids)
        if len(tracks) != len(track_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more track IDs are invalid"
            )
    
    return music_crud.update_playlist(
        db, 
        db_playlist=db_playlist, 
        playlist=playlist_update,
        track_ids=track_ids
    )

@router.delete("/playlists/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a playlist
    """
    # Get the existing playlist
    db_playlist = music_crud.get_playlist(db, playlist_id=playlist_id)
    if not db_playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Check permissions
    if db_playlist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this playlist")
    
    music_crud.delete_playlist(db, playlist_id=playlist_id)
    return None

# Custom Tracks
@router.post("/tracks/upload", response_model=TrackSchema, status_code=status.HTTP_201_CREATED)
async def upload_track(
    file: UploadFile = File(...),
    title: str = Form(...),
    artist: str = Form("Unknown Artist"),
    is_public: bool = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a custom track
    """
    # Validate file type
    allowed_mime_types = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"]
    if file.content_type not in allowed_mime_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_mime_types)}"
        )
    
    # Get file extension
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    # Create track data
    track_data = UserCustomTrackCreate(
        title=title,
        artist=artist,
        file_path=f"temp{file_extension}",  # Will be updated during save
        duration=0,  # Will be updated after file is processed
        file_size=0,  # Will be updated during save
        mime_type=file.content_type,
        is_public=is_public
    )
    
    # Save the track
    track = await music_crud.create_user_custom_track(
        db=db,
        track_data=track_data,
        user_id=current_user.id,
        file=file
    )
    
    if not track:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save track"
        )
    
    return track

@router.delete("/tracks/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_track(
    track_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a custom track
    """
    # Get the track
    track = music_crud.get_track(db, track_id=track_id)
    if not track or track.source_type != TrackSourceType.UPLOAD:
        raise HTTPException(status_code=404, detail="Track not found or not a custom track")
    
    # Check permissions
    if track.custom_track.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this track")
    
    # Delete the track
    if not music_crud.delete_user_custom_track(db, track_id=track_id, user_id=current_user.id):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete track"
        )
    
    return None

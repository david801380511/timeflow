from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import shutil
from pathlib import Path

from ..models.music_models import Track, Playlist, UserCustomTrack, TrackSourceType, playlist_track
from ..schemas.music_schemas import TrackCreate, PlaylistCreate, PlaylistUpdate, UserCustomTrackCreate, UserCustomTrackUpdate
from ..core.config import settings

def get_track(db: Session, track_id: int) -> Optional[Track]:
    """Get a track by ID"""
    return db.query(Track).filter(Track.id == track_id).first()

def get_tracks_by_ids(db: Session, track_ids: List[int]) -> List[Track]:
    """Get multiple tracks by their IDs"""
    return db.query(Track).filter(Track.id.in_(track_ids)).all()

def get_default_tracks(db: Session, skip: int = 0, limit: int = 100) -> List[Track]:
    """Get all default tracks"""
    return db.query(Track).filter(Track.is_default == True).offset(skip).limit(limit).all()

def create_track(db: Session, track: TrackCreate) -> Track:
    """Create a new track"""
    db_track = Track(**track.dict())
    db.add(db_track)
    db.commit()
    db.refresh(db_track)
    return db_track

def delete_track(db: Session, track_id: int) -> bool:
    """Delete a track"""
    track = get_track(db, track_id)
    if not track:
        return False
    
    # If it's a custom track, delete the file
    if track.source_type == TrackSourceType.UPLOAD:
        custom_track = db.query(UserCustomTrack).filter(UserCustomTrack.track_id == track_id).first()
        if custom_track:
            try:
                file_path = Path(settings.UPLOAD_DIR) / custom_track.file_path
                if file_path.exists():
                    file_path.unlink()
                db.delete(custom_track)
            except Exception as e:
                print(f"Error deleting track file: {e}")
    
    # Delete the track
    db.delete(track)
    db.commit()
    return True

def get_playlist(db: Session, playlist_id: int) -> Optional[Playlist]:
    """Get a playlist by ID with its tracks"""
    return db.query(Playlist).filter(Playlist.id == playlist_id).first()

def get_user_playlists(db: Session, user_id: int, include_public: bool = False) -> List[Playlist]:
    """Get all playlists for a user, optionally including public playlists"""
    query = db.query(Playlist).filter(
        (Playlist.user_id == user_id) | 
        (Playlist.is_public == True) if include_public else (Playlist.user_id == user_id)
    )
    return query.all()

def create_playlist(db: Session, playlist: PlaylistCreate, user_id: int) -> Playlist:
    """Create a new playlist"""
    # Create the playlist
    db_playlist = Playlist(
        **playlist.dict(exclude={"track_ids"}),
        user_id=user_id,
        track_count=len(playlist.track_ids or [])
    )
    db.add(db_playlist)
    db.commit()
    
    # Add tracks to playlist if any
    if playlist.track_ids:
        tracks = db.query(Track).filter(Track.id.in_(playlist.track_ids)).all()
        for track in tracks:
            db_playlist.tracks.append(track)
        db.commit()
    
    db.refresh(db_playlist)
    return db_playlist

def update_playlist(
    db: Session, 
    db_playlist: Playlist, 
    playlist: PlaylistUpdate,
    track_ids: Optional[List[int]] = None
) -> Playlist:
    """Update a playlist"""
    update_data = playlist.dict(exclude_unset=True)
    
    # Update playlist metadata
    for field, value in update_data.items():
        setattr(db_playlist, field, value)
    
    # Update tracks if provided
    if track_ids is not None:
        # Clear existing tracks
        db_playlist.tracks.clear()
        
        # Add new tracks
        if track_ids:
            tracks = db.query(Track).filter(Track.id.in_(track_ids)).all()
            for track in tracks:
                db_playlist.tracks.append(track)
        
        db_playlist.track_count = len(track_ids)
    
    db_playlist.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_playlist)
    return db_playlist

def delete_playlist(db: Session, playlist_id: int) -> bool:
    """Delete a playlist and its track associations"""
    playlist = get_playlist(db, playlist_id)
    if not playlist:
        return False
    
    # Clear tracks (this will remove the associations)
    playlist.tracks.clear()
    
    # Delete the playlist
    db.delete(playlist)
    db.commit()
    return True

def add_track_to_playlist(
    db: Session, 
    playlist_id: int, 
    track_id: int, 
    user_id: int,
    position: Optional[int] = None
) -> bool:
    """Add a track to a playlist"""
    # Check if playlist exists and belongs to user
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == user_id
    ).first()
    
    if not playlist:
        return False
        
    # Check if track exists
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        return False
    
    # Check if track is already in playlist
    if track in playlist.tracks:
        return False
    
    # Add track to playlist
    playlist.tracks.append(track)
    db.commit()
    return True

def remove_track_from_playlist(db: Session, playlist_id: int, track_id: int, user_id: int) -> bool:
    """Remove a track from a playlist"""
    # Check if playlist exists and belongs to user
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == user_id
    ).first()
    
    if not playlist:
        return False
        
    # Find the track
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track or track not in playlist.tracks:
        return False
    
    # Remove the track from the playlist
    playlist.tracks.remove(track)
    db.commit()
    return True

def reorder_tracks_in_playlist(
    db: Session, 
    playlist_id: int,
    user_id: int,
    track_order: Dict[int, int]
) -> bool:
    """
    Reorder tracks in a playlist
    
    Args:
        playlist_id: ID of the playlist
        user_id: ID of the user making the request
        track_order: Dictionary mapping track IDs to their new positions (0-based)
    """
    if not track_order:
        return False
    
    # Check if playlist exists and belongs to user
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == user_id
    ).first()
    
    if not playlist:
        return False
    
    # Get all tracks in the playlist
    tracks = {t.id: t for t in playlist.tracks}
    
    # Verify all track IDs in track_order exist in the playlist
    if not all(tid in tracks for tid in track_order):
        return False
    
    # Create a new ordered list of tracks
    ordered_tracks = [None] * len(tracks)
    
    # Place tracks in their new positions
    for track_id, position in track_order.items():
        if 0 <= position < len(ordered_tracks):
            ordered_tracks[position] = tracks[track_id]
    
    # Remove None values (if any) and update the relationship
    playlist.tracks = [t for t in ordered_tracks if t is not None]
    
    db.commit()
    return True

def create_user_custom_track(
    db: Session,
    track_data: UserCustomTrackCreate,
    user_id: int,
    file
) -> Optional[UserCustomTrack]:
    """Create a new user-uploaded track"""
    # Create the track record
    track = Track(
        title=track_data.title,
        artist=track_data.artist,
        duration=track_data.duration,
        source_type=TrackSourceType.UPLOAD,
        is_default=False,
        metadata={
            "original_filename": file.filename,
            "mime_type": track_data.mime_type
        }
    )
    db.add(track)
    db.flush()  # Get the track ID before commit
    
    # Create the custom track record
    custom_track = UserCustomTrack(
        id=track.id,
        user_id=user_id,
        **track_data.dict(exclude={"title", "artist", "duration"})
    )
    db.add(custom_track)
    
    # Save the file
    try:
        # Ensure upload directory exists
        upload_dir = Path(settings.UPLOAD_DIR) / "music" / str(user_id)
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Save file with track ID as filename to avoid conflicts
        file_extension = Path(track_data.file_path).suffix
        filename = f"{track.id}{file_extension}"
        file_path = upload_dir / filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Update file path in the database
        custom_track.file_path = str(Path("music") / str(user_id) / filename)
        
        db.commit()
        db.refresh(track)
        return track
    except Exception as e:
        db.rollback()
        print(f"Error saving track file: {e}")
        return None

def update_user_custom_track(
    db: Session,
    track_id: int,
    track_data: UserCustomTrackUpdate,
    user_id: int
) -> Optional[UserCustomTrack]:
    """Update a user's custom track"""
    custom_track = db.query(UserCustomTrack).filter(
        UserCustomTrack.id == track_id,
        UserCustomTrack.user_id == user_id
    ).first()
    
    if not custom_track:
        return None
    
    # Update track metadata
    track = get_track(db, track_id)
    if not track:
        return None
    
    update_data = track_data.dict(exclude_unset=True)
    
    # Update track fields
    if "title" in update_data:
        track.title = update_data["title"]
    if "artist" in update_data:
        track.artist = update_data["artist"]
    
    # Update custom track fields
    if "is_public" in update_data:
        custom_track.is_public = update_data["is_public"]
    
    track.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(track)
    return track

def delete_user_custom_track(db: Session, track_id: int, user_id: int) -> bool:
    """Delete a user's custom track and its file"""
    custom_track = db.query(UserCustomTrack).filter(
        UserCustomTrack.id == track_id,
        UserCustomTrack.user_id == user_id
    ).first()
    
    if not custom_track:
        return False
    
    # Delete the file
    try:
        file_path = Path(settings.UPLOAD_DIR) / custom_track.file_path
        if file_path.exists():
            file_path.unlink()
    except Exception as e:
        print(f"Error deleting track file: {e}")
    
    # Delete the track and custom track records
    db.query(Track).filter(Track.id == track_id).delete()
    db.commit()
    return True

def get_user_custom_tracks(
    db: Session, 
    user_id: int, 
    include_public: bool = False
) -> List[Track]:
    """Get all custom tracks for a user, optionally including public tracks from others"""
    query = db.query(Track).join(UserCustomTrack)
    
    if include_public:
        query = query.filter(
            (UserCustomTrack.user_id == user_id) |
            (UserCustomTrack.is_public == True)
        )
    else:
        query = query.filter(UserCustomTrack.user_id == user_id)
    
    return query.all()

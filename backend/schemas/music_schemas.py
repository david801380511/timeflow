from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class TrackSourceType(str, Enum):
    DEFAULT = "default"
    CUSTOM = "custom"
    SPOTIFY = "spotify"
    YOUTUBE = "youtube"
    UPLOAD = "upload"

class TrackBase(BaseModel):
    title: str = Field(..., max_length=200)
    artist: str = Field(..., max_length=100)
    duration: int = Field(..., gt=0, description="Duration in seconds")
    source_type: TrackSourceType = TrackSourceType.DEFAULT
    url: Optional[HttpUrl] = None
    thumbnail_url: Optional[HttpUrl] = None
    is_default: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)

class TrackCreate(TrackBase):
    pass

class TrackUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    artist: Optional[str] = Field(None, max_length=100)
    metadata: Optional[Dict[str, Any]] = None

class Track(TrackBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class PlaylistBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_public: bool = False
    is_active: bool = True

class PlaylistCreate(PlaylistBase):
    track_ids: List[int] = Field(default_factory=list)

class PlaylistUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None

class PlaylistTrackBase(BaseModel):
    track_id: int
    order: int = 0
    added_by: Optional[int] = None  # User ID who added the track

class PlaylistTrackCreate(PlaylistTrackBase):
    pass

class PlaylistTrack(PlaylistTrackBase):
    id: int
    playlist_id: int
    created_at: datetime
    track: Track

    class Config:
        orm_mode = True

class Playlist(PlaylistBase):
    id: int
    user_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    tracks: List[PlaylistTrack] = []
    track_count: int = 0

    class Config:
        orm_mode = True

class UserCustomTrackBase(BaseModel):
    title: str = Field(..., max_length=200)
    artist: str = Field(..., max_length=100)
    file_path: str
    duration: int = Field(..., gt=0)
    file_size: int = Field(..., gt=0)
    mime_type: str
    is_public: bool = False

class UserCustomTrackCreate(UserCustomTrackBase):
    pass

class UserCustomTrackUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    artist: Optional[str] = Field(None, max_length=100)
    is_public: Optional[bool] = None

class UserCustomTrack(UserCustomTrackBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

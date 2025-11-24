from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum, Table
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..database import Base

class TrackSourceType(enum.Enum):
    DEFAULT = "default"  # Built-in study tracks
    UPLOAD = "upload"    # User uploaded file
    URL = "url"          # User provided URL

# Association table for many-to-many relationship between Playlist and Track
playlist_track = Table(
    'playlist_track',
    Base.metadata,
    Column('id', Integer, primary_key=True, index=True),
    Column('playlist_id', Integer, ForeignKey('playlists.id')),
    Column('track_id', Integer, ForeignKey('tracks.id')),
    Column('order', Integer, nullable=False, default=0),
    Column('added_at', DateTime, default=datetime.utcnow)
)

class Track(Base):
    """Music tracks (default or user custom)"""
    __tablename__ = "tracks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    artist = Column(String, nullable=True)
    duration = Column(Integer, nullable=True)  # seconds
    source_type = Column(Enum(TrackSourceType), nullable=False)
    file_path = Column(String, nullable=True)  # For uploads: /uploads/tracks/...
    url = Column(String, nullable=True)  # For URL-based tracks
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user_links = relationship("UserCustomTrack", back_populates="track", cascade="all, delete-orphan")

class Playlist(Base):
    """User playlists"""
    __tablename__ = "playlists"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False, default="My Study Music")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="playlists")
    tracks = relationship("Track", secondary=playlist_track, backref="playlists")

class UserCustomTrack(Base):
    """User's custom uploaded/linked tracks"""
    __tablename__ = "user_custom_tracks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    track_id = Column(Integer, ForeignKey("tracks.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="custom_tracks")
    track = relationship("Track", back_populates="user_links")
# class User:
#     # ... existing fields ...
#     playlists = relationship("Playlist", back_populates="user")

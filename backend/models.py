from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from database import Base

class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    excerpt = Column(Text, default="")
    poster = Column(String(1000), default="")
    backdrop = Column(String(1000), default="")
    source = Column(String(100), default="")
    source_url = Column(String(2000), default="")
    year = Column(Integer, nullable=True)
    media_type = Column(String(20), default="movie")
    status = Column(String(20), default="active")
    views = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    stream_links = relationship("StreamLink", back_populates="movie", cascade="all, delete-orphan")

class StreamLink(Base):
    __tablename__ = "stream_links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)
    url = Column(String(2000), default="")
    file_id = Column(String(200), default="")
    created_at = Column(DateTime, server_default=func.now())

    movie = relationship("Movie", back_populates="stream_links")

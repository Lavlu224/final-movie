from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import httpx

from database import get_db
from models import Movie, StreamLink

router = APIRouter()

# --- Pydantic Schemas ---

class StreamLinkSchema(BaseModel):
    provider: str
    url: str = ""
    file_id: str = ""

class MovieCreate(BaseModel):
    title: str
    excerpt: str = ""
    poster: str = ""
    backdrop: str = ""
    source: str = ""
    source_url: str = ""
    year: Optional[int] = None
    media_type: str = "movie"
    stream_links: list[StreamLinkSchema] = []

class MovieResponse(BaseModel):
    id: int
    title: str
    excerpt: str
    poster: str
    backdrop: str
    source: str
    source_url: str
    year: Optional[int] = None
    media_type: str
    status: str
    views: int
    created_at: datetime
    updated_at: datetime
    stream_links: list[StreamLinkSchema] = []

class MovieListItem(BaseModel):
    id: int
    title: str
    poster: str
    source: str
    year: Optional[int] = None
    media_type: str
    status: str
    views: int
    created_at: datetime

# --- Helper ---

def _movie_to_response(movie: Movie):
    return MovieResponse(
        id=movie.id, title=movie.title, excerpt=movie.excerpt or "",
        poster=movie.poster or "", backdrop=movie.backdrop or "",
        source=movie.source or "", source_url=movie.source_url or "",
        year=movie.year, media_type=movie.media_type or "movie",
        status=movie.status or "active", views=movie.views or 0,
        created_at=movie.created_at, updated_at=movie.updated_at,
        stream_links=[StreamLinkSchema(provider=l.provider, url=l.url, file_id=l.file_id) for l in movie.stream_links],
    )

# --- Endpoints ---

@router.post("/movies", response_model=MovieResponse)
def create_movie(data: MovieCreate, db: Session = Depends(get_db)):
    movie = Movie(
        title=data.title, excerpt=data.excerpt, poster=data.poster,
        backdrop=data.backdrop, source=data.source, source_url=data.source_url,
        year=data.year, media_type=data.media_type,
    )
    db.add(movie)
    db.flush()
    for sl in data.stream_links:
        link = StreamLink(movie_id=movie.id, provider=sl.provider, url=sl.url, file_id=sl.file_id)
        db.add(link)
    db.commit()
    db.refresh(movie)
    return _movie_to_response(movie)

@router.get("/movies", response_model=list[MovieListItem])
def list_movies(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.execute(
        select(Movie).order_by(Movie.created_at.desc()).offset(skip).limit(limit)
    ).scalars().all()

@router.get("/movies/{movie_id}", response_model=MovieResponse)
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    movie = db.execute(select(Movie).where(Movie.id == movie_id)).scalar_one_or_none()
    if not movie:
        raise HTTPException(404, "Movie not found")
    movie.views = (movie.views or 0) + 1
    db.commit()
    return _movie_to_response(movie)

@router.put("/movies/{movie_id}", response_model=MovieResponse)
def update_movie(movie_id: int, data: MovieCreate, db: Session = Depends(get_db)):
    movie = db.execute(select(Movie).where(Movie.id == movie_id)).scalar_one_or_none()
    if not movie:
        raise HTTPException(404, "Movie not found")
    movie.title = data.title
    movie.excerpt = data.excerpt
    movie.poster = data.poster
    movie.backdrop = data.backdrop
    movie.source = data.source
    movie.source_url = data.source_url
    movie.year = data.year
    movie.media_type = data.media_type
    db.execute(StreamLink.__table__.delete().where(StreamLink.movie_id == movie_id))
    for sl in data.stream_links:
        link = StreamLink(movie_id=movie.id, provider=sl.provider, url=sl.url, file_id=sl.file_id)
        db.add(link)
    db.commit()
    db.refresh(movie)
    return _movie_to_response(movie)

@router.delete("/movies/{movie_id}")
def delete_movie(movie_id: int, db: Session = Depends(get_db)):
    movie = db.execute(select(Movie).where(Movie.id == movie_id)).scalar_one_or_none()
    if not movie:
        raise HTTPException(404, "Movie not found")
    db.delete(movie)
    db.commit()
    return {"ok": True}

@router.post("/movies/backfill/{movie_id}", response_model=MovieResponse)
async def backfill_movie_links(movie_id: int, db: Session = Depends(get_db)):
    movie = db.execute(select(Movie).where(Movie.id == movie_id)).scalar_one_or_none()
    if not movie:
        raise HTTPException(404, "Movie not found")
    if not movie.source_url:
        raise HTTPException(400, "Movie has no source_url to backfill from")
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"http://localhost:8000/multisource/fetch-url?url={movie.source_url}", timeout=30)
            data = r.json()
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch source: {e}")
    stream_data = data.get("stream_data") or {}
    new_links: list[StreamLink] = []
    seen = set()
    for link_url, sd in stream_data.items():
        if sd.get("_kmhd_file") or sd.get("_kmhd_play"):
            continue
        for provider_key, attr_key in [("streamtape", "streamtape"), ("1xbet", "_1xbet"), ("4rabet", "_4rabet")]:
            sid = sd.get(attr_key)
            if sid and sid not in seen:
                seen.add(sid)
                url = f"https://streamtape.com/e/{sid}" if provider_key == "streamtape" else sid
                new_links.append(StreamLink(movie_id=movie_id, provider=provider_key, url=url, file_id=sid if provider_key == "streamtape" else ""))
    db.execute(StreamLink.__table__.delete().where(StreamLink.movie_id == movie_id))
    for link in new_links:
        db.add(link)
    db.commit()
    db.refresh(movie)
    return _movie_to_response(movie)

@router.get("/movies/stats/summary")
def movie_stats(db: Session = Depends(get_db)):
    total = db.scalar(func.count(Movie.id))
    active = db.scalar(select(func.count(Movie.id)).where(Movie.status == "active"))
    total_views = db.scalar(select(func.coalesce(func.sum(Movie.views), 0)))
    return {
        "total_movies": total or 0,
        "active_movies": active or 0,
        "total_views": total_views or 0,
    }

def _movie_to_response(movie: Movie):
    return MovieResponse(
        id=movie.id, title=movie.title, excerpt=movie.excerpt or "",
        poster=movie.poster or "", backdrop=movie.backdrop or "",
        source=movie.source or "", source_url=movie.source_url or "",
        year=movie.year, media_type=movie.media_type or "movie",
        status=movie.status or "active", views=movie.views or 0,
        created_at=movie.created_at, updated_at=movie.updated_at,
        stream_links=[StreamLinkSchema(provider=l.provider, url=l.url, file_id=l.file_id) for l in movie.stream_links],
    )

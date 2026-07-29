from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os

from routes.multisource import router as multisource_router
from routes.movies import router as movies_router
from database import init_db

app = FastAPI(title="Movie Streaming API")

@app.on_event("startup")
def startup():
    try:
        init_db()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database init failed (app will still run): {e}")

app.include_router(multisource_router, prefix="/multisource")
app.include_router(movies_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
BASE_URL = "https://api.themoviedb.org/3"

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "Movie API running"}

@app.get("/trending")
async def get_trending():
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/trending/movie/week", params={"api_key": TMDB_API_KEY})
        return r.json()

@app.get("/tv/popular")
async def get_popular_tv():
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/tv/popular", params={"api_key": TMDB_API_KEY})
        return r.json()

@app.get("/movie/{movie_id}")
async def get_movie(movie_id: int):
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/movie/{movie_id}", params={"api_key": TMDB_API_KEY, "append_to_response": "videos,recommendations"})
        return r.json()

@app.get("/search")
async def search(q: str):
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/search/movie", params={"api_key": TMDB_API_KEY, "query": q})
        return r.json()

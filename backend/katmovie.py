from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
from bs4 import BeautifulSoup

app = FastAPI(title="KatMovieHD Scraper API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_URL = "https://new.katmoviehd.top"

@app.get("/")
def root():
    return {"message": "KatMovieHD Scraper API", "endpoints": ["/latest", "/search?q="]}

@app.get("/latest")
async def get_latest():
    async with httpx.AsyncClient() as client:
        r = await client.get(BASE_URL)
        soup = BeautifulSoup(r.text, "html.parser")
        items = []
        for article in soup.select("article")[:20]:
            title_el = article.select_one("h2 a")
            if not title_el:
                continue
            items.append({
                "title": title_el.text.strip(),
                "url": title_el["href"],
                "poster": article.select_one("img")["src"] if article.select_one("img") else None,
            })
        return {"results": items}

@app.get("/search")
async def search(q: str = ""):
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/?s={q}")
        soup = BeautifulSoup(r.text, "html.parser")
        items = []
        for article in soup.select("article")[:20]:
            title_el = article.select_one("h2 a")
            if not title_el:
                continue
            items.append({
                "title": title_el.text.strip(),
                "url": title_el["href"],
                "poster": article.select_one("img")["src"] if article.select_one("img") else None,
            })
        return {"results": items}

@app.get("/movie/{path:path}")
async def get_movie_detail(path: str):
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/{path}")
        soup = BeautifulSoup(r.text, "html.parser")
        title = soup.select_one("h1") or soup.select_one("h2")
        poster = soup.select_one("img.wp-post-image")
        content = soup.select_one(".entry-content")
        return {
            "title": title.text.strip() if title else "N/A",
            "poster": poster["src"] if poster else None,
            "content": content.text.strip()[:2000] if content else "N/A",
        }
import os
from fastapi import APIRouter, Query
from fastapi.responses import Response
import httpx
import asyncio
from urllib.parse import quote, unquote
from bs4 import BeautifulSoup
import re
from services.streamtape import get_direct_url, remote_upload, check_uploads, find_existing_file, create_folder

router = APIRouter()

SITES = {
    "katmoviehd": "https://new.katmoviehd.top",
    "katmovie18": "https://new.katmovie18.my",
    "moviesbaba": "https://moviesbaba.lol",
    "katdrama": "https://new.katdrama.my",
    "pikahd": "https://new.pikahd.co",
}

TV_CATEGORY_KEYWORDS = ["tv series", "tv shows", "web series", "web-series", "tv-series", "series", "season", "episode"]

async def fetch_site(client: httpx.AsyncClient, site_key: str, base_url: str, query: str):
    try:
        r = await client.get(f"{base_url}/wp-json/wp/v2/posts?search={quote(query)}&_embed&per_page=10", timeout=10)
        data = r.json()
        if not isinstance(data, list):
            return []
        results = []
        for p in data:
            poster = None
            if p.get("_embedded") and p["_embedded"].get("wp:featuredmedia"):
                poster = p["_embedded"]["wp:featuredmedia"][0].get("source_url")
            # Check categories/tags for TV show
            is_tv = False
            terms = p.get("_embedded", {}).get("wp:term", [])
            for term_group in terms:
                for term in term_group:
                    tname = term.get("name", "").lower()
                    tslug = term.get("slug", "").lower()
                    if any(kw in tname or kw in tslug for kw in TV_CATEGORY_KEYWORDS):
                        is_tv = True
                        break
            results.append({
                "id": p["id"],
                "title": p.get("title", {}).get("rendered", "Untitled"),
                "link": p.get("link", ""),
                "poster": poster,
                "excerpt": p.get("excerpt", {}).get("rendered", "").replace("<p>", "").replace("</p>", "").strip()[:200] if p.get("excerpt") else "",
                "source": site_key,
                "is_tv": is_tv,
            })
        return results
    except:
        return []

@router.get("/proxy-image")
async def proxy_image(url: str = Query(..., description="Image URL to proxy")):
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, timeout=10)
        return Response(content=r.content, media_type=r.headers.get("content-type", "image/jpeg"))
    except:
        return Response(status_code=404)

@router.get("/search")
async def search_all(q: str = Query("", description="Search query")):
    async with httpx.AsyncClient() as client:
        tasks = [
            fetch_site(client, key, url, q)
            for key, url in SITES.items()
        ]
        results = await asyncio.gather(*tasks)
    flat = [item for sublist in results for item in sublist]
    return {"results": flat, "total": len(flat)}

@router.get("/latest/{site_key}")
async def site_latest(site_key: str):
    base_url = SITES.get(site_key)
    if not base_url:
        return {"error": "Invalid site key"}
    async with httpx.AsyncClient() as client:
        results = await fetch_site(client, site_key, base_url, "")
    return {"results": results}

async def extract_kmhd_links(client: httpx.AsyncClient, page_url: str):
    """Extract stream links (kmhd, streamtape, streamwish) from a post page"""
    try:
        r = await client.get(page_url, timeout=10)
        text = r.text
        
        play_links = list(set(re.findall(r'https?://links\.kmhd\.eu/play\?id=[a-zA-Z0-9]+', text)))
        file_links = list(set(re.findall(r'https?://links\.kmhd\.eu/file/[a-zA-Z0-9_]+', text)))
        
        direct_streamtape = list(set(re.findall(r'https?://(?:www\.)?streamtape\.com/e/([a-zA-Z0-9]+)', text)))
        direct_streamwish = list(set(re.findall(r'https?://(?:www\.)?streamwish\.com/e/([a-zA-Z0-9]+)', text)))
        direct_hglink = list(set(re.findall(r'https?://hglink\.to/e/([a-zA-Z0-9]+)', text)))
        direct_1xbet = list(set(re.findall(r'https?://[^"\'<> ]*1xbet[^"\'<> ]*(?:embed|play|player|video)[^"\'<> ]*', text)))
        direct_4rabet = list(set(re.findall(r'https?://[^"\'<> ]*4rabet[^"\'<> ]*(?:embed|play|player|video)[^"\'<> ]*', text)))
        # Also find embedded player iframes (1xplayer, 4raplayer, etc.)
        player_iframes = list(set(re.findall(r'https?://vd\.(?:1xplayer|4raplayer|betplayer|sportsplayer)[^"\'<> ]+', text)))
        # Find any iframe src containing play/embed
        iframe_srcs = list(set(re.findall(r'<iframe[^>]*src="([^"]*play[^"]*)"', text)))
        
        stream_data = {}
        failed_play_links = []
        
        for pl in play_links:
            for domain in ["links.kmhd.eu", "links.kmhd.net", "links.kmhd.win"]:
                try:
                    alt_url = pl.replace("links.kmhd.eu", domain)
                    sr = await client.get(alt_url, timeout=8)
                    stext = sr.text
                    if "523" in stext or "Origin is unreachable" in stext or len(stext) < 100:
                        continue
                    idx = stext.find("resolve({id:1,data:{")
                    if idx >= 0:
                        chunk = stext[idx:idx+3000]
                        data = {}
                        st_m = re.search(r'streamtape_res:"([^"]+)"', chunk)
                        if st_m:
                            data["streamtape"] = st_m.group(1)
                        sw_m = re.search(r'streamwish_res:"([^"]+)"', chunk)
                        if sw_m:
                            data["streamwish"] = sw_m.group(1)
                        if data:
                            stream_data[pl] = data
                        # Extract ALL episode entries from the info object (field order varies)
                        info_start = chunk.find('info:{')
                        if info_start >= 0:
                            brace_start = chunk.find('{', info_start)
                            info_end = chunk.find('},type:', info_start)
                            if info_end < 0:
                                info_end = chunk.find('}}', brace_start)
                            inner = chunk[brace_start+1:info_end]
                            for ep_match in re.finditer(r'([a-zA-Z0-9_]+):\{([^}]+)\}', inner):
                                ep_body = ep_match.group(2)
                                ep_name = re.search(r'name:"([^"]*)"', ep_body)
                                ep_st = re.search(r'streamtape_res:"([^"]*)"', ep_body)
                                ep_sw = re.search(r'streamwish_res:"([^"]*)"', ep_body)
                                if ep_name and ep_st:
                                    ep_data = {"_episode": True, "name": ep_name.group(1)}
                                    ep_data["streamtape"] = ep_st.group(1)
                                    if ep_sw:
                                        ep_data["streamwish"] = ep_sw.group(1)
                                    stream_data[f"ep_{hash(ep_name.group(1))}"] = ep_data
                        break
                except:
                    continue
            else:
                failed_play_links.append(pl)
        
        for sid in direct_streamtape:
            if sid not in [s.get("streamtape") for s in stream_data.values() if isinstance(s, dict)]:
                stream_data[f"direct_st_{sid}"] = {"streamtape": sid, "_direct": True}
        
        for wid in direct_streamwish + direct_hglink:
            if wid not in [s.get("streamwish") for s in stream_data.values() if isinstance(s, dict)]:
                stream_data[f"direct_sw_{wid}"] = {"streamwish": wid, "_direct": True}
        
        for url in direct_1xbet:
            stream_data[f"1xbet_{hash(url)}"] = {"_1xbet": url}
        
        for url in direct_4rabet:
            stream_data[f"4rabet_{hash(url)}"] = {"_4rabet": url}
        
        for url in player_iframes + iframe_srcs:
            if not url.startswith('http'):
                continue
            if '1xplayer' in url or '1xbet' in url:
                stream_data[f"1xbet_{hash(url)}"] = {"_1xbet": url}
            elif '4raplayer' in url or '4rabet' in url:
                stream_data[f"4rabet_{hash(url)}"] = {"_4rabet": url}
        
        # Add failed play links as raw kmhd links so frontend can show them
        for pl in failed_play_links:
            stream_data[pl] = {"_kmhd_play": pl, "_failed": True}
        
        # Add file links as raw kmhd links
        for fl in file_links:
            stream_data[fl] = {"_kmhd_file": fl}
        
        return {
            "play_links": play_links,
            "file_links": file_links,
            "stream_data": stream_data,
        }
    except:
        return {"play_links": [], "file_links": [], "stream_data": {}}

def parse_kmhd_svelte(text: str):
    """Parse kmhd.eu SvelteKit embedded data"""
    idx = text.find("resolve({id:1,data:{")
    if idx < 0:
        return None
    chunk = text[idx:idx+1000]
    name_m = re.search(r'name:"([^"]+)"', chunk)
    id_m = re.search(r'_id:"([^"]+)"', chunk)
    st_m = re.search(r'streamtape_res:"([^"]+)"', chunk)
    sw_m = re.search(r'streamwish_res:"([^"]+)"', chunk)
    
    return {
        "name": name_m.group(1) if name_m else None,
        "_id": id_m.group(1) if id_m else None,
        "streamtape": st_m.group(1) if st_m else None,
        "streamwish": sw_m.group(1) if sw_m else None,
    }

@router.get("/fetch-url")
async def fetch_url(url: str = Query(..., description="Full post URL to scrape")):
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, timeout=15)

            # Handle kmhd.eu directly
            if "kmhd.eu" in url:
                data = parse_kmhd_svelte(r.text)
                if data and data["name"]:
                    streams = []
                    if data.get("streamtape"):
                        streams.append({"type": "streamtape", "id": data["streamtape"], "url": f"https://streamtape.com/e/{data['streamtape']}"})
                    if data.get("streamwish"):
                        streams.append({"type": "streamwish", "id": data["streamwish"], "url": f"https://streamwish.com/e/{data['streamwish']}"})
                    return {
                        "id": hash(url) % 100000,
                        "title": data["name"],
                        "link": url,
                        "poster": None,
                        "excerpt": f"Streaming - ID: {data['_id']}",
                        "source": "kmhd",
                        "streams": streams,
                    }

                soup = BeautifulSoup(r.text, "lxml")
                og_title = soup.select_one('meta[property="og:title"]')
                if og_title:
                    return {
                        "id": hash(url) % 100000,
                        "title": og_title["content"],
                        "link": url,
                        "poster": soup.select_one('meta[property="og:image"]')["content"] if soup.select_one('meta[property="og:image"]') else None,
                        "excerpt": "Streaming link",
                        "source": "kmhd",
                    }

            # WordPress post - extract metadata + stream links
            soup = BeautifulSoup(r.text, "lxml")
            
            # Better title extraction
            og_title = soup.select_one('meta[property="og:title"]')
            title_el = og_title or soup.select_one("article h1") or soup.select_one(".entry-title") or soup.select_one("h1") or soup.select_one("h2")
            title = title_el["content"] if og_title else (title_el.text.strip() if title_el else "Untitled")
            
            # Better poster extraction: og:image first, then wp-post-image, then article tmdb
            og_image = soup.select_one('meta[property="og:image"]')
            poster_el = og_image or soup.select_one("img.wp-post-image") or soup.select_one("article img[src*='tmdb']") or soup.select_one("div.entry-content img") or soup.select_one("article img") or soup.select_one('img[src*="tmdb"]')
            poster_url = None
            if og_image:
                poster_url = og_image["content"]
            elif poster_el:
                poster_url = poster_el.get("src") or poster_el.get("data-src") or poster_el.get("data-lazy-src")
            
            content_el = soup.select_one(".entry-content") or soup.select_one("article")
            content_text = content_el.text if content_el else ""

            source_key = "unknown"
            for key, base in {**SITES, "kmhd": "https://links.kmhd.eu"}.items():
                if base in url:
                    source_key = key
                    break

            # Extract stream links from content
            stream_links_result = await extract_kmhd_links(client, url)

            # Extract extra metadata from content
            extra = {}

            # Extract short clean description (first sentence, max ~180 chars)
            clean_excerpt = ""
            for label in ["Plot", "Synopsis", "DESCRIPTION"]:
                idx = content_text.lower().find(label.lower() + ":")
                if idx != -1:
                    rest = content_text[idx + len(label) + 1:].strip()
                    # Stop at first period or 180 chars
                    period = rest.find(".")
                    if 30 < period < 200:
                        clean_excerpt = rest[:period + 1].strip()
                    else:
                        clean_excerpt = rest[:180].strip()
                    break

            if not clean_excerpt:
                t = content_text.strip()
                p = t.find(".")
                if 30 < p < 200:
                    clean_excerpt = t[:p + 1].strip()
                else:
                    clean_excerpt = t[:180].strip()

            # Helper: find label-value pairs in text
            # Stop at next known label
            next_label = r"(?=(?:IMDB\s*Rating|IMDb\s*Rating|Director|Directed\s*By|Star\s*Cast|Cast|Stars|Resolution|Genere|Genre|Language)\s*:)"
            labels = {
                "imdb_rating": ["IMDB Rating", "IMDb Rating", "Rating", "IMDB"],
                "director": ["Director", "Directed By", "Directed by"],
                "star_cast": ["Star Cast", "Cast", "Stars", "Starring"],
                "resolution": ["Resolution", "Quality", "Available in"],
                "genre": ["Genere", "Genre", "Genres"],
                "language": ["Language"],
            }

            for key, aliases in labels.items():
                for label in aliases:
                    pattern = rf"{re.escape(label)}\s*:?\s*(.*?)(?:{next_label}|\n|\Z)"
                    m = re.search(pattern, content_text, re.IGNORECASE | re.DOTALL)
                    if m:
                        val = m.group(1).strip().rstrip(".")
                        val = re.sub(r"<[^>]+>", "", val)
                        extra[key] = val
                        break

            # Also try looking in the full HTML for labels across divs/spans
            if not extra.get("imdb_rating"):
                imdb_el = soup.select_one('span.imdb-rating, .imdb, [class*="imdb"]')
                if imdb_el:
                    extra["imdb_rating"] = imdb_el.text.strip()

            result = {
                "id": hash(url) % 100000,
                "title": title,
                "link": url,
                "poster": poster_url,
                "excerpt": clean_excerpt,
                "source": source_key,
                "stream_links": stream_links_result.get("play_links", []) + stream_links_result.get("file_links", []),
                "stream_data": stream_links_result.get("stream_data", {}),
                "extra": extra,
            }

            return result

    except Exception as e:
        return {"error": str(e)}

@router.get("/stream-links")
async def get_stream_links(url: str = Query(..., description="Post URL to extract stream links from")):
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{url}?__embed", timeout=15)
        soup = BeautifulSoup(r.text, "lxml")
        content = soup.select_one(".entry-content") or soup.select_one("article")
        
        links = []
        if content:
            for a_tag in content.find_all("a", href=True):
                href = a_tag["href"]
                if any(x in href for x in ["kmhd.eu", "streamwish", "streamtape", "gdflix", "hubcloud", "send.cm", "fuckingfast"]):
                    links.append({
                        "url": href,
                        "text": a_tag.text.strip()[:60] or "Stream",
                    })
        
        # Also search raw HTML for kmhd.eu/play?id= links
        for match in re.finditer(r'https?://links\.kmhd\.eu/play\?id=[a-zA-Z0-9]+', r.text):
            if match.group(0) not in [l["url"] for l in links]:
                links.append({
                    "url": match.group(0),
                    "text": "Play",
                })
        
        return {"links": links, "total": len(links)}
    except Exception as e:
        return {"error": str(e), "links": []}

@router.get("/streamtape/transfer")
async def transfer_streamtape(file_id: str = Query(...), folder_id: str = Query(default="", description="Optional folder ID to upload into")):
    """Remote upload a streamtape file to own account using embed URL"""
    embed_url = f"https://streamtape.com/e/{file_id}"
    
    dl = await get_direct_url(file_id)
    direct_url = dl["url"] if dl["success"] else None
    file_name = dl.get("name") if dl["success"] else None
    
    if file_name:
        existing = await find_existing_file(file_name, folder_id or "SLfavRyyDXI")
        if existing:
            return {
                "success": True,
                "message": "Already exists in your account",
                "embed_url": embed_url,
                "direct_url": direct_url,
                "file_name": file_name,
                "file_size": dl.get("size") if dl["success"] else None,
                "upload_result": {"id": existing["linkid"], "linkid": existing["linkid"], "link": existing["link"], "folderid": folder_id or "SLfavRyyDXI"},
            }
    
    upload = await remote_upload(embed_url, folder_id)
    
    return {
        "success": upload["success"],
        "message": upload.get("message", "Upload started"),
        "embed_url": embed_url,
        "direct_url": direct_url,
        "file_name": file_name,
        "file_size": dl.get("size") if dl["success"] else None,
        "upload_result": upload.get("result"),
    }

@router.get("/streamtape/create-folder")
async def create_streamtape_folder(name: str = Query(..., description="Folder name")):
    """Create a folder in Streamtape account"""
    clean_name = re.sub(r'[\\/:*?"<>|]', '', name)[:50].strip()
    folder = await create_folder(clean_name)
    return folder

@router.post("/streamtape/transfer-episodes")
async def transfer_episodes(data: dict):
    """Create a folder and upload all episodes of a TV show to it"""
    title = data.get("title", "TV Show")
    episodes = data.get("episodes", [])
    folder_name = re.sub(r'[\\/:*?"<>|]', '', title)[:50].strip()
    
    # Create folder
    folder = await create_folder(folder_name)
    if not folder.get("success"):
        return {"success": False, "message": folder.get("message", "Failed to create folder")}
    folder_id = folder["folder_id"]
    
    results = []
    for ep in episodes:
        for st in (ep.get("streams") or []):
            if st.get("type", "").lower() == "streamtape":
                file_id = st.get("id")
                if file_id:
                    embed_url = f"https://streamtape.com/e/{file_id}"
                    dl = await get_direct_url(file_id)
                    file_name = dl.get("name") if dl.get("success") else None
                    existing = await find_existing_file(file_name, folder_id) if file_name else None
                    if existing:
                        results.append({"episode": ep.get("title"), "status": "exists", "linkid": existing["linkid"], "file_name": file_name})
                    else:
                        upload = await remote_upload(embed_url, folder_id)
                        results.append({"episode": ep.get("title"), "status": "uploaded" if upload["success"] else "failed", "message": upload.get("message", ""), "result": upload.get("result"), "file_name": file_name})
    
    return {"success": True, "folder_id": folder_id, "folder_name": folder_name, "results": results}

@router.get("/streamtape/status")
async def streamtape_upload_status():
    """Check Streamtape remote upload status and return completed transfers"""
    uploads = await check_uploads()
    completed = []
    in_progress = []
    for u in uploads:
        if u.get("status") == "finished":
            completed.append({
                "id": u.get("id"),
                "file_id": u.get("extid"),
                "file_name": u.get("file_name", u.get("name", "")),
                "size": u.get("size"),
                "url": u.get("url") or f"https://streamtape.com/e/{u.get('extid')}",
                "remoteurl": u.get("remoteurl"),
            })
        else:
            in_progress.append({
                "id": u.get("id"),
                "status": u.get("status"),
                "progress": u.get("progress"),
                "file_name": u.get("file_name", u.get("name", "")),
            })
    return {"completed": completed, "in_progress": in_progress}

@router.get("/fetch-episodes")
async def fetch_episodes(url: str = Query(..., description="TV show post URL to get all episodes")):
    """For a TV show post, find all episode links and extract stream data for each"""
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, timeout=15)
            soup = BeautifulSoup(r.text, "lxml")
            content = soup.select_one(".entry-content") or soup.select_one("article") or soup
            
            # Collect ALL internal links from the page
            site_domains = list(SITES.values())
            all_links = []
            for a_tag in soup.find_all("a", href=True):
                href = a_tag["href"].split("?")[0].split("#")[0].rstrip("/")
                atext = a_tag.text.strip().lower()
                # Check if internal link
                is_internal = any(domain in href for domain in site_domains)
                if not is_internal:
                    continue
                # Skip the current URL and non-post links
                if href == url.rstrip("/") or href in [l["url"] for l in all_links]:
                    continue
                # Broader episode detection: text or URL contains season/episode indicators
                ep_keywords = ["episode", "season", "s01", "s02", "s1", "s2", "part", "ep ", "ep-", "ep_", "e01", "e02", "e1", "e2",
                              "e03", "e04", "e05", "e06", "e07", "e08", "e09", "e10", "e11", "e12", "e13", "e14", "e15"]
                is_ep = any(kw in atext for kw in ep_keywords)
                is_ep = is_ep or any(kw in href.lower() for kw in ep_keywords)
                # Also detect if link has a numeric pattern like /1234-episode-name or /episode-1234
                is_ep = is_ep or bool(re.search(r'/(?:ep|episode|season|part)[-\s_]?\d+', href, re.I))
                is_ep = is_ep or bool(re.search(r'/\d{4}/\d{2}/\d{2}/', href))  # WordPress date-based permalink
                all_links.append({"url": href, "text": a_tag.text.strip()[:100], "is_ep": is_ep})
            
            # Separate episode links from other links
            episode_links = [l for l in all_links if l["is_ep"]]
            
            # If still too few, try WordPress REST API to find posts from same category
            if len(episode_links) < 2:
                cat_links = [l["url"] for l in all_links if "category" in l["url"].lower()]
                for cat_url in cat_links[:3]:
                    try:
                        # Try WP REST API for posts in this category
                        api_url = cat_url.replace("/category/", "/wp-json/wp/v2/posts?categories=")
                        cat_id_match = re.search(r'/category/(?:[^/]+/)?(\d+)', cat_url)
                        if not cat_id_match:
                            cat_id_match = re.search(r'category_id[=/](\d+)', cat_url)
                        if cat_id_match:
                            api_url = cat_url.split("/category/")[0] + f"/wp-json/wp/v2/posts?categories={cat_id_match.group(1)}&per_page=20"
                            cr = await client.get(api_url, timeout=10)
                            cdata = cr.json()
                            if isinstance(cdata, list):
                                for cp in cdata:
                                    plink = cp.get("link", "").rstrip("/")
                                    if plink and plink != url.rstrip("/") and plink not in [l["url"] for l in episode_links]:
                                        pt = cp.get("title", {}).get("rendered", "")[:100]
                                        episode_links.append({"url": plink, "text": pt, "is_ep": True})
                    except:
                        pass
            
            # Limit to max 25 episodes
            episode_links = episode_links[:25]
            
            # Also collect direct streamtape IDs from the main page content
            direct_st_ids = list(set(re.findall(r'streamtape\.com/e/([a-zA-Z0-9]+)', r.text)))
            
            # Check if the main page has a kmhd play link with multiple episode streamtape IDs
            main_streams = await extract_kmhd_links(client, url)
            main_episodes = []
            for sd_key, sd in main_streams.get("stream_data", {}).items():
                if isinstance(sd, dict) and sd.get("_episode") and sd.get("streamtape"):
                    ep_name = sd.get("name", f"Episode {len(main_episodes) + 1}")
                    ep_clean = re.sub(r'\.mkv$|\.mp4$', '', ep_name)
                    ep_num = ""
                    ep_num_m = re.search(r'S\d+E(\d+)', ep_clean, re.I)
                    if ep_num_m:
                        ep_num = ep_num_m.group(1)
                    elif re.search(r'[Ee](\d+)', ep_clean):
                        ep_num = re.search(r'[Ee](\d+)', ep_clean).group(1)
                    title = f"Episode {ep_num}" if ep_num else ep_clean
                    main_episodes.append({
                        "title": title,
                        "streams": [{"type": "streamtape", "id": sd["streamtape"], "url": f"https://streamtape.com/e/{sd['streamtape']}"}],
                        "url": url,
                    })
            
            episodes = []
            if len(main_episodes) > 1:
                return {"episodes": main_episodes, "total": len(main_episodes)}
            
            # If we have direct streamtape IDs but no episode links, create episodes from them
            if len(direct_st_ids) > 0 and len(episode_links) == 0:
                for idx, st_id in enumerate(direct_st_ids):
                    episodes.append({
                        "title": f"Stream {idx + 1}",
                        "streams": [{"type": "streamtape", "id": st_id, "url": f"https://streamtape.com/e/{st_id}"}],
                        "url": url,
                    })
                return {"episodes": episodes, "total": len(episodes)}
            
            # Fetch stream data for each episode
            for ep in episode_links:
                try:
                    stream_result = await extract_kmhd_links(client, ep["url"])
                    ep_streams = []
                    for sd in stream_result.get("stream_data", {}).values():
                        if isinstance(sd, dict):
                            if sd.get("streamtape"):
                                ep_streams.append({"type": "streamtape", "id": sd["streamtape"], "url": f"https://streamtape.com/e/{sd['streamtape']}"})
                            if sd.get("_1xbet"):
                                ep_streams.append({"type": "1xBet", "url": sd["_1xbet"]})
                            if sd.get("_4rabet"):
                                ep_streams.append({"type": "4raBet", "url": sd["_4rabet"]})
                    if ep_streams:
                        try:
                            epr = await client.get(ep["url"], timeout=8)
                            epsoup = BeautifulSoup(epr.text, "lxml")
                            og_t = epsoup.select_one('meta[property="og:title"]')
                            ep_title = og_t["content"] if og_t else ep["text"]
                        except:
                            ep_title = ep["text"]
                        episodes.append({"title": ep_title, "streams": ep_streams, "url": ep["url"]})
                except:
                    continue
            
            # If still no episodes found via links, try extracting multiple streamtape IDs directly
            if len(episodes) == 0 and len(direct_st_ids) > 1:
                for idx, st_id in enumerate(direct_st_ids):
                    episodes.append({
                        "title": f"Stream {idx + 1}",
                        "streams": [{"type": "streamtape", "id": st_id, "url": f"https://streamtape.com/e/{st_id}"}],
                        "url": url,
                    })
            
            return {"episodes": episodes, "total": len(episodes)}
    except Exception as e:
        return {"error": str(e), "episodes": []}

@router.post("/rewrite")
async def rewrite_meta(data: dict):
    """Clean movie title and description using DeepSeek V4 Flash Free + regex fallback"""
    import html
    raw_title = data.get("title", "")
    raw_excerpt = data.get("excerpt", "")
    title = html.unescape(raw_title)
    excerpt = html.unescape(raw_excerpt)
    excerpt_plain = re.sub(r'<[^>]+>', '', excerpt)
    excerpt_plain = html.unescape(excerpt_plain)

    zen_key = os.getenv("ZEN_API_KEY")
    zen_url = os.getenv("ZEN_API_URL", "https://opencode.ai/zen/v1/chat/completions")

    if zen_key:
        try:
            safe_excerpt = excerpt_plain[:600].replace('"', "'").replace("\n", " ")
            prompt = (
                'Clean movie metadata. Return ONLY JSON: {"title":"...","excerpt":"..."}\n\n'
                "TITLE: " + title + "\n"
                "EXCERPT: " + safe_excerpt + "\n"
                '{"title":"'
            )
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post(zen_url, json={
                    "model": "deepseek-v4-flash-free",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 2000,
                }, headers={
                    "Authorization": f"Bearer {zen_key}",
                    "Content-Type": "application/json",
                })
                r.raise_for_status()
                result = r.json()
                msg = result["choices"][0]["message"]
                content = (msg.get("content") or msg.get("reasoning_content") or "").strip()
                import json as jsonmod
                json_match = re.search(r'\{"title":\s*"[^"]*?"\s*,\s*"excerpt":\s*"[^"]*?"\s*\}', content)
                if json_match:
                    parsed = jsonmod.loads(json_match.group())
                    return {
                        "title": parsed.get("title", title),
                        "excerpt": parsed.get("excerpt", excerpt_plain[:300]),
                    }
        except Exception as e:
            print(f"Zen rewrite error (falling back to regex): {e}")

    # ---- regex fallback ----
    # Title cleaning
    t = title
    year_match = re.search(r'(\d{4})', title)
    year_str = f"({year_match.group(1)})" if year_match else ""
    t = re.sub(r'\s*\[[^\]]*\]', ' ', t)
    if year_str:
        t = t.replace(year_str, "___YEAR___")
    t = re.sub(r'\s*\([^)]*\)', ' ', t)
    if year_str:
        t = t.replace("___YEAR___", year_str)
    t = re.sub(r'(?i)\s*[-–|].*$', '', t)
    t = re.sub(r'(?i)\b(CAMRip|HDTV|WEB-?DL|WEB-?Rip|BluRay|BRRip|DVD-?Rip|HDRip|480p|720p|1080p|2160p|4K|HEVC|x264|x265|AC3|DD5[.]1|AAC|5[.]1)\s*', '', t)
    t = re.sub(r'(?i)\b(HD)\s+', '', t)
    t = re.sub(r'(?i)(full movie|watch online|stream online|free download|download now|online free|movie download|movie name|download free|free streaming)', '', t)
    t = re.sub(r'(?i)\s*(in\s+hindi|in\s+english|in\s+tamil|in\s+telugu|in\s+malayalam|in\s+kannada|in\s+bengali|dubbed|subtitles?)\s*', ' ', t)
    t = re.sub(r'(?i)\s*(katmoviehd|katmovie18|moviesbaba|katdrama|pikahd|1xbet|4rabet)\s*', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    if year_str and year_str not in t:
        t = t + " " + year_str if t else year_str
    title_clean = t.strip()

    # Excerpt cleaning
    sentences = re.split(r'(?<=[.!?])\s+', excerpt_plain)
    clean_sentences = []
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        if re.search(r'(?i)(download|watch online|stream online|free|katmovie|moviesbaba|1xbet|4rabet|camrip|480p|720p|1080p|full movie|movie name:|imdb rating:|star cast:|resolution:|read also|you may also|more *on *|related *post)', s):
            continue
        s = re.sub(r'<[^>]+>', '', s)
        s = html.unescape(s)
        s = re.sub(r'\s+', ' ', s).strip()
        if len(s) > 20:
            clean_sentences.append(s)
    excerpt_clean = clean_sentences[0][:300] if clean_sentences else ""
    if not excerpt_clean or len(excerpt_clean) < 15:
        excerpt_clean = re.sub(r'<[^>]+>', '', excerpt_plain)
        excerpt_clean = html.unescape(excerpt_clean)
        dir_m = re.search(r'(?i)director\s*:\s*([A-Za-z\s.]+?)(?=\s+Cast)', excerpt_plain)
        if not dir_m:
            dir_m = re.search(r'(?i)director\s*:\s*([A-Za-z\s.]+?)(?=Star\s*Cast|Resolution|$)', excerpt_plain)
        cast_m = re.search(r'(?i)Cast\s*:\s*([A-Za-z\s.,\x27-]+?)(?=\s*Resolution|\.|$)', excerpt_plain)
        parts = []
        if dir_m:
            d = dir_m.group(1).strip()
            d = re.sub(r'(?i)([a-z])Star$', r'\1 Star', d)
            parts.append(f"Directed by {d}")
        if cast_m:
            parts.append(f"Starring {cast_m.group(1).strip()}")
        if parts:
            excerpt_clean = ". ".join(parts)
        else:
            excerpt_clean = f"Watch {title_clean} online. " + (excerpt_plain[:100] if excerpt_plain else "")
        if len(excerpt_clean) > 250:
            excerpt_clean = excerpt_clean[:247] + "..."

    return {"title": title_clean or title, "excerpt": excerpt_clean or excerpt_plain[:200]}

@router.get("/streamtape/play")
async def streamtape_play(file_id: str = Query(...)):
    """Redirect to direct Streamtape video URL for playback"""
    dl = await get_direct_url(file_id)
    if dl["success"] and dl.get("url"):
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=dl["url"])
    from fastapi.responses import JSONResponse
    return JSONResponse({"error": "Failed to get direct URL", "detail": dl.get("message", "Unknown")}, status_code=502)

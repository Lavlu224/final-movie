import httpx
import asyncio

ST_USER = "2693ff8f2d1eb3b074a4"
ST_PASS = "D0e8GPpDBZtkjg8"
API_BASE = "https://api.streamtape.com"

async def get_direct_url(file_id: str) -> dict:
    """Get direct download URL from a streamtape file ID"""
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{API_BASE}/file/dlticket", params={"file": file_id, "login": ST_USER, "key": ST_PASS}, timeout=15)
            d = r.json()
            if d.get("status") != 200:
                return {"success": False, "message": d.get("msg", "Failed"), "url": None}

            ticket = d["result"]["ticket"]
            await asyncio.sleep(5)

            r2 = await client.get(f"{API_BASE}/file/dl", params={"file": file_id, "ticket": ticket}, timeout=30)
            d2 = r2.json()
            if d2.get("status") != 200:
                return {"success": False, "message": d2.get("msg", "Failed"), "url": None}

            return {
                "success": True,
                "url": d2["result"]["url"],
                "name": d2["result"].get("name", ""),
                "size": d2["result"].get("size", 0),
            }
    except Exception as e:
        return {"success": False, "message": str(e), "url": None}

async def remote_upload(direct_url: str, folder_id: str = "") -> dict:
    """Remote upload a URL to own Streamtape account, optionally to a specific folder"""
    try:
        params = {"url": direct_url, "login": ST_USER, "key": ST_PASS}
        if folder_id:
            params["folder"] = folder_id
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{API_BASE}/remotedl/add", params=params, timeout=120)
            d = r.json()
            if d.get("status") == 200 and d.get("result"):
                return {"success": True, "result": d["result"]}
            return {"success": False, "message": d.get("msg", "Upload failed"), "api_response": d}
    except Exception as e:
        return {"success": False, "message": str(e)}

async def check_uploads() -> list:
    """Check status of all remote uploads"""
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{API_BASE}/remotedl/status", params={"login": ST_USER, "key": ST_PASS}, timeout=15)
            d = r.json()
            result = d.get("result", [])
            if isinstance(result, dict):
                return list(result.values())
            if isinstance(result, list):
                return result
            return []
    except:
        return []

async def create_folder(name: str) -> dict:
    """Create a new folder in Streamtape account"""
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{API_BASE}/file/createfolder", params={"name": name, "login": ST_USER, "key": ST_PASS}, timeout=15)
            d = r.json()
            if d.get("status") == 200 and d.get("result"):
                return {"success": True, "folder_id": d["result"].get("folderid"), "name": d["result"].get("name", name)}
            return {"success": False, "message": d.get("msg", "Folder creation failed")}
    except Exception as e:
        return {"success": False, "message": str(e)}

async def list_folders() -> list:
    """List all folders in Streamtape account"""
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{API_BASE}/file/listfolder", params={"login": ST_USER, "key": ST_PASS}, timeout=15)
            d = r.json()
            if d.get("status") == 200 and d.get("result"):
                return d["result"].get("folders", [])
            return []
    except:
        return []

async def find_existing_file(file_name: str, folder_id: str = "SLfavRyyDXI") -> dict | None:
    """Check if a file with the same name already exists in the account"""
    try:
        r = await httpx.AsyncClient().get(f"{API_BASE}/file/listfolder", params={"login": ST_USER, "key": ST_PASS, "folder": folder_id}, timeout=15)
        d = r.json()
        if d.get("status") != 200:
            return None
        files = d.get("result", {}).get("files", [])
        for f in files:
            if f.get("name") == file_name:
                return {
                    "name": f["name"],
                    "linkid": f["linkid"],
                    "link": f["link"],
                    "size": f.get("size"),
                }
        return None
    except:
        return None

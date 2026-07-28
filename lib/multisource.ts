const BACKEND_URL = 'http://localhost:8000/multisource';

export async function searchAllSites(query: string) {
  const res = await fetch(`${BACKEND_URL}/search?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function getSiteLatest(siteKey: string) {
  const res = await fetch(`${BACKEND_URL}/latest/${siteKey}`);
  return res.json();
}

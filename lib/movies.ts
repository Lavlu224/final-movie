const API = 'http://localhost:8000/api';

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

export async function createMovie(data: {
  title: string;
  excerpt?: string;
  poster?: string;
  source?: string;
  source_url?: string;
  year?: number | null;
  stream_links?: { provider: string; url: string; file_id?: string }[];
}) {
  const res = await fetch(`${API}/movies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listMovies(skip = 0, limit = 50) {
  const res = await fetch(`${API}/movies?skip=${skip}&limit=${limit}`);
  return res.json();
}

export async function getMovie(id: number) {
  const res = await fetch(`${API}/movies/${id}`);
  return res.json();
}

export async function updateMovie(id: number, data: {
  title: string;
  excerpt?: string;
  poster?: string;
  source?: string;
  source_url?: string;
  year?: number | null;
  stream_links?: { provider: string; url: string; file_id?: string }[];
}) {
  const res = await fetch(`${API}/movies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteMovie(id: number) {
  const res = await fetch(`${API}/movies/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function getMovieStats() {
  const res = await fetch(`${API}/movies/stats/summary`);
  return res.json();
}

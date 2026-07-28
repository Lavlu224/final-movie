const API_URL = 'https://new.katmoviehd.top/wp-json/wp/v2';

export interface KatMoviePost {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  featured_media: number;
  link: string;
  date: string;
  _embedded?: {
    "wp:featuredmedia"?: { source_url: string }[];
    "wp:term"?: { name: string }[][];
  };
}

export const getLatestPosts = (page = 1): Promise<{ data: KatMoviePost[] }> =>
  fetch(`${API_URL}/posts?page=${page}&_embed`).then(r => r.json());

export const searchPosts = (query: string): Promise<{ data: KatMoviePost[] }> =>
  fetch(`${API_URL}/posts?search=${query}&_embed`).then(r => r.json());

export const getPost = (id: number): Promise<KatMoviePost> =>
  fetch(`${API_URL}/posts/${id}?_embed`).then(r => r.json());

export const getCategories = () =>
  fetch(`${API_URL}/categories`).then(r => r.json());

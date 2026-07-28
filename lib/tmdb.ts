const BACKEND_URL = 'http://localhost:8000';

export const getTrending = () => fetch(`${BACKEND_URL}/trending`).then(r => r.json());
export const getPopularTV = () => fetch(`${BACKEND_URL}/tv/popular`).then(r => r.json());
export const getMovieDetails = (id: number) => fetch(`${BACKEND_URL}/movie/${id}`).then(r => r.json());
export const searchMovies = (query: string) => fetch(`${BACKEND_URL}/search?q=${query}`).then(r => r.json());

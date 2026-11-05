import axios from 'axios';

export const BACKEND_URL = (
    import.meta.env.VITE_BACKEND_URL || 'http://localhost:5030'
).replace(/\/+$/, '');

const API = axios.create({
    baseURL: `${BACKEND_URL}/api`,
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default API;
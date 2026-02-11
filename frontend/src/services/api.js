import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('cosmic_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('cosmic_token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (username, email, password) => api.post('/auth/register', { username, email, password }),
    getProfile: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/updateprofile', data),
    changePassword: (currentPassword, newPassword) =>
        api.put('/auth/changepassword', { currentPassword, newPassword })
};

// NEO API
export const neoApi = {
    getFeed: (params) => api.get('/neo/feed', { params }),
    getAsteroid: (id) => api.get(`/neo/lookup/${id}`),
    getHazardous: (limit) => api.get('/neo/hazardous', { params: { limit } }),
    getUpcoming: () => api.get('/neo/upcoming'),
    getStats: () => api.get('/neo/stats'),
    getRiskAnalysis: (id) => api.get(`/neo/risk-analysis/${id}`)
};

// User API
export const userApi = {
    getProfile: () => api.get('/user/profile'),
    updatePreferences: (preferences) => api.put('/user/preferences', preferences),
    getWatchlist: () => api.get('/user/watchlist'),
    addToWatchlist: (asteroidId, notes) => api.post(`/user/watchlist/${asteroidId}`, { notes }),
    removeFromWatchlist: (asteroidId) => api.delete(`/user/watchlist/${asteroidId}`),
    updateWatchlistNotes: (asteroidId, notes) =>
        api.put(`/user/watchlist/${asteroidId}/notes`, { notes })
};

export default api;

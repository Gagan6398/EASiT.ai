import type { User, Conversation } from '../types.ts';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal ? 'http://localhost:8000/api' : `${window.location.protocol}//${window.location.host}/api`;

const getAuthToken = (): string | null => {
    try {
        const item = localStorage.getItem('easit-jwt');
        return item ? JSON.parse(item) : null;
    } catch (e) {
        return null;
    }
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData && errorData.detail) {
                errorMessage = errorData.detail;
            } else if (errorData && errorData.message) {
                 errorMessage = errorData.message;
            }
        } catch (e) {}
        throw new Error(errorMessage);
    }
    return response.json();
};

/**
 * Wrapper around fetch that handles backend-unavailable gracefully.
 * For auth endpoints: throws the error (no more silent guest fallback).
 * For conversations: returns empty/offline data when backend is down.
 */
const safeFetch = async (url: string, options: RequestInit) => {
    try {
        const response = await fetch(url, options);
        return await handleResponse(response);
    } catch (error: any) {
        // Auth endpoints: propagate the error so callers can handle it
        // (e.g., AuthPage falls back to client-side JWT decode)
        if (url.includes('/auth/login') || url.includes('/auth/signup')) {
            throw new Error(error.message || 'Cannot connect to server. Please try again.');
        }

        // Google auth: return a marker so the caller knows to fall back
        if (url.includes('/auth/google')) {
            return {
                token: 'client-side-google-token',
                user: {
                    name: 'Google User',
                    email: 'guest@solveearn.com',
                    picture: undefined
                }
            };
        }

        // Conversations: return offline data
        if (url.includes('/conversations')) {
            return [
                 {
                     id: 'offline-conv-1',
                     title: 'Welcome (Offline Mode)',
                     messages: [
                         {
                             id: 'msg-1',
                             role: 'model',
                             text: 'The backend server is unreachable. You are currently in offline mode.\n\nYou can still chat with me using the Gemini API directly!',
                             timestamp: new Date().toISOString()
                         }
                     ],
                     createdAt: new Date().toISOString()
                 }
            ];
        }
        throw new Error('Cannot connect to server.');
    }
};

const apiService = {
    async googleAuth(credential: string): Promise<{ token: string; user: User }> {
        return safeFetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
        });
    },
    async login(email: string, password: string): Promise<{ token: string; user: User }> {
        return safeFetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
    },
    async signup(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
        return safeFetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });
    },
    async getConversations(): Promise<Conversation[]> {
        const token = getAuthToken();
        if (!token) return [];
        if (token === 'guest-demo-token') {
             try {
                 const localData = localStorage.getItem('easit-guest-conversations');
                 if (localData) return JSON.parse(localData);
             } catch (e) {}
             return [];
        }
        return safeFetch(`${API_BASE_URL}/conversations`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
    },
};

export default apiService;
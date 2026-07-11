
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Mail, Lock, User, Loader, AlertCircle } from 'lucide-react';
import type { User as AppUser } from '../types';
import apiService from '../services/apiService';

interface AuthPageProps {
  onLoginSuccess: (user: AppUser, token: string) => void;
  onGoBack: () => void;
}

const logoUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMTcwIiBzdHJva2U9InVybCgjZ3JhZDEpIiBzdHJva2Utd2lkdGg9IjEyIi8+CjxjaXJjbGUgY3g9IjI1MCIgY3k9IjE2MCIgcj0iMzUiIGZpbGw9IiM4QjVDRjYiLz4KPGNpcmNsZSBjeD0iMTcwIiBjeT0iMzAwIiByPSIzNSIgZmlsbD0iIzNCODJGNiIvPgo8Y2lyY2xlIGN4PSIzMzAiIGN5PSIzMDAiIHI9IjM1IiBmaWxsPSIjMDBGMEY2Ii8+CjxsaW5lIHgxPSIyNTAiIHkxPSIxNjAiIHgyPSIxNzAiIHkyPSIzMDAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjMiIHN0cm9rZS13aWR0aD0iMyIvPgo8bGluZSB4MT0iMjUwIiB5MT0iMTYwIiB4Mj0iMzMwIiB5Mj0iMzAwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utb3BhY2l0eT0iMC4zIiBzdHJva2Utd2lkdGg9IjMiLz4KPGxpbmUgeDE9IjE3MCIgeTE9IjMwMCIgeDI9IjMzMCIgeTI9IjMwMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIgc3Ryb2tlLXdpZHRoPSIzIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQxIiB4MT0iODAiIHkxPSI4MCIgeDI9IjQyMCIgeTI9IjQyMCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjOEI1Q0Y2Ii8+CjxzdG9wIG9mZnNldD0iMC41IiBzdG9wLWNvbG9yPSIjM0I4MkY2Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwRjBGRiIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPg==';

/**
 * Decode a Google ID token (JWT) client-side to extract user info.
 * This avoids needing a backend to verify the token for static deployments.
 * The JWT payload is the second base64url-encoded segment.
 */
function decodeGoogleJwt(credential: string): AppUser | null {
    try {
        const parts = credential.split('.');
        if (parts.length !== 3) return null;

        // base64url → base64 → decode
        const payload = parts[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const decoded = JSON.parse(atob(payload));

        return {
            name: decoded.name || decoded.given_name || 'Google User',
            email: decoded.email || '',
            picture: decoded.picture || undefined,
        };
    } catch (err) {
        console.error('Failed to decode Google JWT:', err);
        return null;
    }
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, onGoBack }) => {
    const googleButtonRef = useRef<HTMLDivElement>(null);
    
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [googleLoading, setGoogleLoading] = useState(true);
    const [googleError, setGoogleError] = useState(false);

    // Form States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Stable callback ref so Google SDK always uses the latest onLoginSuccess
    const onLoginSuccessRef = useRef(onLoginSuccess);
    onLoginSuccessRef.current = onLoginSuccess;

    const handleCredentialResponse = useCallback(async (response: { credential?: string }) => {
        if (!response.credential) {
            setError('Google Sign-In did not return a credential. Please try again.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // First try: send credential to backend for server-side verification
            const { token, user } = await apiService.googleAuth(response.credential);
            
            // Check if the backend returned real data vs guest fallback
            if (token !== 'client-side-google-token' && user.email !== 'guest@solveearn.com') {
                onLoginSuccessRef.current(user, token);
                return;
            }

            // If we got guest fallback, try client-side decode instead
            throw new Error('Backend returned guest fallback');
        } catch (backendErr) {
            // Fallback: decode the JWT client-side (works without backend)
            const decoded = decodeGoogleJwt(response.credential);
            if (decoded && decoded.email) {
                onLoginSuccessRef.current(decoded, `google-${response.credential.slice(-20)}`);
            } else {
                setError('Could not process Google Sign-In. Please try email login instead.');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initialize Google Sign-In with retry polling
    useEffect(() => {
        const buttonEl = googleButtonRef.current;
        if (!buttonEl) return;

        const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
        if (!GOOGLE_CLIENT_ID) {
            setGoogleLoading(false);
            setGoogleError(true);
            console.warn('Google Client ID not configured');
            return;
        }

        let attempts = 0;
        const MAX_ATTEMPTS = 30; // 30 * 200ms = 6 seconds max wait
        let timerId: ReturnType<typeof setTimeout> | null = null;

        const tryInitialize = () => {
            attempts++;

            if (typeof google !== 'undefined' && google?.accounts?.id) {
                // Google SDK loaded — initialize
                try {
                    google.accounts.id.initialize({
                        client_id: GOOGLE_CLIENT_ID,
                        callback: handleCredentialResponse,
                    });

                    // Clear any previous button content before rendering
                    buttonEl.innerHTML = '';

                    google.accounts.id.renderButton(
                        buttonEl,
                        { 
                            theme: 'filled_black', 
                            size: 'large', 
                            type: 'standard', 
                            text: 'continue_with', 
                            width: '320' 
                        }
                    );

                    setGoogleLoading(false);
                    setGoogleError(false);
                } catch (err) {
                    console.error('Google Sign-In initialization failed:', err);
                    setGoogleLoading(false);
                    setGoogleError(true);
                }
                return;
            }

            // SDK not yet loaded — retry
            if (attempts < MAX_ATTEMPTS) {
                timerId = setTimeout(tryInitialize, 200);
            } else {
                // Give up after max attempts
                console.warn('Google Sign-In SDK failed to load after', MAX_ATTEMPTS, 'attempts');
                setGoogleLoading(false);
                setGoogleError(true);
            }
        };

        tryInitialize();

        return () => {
            if (timerId) clearTimeout(timerId);
        };
    }, [handleCredentialResponse]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (mode === 'signup') {
                const { token, user } = await apiService.signup(name, email, password);
                onLoginSuccess(user, token);
            } else {
                const { token, user } = await apiService.login(email, password);
                onLoginSuccess(user, token);
            }
        } catch (err: any) {
            setError(err.message || "Authentication failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-cream-bg bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))]">
            <div className="relative w-full max-w-md p-8 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200">
                <button 
                    onClick={onGoBack} 
                    className="absolute top-4 left-4 p-2 text-gray-600 hover:text-text-dark transition-colors"
                    aria-label="Go back"
                >
                    <ArrowLeft size={20} />
                </button>
                
                <div className="text-center mb-8">
                    <img src={logoUrl} alt="Easit.ai Logo" className="h-12 w-12 mx-auto mb-4 rounded-full" />
                    <h1 className="text-2xl font-bold text-text-dark tracking-tight">
                        {mode === 'login' ? 'Welcome back' : 'Create an account'}
                    </h1>
                    <p className="text-gray-600 text-sm mt-2">
                        {mode === 'login' ? 'Enter your details to access your account' : 'Start building your voice AI today'}
                    </p>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-white shadow-sm rounded-lg mb-6">
                    <button
                        onClick={() => { setMode('login'); setError(null); }}
                        className={`py-2 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-gold-gradient text-white shadow-lg' : 'text-gray-600 hover:text-text-dark'}`}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => { setMode('signup'); setError(null); }}
                        className={`py-2 text-sm font-medium rounded-md transition-all ${mode === 'signup' ? 'bg-gold-gradient text-white shadow-lg' : 'text-gray-600 hover:text-text-dark'}`}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'signup' && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 ml-1">Full Name</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full bg-white shadow-sm border border-gray-100 rounded-lg py-2.5 pl-10 pr-4 text-text-dark placeholder-gray-500 focus:outline-none focus:border-[#CFA54D] focus:ring-1 focus:ring-brand-blue transition-all"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="w-full bg-white shadow-sm border border-gray-100 rounded-lg py-2.5 pl-10 pr-4 text-text-dark placeholder-gray-500 focus:outline-none focus:border-[#CFA54D] focus:ring-1 focus:ring-brand-blue transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700 ml-1">Password</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-white shadow-sm border border-gray-100 rounded-lg py-2.5 pl-10 pr-4 text-text-dark placeholder-gray-500 focus:outline-none focus:border-[#CFA54D] focus:ring-1 focus:ring-brand-blue transition-all"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading && <Loader size={16} className="animate-spin" />}
                        {mode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-100"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-cream-bg text-gray-500">Or continue with</span>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                    {/* Google button loading state */}
                    {googleLoading && (
                        <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                            <Loader size={16} className="animate-spin" />
                            <span>Loading Google Sign-In...</span>
                        </div>
                    )}

                    {/* Google button error state */}
                    {googleError && !googleLoading && (
                        <div className="text-center text-sm text-gray-500 py-2">
                            <p>Google Sign-In unavailable.</p>
                            <p className="text-xs mt-1">Please use email login above, or check your internet connection.</p>
                        </div>
                    )}

                    {/* Google rendered button container */}
                    <div 
                        ref={googleButtonRef} 
                        className={`overflow-hidden rounded-lg ${googleLoading || googleError ? 'hidden' : ''}`}
                    ></div>
                </div>
            </div>
        </div>
    );
};

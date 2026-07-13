import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage.tsx';
import ChatApp from './ChatApp.tsx';
import DeepResearchApp from './DeepResearchApp.tsx';
import { AuthPage } from './components/AuthPage.tsx';
import { SettingsPage } from './SettingsPage.tsx';
import { AboutPage } from './components/AboutPage.tsx';
import { FeaturesPage } from './components/FeaturesPage.tsx';
import { PricingPage } from './components/PricingPage.tsx';
import { LegalPage } from './components/LegalPage.tsx';
import { useTheme } from './hooks/useTheme.ts';
import { useLocalStorage } from './hooks/useLocalStorage.ts';
import type { User } from './types.ts';
import { websocketService } from './services/websocketService.ts';
import { supabase } from './services/supabaseClient.ts';

const App: React.FC = () => {
    const [user, setUser] = useLocalStorage<User | null>('easit-user', null);
    const [jwt, setJwt] = useLocalStorage<string | null>('easit-jwt', null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
    const navigate = useNavigate();
    
    useTheme();

    useEffect(() => {
        // Listen to Supabase Auth State Changes (e.g. after Google OAuth redirect)
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                const newUser: User = {
                    name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                    email: session.user.email || '',
                    picture: session.user.user_metadata?.avatar_url
                };
                setUser(newUser);
                setJwt(session.access_token);
                // Don't auto navigate to /chat if we're just refreshing tokens
                if (event === 'SIGNED_IN') {
                    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'easitai-semifinal-main.vercel.app') {
                        window.location.href = 'https://easitai-semifinal-main.vercel.app/chat';
                    } else if (window.location.pathname === '/') {
                        navigate('/chat');
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setJwt(null);
            }
        });
        
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (jwt && jwt !== 'guest-demo-token') {
            websocketService.connect(jwt);
        } else {
            websocketService.disconnect();
        }

        return () => {
            websocketService.disconnect();
        };
    }, [jwt]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setJwt(null);
        navigate('/');
    };

    const handleGuestLogin = () => {
        const guestUser: User = {
            name: "Easit Guest",
            email: "guest@solveearn.com",
            picture: undefined
        };
        setUser(guestUser);
        setJwt("guest-demo-token");
        
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'easitai-semifinal-main.vercel.app') {
            window.location.href = 'https://easitai-semifinal-main.vercel.app/chat';
        } else {
            navigate('/chat');
        }
    };

    const handleLoginSuccess = (newUser: User, token: string) => {
        setUser(newUser);
        setJwt(token);
        
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'easitai-semifinal-main.vercel.app') {
            window.location.href = 'https://easitai-semifinal-main.vercel.app/chat';
        } else {
            navigate('/chat');
        }
    };

    return (
        <Routes>
            <Route 
                path="/" 
                element={
                    user ? <Navigate to="/chat" replace /> : (
                        <>
                            <LandingPage 
                                onOpenLogin={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }} 
                                onOpenSignup={() => { setAuthModalMode('signup'); setIsAuthModalOpen(true); }} 
                                onEnterAsGuest={handleGuestLogin} 
                            />
                            {isAuthModalOpen && (
                                <AuthPage 
                                    initialMode={authModalMode}
                                    onLoginSuccess={(u, t) => { setIsAuthModalOpen(false); handleLoginSuccess(u, t); }} 
                                    onGoBack={() => setIsAuthModalOpen(false)} 
                                />
                            )}
                        </>
                    )
                } 
            />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route 
                path="/auth" 
                element={
                    user ? <Navigate to="/chat" replace /> : <AuthPage onLoginSuccess={handleLoginSuccess} onGoBack={() => navigate('/')} />
                } 
            />
            <Route 
                path="/chat" 
                element={
                    user ? <ChatApp user={user} onSignOut={handleSignOut} /> : <Navigate to="/" replace />
                } 
            />
            <Route 
                path="/research" 
                element={
                    user ? <DeepResearchApp user={user} onSignOut={handleSignOut} /> : <Navigate to="/" replace />
                } 
            />
            <Route 
                path="/settings" 
                element={
                    user ? <SettingsPage user={user} onSignOut={handleSignOut} /> : <Navigate to="/" replace />
                } 
            />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};

const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-cream-bg flex flex-col items-center justify-center text-center p-6 font-sans">
            <h1 className="text-7xl font-bold text-[#CFA54D] mb-4">404</h1>
            <p className="text-xl text-text-dark mb-2 font-semibold">Page not found</p>
            <p className="text-gray-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
            <button 
                onClick={() => navigate('/')}
                className="bg-gold-gradient text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
                Go Home
            </button>
        </div>
    );
};

export default App;
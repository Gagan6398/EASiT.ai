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

const App: React.FC = () => {
    const [user, setUser] = useLocalStorage<User | null>('easit-user', null);
    const [jwt, setJwt] = useLocalStorage<string | null>('easit-jwt', null);
    const navigate = useNavigate();
    
    useTheme();

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

    const handleSignOut = () => {
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
        navigate('/chat');
    };

    const handleLoginSuccess = (newUser: User, token: string) => {
        setUser(newUser);
        setJwt(token);
        navigate('/chat');
    };

    return (
        <Routes>
            <Route 
                path="/" 
                element={
                    user ? <Navigate to="/chat" replace /> : <LandingPage onGetStarted={() => navigate('/auth')} onEnterAsGuest={handleGuestLogin} />
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
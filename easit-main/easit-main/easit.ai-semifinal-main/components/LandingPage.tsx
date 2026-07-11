import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Settings, Search } from 'lucide-react';
import { FooterAssistant } from './FooterAssistant.tsx';

interface LandingPageProps {
  onGetStarted: () => void;
  onEnterAsGuest: () => void;
}

const logoUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMTcwIiBzdHJva2U9InVybCgjZ3JhZDEpIiBzdHJva2Utd2lkdGg9IjEyIi8+CjxjaXJjbGUgY3g9IjI1MCIgY3k9IjE2MCIgcj0iMzUiIGZpbGw9IiNENEFGMzciLz4KPGNpcmNsZSBjeD0iMTcwIiBjeT0iMzAwIiByPSIzNSIgZmlsbD0iI0YzRTVBQiIvPgo8Y2lyY2xlIGN4PSIzMzAiIGN5PSIzMDAiIHI9IjM1IiBmaWxsPSIjQjg4NjBCIi8+CjxsaW5lIHgxPSIyNTAiIHkxPSIxNjAiIHgyPSIxNzAiIHkyPSIzMDAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjMiIHN0cm9rZS13aWR0aD0iMyIvPgo8bGluZSB4MT0iMjUwIiB5MT0iMTYwIiB4Mj0iMzMwIiB5Mj0iMzAwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utb3BhY2l0eT0iMC4zIiBzdHJva2Utd2lkdGg9IjMiLz4KPGxpbmUgeDE9IjE3MCIgeTE9IjMwMCIgeDI9IjMzMCIgeTI9IjMwMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIgc3Ryb2tlLXdpZHRoPSIzIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQxIiB4MT0iODAiIHkxPSI4MCIgeDI9IjQyMCIgeTI9IjQyMCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjRDRBRjM3Ii8+CjxzdG9wIG9mZnNldD0iMC41IiBzdG9wLWNvbG9yPSIjRjNFNUFCIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0I4ODYwQiIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPg==';

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onEnterAsGuest }) => {
    return (
        <div className="bg-cream-bg min-h-screen text-text-dark font-sans selection:bg-[#D4AF37] selection:text-white flex flex-col items-center">
            {/* Minimalist Header */}
            <header className="w-full max-w-5xl mx-auto px-6 py-8 flex justify-between items-center z-50 animate-slide-up-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <img src={logoUrl} alt="Easit.ai Logo" className="w-8 h-8 opacity-80" />
                    <span className="text-2xl font-serif font-bold text-text-dark tracking-tight">Easit</span>
                </div>
                <button onClick={onGetStarted} className="text-lg font-semibold font-serif text-text-dark hover:text-opacity-70 transition-opacity">
                    Sign In
                </button>
            </header>

            <main className="flex-1 w-full max-w-4xl mx-auto px-6 flex flex-col items-center justify-center pt-16 pb-32 animate-slide-up-fade-in text-center" style={{ animationDelay: '0.2s' }}>
                {/* Hero */}
                <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight text-text-dark leading-[1.1] mb-6">
                    AI without the<br />guesswork.
                </h1>
                
                <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed mb-10">
                    Easit delivers accurate, verifiable answers by grounding every response in real-time, trusted sources. Experience the future of trustworthy AI.
                </p>

                {/* CTA Button */}
                <button 
                    onClick={onGetStarted}
                    className="relative overflow-hidden group bg-gold-gradient text-white font-medium text-lg px-16 py-4 rounded-md shadow-md hover:shadow-lg transition-all duration-300 w-full max-w-xs mb-24"
                >
                    <span className="relative z-10 font-serif">Try Easit Free</span>
                    <div className="absolute inset-0 -translate-x-full bg-white/30 group-hover:animate-shimmer skew-x-12" />
                </button>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                    <FeatureCard 
                        icon={<Shield size={32} strokeWidth={1.5} className="text-[#CFA54D] group-hover:animate-pulse-glow" />} 
                        title="Verified Sources"
                    >
                        Answers cited from credible publishers.
                    </FeatureCard>
                    <FeatureCard 
                        icon={<Settings size={32} strokeWidth={1.5} className="text-[#CFA54D] group-hover:animate-pulse-glow" />} 
                        title="Real-time Logic"
                    >
                        Processes data on the fly for precision.
                    </FeatureCard>
                    <FeatureCard 
                        icon={<Search size={32} strokeWidth={1.5} className="text-[#CFA54D] group-hover:animate-pulse-glow" />} 
                        title="Zero Hallucination"
                    >
                        Engineered to prevent made-up information.
                    </FeatureCard>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full text-center pb-12 animate-slide-up-fade-in" style={{ animationDelay: '0.3s' }}>
                <nav className="flex justify-center gap-6 md:gap-10 mb-6 font-serif">
                    <FooterLink to="/about">About</FooterLink>
                    <FooterLink to="/features">Features</FooterLink>
                    <FooterLink to="/pricing">Pricing</FooterLink>
                    <FooterLink to="/legal">Contact</FooterLink>
                </nav>
                <div className="text-sm text-gray-500 font-sans">
                    &copy; 2025 Easit AI. All rights reserved.
                </div>
            </footer>

            <FooterAssistant />
        </div>
    );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-white py-10 px-6 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] group">
        <div className="mb-6 p-4 rounded-full border border-gray-100">
            {icon}
        </div>
        <h3 className="text-lg font-bold font-serif text-text-dark mb-3 leading-snug">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed font-sans max-w-[180px]">
            {children}
        </p>
    </div>
);

const FooterLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
    <Link 
        to={to} 
        className="text-text-dark font-medium relative py-1 overflow-hidden group"
    >
        {children}
        <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#CFA54D] -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
    </Link>
);

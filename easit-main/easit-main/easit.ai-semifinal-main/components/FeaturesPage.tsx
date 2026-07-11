import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Search, Zap, Mic, Lock, Code } from 'lucide-react';
import { FooterAssistant } from './FooterAssistant.tsx';

export const FeaturesPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => { document.title = 'Features — Easit.ai | Hallucination-Free AI'; }, []);

    return (
        <div className="bg-cream-bg text-text-dark font-sans min-h-screen flex flex-col">
            <header className="border-b border-gray-100 py-5 bg-cream-bg/90 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 flex items-center">
                    <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-text-dark transition flex items-center gap-2">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="ml-8 text-xl font-bold tracking-tight text-text-dark">Easit.ai Features</h1>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-6 py-20 max-w-6xl">
                <div className="text-center mb-24 max-w-3xl mx-auto space-y-4">
                    <h2 className="text-4xl md:text-6xl font-bold text-text-dark tracking-tighter">Engineered for Accuracy.</h2>
                    <p className="text-gray-600 text-xl leading-relaxed">
                        Most AI assistants guess when they don't know. Easit AI searches, verifies, and cites.
                    </p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
                    <FeatureCard icon={<ShieldCheck size={26} />} title="Hallucination Checks">
                        Our unique verification algorithm cross-references AI internal logic with external web chunks instantly to ensure facts are strictly accurate.
                    </FeatureCard>
                    <FeatureCard icon={<Search size={26} />} title="Real-time Grounding">
                        Powered by Google Search, fetching real-time news, documentation, and market data seamlessly into your conversation.
                    </FeatureCard>
                    <FeatureCard icon={<Zap size={26} />} title="Smart Presets">
                        One-click summarization, simplicity mapping, and deep research modes tailored for unparalleled productivity.
                    </FeatureCard>
                    <FeatureCard icon={<Mic size={26} />} title="Voice Interaction">
                        Ultra-low latency voice with interruptible streaming. It listens as well as it speaks, providing a natural conversation flow.
                    </FeatureCard>
                    <FeatureCard icon={<Lock size={26} />} title="Privacy First">
                        End-to-end encrypted storage for chats and secure session management. Your data is yours.
                    </FeatureCard>
                    <FeatureCard icon={<Code size={26} />} title="Technical Personas">
                        Specialized AI modes for developers, researchers, and creative writers, adjusting tone and verbosity dynamically.
                    </FeatureCard>
                </div>
            </main>
            <FooterAssistant />
        </div>
    );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="p-8 rounded-3xl bg-white shadow-sm border border-gray-100 hover:border-[#CFA54D]/30 transition-all group">
        <div className="w-12 h-12 rounded-2xl bg-gold-light/20 flex items-center justify-center text-[#CFA54D] mb-6 group-hover:scale-110 group-hover:bg-gold-gradient group-hover:text-text-dark transition-all">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-text-dark mb-3 tracking-tight">{title}</h3>
        <p className="text-gray-600 text-sm leading-relaxed">{children}</p>
    </div>
);

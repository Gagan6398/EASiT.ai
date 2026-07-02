import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Globe, Shield } from 'lucide-react';
import { FooterAssistant } from './FooterAssistant.tsx';

export const AboutPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-cream-bg text-text-dark font-sans min-h-screen flex flex-col">
            <header className="border-b border-gray-100 py-5 bg-cream-bg/90 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 flex items-center">
                    <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-text-dark transition flex items-center gap-2">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="ml-8 text-xl font-bold tracking-tight text-text-dark">About Easit.ai</h1>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-6 py-20 max-w-4xl">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-5xl md:text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-purple to-neon-cyan">
                        Building the Future of Voice AI
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Easit AI was founded with a singular vision: to create the most reliable, hallucination-free AI assistant on the planet.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-20">
                    <div className="p-8 rounded-3xl bg-white shadow-sm border border-gray-100 hover:border-[#CFA54D]/30 transition">
                        <Users className="text-[#CFA54D] mb-4" size={32} />
                        <h3 className="text-xl font-bold mb-2">Our Team</h3>
                        <p className="text-gray-600 text-sm">A globally distributed group of engineers, researchers, and designers obsessed with latency and accuracy.</p>
                    </div>
                    <div className="p-8 rounded-3xl bg-white shadow-sm border border-gray-100 hover:border-brand-purple/30 transition">
                        <Shield className="text-[#B8860B] mb-4" size={32} />
                        <h3 className="text-xl font-bold mb-2">Our Mission</h3>
                        <p className="text-gray-600 text-sm">To eliminate AI hallucinations by grounding every response in real-time, verified web data.</p>
                    </div>
                    <div className="p-8 rounded-3xl bg-white shadow-sm border border-gray-100 hover:border-neon-cyan/30 transition">
                        <Globe className="text-[#D4AF37] mb-4" size={32} />
                        <h3 className="text-xl font-bold mb-2">Our Impact</h3>
                        <p className="text-gray-600 text-sm">Powering thousands of researchers, developers, and creators worldwide.</p>
                    </div>
                </div>

                <div className="prose prose-invert max-w-none">
                    <h3 className="text-2xl font-bold mb-4">The Easit Story</h3>
                    <p className="text-gray-600 mb-6">
                        We started Easit.ai because we were frustrated. Large language models are incredible, but they make things up. When you're writing code, conducting research, or managing a business, you need facts, not guesses.
                    </p>
                    <p className="text-gray-600 mb-6">
                        Our proprietary Grounding Engine cross-references AI outputs with live web data in milliseconds, ensuring that when you talk to Easit, you're getting the truth.
                    </p>
                </div>
            </main>
            <FooterAssistant />
        </div>
    );
};

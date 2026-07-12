import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Globe, Shield } from 'lucide-react';
import { FooterAssistant } from './FooterAssistant.tsx';

export const AboutPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => { document.title = 'About — Easit.ai | AI Voice Assistant'; }, []);

    return (
        <div className="bg-[#0f1115] text-gray-200 font-sans min-h-screen flex flex-col selection:bg-[#00F0FF] selection:text-black">
            <header className="border-b border-gray-800 py-5 bg-[#0a0b0e]/90 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 flex items-center">
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition flex items-center gap-2">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="ml-8 text-xl font-bold tracking-tight text-white">About Easit.ai</h1>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-6 py-20 max-w-4xl">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-5xl md:text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-[#00F0FF] to-blue-500">
                        Building the Future of Voice AI
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Easit AI was founded with a singular vision: to create the most reliable, hallucination-free AI assistant on the planet.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-20">
                    <div className="p-8 rounded-3xl bg-[#12141a] border border-gray-800 hover:border-[#00F0FF]/30 transition group">
                        <Users className="text-[#00F0FF] mb-4 group-hover:scale-110 transition-transform" size={32} />
                        <h3 className="text-xl font-bold mb-2 text-white">Our Team</h3>
                        <p className="text-gray-400 text-sm">A globally distributed group of engineers, researchers, and designers obsessed with latency and accuracy.</p>
                    </div>
                    <div className="p-8 rounded-3xl bg-[#12141a] border border-gray-800 hover:border-purple-500/30 transition group">
                        <Shield className="text-purple-400 mb-4 group-hover:scale-110 transition-transform" size={32} />
                        <h3 className="text-xl font-bold mb-2 text-white">Our Mission</h3>
                        <p className="text-gray-400 text-sm">To eliminate AI hallucinations by grounding every response in real-time, verified web data.</p>
                    </div>
                    <div className="p-8 rounded-3xl bg-[#12141a] border border-gray-800 hover:border-blue-500/30 transition group">
                        <Globe className="text-blue-400 mb-4 group-hover:scale-110 transition-transform" size={32} />
                        <h3 className="text-xl font-bold mb-2 text-white">Our Impact</h3>
                        <p className="text-gray-400 text-sm">Powering thousands of researchers, developers, and creators worldwide.</p>
                    </div>
                </div>

                <div className="max-w-none">
                    <h3 className="text-2xl font-bold mb-4 text-white">The Easit Story</h3>
                    <p className="text-gray-400 mb-6 leading-relaxed">
                        We started Easit.ai because we were frustrated. Large language models are incredible, but they make things up. When you're writing code, conducting research, or managing a business, you need facts, not guesses.
                    </p>
                    <p className="text-gray-400 mb-6 leading-relaxed">
                        Our proprietary Grounding Engine cross-references AI outputs with live web data in milliseconds, ensuring that when you talk to Easit, you're getting the truth.
                    </p>
                </div>
            </main>
            <FooterAssistant />
        </div>
    );
};

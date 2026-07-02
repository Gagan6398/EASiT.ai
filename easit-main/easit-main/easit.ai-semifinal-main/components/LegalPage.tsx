import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { FooterAssistant } from './FooterAssistant.tsx';

// A simple component to fetch and render markdown (in a real app, use react-markdown)
// For this mockup, we will just display a placeholder or raw text if we can't parse it easily,
// but since we are just building the UI wrapper, we'll provide a clean structure.
export const LegalPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('privacy');

    const tabs = [
        { id: 'privacy', label: 'Privacy Policy' },
        { id: 'terms', label: 'Terms of Service' },
        { id: 'acceptable-use', label: 'Acceptable Use' },
        { id: 'disclaimer', label: 'Disclaimer' },
        { id: 'cookie', label: 'Cookie Policy' },
        { id: 'eula', label: 'EULA' },
    ];

    return (
        <div className="bg-cream-bg text-text-dark font-sans min-h-screen flex flex-col">
            <header className="border-b border-gray-100 py-5 bg-cream-bg/90 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 flex items-center">
                    <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-text-dark transition flex items-center gap-2">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="ml-8 text-xl font-bold tracking-tight text-text-dark">Legal Hub</h1>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-6 py-12 max-w-6xl flex flex-col md:flex-row gap-12">
                {/* Sidebar Navigation */}
                <aside className="w-full md:w-64 flex-shrink-0">
                    <div className="sticky top-32 space-y-2">
                        <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-4 px-4">Documents</h3>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === tab.id ? 'bg-gold-light/20 text-[#CFA54D] border border-[#CFA54D]/20' : 'text-gray-600 hover:text-text-dark hover:bg-white shadow-sm border border-transparent'}`}
                            >
                                <FileText size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Content Area */}
                <div className="flex-1 bg-white shadow-sm border border-gray-100 rounded-3xl p-8 md:p-12">
                    <h2 className="text-3xl font-bold mb-8 text-text-dark">{tabs.find(t => t.id === activeTab)?.label}</h2>
                    <div className="prose prose-invert max-w-none text-gray-600">
                        <p className="mb-4">
                            This is the official {tabs.find(t => t.id === activeTab)?.label} for Easit.ai. 
                            Please review the terms carefully. Our full documentation is located in the <code>/legal</code> directory of our repository.
                        </p>
                        <div className="p-6 bg-cream-bg rounded-xl border border-gray-100 font-mono text-sm">
                            Loading document content...
                            {/* In a production environment, this would fetch the corresponding .md file from the /legal folder and render it using a Markdown renderer */}
                        </div>
                    </div>
                </div>
            </main>
            <FooterAssistant />
        </div>
    );
};

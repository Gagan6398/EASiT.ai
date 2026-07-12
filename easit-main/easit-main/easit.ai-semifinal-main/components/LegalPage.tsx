import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { FooterAssistant } from './FooterAssistant.tsx';

// Map of legal document IDs to their file paths
const LEGAL_DOCS: Record<string, string> = {
    'privacy': '/legal/privacy-policy.md',
    'terms': '/legal/terms-of-service.md',
    'acceptable-use': '/legal/acceptable-use-policy.md',
    'disclaimer': '/legal/disclaimer.md',
    'cookie': '/legal/cookie-policy.md',
    'eula': '/legal/eula.md',
};

// Simple markdown-to-HTML renderer (avoids adding a dependency)
function renderMarkdown(md: string): string {
    let html = md
        // Escape HTML entities
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Headers
        .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-white mt-6 mb-2">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-white mt-8 mb-3">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mt-8 mb-4">$1</h1>')
        // Bold and italic
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Unordered lists
        .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-400 text-sm leading-relaxed">$1</li>')
        // Paragraphs (lines not already tagged)
        .replace(/^(?!<[hl]|<li)(.+)$/gm, '<p class="text-gray-400 text-sm leading-relaxed mb-3">$1</p>')
        // Wrap consecutive <li> in <ul>
        .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul class="space-y-1 mb-4">${match}</ul>`)
        // Horizontal rules
        .replace(/^---$/gm, '<hr class="border-gray-800 my-6" />')
        // Remove empty paragraphs
        .replace(/<p[^>]*>\s*<\/p>/g, '');

    return html;
}

export const LegalPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('privacy');
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const tabs = [
        { id: 'privacy', label: 'Privacy Policy' },
        { id: 'terms', label: 'Terms of Service' },
        { id: 'acceptable-use', label: 'Acceptable Use' },
        { id: 'disclaimer', label: 'Disclaimer' },
        { id: 'cookie', label: 'Cookie Policy' },
        { id: 'eula', label: 'EULA' },
    ];

    useEffect(() => {
        document.title = `${tabs.find(t => t.id === activeTab)?.label} — Easit.ai`;
        setIsLoading(true);
        setError(null);
        
        fetch(LEGAL_DOCS[activeTab])
            .then(res => {
                if (!res.ok) throw new Error(`Could not load document (${res.status})`);
                return res.text();
            })
            .then(text => {
                if (text.trim().startsWith('<!DOCTYPE html>')) {
                    throw new Error("Document not found (returned HTML)");
                }
                setContent(renderMarkdown(text));
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch legal document:", err);
                setError(err.message || "Failed to load document.");
                setIsLoading(false);
            });
    }, [activeTab]);

    return (
        <div className="bg-[#0f1115] text-gray-200 font-sans min-h-screen flex flex-col selection:bg-[#00F0FF] selection:text-black">
            <header className="border-b border-gray-800 py-5 bg-[#0a0b0e]/90 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 flex items-center">
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition flex items-center gap-2">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="ml-8 text-xl font-bold tracking-tight text-white">Legal Information</h1>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-6 py-12 max-w-5xl flex flex-col md:flex-row gap-10">
                <aside className="w-full md:w-64 shrink-0">
                    <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-4 md:pb-0 hide-scrollbar">
                        {tabs.map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                    activeTab === tab.id 
                                    ? 'bg-[#00F0FF]/10 text-[#00F0FF] shadow-sm' 
                                    : 'text-gray-400 hover:bg-[#12141a] hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </aside>
                
                <section className="flex-1 bg-[#12141a] border border-gray-800 p-8 md:p-12 rounded-3xl min-h-[600px] shadow-2xl">
                    <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-800">
                        <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/10 flex items-center justify-center text-[#00F0FF]">
                            <FileText size={20} />
                        </div>
                        <h2 className="text-2xl font-bold text-white">{tabs.find(t => t.id === activeTab)?.label}</h2>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                            <Loader2 className="animate-spin mb-4" size={32} />
                            <p>Loading document...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20">
                            <p className="font-semibold mb-1">Error Loading Document</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : (
                        <div 
                            className="prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    )}
                </section>
            </main>
            <FooterAssistant />
        </div>
    );
};

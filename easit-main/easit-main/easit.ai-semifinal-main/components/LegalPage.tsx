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
        .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-text-dark mt-6 mb-2">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-text-dark mt-8 mb-3">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-text-dark mt-8 mb-4">$1</h1>')
        // Bold and italic
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-text-dark">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Unordered lists
        .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-600 text-sm leading-relaxed">$1</li>')
        // Paragraphs (lines not already tagged)
        .replace(/^(?!<[hl]|<li)(.+)$/gm, '<p class="text-gray-600 text-sm leading-relaxed mb-3">$1</p>')
        // Wrap consecutive <li> in <ul>
        .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul class="space-y-1 mb-4">${match}</ul>`)
        // Horizontal rules
        .replace(/^---$/gm, '<hr class="border-gray-200 my-6" />')
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
        const loadDocument = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const filePath = LEGAL_DOCS[activeTab];
                if (!filePath) throw new Error('Document not found');

                // Import the markdown file as raw text via Vite
                const modules: Record<string, () => Promise<string>> = {
                    'privacy': async () => (await import('../legal/privacy-policy.md?raw')).default,
                    'terms': async () => (await import('../legal/terms-of-service.md?raw')).default,
                    'acceptable-use': async () => (await import('../legal/acceptable-use-policy.md?raw')).default,
                    'disclaimer': async () => (await import('../legal/disclaimer.md?raw')).default,
                    'cookie': async () => (await import('../legal/cookie-policy.md?raw')).default,
                    'eula': async () => (await import('../legal/eula.md?raw')).default,
                };

                const loader = modules[activeTab];
                if (!loader) throw new Error('Document loader not found');
                
                const rawContent = await loader();
                setContent(renderMarkdown(rawContent));
            } catch (err: any) {
                console.error('Failed to load legal document:', err);
                setError('Failed to load this document. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        
        loadDocument();
    }, [activeTab]);

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
                    <div className="prose max-w-none">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 size={24} className="animate-spin text-[#CFA54D]" />
                                <span className="ml-3 text-gray-500">Loading document...</span>
                            </div>
                        ) : error ? (
                            <div className="p-6 bg-red-50 rounded-xl border border-red-200 text-red-600 text-sm">
                                {error}
                            </div>
                        ) : (
                            <div dangerouslySetInnerHTML={{ __html: content }} />
                        )}
                    </div>
                </div>
            </main>
            <FooterAssistant />
        </div>
    );
};

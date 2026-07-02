
import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

const logoUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMTcwIiBzdHJva2U9InVybCgjZ3JhZDEpIiBzdHJva2Utd2lkdGg9IjEyIi8+CjxjaXJjbGUgY3g9IjI1MCIgY3k9IjE2MCIgcj0iMzUiIGZpbGw9IiM4QjVDRjYiLz4KPGNpcmNsZSBjeD0iMTcwIiBjeT0iMzAwIiByPSIzNSIgZmlsbD0iIzNCODJGNiIvPgo8Y2lyY2xlIGN4PSIzMzAiIGN5PSIzMDAiIHI9IjM1IiBmaWxsPSIjMDBGMEY2Ii8+CjxsaW5lIHgxPSIyNTAiIHkxPSIxNjAiIHgyPSIxNzAiIHkyPSIzMDAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjMiIHN0cm9rZS13aWR0aD0iMyIvPgo8bGluZSB4MT0iMjUwIiB5MT0iMTYwIiB4Mj0iMzMwIiB5Mj0iMzAwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utb3BhY2l0eT0iMC4zIiBzdHJva2Utd2lkdGg9IjMiLz4KPGxpbmUgeDE9IjE3MCIgeTE9IjMwMCIgeDI9IjMzMCIgeTI9IjMwMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIgc3Ryb2tlLXdpZHRoPSIzIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQxIiB4MT0iODAiIHkxPSI4MCIgeDI9IjQyMCIgeTI9IjQyMCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjOEI1Q0Y2Ii8+CjxzdG9wIG9mZnNldD0iMC41IiBzdG9wLWNvbG9yPSIjM0I4MkY2Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwRjBGRiIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPg==';

export const FooterAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-[60]">
            {isOpen && (
                <div className="absolute bottom-20 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-80 border border-gray-200 dark:border-gray-700 origin-bottom-right transition-transform duration-300">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-t-lg">
                        <div className="flex items-center gap-2">
                            <img src={logoUrl} alt="Easit AI Assistant Logo" className="h-6 w-6 rounded-full" />
                            <h3 className="font-semibold text-sm">Easit Assistant</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-sm max-w-max self-start">
                           <p>Welcome to Easit! I can help you learn about our services. What are you interested in?</p>
                        </div>
                         <div className="flex flex-wrap gap-2">
                            <button className="text-xs px-3 py-1.5 border border-[#CFA54D] text-[#CFA54D] rounded-full hover:bg-gold-light/20">White-Label</button>
                            <button className="text-xs px-3 py-1.5 border border-[#CFA54D] text-[#CFA54D] rounded-full hover:bg-gold-light/20">API Access</button>
                             <button className="text-xs px-3 py-1.5 border border-[#CFA54D] text-[#CFA54D] rounded-full hover:bg-gold-light/20">Enterprise</button>
                        </div>
                    </div>
                </div>
            )}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-16 h-16 bg-gold-gradient rounded-full shadow-lg hover:bg-gold-gradient/90 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transform transition-transform hover:scale-110"
                aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
            >
                {isOpen ? <ChevronDown size={32} className="text-text-dark" /> : <img src={logoUrl} alt="Easit Assistant Logo" className="w-10 h-10 rounded-full" />}
            </button>
        </div>
    );
};

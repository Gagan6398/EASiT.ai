
import React from 'react';
import { MessageSquarePlus } from 'lucide-react';

interface WelcomeScreenProps {
  onNewConversation: () => void;
}

const logoUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMTcwIiBzdHJva2U9InVybCgjZ3JhZDEpIiBzdHJva2Utd2lkdGg9IjEyIi8+CjxjaXJjbGUgY3g9IjI1MCIgY3k9IjE2MCIgcj0iMzUiIGZpbGw9IiM4QjVDRjYiLz4KPGNpcmNsZSBjeD0iMTcwIiBjeT0iMzAwIiByPSIzNSIgZmlsbD0iIzNCODJGNiIvPgo8Y2lyY2xlIGN4PSIzMzAiIGN5PSIzMDAiIHI9IjM1IiBmaWxsPSIjMDBGMEY2Ii8+CjxsaW5lIHgxPSIyNTAiIHkxPSIxNjAiIHgyPSIxNzAiIHkyPSIzMDAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjMiIHN0cm9rZS13aWR0aD0iMyIvPgo8bGluZSB4MT0iMjUwIiB5MT0iMTYwIiB4Mj0iMzMwIiB5Mj0iMzAwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utb3BhY2l0eT0iMC4zIiBzdHJva2Utd2lkdGg9IjMiLz4KPGxpbmUgeDE9IjE3MCIgeTE9IjMwMCIgeDI9IjMzMCIgeTI9IjMwMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIgc3Ryb2tlLXdpZHRoPSIzIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQxIiB4MT0iODAiIHkxPSI4MCIgeDI9IjQyMCIgeTI9IjQyMCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjOEI1Q0Y2Ii8+CjxzdG9wIG9mZnNldD0iMC41IiBzdG9wLWNvbG9yPSIjM0I4MkY2Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwRjBGRiIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPg==';

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNewConversation }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-100 dark:bg-gray-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.2),rgba(0,0,0,0))]">
      <div className="relative mb-8 group">
          <div className="absolute inset-0 bg-gold-gradient/30 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <img src={logoUrl} alt="Easit.ai Assistant Logo" className="relative h-24 w-24 rounded-full shadow-2xl border-4 border-gray-100" />
      </div>
      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-text-dark tracking-tight">
        Welcome to <span className="text-[#CFA54D]">Easit.ai</span>
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-600 mb-10 max-w-lg leading-relaxed">
        Your intelligent voice assistant. Real-time responses, natural conversation, and task automation.
      </p>
      <button
        onClick={onNewConversation}
        className="flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold bg-gold-gradient text-white hover:bg-gold-gradient/90 hover:scale-105 transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)]"
      >
        <MessageSquarePlus size={22} />
        Start New Conversation
      </button>
    </div>
  );
};

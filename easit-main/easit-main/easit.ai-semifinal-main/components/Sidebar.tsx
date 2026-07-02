
import React from 'react';
import type { Conversation } from '../types.ts';
import { MessageSquarePlus, MessageSquareText, X } from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  isMobileOpen: boolean;
  onClose: () => void;
}

const logoUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMTcwIiBzdHJva2U9InVybCgjZ3JhZDEpIiBzdHJva2Utd2lkdGg9IjEyIi8+CjxjaXJjbGUgY3g9IjI1MCIgY3k9IjE2MCIgcj0iMzUiIGZpbGw9IiM4QjVDRjYiLz4KPGNpcmNsZSBjeD0iMTcwIiBjeT0iMzAwIiByPSIzNSIgZmlsbD0iIzNCODJGNiIvPgo8Y2lyY2xlIGN4PSIzMzAiIGN5PSIzMDAiIHI9IjM1IiBmaWxsPSIjMDBGMEY2Ii8+CjxsaW5lIHgxPSIyNTAiIHkxPSIxNjAiIHgyPSIxNzAiIHkyPSIzMDAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjMiIHN0cm9rZS13aWR0aD0iMyIvPgo8bGluZSB4MT0iMjUwIiB5MT0iMTYwIiB4Mj0iMzMwIiB5Mj0iMzAwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utb3BhY2l0eT0iMC4zIiBzdHJva2Utd2lkdGg9IjMiLz4KPGxpbmUgeDE9IjE3MCIgeTE9IjMwMCIgeDI9IjMzMCIgeTI9IjMwMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIgc3Ryb2tlLXdpZHRoPSIzIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQxIiB4MT0iODAiIHkxPSI4MCIgeDI9IjQyMCIgeTI9IjQyMCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjOEI1Q0Y2Ii8+CjxzdG9wIG9mZnNldD0iMC41IiBzdG9wLWNvbG9yPSIjM0I4MkY2Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwRjBGRiIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPg==';

const timeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  isMobileOpen,
  onClose,
}) => {
  return (
    <>
      {isMobileOpen && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={onClose}></div>}
      <aside className={`fixed top-0 left-0 h-full z-40 w-64 bg-white shadow-sm dark:bg-gray-800/20 backdrop-blur-lg border-r border-gray-100 dark:border-gray-700/50 flex flex-col transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700/50">
          <img src={logoUrl} alt="Easit.ai Assistant Logo" className="h-9 w-9 rounded-full" />
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 md:hidden" aria-label="Close sidebar">
              <X size={20} />
          </button>
        </div>
        <div className="p-2">
          <button
            onClick={onNewConversation}
            className="flex items-center gap-2 w-full p-2.5 my-2 rounded-lg text-sm font-semibold bg-gold-gradient text-white hover:bg-gold-gradient/90 transition-colors duration-200"
          >
            <MessageSquarePlus size={18} />
            New Chat
          </button>
          <nav className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[calc(100vh-200px)]">
            {conversations.length > 0 ? (
              conversations.map((conv) => (
                <a
                  key={conv.id}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectConversation(conv.id);
                  }}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg text-sm transition-colors duration-200 ${
                    activeConversationId === conv.id
                      ? 'bg-gold-light/40 text-[#CFA54D] dark:text-text-dark'
                      : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <MessageSquareText size={18} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-600 truncate">
                      {timeAgo(conv.createdAt)}
                    </p>
                  </div>
                </a>
              ))
            ) : (
              <div className="text-center text-xs text-gray-500 dark:text-gray-600 p-4 mt-4">
                No past conversations. Start a new chat to begin!
              </div>
            )}
          </nav>
        </div>
        <div className="mt-auto p-4 border-t border-gray-100 dark:border-gray-700/50 space-y-2">
            <a href="/research" className="flex items-center gap-3 p-2 rounded-lg text-sm text-[#B8860B] hover:bg-[#F3E5AB]/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                Deep Research
            </a>
            <a href="/settings" className="flex items-center gap-3 p-2 rounded-lg text-sm text-gray-600 hover:text-text-dark hover:bg-white shadow-sm transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                Settings
            </a>
        </div>
      </aside>
    </>
  );
};

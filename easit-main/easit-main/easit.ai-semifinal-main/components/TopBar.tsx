import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, PanelLeft, LogOut, User as UserIcon, Settings, Info, Shield, Mail, Sliders, WifiOff, RefreshCw, Save, MessageSquarePlus } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.ts';
import type { User, ConnectionStatus } from '../types.ts';

interface TopBarProps {
    user: User;
    onSignOut: () => void;
    onToggleSidebar: () => void;
    onNewConversation: () => void;
    onShowModal: (modal: string) => void;
    onShowSettings: () => void;
    onSaveConversation: () => void;
    conversationTitle?: string;
    connectionStatus: ConnectionStatus;
}

const UserMenu: React.FC<{ user: User; onSignOut: () => void; onShowModal: (modal: string) => void; onShowSettings: () => void; }> = ({ user, onSignOut, onShowModal, onShowSettings }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const menuItems = [
        { label: 'Customize Persona', icon: Sliders, onClick: () => onShowSettings() },
        { label: 'Account', icon: Settings, onClick: () => onShowModal('Account') },
        { label: 'About', icon: Info, onClick: () => onShowModal('About') },
        { label: 'Privacy', icon: Shield, onClick: () => onShowModal('Privacy') },
        { label: 'Contact Us', icon: Mail, onClick: () => onShowModal('Contact Us') },
    ];

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-9 h-9 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue focus:ring-offset-gray-800">
                {user.picture ? (
                    <img src={user.picture} alt="User" className="w-full h-full rounded-full" />
                ) : (
                    <div className="w-full h-full rounded-full bg-brand-purple flex items-center justify-center">
                        <UserIcon size={20} className="text-text-dark" />
                    </div>
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20 border border-gray-100 dark:border-gray-700/50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-semibold text-gray-800 dark:text-text-dark truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-600 truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                        {menuItems.map((item, index) => (
                             <button
                                key={index}
                                onClick={() => { item.onClick(); setIsOpen(false); }}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <item.icon size={16} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div className="py-1 border-t border-gray-200 dark:border-gray-700">
                         <button
                            onClick={onSignOut}
                            className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ConnectionBadge: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
    if (status === 'connected') return null;

    if (status === 'reconnecting') {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full animate-pulse">
                <RefreshCw size={12} className="animate-spin" />
                <span className="hidden md:inline">Reconnecting...</span>
            </div>
        );
    }

    if (status === 'disconnected') {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full">
                <WifiOff size={12} />
                <span className="hidden md:inline">Offline</span>
            </div>
        );
    }
    
    return null;
};


export const TopBar: React.FC<TopBarProps> = ({ user, onSignOut, onToggleSidebar, onNewConversation, onShowModal, conversationTitle, onShowSettings, onSaveConversation, connectionStatus }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex-shrink-0 h-16 flex items-center justify-between px-6 bg-white shadow-sm dark:bg-gray-800/20 backdrop-blur-lg border-b border-gray-100 dark:border-gray-700/50">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors md:hidden"
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold truncate max-w-[calc(100%-4rem)] md:max-w-xs">{conversationTitle || 'Easit.ai'}</h2>
        <ConnectionBadge status={connectionStatus} />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onNewConversation}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="New chat"
          title="New Chat"
        >
            <MessageSquarePlus size={20} />
        </button>
        <button
          onClick={onSaveConversation}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Save conversation"
          title="Save Conversation"
        >
            <Save size={20} />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <UserMenu user={user} onSignOut={onSignOut} onShowModal={onShowModal} onShowSettings={onShowSettings} />
      </div>
    </header>
  );
};
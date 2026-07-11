import React from 'react';
import { ArrowLeft, User as UserIcon, Settings as SettingsIcon, Bell, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User } from './types.ts';

interface SettingsPageProps {
    user: User;
    onSignOut: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onSignOut }) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-cream-bg text-text-dark p-6 font-sans">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                    <button 
                        onClick={() => navigate('/chat')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-3xl font-bold">Settings & Accessibilities</h1>
                </div>

                {/* Profile Section */}
                <section className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-[#CFA54D]">
                        <UserIcon size={20} /> Account Profile
                    </h2>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-xl font-bold">
                            {user.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <p className="text-lg font-medium">{user.name}</p>
                            <p className="text-gray-600 text-sm">{user.email}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onSignOut}
                        className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm font-medium px-4 py-2 bg-red-500/10 rounded-lg hover:bg-red-500/20"
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </section>

                {/* Functional Accessibilities */}
                <section className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-[#B8860B]">
                        <SettingsIcon size={20} /> Functional Preferences
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                                <h3 className="font-medium text-text-dark">Persona Configuration</h3>
                                <p className="text-xs text-gray-500">Configure AI tone, style, and verbosity in the Chat UI.</p>
                            </div>
                            <button onClick={() => navigate('/chat')} className="px-4 py-2 bg-[#F3E5AB]/40 text-[#B8860B] text-sm font-medium rounded-lg hover:bg-brand-purple/30">
                                Configure
                            </button>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                                <h3 className="font-medium text-text-dark">Deep Research Mode</h3>
                                <p className="text-xs text-gray-500">Access the G-C-G-O Consensus Architecture.</p>
                            </div>
                            <button onClick={() => navigate('/research')} className="px-4 py-2 bg-gold-light/40 text-[#CFA54D] text-sm font-medium rounded-lg hover:bg-gold-gradient/30">
                                Open Engine
                            </button>
                        </div>
                    </div>
                </section>

                {/* Security & Privacy */}
                <section className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-green-400">
                        <Shield size={20} /> Security & Privacy
                    </h2>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        Easit.ai utilizes end-to-end encrypted storage for your chat history. Your voice interactions are processed entirely in memory via secure WebSockets and are not stored as audio files on our servers.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 px-3 py-2 rounded-lg inline-flex border border-green-500/20">
                        <Shield size={14} /> Account Status: Secure
                    </div>
                </section>
            </div>
        </div>
    );
};

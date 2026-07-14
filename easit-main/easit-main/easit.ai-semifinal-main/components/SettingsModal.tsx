import React, { useState, useEffect } from 'react';
import { Modal } from './Modal.tsx';
import type { PersonaSettings } from '../types.ts';
import { MessageSquare, Volume2, PenTool, Check, RotateCcw, Key, Copy, Plus, Trash2, Loader } from 'lucide-react';
import apiService, { ApiKey } from '../services/apiService.ts';

interface SettingsModalProps {
  settings: PersonaSettings;
  onUpdate: (settings: PersonaSettings) => void;
  onClose: () => void;
}

interface OptionGroupProps {
  label: string;
  icon: React.ElementType;
  value: string;
  options: string[];
  onChange: (val: any) => void;
}

function OptionGroup({ 
  label, 
  icon: Icon, 
  value, 
  options, 
  onChange 
}: OptionGroupProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-200 font-semibold">
        <Icon size={18} />
        <span>{label}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`
              relative px-3 py-2 rounded-lg text-sm capitalize transition-all duration-200 border
              ${value === opt 
                ? 'bg-gold-light/20 border-[#CFA54D] text-[#CFA54D] dark:text-[#B8860B] dark:border-brand-purple dark:bg-[#F3E5AB]/20' 
                : 'bg-gray-100 dark:bg-gray-700/50 border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}
            `}
          >
            {opt}
            {value === opt && (
              <div className="absolute top-1 right-1">
                <Check size={12} strokeWidth={3} />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsModal({ settings, onUpdate, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'persona' | 'api'>('persona');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (activeTab === 'api') {
      loadKeys();
    }
  }, [activeTab]);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const keys = await apiService.getApiKeys();
      setApiKeys(keys);
    } catch (e) {
      console.error("Failed to load keys", e);
    }
    setLoading(false);
  };

  const handleGenerateKey = async () => {
    setGenerating(true);
    try {
      const newKey = await apiService.generateApiKey();
      setApiKeys([newKey, ...apiKeys]);
    } catch (e) {
      alert("Failed to generate key. Are you logged in?");
    }
    setGenerating(false);
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API Key?')) return;
    try {
      await apiService.deleteApiKey(id);
      setApiKeys(apiKeys.filter(k => k.id !== id));
    } catch (e) {
      alert("Failed to delete key");
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    // Could add toast here, but simple implementation for now
  };

  const updateSetting = (key: keyof PersonaSettings, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };
  
  const handleReset = () => {
      onUpdate({
          tone: 'friendly',
          verbosity: 'balanced',
          style: 'casual'
      });
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button 
          onClick={() => setActiveTab('persona')}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'persona' ? 'border-[#CFA54D] text-[#CFA54D]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
        >
          Persona
        </button>
        <button 
          onClick={() => setActiveTab('api')}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'api' ? 'border-[#CFA54D] text-[#CFA54D]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
        >
          <Key size={14} /> Developer API
        </button>
      </div>

      <div className="p-1 max-h-[60vh] overflow-y-auto">
        {activeTab === 'persona' ? (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Adjust how Easit.ai speaks and behaves to better suit your needs. Changes are applied instantly to new messages.
            </p>

            <OptionGroup
              label="Tone"
              icon={Volume2}
              value={settings.tone}
              options={['friendly', 'professional', 'humorous', 'empathetic']}
              onChange={(val) => updateSetting('tone', val)}
            />

            <OptionGroup
              label="Verbosity"
              icon={MessageSquare}
              value={settings.verbosity}
              options={['concise', 'balanced', 'detailed']}
              onChange={(val) => updateSetting('verbosity', val)}
            />

            <OptionGroup
              label="Style"
              icon={PenTool}
              value={settings.style}
              options={['casual', 'formal', 'technical']}
              onChange={(val) => updateSetting('style', val)}
            />
            
            <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#CFA54D] transition-colors"
                >
                    <RotateCcw size={14} />
                    Reset Defaults
                </button>
                <button 
                    onClick={onClose}
                    className="px-6 py-2 bg-gold-gradient text-white rounded-full font-medium hover:bg-gold-gradient/90 transition-colors"
                >
                    Done
                </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">API Keys</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Use these keys to access the Easit Multi-Source RAG Engine from your own applications.</p>
              </div>
              <button 
                onClick={handleGenerateKey}
                disabled={generating}
                className="flex items-center gap-1 bg-[#0F172A] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                {generating ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                Generate
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[150px] p-4 space-y-3">
              {loading ? (
                <div className="flex justify-center py-8"><Loader size={20} className="animate-spin text-gray-400" /></div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                  No API keys found. Generate one to get started.
                </div>
              ) : (
                apiKeys.map(key => (
                  <div key={key.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="font-mono text-sm text-gray-700 dark:text-gray-300 truncate mr-4">
                      {key.key_value}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleCopy(key.key_value)} className="p-1.5 text-gray-500 hover:text-[#CFA54D] bg-gray-100 dark:bg-gray-700 rounded transition-colors" title="Copy Key">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => handleDeleteKey(key.id)} className="p-1.5 text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-900/20 rounded transition-colors" title="Revoke Key">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">How to use the API</h4>
              <pre className="text-xs text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-900 p-3 rounded border border-blue-100 dark:border-blue-900/50 overflow-x-auto">
{`POST https://easitai-semifinal-main.vercel.app/api/chat
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "query": "Explain quantum computing",
  "enableSearch": true
}`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
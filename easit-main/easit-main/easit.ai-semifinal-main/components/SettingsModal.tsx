import React from 'react';
import { Modal } from './Modal.tsx';
import type { PersonaSettings } from '../types.ts';
import { MessageSquare, Volume2, PenTool, Check, RotateCcw } from 'lucide-react';

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
                : 'bg-gray-100 dark:bg-gray-700/50 border-transparent text-gray-600 dark:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}
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
      <div className="p-1 max-h-[70vh] overflow-y-auto">
        <p className="text-sm text-gray-500 dark:text-gray-600 mb-6">
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
      </div>
    </Modal>
  );
}
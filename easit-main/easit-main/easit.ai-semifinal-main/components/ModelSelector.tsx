import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Lock, Zap } from 'lucide-react';
import type { ModelInfo } from '../types.ts';
import { MODEL_CATALOG, getFreeModels, getPremiumModels } from '../services/openRouterService.ts';

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModelId, onSelectModel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModel = MODEL_CATALOG.find(m => m.id === selectedModelId) || MODEL_CATALOG[0];
  const freeModels = getFreeModels();
  const premiumModels = getPremiumModels();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-[#00F0FF]/50 transition-all text-xs font-medium text-gray-700 dark:text-gray-300 shadow-sm"
        aria-label="Select AI model"
      >
        <span>{selectedModel.icon}</span>
        <span className="hidden sm:inline max-w-[100px] truncate">{selectedModel.name}</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-72 bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-up-fade-in">
          {/* Free Models */}
          <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <Zap size={10} /> Free Models
            </div>
          </div>
          {freeModels.map(model => (
            <ModelOption
              key={model.id}
              model={model}
              isSelected={model.id === selectedModelId}
              onSelect={() => { onSelectModel(model.id); setIsOpen(false); }}
            />
          ))}

          {/* Premium Models */}
          <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              <Sparkles size={10} /> Premium Models • Credits Required
            </div>
          </div>
          {premiumModels.map(model => (
            <ModelOption
              key={model.id}
              model={model}
              isSelected={model.id === selectedModelId}
              onSelect={() => { onSelectModel(model.id); setIsOpen(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function ModelOption({ model, isSelected, onSelect }: { model: ModelInfo; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
        isSelected
          ? 'bg-[#00F0FF]/10 dark:bg-[#00F0FF]/10'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      <span className="text-base flex-shrink-0">{model.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold truncate ${isSelected ? 'text-[#00F0FF]' : 'text-gray-800 dark:text-gray-200'}`}>
            {model.name}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{model.provider}</span>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{model.description}</p>
      </div>
      {model.tier === 'premium' && (
        <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold flex-shrink-0">
          ${((model.inputPricePer1k + model.outputPricePer1k) / 2).toFixed(2)}/1K
        </span>
      )}
      {model.tier === 'free' && (
        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold flex-shrink-0">
          FREE
        </span>
      )}
    </button>
  );
}

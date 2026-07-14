import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Mic, Send, Square, Loader2, AlertCircle, Search, BookOpen, Scissors, HelpCircle, ShieldCheck, Zap, Brain, MessageSquare } from 'lucide-react';
import { useGeminiLive } from '../hooks/useGeminiLive.ts';
import { GeminiLiveStatus } from '../types.ts';
import type { QueryMode } from '../types.ts';
import { classifyQuery } from '../services/gcgoEngine.ts';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onSendVoiceMessage: (userText: string, aiText: string) => void;
  isLoading: boolean;
  systemInstruction: string;
  isSearchActive: boolean;
  setIsSearchActive: (active: boolean) => void;
  queryMode: QueryMode;
  setQueryMode: (mode: QueryMode) => void;
}

const MicButton: React.FC<{ status: GeminiLiveStatus; onClick: () => void }> = ({ status, onClick }) => {
    const getButtonContent = () => {
        switch (status) {
            case GeminiLiveStatus.CONNECTING:
                return (
                    <div className="flex items-center justify-center w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-[#CFA54D]/30 cursor-wait">
                        <Loader2 size={20} className="text-[#CFA54D] animate-spin" />
                    </div>
                );
            case GeminiLiveStatus.LISTENING:
                return (
                    <button
                        onClick={onClick}
                        className="flex items-center justify-center w-11 h-11 rounded-full bg-red-500 hover:bg-red-600 text-text-dark shadow-[0_0_15px_rgba(239,68,68,0.5)] ring-4 ring-red-500/20 animate-pulse transition-all duration-300"
                        title="Stop Listening"
                        aria-label="Stop Listening"
                    >
                        <Square size={18} className="fill-current" />
                    </button>
                );
            case GeminiLiveStatus.ERROR:
                 return (
                    <button
                        onClick={onClick}
                        className="flex items-center justify-center w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 text-text-dark shadow-lg transition-all duration-300"
                        title="Retry Connection"
                        aria-label="Retry Connection"
                    >
                        <AlertCircle size={20} />
                    </button>
                );
            default: // IDLE
                return (
                    <button
                        onClick={onClick}
                        className="flex items-center justify-center w-11 h-11 rounded-full bg-gold-gradient hover:bg-gold-gradient/90 text-text-dark shadow-lg shadow-brand-blue/30 hover:scale-105 transition-all duration-300"
                        title="Start Voice Chat"
                        aria-label="Start Voice Chat"
                    >
                        <Mic size={20} />
                    </button>
                );
        }
    };

    return getButtonContent();
};


export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  onSendVoiceMessage, 
  isLoading, 
  systemInstruction,
  isSearchActive,
  setIsSearchActive,
  queryMode,
  setQueryMode
}) => {
  const [inputText, setInputText] = useState('');
  const { status, userTranscript, aiTranscript, startSession, stopSession, error } = useGeminiLive();

  // ── Auto-classify query as user types ──
  const queryClassification = useMemo(() => {
    if (!inputText.trim()) return null;
    return classifyQuery(inputText);
  }, [inputText]);

  // ── Auto-enable search for factual queries ──
  useEffect(() => {
    if (queryClassification?.shouldSearch && !isSearchActive) {
      setIsSearchActive(true);
    }
  }, [queryClassification?.shouldSearch]);

  useEffect(() => {
    if (status === GeminiLiveStatus.LISTENING) {
      setInputText(userTranscript);
    }
  }, [userTranscript, status]);

  const handleSend = () => {
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };
  
  const handleMicToggle = useCallback(() => {
    if (status === GeminiLiveStatus.IDLE || status === GeminiLiveStatus.ERROR) {
      startSession({
        onTurnComplete: (finalUserTranscript, finalAiTranscript) => {
          onSendVoiceMessage(finalUserTranscript, finalAiTranscript);
          setInputText('');
        },
        systemInstruction
      });
    } else {
      stopSession();
    }
  }, [status, startSession, stopSession, onSendVoiceMessage, systemInstruction]);

  const applyPreset = (preset: string) => {
      const currentText = inputText.trim();
      
      if (!currentText) {
          switch(preset) {
              case 'summarize':
                  setInputText('Please provide a concise summary of the following:\n\n');
                  break;
              case 'explain':
                  setInputText('Explain this in simple terms that even a non-expert could understand:\n\n');
                  break;
              case 'research':
                  setIsSearchActive(true);
                  setQueryMode('consensus');
                  setInputText('Perform deep research on this topic using Google Search and provide a detailed verified report with the full G-C-G-O consensus analysis:\n\n');
                  break;
              case 'verify':
                  setIsSearchActive(true);
                  setInputText('Verify the following claim for accuracy and potential hallucinations using all available tools. Cross-reference with multiple sources:\n\n');
                  break;
          }
          return;
      }

      let finalPrompt = currentText;
      switch(preset) {
          case 'summarize':
              finalPrompt = `Please provide a concise summary of the following:\n\n${finalPrompt}`;
              break;
          case 'explain':
              finalPrompt = `Explain this in simple terms that even a non-expert could understand:\n\n${finalPrompt}`;
              break;
          case 'research':
              setIsSearchActive(true);
              setQueryMode('consensus');
              finalPrompt = `Perform deep research on this topic using Google Search and provide a detailed verified report with the full G-C-G-O consensus analysis:\n\n${finalPrompt}`;
              break;
          case 'verify':
              setIsSearchActive(true);
              finalPrompt = `Verify the following claim for accuracy and potential hallucinations using all available tools. Cross-reference with multiple sources:\n\n${finalPrompt}`;
              break;
      }
      
      onSendMessage(finalPrompt);
      setInputText('');
  };

  // ── Query type badge ──
  const queryTypeBadge = useMemo(() => {
    if (!queryClassification) return null;
    const badges: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
      factual: { icon: <Search size={9} />, label: 'Factual', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
      creative: { icon: <Zap size={9} />, label: 'Creative', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
      code: { icon: <Brain size={9} />, label: 'Code', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
      research: { icon: <BookOpen size={9} />, label: 'Research', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
      casual: { icon: <MessageSquare size={9} />, label: 'Chat', color: 'text-gray-600 bg-gray-500/10 border-gray-500/20' },
    };
    const badge = badges[queryClassification.type];
    return badge ? (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${badge.color}`}>
        {badge.icon} {badge.label}
      </span>
    ) : null;
  }, [queryClassification]);

  const isInputDisabled = isLoading || status === GeminiLiveStatus.LISTENING || status === GeminiLiveStatus.CONNECTING;

  const tokenEstimate = useMemo(() => {
    const count = Math.ceil(inputText.length / 4);
    return count > 0 ? `~${count} tokens` : '';
  }, [inputText]);

  return (
    <div className="p-4 bg-white shadow-sm dark:bg-gray-800/20 backdrop-blur-lg border-t border-gray-100 dark:border-gray-700/50">
        {/* ── Mode Selector + Presets Row ── */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar max-w-4xl mx-auto">
            {/* Mode Toggle */}
            <div className="flex items-center rounded-full border border-gray-100 overflow-hidden flex-shrink-0">
              <button
                onClick={() => setQueryMode('quick')}
                className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold uppercase tracking-tight transition-all whitespace-nowrap ${
                  queryMode === 'quick'
                    ? 'bg-gold-gradient text-white'
                    : 'bg-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Zap size={11} /> Quick
              </button>
              <button
                onClick={() => setQueryMode('consensus')}
                className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold uppercase tracking-tight transition-all whitespace-nowrap ${
                  queryMode === 'consensus'
                    ? 'bg-brand-purple text-text-dark'
                    : 'bg-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Brain size={11} /> Consensus
              </button>
            </div>

            <div className="w-px h-4 bg-gray-100 mx-1"></div>

            {/* Search Toggle */}
            <button
                onClick={() => setIsSearchActive(!isSearchActive)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-tight transition-all whitespace-nowrap border ${
                    isSearchActive 
                        ? 'bg-gold-gradient text-white border-[#CFA54D] shadow-lg shadow-brand-blue/20' 
                        : 'bg-gray-100 text-gray-600 border-gray-100 hover:border-[#CFA54D]/50'
                }`}
            >
                <Search size={13} />
                Verified Search
            </button>

            <div className="w-px h-4 bg-gray-100 mx-1"></div>

            {/* Presets */}
            <button
                onClick={() => applyPreset('research')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase bg-white shadow-sm text-gray-600 border border-gray-100 hover:border-brand-purple/50 hover:text-[#B8860B] whitespace-nowrap transition-all"
            >
                <BookOpen size={13} />
                Deep Research
            </button>
            <button
                onClick={() => applyPreset('verify')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase bg-white shadow-sm text-gray-600 border border-gray-100 hover:border-[#CFA54D]/50 hover:text-[#CFA54D] whitespace-nowrap transition-all"
            >
                <ShieldCheck size={13} />
                Hallucination Check
            </button>
            <button
                onClick={() => applyPreset('summarize')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase bg-white shadow-sm text-gray-600 border border-gray-100 hover:border-orange-500/50 hover:text-orange-500 whitespace-nowrap transition-all"
            >
                <Scissors size={13} />
                Summarize
            </button>
            <button
                onClick={() => applyPreset('explain')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase bg-white shadow-sm text-gray-600 border border-gray-100 hover:border-green-500/50 hover:text-green-500 whitespace-nowrap transition-all"
            >
                <HelpCircle size={13} />
                Explain Simply
            </button>
        </div>

        {error && <div className="mb-2 text-center text-red-500 text-sm animate-fade-in">{error}</div>}
        
        {/* ── Input Area ── */}
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder={status === GeminiLiveStatus.LISTENING ? "Listening..." : (queryMode === 'consensus' ? "Ask anything — G-C-G-O consensus active..." : "Quick chat...")}
                    className={`w-full p-3 pr-10 rounded-2xl bg-white dark:bg-gray-700/50 border focus:outline-none focus:ring-2 resize-none min-h-[48px] max-h-32 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm ${
                        isSearchActive 
                        ? 'border-[#CFA54D] focus:ring-brand-blue/30 focus:border-[#CFA54D]' 
                        : queryMode === 'consensus'
                        ? 'border-brand-purple/30 focus:ring-brand-purple/30 focus:border-brand-purple'
                        : 'border-gray-200 dark:border-gray-600 focus:ring-brand-blue/50 focus:border-[#CFA54D]'
                    }`}
                    rows={1}
                    disabled={isInputDisabled}
                />
                {/* ── Inline indicators ── */}
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  {queryTypeBadge}
                  {isSearchActive && (
                    <Search size={14} className="text-[#CFA54D] animate-pulse" />
                  )}
                </div>
            </div>
            
            <MicButton status={status} onClick={handleMicToggle} />
            
            <button
                onClick={handleSend}
                disabled={!inputText.trim() || isInputDisabled}
                aria-label="Send Message"
                className={`flex items-center justify-center w-11 h-11 rounded-full text-text-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:scale-105 ${
                  queryMode === 'consensus'
                    ? 'bg-brand-purple shadow-brand-purple/20 hover:bg-brand-purple/90'
                    : 'bg-gold-gradient shadow-brand-blue/20 hover:bg-gold-gradient/90'
                }`}
            >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
            </button>
        </div>

        {/* ── Footer: Token estimate + voice transcript ── */}
        <div className="max-w-4xl mx-auto mt-1.5 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            {tokenEstimate && (
              <span className="text-[10px] text-gray-600">{tokenEstimate}</span>
            )}
            {queryMode === 'consensus' && (
              <span className="text-[10px] text-[#B8860B]/60 font-mono">G-C-G-O</span>
            )}
          </div>
          {status === GeminiLiveStatus.LISTENING && aiTranscript && (
            <div className="text-[10px] text-gray-500 animate-pulse truncate max-w-[60%]">
              AI: {aiTranscript}
            </div>
          )}
        </div>
    </div>
  );
};
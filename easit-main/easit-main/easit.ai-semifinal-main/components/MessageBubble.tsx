import React, { useState } from 'react';
import type { Message } from '../types.ts';
import { User, Sparkles, Link, ShieldCheck, Copy, Check, ChevronDown, ChevronUp, Clock, Zap, Brain, Eye, Shield, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer.tsx';

interface MessageBubbleProps {
  message: Message;
  isLoading?: boolean;
  onVerify?: () => void;
  onRegenerate?: () => void;
}

// ─── COPY UTILITY ──────────────────────────────────

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* fallthrough */ }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1.5 h-6 px-2">
        <span className="w-2 h-2 bg-gold-gradient/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-2 h-2 bg-brand-purple/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-2 h-2 bg-gold-gradient/60 rounded-full animate-bounce"></span>
    </div>
);

// ─── STREAMING CURSOR ──────────────────────────────

const StreamingCursor: React.FC = () => (
  <span className="inline-block w-2 h-5 bg-gold-gradient ml-0.5 animate-pulse rounded-sm" />
);

// ─── CONFIDENCE BADGE ──────────────────────────────

const ConfidenceBadge: React.FC<{ score: number; verified: boolean }> = ({ score, verified }) => {
  const getColor = () => {
    if (score >= 85) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: ShieldCheck };
    if (score >= 60) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: AlertTriangle };
    return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: AlertTriangle };
  };
  
  const color = getColor();
  const Icon = color.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${color.bg} ${color.border} ${color.text} border`}>
      <Icon size={11} />
      {score}% {verified ? 'Verified' : 'Confidence'}
    </div>
  );
};

// ─── CACHED BADGE ──────────────────────────────────

const CachedBadge: React.FC = () => (
  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
    <Database size={10} />
    Cached
  </div>
);

// ─── AGENT BREAKDOWN PANEL ─────────────────────────

const AGENT_CONFIG = {
  gemini: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: '🔵', label: 'Gemini' },
  claude: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: '🟣', label: 'Claude' },
  grok: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: '🟠', label: 'Grok' },
  openai: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: '🟢', label: 'OpenAI' },
} as const;

const AgentBreakdown: React.FC<{ agents: Message['consensusMetadata'] }> = ({ agents }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!agents?.agentBreakdown || agents.agentBreakdown.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-gray-700 transition-colors"
      >
        <Brain size={12} />
        G-C-G-O Agent Breakdown
        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      
      {isExpanded && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-slide-up-fade-in">
          {agents.agentBreakdown.map((agent, i) => {
            const config = AGENT_CONFIG[agent.agent];
            return (
              <div
                key={i}
                className={`p-3 rounded-xl ${config.bg} ${config.border} border transition-all hover:scale-[1.02]`}
              >
                <div className={`flex items-center gap-2 mb-1.5 ${config.color}`}>
                  <span className="text-sm">{config.icon}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider">{config.label}</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">{agent.label}</p>
                <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{agent.contribution}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── MAIN MESSAGE BUBBLE ───────────────────────────

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLoading = false, onVerify, onRegenerate }) => {
  const [isCopied, setIsCopied] = useState(false);
  const isUser = message.role === 'user';
  const hasSources = message.groundingMetadata && message.groundingMetadata.length > 0;
  const hasConsensus = message.consensusMetadata;
  const isStreaming = message.isStreaming;
  const isFromCache = message.fromCache;

  const handleCopy = async () => {
    const success = await copyToClipboard(message.text);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // ── USER MESSAGE ──
  if (isUser) {
    return (
      <div className="flex items-end gap-3 justify-end animate-slide-up-fade-in">
        <div className="flex flex-col gap-1 max-w-[85%] md:max-w-xl">
          <div className="p-4 rounded-2xl rounded-br-none bg-gold-gradient text-white shadow-lg shadow-brand-blue/10">
            <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
          </div>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-brand-purple shadow-lg shadow-brand-purple/20">
          <User size={16} className="text-text-dark" />
        </div>
      </div>
    );
  }

  // ── AI MESSAGE ──
  return (
    <div className="flex items-end gap-3 justify-start animate-slide-up-fade-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-800 border border-gray-100">
        <Sparkles size={16} className="text-[#CFA54D]" />
      </div>
      <div className="flex flex-col gap-2 max-w-[85%] md:max-w-3xl w-full">
        <div className="p-5 rounded-2xl rounded-bl-none bg-white/[0.03] dark:bg-gray-800/40 text-gray-200 backdrop-blur-sm shadow-sm border border-gray-100 relative group">
          
          {/* ── Header: Consensus metadata ── */}
          {hasConsensus && !isLoading && (
            <div className="flex items-center flex-wrap gap-2 mb-4 pb-3 border-b border-gray-100">
              <ConfidenceBadge 
                score={hasConsensus.confidenceScore} 
                verified={hasConsensus.verificationStatus === 'verified'} 
              />
              {hasConsensus.searchGrounded && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold-light/20 text-[#CFA54D] border border-[#CFA54D]/20">
                  <Eye size={10} />
                  Search Grounded
                </div>
              )}
              {isFromCache && <CachedBadge />}
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-gray-600">
                <Clock size={10} />
                {isFromCache 
                  ? 'Instant'
                  : hasConsensus.responseTimeMs < 1000 
                    ? `${hasConsensus.responseTimeMs}ms` 
                    : `${(hasConsensus.responseTimeMs / 1000).toFixed(1)}s`
                }
              </div>
              {hasConsensus.tokenUsage && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-gray-600">
                  <Zap size={10} />
                  {hasConsensus.tokenUsage.input + hasConsensus.tokenUsage.output} tokens
                </div>
              )}
            </div>
          )}

          {/* ── Body: Rendered content ── */}
          {isLoading ? (
            <TypingIndicator />
          ) : (
            <div>
              <MarkdownRenderer content={message.text} />
              {isStreaming && <StreamingCursor />}
            </div>
          )}

          {/* ── Action buttons (visible on hover) ── */}
          {!isLoading && !isStreaming && (
            <div className="absolute -right-1 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-gray-800/80 border border-gray-100 text-gray-600 hover:text-text-dark transition-colors"
                title="Copy response"
              >
                {isCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
              {onVerify && (
                <button
                  onClick={onVerify}
                  className="p-1.5 rounded-lg bg-gray-800/80 border border-gray-100 text-gray-600 hover:text-[#CFA54D] transition-colors"
                  title="Verify for Hallucinations"
                >
                  <ShieldCheck size={14} />
                </button>
              )}
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1.5 rounded-lg bg-gray-800/80 border border-gray-100 text-gray-600 hover:text-[#B8860B] transition-colors"
                  title="Regenerate response"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Agent Breakdown ── */}
        {hasConsensus && !isLoading && !isStreaming && (
          <AgentBreakdown agents={message.consensusMetadata} />
        )}

        {/* ── Grounding Sources ── */}
        {hasSources && !isLoading && !isStreaming && (
          <div className="animate-fade-in px-1">
            <h4 className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Zap size={10} className="text-[#CFA54D]" /> Verified Sources
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {message.groundingMetadata?.map((source, index) => {
                let hostname = '';
                try { hostname = new URL(source.uri).hostname; } catch { hostname = source.title; }
                return (
                  <a
                    key={index}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] bg-white shadow-sm hover:bg-gray-100 px-2.5 py-1 rounded-full transition-all border border-gray-100 hover:border-[#CFA54D]/30 text-gray-600 hover:text-text-dark"
                    title={source.title}
                  >
                    <Link size={9} />
                    <span className="truncate max-w-[120px]">{hostname}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
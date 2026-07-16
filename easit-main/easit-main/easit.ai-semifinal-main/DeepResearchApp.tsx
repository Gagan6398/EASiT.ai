import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, ArrowLeft, ShieldCheck, Zap, Server, Activity, Database, CheckCircle2, Brain, Eye, Clock, ChevronDown, ChevronUp, Download, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User, Source, ConsensusMetadata, PersonaSettings } from './types.ts';
import { buildSystemInstruction, generateWithConsensus } from './services/gcgoEngine.ts';
import { MarkdownRenderer } from './components/MarkdownRenderer.tsx';
import { useLocalStorage } from './hooks/useLocalStorage.ts';
import { ModelSelector } from './components/ModelSelector.tsx';

interface DeepResearchAppProps {
    user: User;
    onSignOut: () => void;
}

interface ResearchResult {
    query: string;
    response: string;
    sources: Source[];
    consensusMetadata: ConsensusMetadata;
    timestamp: string;
}

// ─── PROGRESS STEPS ────────────────────────────────

const PROGRESS_STEPS = [
    { icon: Search, label: 'Searching the web...', color: 'text-[#CFA54D]' },
    { icon: Database, label: 'Retrieving verified data...', color: 'text-cyan-400' },
    { icon: Brain, label: 'Running G-C-G-O consensus...', color: 'text-[#B8860B]' },
    { icon: ShieldCheck, label: 'Verifying claims...', color: 'text-green-400' },
];

const ProgressIndicator: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    const [step, setStep] = useState(0);
    
    useEffect(() => {
        if (!isActive) { setStep(0); return; }
        const interval = setInterval(() => {
            setStep(prev => (prev + 1) % PROGRESS_STEPS.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [isActive]);

    if (!isActive) return null;
    
    const current = PROGRESS_STEPS[step];
    const Icon = current.icon;

    return (
        <div className="flex justify-start animate-pulse">
            <div className="bg-white shadow-sm border border-gray-100 rounded-3xl rounded-tl-sm p-6 w-full max-w-2xl">
                <div className="flex items-center gap-4">
                    <div className={`${current.color}`}>
                        <Icon size={24} className="animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                    <div className="space-y-1">
                        <p className={`font-bold ${current.color}`}>{current.label}</p>
                        <p className="text-xs text-gray-500">Step {step + 1} of {PROGRESS_STEPS.length} — Multi-agent verification pipeline</p>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="mt-4 h-1 bg-white shadow-sm rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-brand-blue to-brand-purple rounded-full transition-all duration-[2500ms] ease-linear"
                        style={{ width: `${((step + 1) / PROGRESS_STEPS.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

// ─── AGENT CARD ────────────────────────────────────

const AGENT_CONFIG = {
    gemini: { color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/30', text: 'text-blue-400', icon: '🔵' },
    claude: { color: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/30', text: 'text-purple-400', icon: '🟣' },
    grok: { color: 'from-orange-500/20 to-orange-600/5', border: 'border-orange-500/30', text: 'text-orange-400', icon: '🟠' },
    openai: { color: 'from-green-500/20 to-green-600/5', border: 'border-green-500/30', text: 'text-green-400', icon: '🟢' },
} as const;

const AgentCards: React.FC<{ metadata: ConsensusMetadata }> = ({ metadata }) => {
    const [expanded, setExpanded] = useState(false);
    
    return (
        <div className="mt-4">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-gray-700 transition-colors"
            >
                <Brain size={14} />
                Agent Contributions
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expanded && (
                <div className="grid grid-cols-2 gap-3 mt-3 animate-slide-up-fade-in">
                    {metadata.agentBreakdown.map((agent, i) => {
                        const config = AGENT_CONFIG[agent.agent];
                        return (
                            <div key={i} className={`p-4 rounded-xl bg-gradient-to-br ${config.color} ${config.border} border`}>
                                <div className={`flex items-center gap-2 mb-2 ${config.text}`}>
                                    <span className="text-lg">{config.icon}</span>
                                    <span className="text-xs font-bold uppercase tracking-wider">{agent.agent}</span>
                                </div>
                                <p className="text-xs text-gray-600 font-medium mb-1">{agent.label}</p>
                                <p className="text-[11px] text-gray-500 leading-relaxed">{agent.contribution}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── MAIN COMPONENT ────────────────────────────────

const DeepResearchApp: React.FC<DeepResearchAppProps> = ({ user }) => {
    const [query, setQuery] = useState('');
    const [isResearching, setIsResearching] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [results, setResults] = useState<ResearchResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [personaSettings] = useLocalStorage<PersonaSettings>('easit-persona', { tone: 'friendly', verbosity: 'balanced', style: 'casual' });
    const [selectedModelId, setSelectedModelId] = useLocalStorage<string>('easit-selected-model', 'gemini-2.5-pro');
    const navigate = useNavigate();
    const resultsEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [results, streamingText]);

    // ── Keyboard shortcut: Ctrl+Enter to submit ──
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isResearching && query.trim()) {
                e.preventDefault();
                handleResearch();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [query, isResearching]);

    const handleClearResults = () => {
        setResults([]);
        setError(null);
        setStreamingText('');
        inputRef.current?.focus();
    };

    const handleResearch = async () => {
        if (!query.trim()) return;

        setIsResearching(true);
        setError(null);
        setStreamingText('');
        
        const currentQuery = query;
        setQuery('');

        try {
            const systemInstr = buildSystemInstruction(personaSettings, 'consensus');

            const result = await generateWithConsensus({
                query: currentQuery,
                conversationHistory: results.map(r => [
                    { id: `q-${r.timestamp}`, role: 'user' as const, text: r.query, timestamp: r.timestamp },
                    { id: `r-${r.timestamp}`, role: 'model' as const, text: r.response, timestamp: r.timestamp },
                ]).flat(),
                systemInstruction: systemInstr,
                enableSearch: true,
                mode: 'consensus',
                temperature: 0.2,
                model: selectedModelId,
                onChunk: (partialText: string) => {
                    setStreamingText(partialText);
                },
            });

            setStreamingText('');
            setResults(prev => [...prev, {
                query: currentQuery,
                response: result.text,
                sources: result.sources,
                consensusMetadata: result.consensusMetadata,
                timestamp: new Date().toISOString()
            }]);
        } catch (e: any) {
            console.error("Deep Research Error", e);
            setError(e.message || "Failed to conduct deep research. Please verify your API key and connection.");
        } finally {
            setIsResearching(false);
        }
    };

    const handleExportMarkdown = (res: ResearchResult) => {
        const content = `# Research: ${res.query}\n\n_Generated by EASIT.ai G-C-G-O Consensus Architecture_\n_${new Date(res.timestamp).toLocaleString()}_\n\n---\n\n${res.response}\n\n---\n\n## Sources\n${res.sources.map(s => `- [${s.title}](${s.uri})`).join('\n')}`;
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `research_${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-cream-bg text-text-dark flex flex-col font-sans">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-gray-100 bg-white shadow-md border-gray-100 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/chat')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-text-dark"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Database size={20} className="text-[#B8860B]" />
                            Deep Research Engine
                        </h1>
                        <p className="text-xs text-[#B8860B] font-mono tracking-widest uppercase">G-C-G-O Consensus Architecture v2</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {results.length > 0 && (
                        <button
                            onClick={handleClearResults}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-text-dark bg-white shadow-sm border border-gray-100 hover:border-red-500/30 rounded-full transition-colors"
                        >
                            Clear Results
                        </button>
                    )}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#F3E5AB]/20 border border-brand-purple/30 rounded-full">
                        <Activity size={14} className="text-[#B8860B] animate-pulse" />
                        <span className="text-xs font-bold text-[#B8860B]">RAG + STREAMING</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    
                    {results.length === 0 && !isResearching && (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-70 animate-slide-up-fade-in">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 flex items-center justify-center mb-6 border border-gray-100 shadow-[0_0_50px_rgba(139,92,246,0.15)]">
                                <Server size={40} className="text-text-dark" />
                            </div>
                            <h2 className="text-3xl font-bold mb-4">Initialize Deep Research</h2>
                            <p className="max-w-md text-gray-600">
                                Enter a complex query. The system will deploy the G-C-G-O Consensus Architecture with real-time streaming, search the web, and synthesize a rigorously validated, hallucination-free response.
                            </p>
                            <div className="flex items-center gap-4 mt-6">
                                {['🔵 Gemini', '🟣 Claude', '🟠 Grok', '🟢 OpenAI'].map(agent => (
                                    <span key={agent} className="text-xs text-gray-600 font-mono">{agent}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.map((res, index) => (
                        <div key={index} className="space-y-4 animate-slide-up-fade-in">
                            {/* User Query */}
                            <div className="flex justify-end">
                                <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-tr-sm p-4 max-w-[80%] text-text-dark shadow-lg">
                                    <p className="font-medium">{res.query}</p>
                                </div>
                            </div>

                            {/* System Response */}
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 rounded-3xl rounded-tl-sm p-6 w-full shadow-lg">
                                    {/* Header bar */}
                                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck size={16} className={res.consensusMetadata.confidenceScore >= 80 ? 'text-green-400' : 'text-yellow-400'} />
                                                <span className={`text-xs font-bold tracking-widest uppercase ${res.consensusMetadata.confidenceScore >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                    {res.consensusMetadata.confidenceScore}% Confidence
                                                </span>
                                            </div>
                                            {res.consensusMetadata.searchGrounded && (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-light/20 border border-[#CFA54D]/20">
                                                    <Eye size={10} className="text-[#CFA54D]" />
                                                    <span className="text-[10px] font-bold text-[#CFA54D]">SEARCH GROUNDED</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 text-[10px] text-gray-600">
                                                <Clock size={10} />
                                                {res.consensusMetadata.responseTimeMs < 1000
                                                    ? `${res.consensusMetadata.responseTimeMs}ms`
                                                    : `${(res.consensusMetadata.responseTimeMs / 1000).toFixed(1)}s`
                                                }
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleExportMarkdown(res)}
                                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-text-dark transition-colors"
                                            title="Export as Markdown"
                                        >
                                            <Download size={16} />
                                        </button>
                                    </div>
                                    
                                    {/* Rendered markdown content */}
                                    <MarkdownRenderer content={res.response} />

                                    {/* Agent breakdown */}
                                    <AgentCards metadata={res.consensusMetadata} />

                                    {/* Sources */}
                                    {res.sources && res.sources.length > 0 && (
                                        <div className="mt-8 pt-4 border-t border-gray-100">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <Search size={14} /> Grounding Sources ({res.sources.length})
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {res.sources.map((source, i) => (
                                                    <a 
                                                        key={i} 
                                                        href={source.uri} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-xs px-3 py-1.5 bg-gold-light/20 text-[#CFA54D] hover:bg-gold-gradient hover:text-text-dark rounded-md transition-colors border border-[#CFA54D]/20 flex items-center gap-2"
                                                    >
                                                        <CheckCircle2 size={12} />
                                                        {source.title.length > 40 ? source.title.substring(0, 40) + '...' : source.title}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Streaming preview */}
                    {isResearching && streamingText && (
                        <div className="flex justify-start animate-slide-up-fade-in">
                            <div className="bg-white border border-gray-200 rounded-3xl rounded-tl-sm p-6 w-full shadow-lg">
                                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                                    <Loader2 size={14} className="text-[#B8860B] animate-spin" />
                                    <span className="text-[10px] font-bold text-[#B8860B] uppercase tracking-widest">Streaming response...</span>
                                </div>
                                <MarkdownRenderer content={streamingText} />
                                <span className="inline-block w-2 h-5 bg-brand-purple ml-0.5 animate-pulse rounded-sm" />
                            </div>
                        </div>
                    )}

                    {/* Progress indicator (before streaming starts) */}
                    {isResearching && !streamingText && (
                        <ProgressIndicator isActive={true} />
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
                            <AlertTriangle size={18} />
                            {error}
                        </div>
                    )}

                    <div ref={resultsEndRef} />
                </div>
            </main>

            {/* Input Area */}
            <div className="p-4 bg-cream-bg border-t border-gray-100 pb-8">
                <div className="max-w-4xl mx-auto flex items-center mb-3">
                    <ModelSelector selectedModelId={selectedModelId} onSelectModel={setSelectedModelId} />
                </div>
                <div className="max-w-4xl mx-auto relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-brand-blue to-brand-purple rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex items-center bg-white border border-gray-200 rounded-2xl p-2 shadow-lg">
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleResearch()}
                            placeholder="Enter a complex query for deep research... (Ctrl+Enter to submit)"
                            className="flex-1 bg-transparent text-text-dark placeholder-gray-500 px-4 py-3 outline-none"
                            disabled={isResearching}
                        />
                        <button
                            onClick={handleResearch}
                            disabled={!query.trim() || isResearching}
                            className="p-3 bg-brand-purple text-text-dark rounded-xl hover:bg-brand-purple/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Zap size={20} />
                        </button>
                    </div>
                </div>
                <div className="text-center mt-4">
                    <p className="text-xs text-gray-600">Powered by G-C-G-O Consensus Architecture v2 — Streaming + Search Grounding + Multi-Agent Verification</p>
                </div>
            </div>
        </div>
    );
};

export default DeepResearchApp;

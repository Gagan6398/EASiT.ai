import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Settings, Search, Play, ArrowRight, Zap, Code, LayoutDashboard, BrainCircuit, Waves, CheckCircle2, Mic, SlidersHorizontal, Lock, Terminal, Box, Link2 } from 'lucide-react';
import { FooterAssistant } from './FooterAssistant.tsx';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenSignup: () => void;
  onEnterAsGuest: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin, onOpenSignup, onEnterAsGuest }) => {
    const navigate = useNavigate();
    return (
        <div className="bg-[#0f1115] min-h-screen text-gray-200 font-sans selection:bg-[#00F0FF] selection:text-black flex flex-col items-center overflow-x-hidden">
            {/* Navbar */}
            <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-50 animate-slide-up-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <span className="text-2xl font-bold text-white tracking-tight">Easit.AI</span>
                </div>
                <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-gray-400">
                    <Link to="/features" className="hover:text-white transition-colors">Features</Link>
                    <button onClick={() => document.getElementById('research')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">Research</button>
                    <button onClick={onOpenSignup} className="hover:text-white transition-colors">API</button>
                    <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                </nav>
                <div className="flex items-center gap-4">
                    <button onClick={onOpenLogin} className="text-sm font-medium text-gray-300 hover:text-white transition-colors hidden md:block">
                        Sign In
                    </button>
                    <button onClick={onOpenSignup} className="bg-[#00F0FF] text-black px-5 py-2 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] transition-all">
                        Get Started
                    </button>
                </div>
            </header>

            <main className="flex-1 w-full flex flex-col items-center">
                
                {/* Hero Section */}
                <section className="w-full max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
                    <div className="flex-1 text-left animate-slide-up-fade-in" style={{ animationDelay: '0.2s' }}>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-mono font-medium mb-8">
                            <Zap size={14} /> v3.0 Introducing Multi-Source RAG Engine
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
                            Search-<br />Verified<br /><span className="text-[#00F0FF]">Intelligence:</span><br />
                            Meet EASiT.
                        </h1>
                        <p className="text-lg text-gray-400 max-w-xl leading-relaxed mb-10">
                            Generative AI, without hallucination. Seamlessly Integrated. Precision Engineered. EASIT ensures factual accuracy against ground truth before it reaches your system. If Easit can't verify it, it won't say it.
                        </p>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <button onClick={onOpenSignup} className="bg-[#00F0FF] text-black px-8 py-4 rounded-lg font-bold text-lg shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all flex items-center gap-2 w-full sm:w-auto justify-center">
                                Get Started Now <ArrowRight size={20} />
                            </button>
                            <button onClick={() => document.getElementById('research')?.scrollIntoView({ behavior: 'smooth' })} className="border border-gray-700 bg-gray-900/50 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition-all flex items-center gap-2 w-full sm:w-auto justify-center">
                                <Play size={20} /> Watch Demo
                            </button>
                        </div>
                    </div>
                    
                    {/* Hero Graphic (Dashboard UI Mockup) */}
                    <div className="flex-1 w-full max-w-2xl relative animate-slide-up-fade-in" style={{ animationDelay: '0.3s' }}>
                        <div className="absolute -inset-4 bg-gradient-to-tr from-[#00F0FF]/10 to-transparent blur-2xl rounded-full"></div>
                        <div className="relative bg-[#1a1d24] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden shadow-[#00F0FF]/5">
                            {/* Window controls */}
                            <div className="bg-[#12141a] px-4 py-3 flex items-center gap-2 border-b border-gray-800">
                                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                <div className="ml-4 text-xs text-gray-500 font-mono flex gap-4">
                                    <span className="text-[#00F0FF]">Dashboard</span>
                                    <span>Chat</span>
                                    <span>Settings</span>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-4 opacity-80 hover:opacity-100 transition-opacity">
                                <div className="bg-[#242833] p-4 rounded-xl border border-gray-700/50">
                                    <div className="text-xs text-gray-400 mb-2 font-mono">Consensus Health Score</div>
                                    <div className="relative w-32 h-32 mx-auto mt-4">
                                        <svg viewBox="0 0 36 36" className="w-full h-full text-[#00F0FF] stroke-current stroke-[3] fill-none">
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" strokeDasharray="99, 100" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-bold text-white">99</span>
                                            <span className="text-[10px] text-gray-400">Score</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-[#242833] p-4 rounded-xl border border-gray-700/50 flex-1">
                                        <div className="text-xs text-gray-400 mb-2 font-mono">Real-Time Alignment Map</div>
                                        <div className="h-20 w-full opacity-50 relative border-b border-l border-gray-600 mt-2">
                                            <div className="absolute top-[50%] left-[25%] w-2 h-2 bg-[#00F0FF] rounded-full shadow-[0_0_10px_#00F0FF]"></div>
                                            <div className="absolute top-[33%] left-[66%] w-2 h-2 bg-[#00F0FF] rounded-full shadow-[0_0_10px_#00F0FF]"></div>
                                            <div className="absolute top-[75%] left-[50%] w-2 h-2 bg-[#00F0FF] rounded-full shadow-[0_0_10px_#00F0FF]"></div>
                                            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                                <polyline fill="none" stroke="#00F0FF" strokeWidth="1" opacity="0.5" points="0,80 25,50 50,75 66,33 100,20"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="bg-[#242833] p-4 rounded-xl border border-gray-700/50 flex-1">
                                         <div className="text-xs text-gray-400 mb-2 font-mono">Automated Quality Control</div>
                                         <div className="flex items-end gap-1 h-12 mt-2">
                                             <div className="w-full bg-[#00F0FF]/20 h-[40%] rounded-t-sm relative"><div className="absolute top-0 w-full bg-[#00F0FF] h-1"></div></div>
                                             <div className="w-full bg-[#00F0FF]/20 h-[70%] rounded-t-sm relative"><div className="absolute top-0 w-full bg-[#00F0FF] h-1"></div></div>
                                             <div className="w-full bg-[#00F0FF]/20 h-[50%] rounded-t-sm relative"><div className="absolute top-0 w-full bg-[#00F0FF] h-1"></div></div>
                                             <div className="w-full bg-[#00F0FF]/20 h-[90%] rounded-t-sm relative"><div className="absolute top-0 w-full bg-[#00F0FF] h-1"></div></div>
                                             <div className="w-full bg-[#00F0FF]/20 h-[60%] rounded-t-sm relative"><div className="absolute top-0 w-full bg-[#00F0FF] h-1"></div></div>
                                         </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* The Architecture of Truth */}
                <section className="w-full max-w-5xl mx-auto px-6 py-24 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">The Architecture of Truth</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto mb-16">
                        Our proprietary 3-stage RAG verification pipeline fetches data, generates context-aware responses, and deterministically verifies claims against multiple sources.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        {/* Gather */}
                        <div onClick={() => { window.scrollTo(0,0); navigate('/features'); }} className="bg-[#12141a] border border-gray-800 p-6 rounded-2xl hover:border-[#00F0FF]/30 transition-colors group cursor-pointer">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform">
                                <Search size={24} />
                            </div>
                            <div className="text-xs font-mono text-blue-400 mb-2">PHASE 01</div>
                            <h3 className="text-xl font-bold text-white mb-3">Gather</h3>
                            <p className="text-sm text-gray-400">Pre-fetch verified facts from Wikipedia, Wikidata, and DuckDuckGo to establish a baseline of truth.</p>
                        </div>
                        {/* Generate */}
                        <div onClick={() => { window.scrollTo(0,0); navigate('/features'); }} className="bg-[#12141a] border border-gray-800 p-6 rounded-2xl hover:border-purple-500/30 transition-colors group cursor-pointer">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform">
                                <BrainCircuit size={24} />
                            </div>
                            <div className="text-xs font-mono text-purple-400 mb-2">PHASE 02</div>
                            <h3 className="text-xl font-bold text-white mb-3">Generate</h3>
                            <p className="text-sm text-gray-400">Synthesize context-aware responses using advanced Gemini models with injected reference data and live search grounding.</p>
                        </div>
                        {/* Verify & Output */}
                        <div onClick={() => { window.scrollTo(0,0); navigate('/features'); }} className="bg-[#12141a] border border-gray-800 p-6 rounded-2xl hover:border-green-500/30 transition-colors group cursor-pointer">
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-6 text-green-400 group-hover:scale-110 transition-transform">
                                <CheckCircle2 size={24} />
                            </div>
                            <div className="text-xs font-mono text-green-400 mb-2">PHASE 03</div>
                            <h3 className="text-xl font-bold text-white mb-3">Verify & Output</h3>
                            <p className="text-sm text-gray-400">Deterministically extract claims and cross-check them against the gathered facts, providing a final confidence score.</p>
                        </div>
                    </div>
                </section>

                {/* Real-Time Data Processing */}
                <section className="w-full max-w-6xl mx-auto px-6 py-24 border-t border-gray-800/50">
                    <div onClick={() => { window.scrollTo(0,0); navigate('/features'); }} className="bg-[#12141a] border border-gray-800 rounded-3xl p-10 lg:p-16 flex flex-col lg:flex-row items-center gap-16 relative overflow-hidden hover:border-[#00F0FF]/30 transition-colors cursor-pointer group">
                        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#00F0FF]/5 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="flex-1 z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-mono font-medium mb-6">
                                <Waves size={14} /> Live Stream Engine
                            </div>
                            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Real-Time Data<br />Processing</h2>
                            <p className="text-gray-400 leading-relaxed text-lg">
                                Escape the "training data cutoff". Easit fetches live data on the fly, injecting real-time search context directly into the AI's processing matrix before generating a response. Ensures up-to-the-second accuracy.
                            </p>
                        </div>
                        <div className="flex-1 w-full max-w-md z-10 relative">
                            {/* Concentric rings graphic */}
                            <div className="bg-[#1a1d24] border border-gray-800 p-8 rounded-2xl flex flex-col items-center justify-center relative shadow-2xl h-64">
                                <div className="absolute inset-0 overflow-hidden rounded-2xl flex items-center justify-center">
                                    <div className="w-[120%] h-[120%] border border-gray-700/30 rounded-full absolute border-dashed animate-[spin_30s_linear_infinite]"></div>
                                    <div className="w-[80%] h-[80%] border border-purple-500/20 rounded-full absolute animate-[spin_20s_linear_infinite_reverse]"></div>
                                    <div className="w-[40%] h-[40%] border border-[#00F0FF]/30 rounded-full absolute animate-[spin_10s_linear_infinite]"></div>
                                </div>
                                <div className="bg-[#12141a] px-6 py-3 rounded-lg border border-gray-700 relative z-10 flex items-center gap-3">
                                    <Shield className="text-[#00F0FF]" size={20} />
                                    <span className="text-white font-mono text-sm">Ingesting Live Data Streams...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Deep Research Engine */}
                <section id="research" className="w-full max-w-5xl mx-auto px-6 py-24 text-center border-t border-gray-800/50">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Deep Research Engine</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto mb-16 text-lg">
                        Go beyond "quick chat." Deep Research Mode is designed for compiling comprehensive, highly cited reports through autonomous, multi-step synthesis.
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 relative z-10">
                        {/* Quick Chat Mock */}
                        <div className="w-full md:w-[400px] bg-[#12141a] border border-gray-800 rounded-2xl p-6 text-left shadow-xl">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-gray-400 text-sm font-medium">Quick Chat</span>
                            </div>
                            <div className="bg-[#1a1d24] border border-gray-800 rounded-xl p-4 mb-4 text-sm text-gray-300">
                                What is quantum computing?
                            </div>
                            <div className="bg-[#00F0FF]/10 border border-[#00F0FF]/20 rounded-xl p-4 text-sm text-gray-300">
                                Quantum computing is a rapidly-emerging technology...
                            </div>
                        </div>

                        {/* Connection arrow */}
                        <div className="hidden md:block w-8 border-t-2 border-dashed border-gray-700 relative">
                             <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-y-4 border-l-4 border-y-transparent border-l-gray-700 w-0 h-0"></div>
                        </div>

                        {/* Deep Research Mock */}
                        <div className="w-full md:w-[450px] bg-[#12141a] border border-[#00F0FF]/30 rounded-2xl p-6 text-left shadow-[0_0_30px_rgba(0,240,255,0.05)] relative overflow-hidden">
                            <div className="absolute top-0 right-6 bg-[#00F0FF] text-black text-[10px] font-bold px-3 py-1 rounded-b-lg tracking-wider">ACTIVE</div>
                            <div className="flex items-center gap-2 mb-6 text-[#00F0FF]">
                                <Settings size={20} className="animate-spin-slow" />
                                <span className="font-bold text-lg">Deep Research Mode</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                    Querying 14 academic databases...
                                </div>
                                <div className="flex items-center gap-3 text-sm text-[#00F0FF]">
                                    <div className="w-4 h-4 border-2 border-[#00F0FF] rounded-full flex items-center justify-center"><div className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full"></div></div>
                                    Synthesizing 42 authoritative sources...
                                </div>
                                <div className="h-1 w-full bg-gray-800 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full w-2/3 bg-gradient-to-r from-purple-500 to-[#00F0FF]"></div>
                                </div>
                                <div className="text-right text-xs text-[#00F0FF] font-mono mt-1">Generating Comprehensive Report...</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Seamless Voice Interaction */}
                <section className="w-full max-w-4xl mx-auto px-6 py-24 border-t border-gray-800/50 text-center">
                    <div className="mb-6 flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-[#00F0FF]/10 flex items-center justify-center text-[#00F0FF] border border-[#00F0FF]/30 shadow-[0_0_30px_rgba(0,240,255,0.2)]">
                            <Mic size={32} />
                        </div>
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-6">Seamless Voice Interaction</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto mb-10 text-lg">
                        Engage in fluid, real-time conversations utilizing secure WebSockets. Experience near zero-latency communication designed for natural interaction.
                    </p>
                    <div onClick={onOpenSignup} className="inline-flex items-center gap-4 bg-[#12141a] border border-gray-800 rounded-xl p-4 shadow-xl text-left hover:border-purple-500/30 transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm group-hover:text-purple-400 transition-colors">True E2E Encryption + Ephemeral Audio</h4>
                            <p className="text-xs text-gray-500">Audio is ephemeral. Chat histories are fully encrypted on your device using Web Crypto API before saving.</p>
                        </div>
                    </div>
                </section>

                {/* Smart Intelligence Controls */}
                <section className="w-full max-w-6xl mx-auto px-6 py-24 border-t border-gray-800/50">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1">
                            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Smart Intelligence<br />Controls</h2>
                            <p className="text-gray-400 leading-relaxed text-lg mb-8">
                                Instantly adapt the AI's tone, style, and verbosity to your specific needs. Choose from expert personas or configure custom parameters for specialized workflows.
                            </p>
                        </div>
                        <div className="flex-1 w-full">
                            <div className="bg-[#12141a] border border-gray-800 rounded-2xl p-6 shadow-2xl">
                                <div className="text-xs font-mono text-gray-500 mb-4 tracking-widest uppercase">Select Persona</div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                                    <div onClick={onOpenSignup} className="bg-[#1a1d24] border border-[#00F0FF]/50 rounded-xl p-4 text-center cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                                        <Code size={20} className="mx-auto mb-2 text-[#00F0FF]" />
                                        <div className="text-xs font-bold text-[#00F0FF]">Software<br className="hidden sm:block" /> Engineer</div>
                                    </div>
                                    <div onClick={onOpenSignup} className="bg-[#1a1d24] border border-gray-800 hover:border-gray-600 rounded-xl p-4 text-center cursor-pointer transition-colors">
                                        <BrainCircuit size={20} className="mx-auto mb-2 text-gray-400" />
                                        <div className="text-xs font-bold text-gray-400">Academic<br className="hidden sm:block" /> Researcher</div>
                                    </div>
                                    <div onClick={onOpenSignup} className="bg-[#1a1d24] border border-gray-800 hover:border-gray-600 rounded-xl p-4 text-center cursor-pointer transition-colors">
                                        <SlidersHorizontal size={20} className="mx-auto mb-2 text-gray-400" />
                                        <div className="text-xs font-bold text-gray-400">Standard</div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between bg-[#1a1d24] p-4 rounded-lg border border-gray-800">
                                    <span className="text-sm text-gray-400">Verbosity Level</span>
                                    <span className="text-sm text-white font-mono bg-gray-800 px-2 py-1 rounded">Concise</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Precision Engineered Capabilities */}
                <section id="api" className="w-full max-w-6xl mx-auto px-6 py-24 border-t border-gray-800/50">
                    <h2 className="text-3xl font-bold text-white mb-10">Precision Engineered Capabilities</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Big Card */}
                        <div onClick={() => { window.scrollTo(0,0); navigate('/features'); }} className="md:col-span-2 bg-[#12141a] border border-gray-800 rounded-2xl p-8 relative overflow-hidden group hover:border-[#00F0FF]/30 transition-colors cursor-pointer">
                            <div className="relative z-10">
                                <Link2 size={24} className="text-[#00F0FF] mb-6" />
                                <h3 className="text-2xl font-bold text-white mb-4">Search-Verified Reliability</h3>
                                <p className="text-gray-400 text-sm max-w-sm mb-8">
                                    Experience zero-trust AI. Every output undergoes rigorous cross-verification and grounding in real-time data sources before it reaches your screen. We prioritize factual accuracy over generative fluency.
                                </p>
                            </div>
                            <div className="absolute right-0 bottom-0 w-2/3 h-2/3 opacity-40 group-hover:opacity-80 transition-opacity flex items-end justify-end p-4">
                                {/* Abstract network visualization */}
                                <svg viewBox="0 0 200 100" className="w-full h-full stroke-purple-500 fill-none opacity-50">
                                    <path d="M10,50 Q40,20 100,50 T190,50" strokeWidth="2" />
                                    <path d="M10,50 Q40,80 100,50 T190,50" strokeWidth="2" stroke="#00F0FF" />
                                    <circle cx="100" cy="50" r="4" fill="#00F0FF" />
                                    <circle cx="50" cy="35" r="2" fill="#a855f7" />
                                    <circle cx="150" cy="65" r="2" fill="#a855f7" />
                                </svg>
                            </div>
                        </div>

                        {/* Stacked Small Cards */}
                        <div className="flex flex-col gap-6">
                            <div onClick={() => { window.scrollTo(0,0); navigate('/features'); }} className="bg-[#12141a] border border-gray-800 rounded-2xl p-6 hover:border-purple-500/30 transition-colors cursor-pointer">
                                <Search size={24} className="text-purple-400 mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">Deep Research Mode</h3>
                                <p className="text-xs text-gray-500">A groundbreaking reasoning algorithm that enables custom-tailored synthesis to interrelate a cross-domain of sources, building comprehensive and robust reports autonomously.</p>
                            </div>
                            <div onClick={() => { window.scrollTo(0,0); navigate('/features'); }} className="bg-[#12141a] border border-gray-800 rounded-2xl p-6 hover:border-[#00F0FF]/30 transition-colors cursor-pointer">
                                <Settings size={24} className="text-[#00F0FF] mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">Persona Customization</h3>
                                <p className="text-xs text-gray-500">Adapt the AI's tone, verbosity, and expertise level. From strict academic rigor to concise developer assistance, exactly the exact assistance you need at your command.</p>
                            </div>
                        </div>

                        {/* Wide Card Code Snippet */}
                        <div onClick={onOpenSignup} className="md:col-span-3 bg-[#12141a] border border-gray-800 rounded-2xl p-0 overflow-hidden flex flex-col md:flex-row mt-6 cursor-pointer hover:border-[#00F0FF]/30 transition-colors">
                            <div className="p-8 md:w-1/3 flex flex-col justify-center">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-mono font-medium mb-4 w-fit">
                                    <Terminal size={14} /> Live Verification APIs
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Real-Time Hallucination Check</h3>
                                <p className="text-sm text-gray-400">
                                    Powered by Google Search Integration, EASiT constantly cross-references its own statements against the live web. Inconsistencies are flagged, and sources are cited inline for immediate transparency.
                                </p>
                            </div>
                            <div className="bg-[#0b0c0f] p-6 md:w-2/3 border-t md:border-t-0 md:border-l border-gray-800">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span className="ml-2 text-xs text-gray-600 font-mono">verify.js</span>
                                </div>
                                <pre className="text-xs md:text-sm font-mono text-gray-300 overflow-x-auto">
                                    <code>
{`async function verifyClaim(claim, sources) {
  const isVerified = await runConsensusCheck(claim, sources);
  if (!isVerified) {
    throw new HallucinationError("Claim unverified. Dropping.");
  }
  return appendCitation(claim, sources[0]);
}`}
                                    </code>
                                </pre>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Meet the Founder */}
                <section className="w-full max-w-4xl mx-auto px-6 py-24 text-center">
                    <h2 className="text-4xl font-bold text-white mb-10">Meet the Founder</h2>
                    <div className="bg-[#12141a] border border-gray-800 rounded-3xl p-10 flex flex-col md:flex-row items-center md:items-start gap-10 text-left relative overflow-hidden">
                        <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden shrink-0 border border-gray-700 shadow-2xl relative bg-gray-800">
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#00F0FF]/20 to-transparent mix-blend-overlay"></div>
                            {/* Placeholder for founder image */}
                            <img src="/founder.jpg" alt="Gagan Chaudhary" className="w-full h-full object-cover" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold text-white">Gagan Chaudhary</h3>
                            <div className="text-[#00F0FF] text-xs font-bold tracking-widest uppercase mb-4 mt-1">Founder & CEO, EASiT.AI</div>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                As an AI Researcher and the founder of EASiT, Gagan Chaudhary is on a mission to make artificial intelligence truly reliable. With a strong foundation in deep learning and large language models, he leads EASiT's product development, building systems that prioritize factual accuracy over generative fluency. His extensive work with complex models, training pipelines and applied mathematics over recent years, cementing that his framework is indeed powerful but actually grounded in reality.
                            </p>
                            <div className="flex items-center gap-4">
                                <a href="https://linkedin.com/in/gaganchaudhary" target="_blank" rel="noreferrer" className="text-[#00F0FF] bg-[#00F0FF]/10 p-2 rounded hover:bg-[#00F0FF]/20 transition-colors"><div className="w-5 h-5 flex items-center justify-center font-bold">in</div></a>
                                <a href="https://twitter.com/easit_ai" target="_blank" rel="noreferrer" className="text-[#00F0FF] bg-[#00F0FF]/10 p-2 rounded hover:bg-[#00F0FF]/20 transition-colors"><div className="w-5 h-5 flex items-center justify-center font-bold">X</div></a>
                                <a href="https://github.com/Gagan6398" target="_blank" rel="noreferrer" className="text-[#00F0FF] bg-[#00F0FF]/10 p-2 rounded hover:bg-[#00F0FF]/20 transition-colors"><div className="w-5 h-5 flex items-center justify-center font-bold">G</div></a>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="w-full bg-[#0a0b0e] border-t border-gray-800 pt-16 pb-8 px-6">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                    <div>
                        <span className="text-2xl font-bold text-white tracking-tight mb-4 block">Easit.AI</span>
                        <p className="text-xs text-gray-500 max-w-xs">Advanced Intelligence engineered for truth.</p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">Product</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/features" className="hover:text-[#00F0FF] transition-colors">Features</Link></li>
                            <li><button onClick={onOpenSignup} className="hover:text-[#00F0FF] transition-colors">API</button></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">Company</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/about" className="hover:text-[#00F0FF] transition-colors">About</Link></li>
                            <li><Link to="/about" className="hover:text-[#00F0FF] transition-colors">Careers</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/legal" className="hover:text-[#00F0FF] transition-colors">Privacy</Link></li>
                            <li><Link to="/legal" className="hover:text-[#00F0FF] transition-colors">Terms</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto text-center text-xs text-gray-600 border-t border-gray-800/50 pt-8">
                    &copy; {new Date().getFullYear()} Easit.AI. All rights reserved.
                </div>
            </footer>

            <FooterAssistant />
        </div>
    );
};

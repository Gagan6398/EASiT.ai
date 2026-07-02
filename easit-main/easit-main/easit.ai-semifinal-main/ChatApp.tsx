import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatView } from './components/ChatView.tsx';
import { TopBar } from './components/TopBar.tsx';
import { Modal } from './components/Modal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { ToastContainer, type ToastMessage, type ToastType } from './components/Toast.tsx';
import type { Conversation, Message, User, PersonaSettings, ConnectionStatus, Source, QueryMode } from './types.ts';
import { useLocalStorage } from './hooks/useLocalStorage.ts';
import { WelcomeScreen } from './components/WelcomeScreen.tsx';
import apiService from './services/apiService.ts';
import { websocketService } from './services/websocketService.ts';
import { 
  buildSystemInstruction, 
  generateWithConsensus, 
  classifyQuery, 
  generateTitle,
  type ConsensusResult 
} from './services/gcgoEngine.ts';
import { responseCache } from './services/responseCache.ts';

interface ChatAppProps {
  user: User;
  onSignOut: () => void;
}

const DEFAULT_PERSONA: PersonaSettings = {
    tone: 'friendly',
    verbosity: 'balanced',
    style: 'casual'
};

const ChatApp: React.FC<ChatAppProps> = ({ user, onSignOut }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [personaSettings, setPersonaSettings] = useLocalStorage<PersonaSettings>('easit-persona', DEFAULT_PERSONA);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [queryMode, setQueryMode] = useLocalStorage<QueryMode>('easit-query-mode', 'consensus');
  
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  
  // Abort controller for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Ref to always have latest conversations (fixes stale closure bug)
  const conversationsRef = useRef<Conversation[]>([]);
  conversationsRef.current = conversations;

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now().toString() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── BUILD SYSTEM INSTRUCTION (G-C-G-O Powered) ───
  const systemInstruction = useMemo(() => {
    return buildSystemInstruction(personaSettings, queryMode);
  }, [personaSettings, queryMode]);

  useEffect(() => {
      const handleStatusChange = (status: ConnectionStatus) => {
          setConnectionStatus(status);
      };

      websocketService.addStatusListener(handleStatusChange);
      return () => {
          websocketService.removeStatusListener(handleStatusChange);
      };
  }, []);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const storedConversations = await apiService.getConversations();
        setConversations(storedConversations);
    } catch (err: any) {
        console.error("Failed to load conversations:", err);
        setError("Failed to load your conversations.");
        addToast(err.message || "Failed to load conversations", 'error');
    } finally {
        setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);
  
  useEffect(() => {
      if (!isLoading && user.email === 'guest@solveearn.com') {
          localStorage.setItem('easit-guest-conversations', JSON.stringify(conversations));
      }
  }, [conversations, user, isLoading]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleAiMessage = useCallback((data: any) => {
    if (data.type === 'aiMessage') {
        const { conversationId, message } = data.payload;
        setConversations(prev => {
            return prev.map(c => {
                if (c.id === conversationId) {
                    return { ...c, messages: [...c.messages, message] };
                }
                return c;
            });
        });
    } else if (data.type === 'error') {
        addToast(data.payload.message || 'An error occurred', 'error');
    }
  }, [addToast]);

  useEffect(() => {
      websocketService.addMessageListener(handleAiMessage);
      return () => {
          websocketService.removeMessageListener(handleAiMessage);
      };
  }, [handleAiMessage]);


  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  const handleNewConversation = useCallback(() => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    setIsMobileSidebarOpen(false);
  }, []);
  
  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setIsMobileSidebarOpen(false);
  }, []);

  // ─── CORE: ADD MESSAGE + GENERATE AI RESPONSE ───
  const addMessageToConversation = useCallback(async (conversationId: string, message: Message) => {
    // 1. Add user message to conversation
    setConversations(prev => prev.map(c => {
        if (c.id === conversationId) {
            return { ...c, messages: [...c.messages, message] };
        }
        return c;
    }));

    const token = localStorage.getItem('easit-jwt');
    const isGuest = token && token.includes('guest-demo-token');

    if (isGuest && message.role === 'user') {
        // Cancel any in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            // Get current conversation for history using ref (fixes stale closure)
            const currentConv = conversationsRef.current.find(c => c.id === conversationId);
            const history = currentConv ? currentConv.messages : [];
            
            // Classify query for smart search
            const classification = classifyQuery(message.text);
            const shouldSearch = isSearchActive || classification.shouldSearch;
            const effectiveMode = queryMode === 'consensus' || classification.type === 'research' ? 'consensus' : 'quick';
            
            // Build system instruction for current mode
            const sysInstr = buildSystemInstruction(personaSettings, effectiveMode);

            // ── CHECK CACHE FIRST ──
            const cachedResult = responseCache.get(message.text, shouldSearch);
            if (cachedResult) {
              const cachedMessage: Message = {
                id: `ai-cached-${Date.now()}`,
                role: 'model',
                text: cachedResult.text,
                timestamp: new Date().toISOString(),
                groundingMetadata: cachedResult.sources.length > 0 ? cachedResult.sources : undefined,
                consensusMetadata: {
                  ...cachedResult.consensusMetadata,
                  responseTimeMs: 0, // Instant from cache
                },
                isStreaming: false,
                fromCache: true,
              };

              setConversations(prev => prev.map(c =>
                c.id === conversationId ? { ...c, messages: [...c.messages, cachedMessage] } : c
              ));
              return;
            }

            // ── CHECK IN-FLIGHT DEDUPLICATION ──
            const inFlight = responseCache.getInFlight(message.text, shouldSearch);
            if (inFlight) {
              const result = await inFlight;
              const dedupMessage: Message = {
                id: `ai-dedup-${Date.now()}`,
                role: 'model',
                text: result.text,
                timestamp: new Date().toISOString(),
                groundingMetadata: result.sources.length > 0 ? result.sources : undefined,
                consensusMetadata: result.consensusMetadata,
                isStreaming: false,
              };
              setConversations(prev => prev.map(c =>
                c.id === conversationId ? { ...c, messages: [...c.messages, dedupMessage] } : c
              ));
              return;
            }

            // Create placeholder streaming message
            const streamingMsgId = `ai-${Date.now()}`;
            const streamingMessage: Message = {
              id: streamingMsgId,
              role: 'model',
              text: '',
              timestamp: new Date().toISOString(),
              isStreaming: true,
            };

            setConversations(prev => prev.map(c =>
              c.id === conversationId ? { ...c, messages: [...c.messages, streamingMessage] } : c
            ));

            // Generate with consensus engine (streaming)
            const generatePromise = generateWithConsensus({
              query: message.text,
              conversationHistory: history,
              systemInstruction: sysInstr,
              enableSearch: shouldSearch,
              mode: effectiveMode,
              temperature: effectiveMode === 'consensus' ? 0.3 : 0.7,
              signal: abortController.signal,
              onChunk: (partialText: string) => {
                // Update the streaming message in real-time
                setConversations(prev => prev.map(c => {
                  if (c.id === conversationId) {
                    return {
                      ...c,
                      messages: c.messages.map(m =>
                        m.id === streamingMsgId
                          ? { ...m, text: partialText }
                          : m
                      ),
                    };
                  }
                  return c;
                }));
              },
            });

            // Register in-flight for deduplication
            responseCache.setInFlight(message.text, shouldSearch, generatePromise);

            const result = await generatePromise;

            // Finalize the message with full metadata
            const finalMessage: Message = {
              id: streamingMsgId,
              role: 'model',
              text: result.text,
              timestamp: new Date().toISOString(),
              groundingMetadata: result.sources.length > 0 ? result.sources : undefined,
              consensusMetadata: result.consensusMetadata,
              isStreaming: false,
            };

            setConversations(prev => prev.map(c => {
              if (c.id === conversationId) {
                return {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === streamingMsgId ? finalMessage : m
                  ),
                };
              }
              return c;
            }));

            // Cache the result
            responseCache.set(message.text, shouldSearch, result);

            // Auto-generate title on first user message
            if (history.length === 0) {
              generateTitle(message.text).then(title => {
                setConversations(prev => prev.map(c =>
                  c.id === conversationId ? { ...c, title } : c
                ));
              });
            }

        } catch (e: any) {
            if (e.name === 'AbortError') return;
            
            console.error("G-C-G-O Engine Error", e);
            addToast("Failed to generate response: " + e.message, 'error');
            
            const errorMessage: Message = {
                id: `err-${Date.now()}`,
                role: 'model',
                text: "I'm having trouble connecting right now. Please check your API key and try again.",
                timestamp: new Date().toISOString()
            };
            setConversations(prev => prev.map(c => {
              if (c.id === conversationId) {
                // Remove streaming message, add error
                const filtered = c.messages.filter(m => !m.isStreaming);
                return { ...c, messages: [...filtered, errorMessage] };
              }
              return c;
            }));
        }
    } else if (!isGuest) {
        try {
            websocketService.sendMessage('chatMessage', { 
                conversationId, 
                userMessage: message, 
                systemInstruction,
                searchEnabled: isSearchActive 
            });
        } catch (e: any) {
             addToast("Connection error: Message not sent.", 'error');
        }
    }
  }, [systemInstruction, addToast, isSearchActive, queryMode, personaSettings]);

  // ─── REGENERATE HANDLER ───
  const handleRegenerateMessage = useCallback((conversationId: string, originalUserMessage: Message) => {
    // Remove the last AI response and re-send the user message
    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        // Find the user message index and remove everything after it
        const userMsgIndex = c.messages.findIndex(m => m.id === originalUserMessage.id);
        if (userMsgIndex >= 0) {
          return { ...c, messages: c.messages.slice(0, userMsgIndex) };
        }
      }
      return c;
    }));
    
    // Re-send the same user message
    setTimeout(() => {
      addMessageToConversation(conversationId, {
        ...originalUserMessage,
        id: `msg-regen-${Date.now()}`,
        timestamp: new Date().toISOString(),
      });
    }, 100);
  }, [addMessageToConversation]);

  // ─── VERIFICATION HANDLER ───
  const handleVerifyMessage = useCallback((conversationId: string, messageToVerify: Message) => {
      const verificationPrompt = `Please perform a "Hallucination Check" on your previous response. Verify the following content against the sources you found: "${messageToVerify.text.slice(0, 2000)}". Confirm if all statements are grounded in reality or if any parts were hallucinated. Use Google Search to cross-reference claims.`;
      
      const userMsg: Message = {
          id: `verify-req-${Date.now()}`,
          role: 'user',
          text: verificationPrompt,
          timestamp: new Date().toISOString()
      };

      // Force search + consensus for verification
      setIsSearchActive(true);
      setQueryMode('consensus');
      addMessageToConversation(conversationId, userMsg);
  }, [addMessageToConversation]);

  const handleSaveConversation = useCallback(() => {
    if (!activeConversation) {
        addToast('No active conversation to save', 'info');
        return;
    }
    try {
        const title = activeConversation.title || 'Conversation';
        const date = new Date(activeConversation.createdAt).toLocaleDateString();
        let content = `Title: ${title}\nDate: ${date}\n\n`;
        activeConversation.messages.forEach(msg => {
            const role = msg.role === 'user' ? 'You' : 'Easit.ai';
            const time = new Date(msg.timestamp).toLocaleTimeString();
            content += `[${time}] ${role}:\n${msg.text}\n\n`;
        });
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_').toLowerCase()}_transcript.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('Conversation saved successfully', 'success');
    } catch (e) {
        addToast('Failed to save conversation', 'error');
    }
  }, [activeConversation, addToast]);

  const getModalContent = (modalTitle: string) => {
      switch (modalTitle.toLowerCase()) {
          case 'about': return <p>Easit.ai is a next-generation AI assistant powered by the G-C-G-O Consensus Architecture — delivering hallucination-free, multi-agent verified responses.</p>;
          case 'privacy': return <p>Your privacy is important. Conversations are securely stored in your account. Voice interactions are processed in-memory and never stored as audio.</p>;
          case 'contact us': return <p>Contact us at <a href="mailto:support@easit.ai" className="text-[#CFA54D] hover:underline">support@easit.ai</a>.</p>;
          case 'account': return <p>You are signed in as {user.email}.</p>;
          default: return <p>Content not available.</p>;
      }
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-t-transparent border-[#CFA54D] rounded-full animate-spin"></div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={loadConversations} className="bg-gold-gradient text-white px-4 py-2 rounded-lg font-semibold hover:bg-gold-gradient/90 transition-colors">Retry</button>
        </div>
      );
    }
    if (activeConversation) {
      return <ChatView 
        key={activeConversation.id} 
        conversation={activeConversation} 
        addMessage={addMessageToConversation} 
        onVerifyMessage={handleVerifyMessage}
        onRegenerateMessage={handleRegenerateMessage}
        systemInstruction={systemInstruction}
        isSearchActive={isSearchActive}
        setIsSearchActive={setIsSearchActive}
        queryMode={queryMode}
        setQueryMode={setQueryMode}
      />;
    }
    return <WelcomeScreen onNewConversation={handleNewConversation} />;
  };

  return (
    <div className="flex h-screen w-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans overflow-hidden">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <Sidebar conversations={conversations} activeConversationId={activeConversationId} onSelectConversation={handleSelectConversation} onNewConversation={handleNewConversation} isMobileOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
      <main className="flex flex-1 flex-col transition-all duration-300 md:pl-64">
        <TopBar 
          user={user} 
          onSignOut={onSignOut} 
          onToggleSidebar={() => setIsMobileSidebarOpen(true)} 
          onNewConversation={handleNewConversation}
          onShowModal={setActiveModal} 
          onShowSettings={() => setSettingsModalVisible(true)} 
          onSaveConversation={handleSaveConversation} 
          conversationTitle={activeConversation?.title} 
          connectionStatus={connectionStatus} 
        />
        <div className="flex-1 overflow-hidden">{renderContent()}</div>
      </main>
      {isSettingsModalVisible && <SettingsModal settings={personaSettings} onUpdate={setPersonaSettings} onClose={() => setSettingsModalVisible(false)} />}
      {activeModal && <Modal title={activeModal} onClose={() => setActiveModal(null)}>{getModalContent(activeModal)}</Modal>}
    </div>
  );
};

export default ChatApp;
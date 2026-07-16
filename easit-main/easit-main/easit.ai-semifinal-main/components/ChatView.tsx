import React, { useEffect, useRef, useMemo } from 'react';
import type { Conversation, Message, QueryMode } from '../types.ts';
import { MessageBubble } from './MessageBubble.tsx';
import { ChatInput } from './ChatInput.tsx';

interface ChatViewProps {
  conversation: Conversation;
  addMessage: (conversationId: string, message: Message) => void;
  onVerifyMessage: (conversationId: string, message: Message) => void;
  onRegenerateMessage: (conversationId: string, originalUserMessage: Message) => void;
  systemInstruction: string;
  isSearchActive: boolean;
  setIsSearchActive: (active: boolean) => void;
  queryMode: QueryMode;
  setQueryMode: (mode: QueryMode) => void;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ 
  conversation, 
  addMessage, 
  onVerifyMessage,
  onRegenerateMessage,
  systemInstruction, 
  isSearchActive, 
  setIsSearchActive,
  queryMode,
  setQueryMode,
  selectedModelId,
  onSelectModel,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  // Derive loading state from messages — no separate useState needed
  // Loading = last message is from user AND there's no streaming/completed AI response after it
  const isLoading = useMemo(() => {
    const msgs = conversation.messages;
    if (msgs.length === 0) return false;
    const lastMsg = msgs[msgs.length - 1];
    // Loading only if the last message is a user message (no AI response yet)
    return lastMsg.role === 'user';
  }, [conversation.messages]);

  // Don't show the typing indicator if the last message is a streaming AI message
  const showTypingIndicator = useMemo(() => {
    const msgs = conversation.messages;
    if (msgs.length === 0) return false;
    const lastMsg = msgs[msgs.length - 1];
    // Show typing only if last is user message (AI hasn't started responding)
    return lastMsg.role === 'user';
  }, [conversation.messages]);

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    addMessage(conversation.id, userMessage);
  };
  
  const handleSendVoiceMessage = (userText: string, aiText: string) => {
    const userTextTrimmed = userText.trim();
    if (userTextTrimmed) {
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        text: userTextTrimmed,
        timestamp: new Date().toISOString(),
      };
      addMessage(conversation.id, userMessage);
    }

    if (aiText.trim()) {
        const aiMessage: Message = {
            id: `msg-${Date.now() + 1}`,
            role: 'model',
            text: aiText.trim(),
            timestamp: new Date().toISOString(),
        };
        addMessage(conversation.id, aiMessage);
    }
  };

  // Find the user message that preceded each AI message (for regenerate)
  const findPrecedingUserMessage = (aiMessageIndex: number): Message | null => {
    for (let i = aiMessageIndex - 1; i >= 0; i--) {
      if (conversation.messages[i].role === 'user') {
        return conversation.messages[i];
      }
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.3),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(124,58,237,0.3),rgba(255,255,255,0))]">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {conversation.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50 text-center px-4">
             <p className="text-lg font-medium">No messages yet.</p>
             <p className="text-sm">Try one of the enhanced prompt presets below!</p>
          </div>
        ) : (
          conversation.messages.map((message, index) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              onVerify={() => onVerifyMessage(conversation.id, message)}
              onRegenerate={
                message.role === 'model' && !message.isStreaming
                  ? () => {
                      const userMsg = findPrecedingUserMessage(index);
                      if (userMsg) onRegenerateMessage(conversation.id, userMsg);
                    }
                  : undefined
              }
            />
          ))
        )}
        {showTypingIndicator && (
            <MessageBubble 
                message={{ id: 'loading', role: 'model', text: '...', timestamp: ''}} 
                isLoading={true} 
            />
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput
        onSendMessage={handleSendMessage}
        onSendVoiceMessage={handleSendVoiceMessage}
        isLoading={isLoading}
        systemInstruction={systemInstruction}
        isSearchActive={isSearchActive}
        setIsSearchActive={setIsSearchActive}
        queryMode={queryMode}
        setQueryMode={setQueryMode}
        selectedModelId={selectedModelId}
        onSelectModel={onSelectModel}
      />
    </div>
  );
};
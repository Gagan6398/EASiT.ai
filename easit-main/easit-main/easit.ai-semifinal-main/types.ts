

export type Role = 'user' | 'model';

export type QueryMode = 'quick' | 'consensus';

export interface Source {
  uri: string;
  title: string;
}

export interface AgentPerspective {
  agent: 'gemini' | 'claude' | 'grok' | 'openai';
  label: string;
  contribution: string;
}

export interface ConsensusMetadata {
  confidenceScore: number;
  agentBreakdown: AgentPerspective[];
  verificationStatus: 'pending' | 'verified' | 'partial' | 'unverified';
  searchGrounded: boolean;
  tokenUsage?: { input: number; output: number };
  responseTimeMs: number;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: string;
  groundingMetadata?: Source[];
  consensusMetadata?: ConsensusMetadata;
  isStreaming?: boolean;
  fromCache?: boolean;
}

export interface Conversation {
  id:string;
  title: string;
  messages: Message[];
  createdAt: string;
}

export type Theme = 'light' | 'dark';

export enum GeminiLiveStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  ERROR = 'ERROR',
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export interface User {
  name: string;
  email: string;
  picture?: string;
}

export interface PersonaSettings {
  tone: 'friendly' | 'professional' | 'humorous' | 'empathetic';
  verbosity: 'concise' | 'balanced' | 'detailed';
  style: 'casual' | 'formal' | 'technical';
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// Add type definitions for the Google Identity Services client library
// This allows for type-safe access to the `google` global object
declare global {
  const google: {
    accounts: {
      id: {
        initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void; }) => void;
        renderButton: (
          parent: HTMLElement, 
          options: {
            theme?: 'outline' | 'filled_blue' | 'filled_black';
            size?: 'large' | 'medium' | 'small';
            type?: 'standard' | 'icon';
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
            width?: string;
          }
        ) => void;
      }
    }
  }
}
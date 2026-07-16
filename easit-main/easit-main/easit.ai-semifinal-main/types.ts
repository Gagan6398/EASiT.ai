

export type Role = 'user' | 'model';

export type QueryMode = 'quick' | 'verified';

export interface Source {
  uri: string;
  title: string;
}

export interface ClaimCheck {
  claim: string;
  verified: boolean;
  matchedSource?: string;
}

export interface VerificationMetadata {
  confidenceScore: number;
  verificationStatus: 'pending' | 'verified' | 'partial' | 'unverified';
  searchGrounded: boolean;
  totalClaims: number;
  verifiedClaims: number;
  verificationRate: number;
  claimChecks?: ClaimCheck[];
  tokenUsage?: { input: number; output: number };
  responseTimeMs: number;
  factSourcesUsed: number; // How many free sources contributed data
}

// Legacy alias for backwards compatibility with existing components
export type ConsensusMetadata = VerificationMetadata;

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: string;
  groundingMetadata?: Source[];
  consensusMetadata?: VerificationMetadata;
  isStreaming?: boolean;
  fromCache?: boolean;
}

export interface Conversation {
  id:string;
  title: string;
  messages: Message[];
  createdAt: string;
  encrypted?: boolean; // Flag for E2E encrypted conversations
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

// ─── Model Marketplace Types ───

export interface ModelInfo {
  id: string;               // e.g., 'gemini-2.5-flash', 'openai/gpt-4o'
  name: string;             // Display name: "Gemini 2.5 Flash"
  provider: string;         // "google", "openai", "anthropic", "meta", etc.
  tier: 'free' | 'premium'; // Free (Gemini) vs Premium (OpenRouter)
  inputPricePer1k: number;  // Cost per 1K input tokens in cents (after 1.5x markup)
  outputPricePer1k: number; // Cost per 1K output tokens in cents (after 1.5x markup)
  contextWindow: number;    // Max context window
  description: string;      // Short description
  icon?: string;            // Emoji or icon
}

export interface UserCredits {
  balanceCents: number;
  totalSpentCents: number;
}

// Kept for backwards compatibility — no longer used for Google Identity
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
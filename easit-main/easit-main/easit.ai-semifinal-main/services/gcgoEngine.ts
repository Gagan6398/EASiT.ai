/**
 * EASIT.ai — Verified AI Engine Client v3.0
 * 
 * Proxies generation requests to the secure serverless backend (/api/chat)
 * which handles the 3-stage RAG Verification Pipeline securely.
 */

import type { Message, Source, VerificationMetadata, PersonaSettings, QueryMode } from '../types.js';
import { getApiKey } from './apiService.js'; // We'll assume the user has a key

// ─────────────────────────────────────────────────────
// 1. QUERY CLASSIFICATION (Client-side for UI responsiveness)
// ─────────────────────────────────────────────────────

export type QueryType = 'factual' | 'creative' | 'code' | 'research' | 'casual';

const FACTUAL_INDICATORS = [
  'what is', 'who is', 'when did', 'where is', 'how many', 'how much',
  'current', 'latest', 'today', 'yesterday', 'this year', '2024', '2025', '2026', '2027',
  'price of', 'stock', 'weather', 'news', 'score', 'result',
  'population', 'gdp', 'capital of', 'president', 'ceo',
  'statistics', 'data', 'number of', 'percentage', 'rate',
];

const CODE_INDICATORS = [
  'write code', 'write a function', 'implement', 'debug', 'fix this code',
  'python', 'javascript', 'typescript', 'react', 'algorithm',
  'class', 'function', 'api', 'database', 'sql', 'html', 'css',
  'error', 'bug', 'compile', 'runtime', 'syntax',
];

const CASUAL_INDICATORS = [
  'hello', 'hi', 'hey', 'how are you', 'thanks', 'thank you',
  'good morning', 'good night', 'bye', 'ok', 'sure', 'cool',
  'what can you do', 'who are you', 'your name',
];

export function classifyQuery(query: string): { type: QueryType; shouldSearch: boolean } {
  const lower = query.toLowerCase().trim();
  if (lower.length < 40 && CASUAL_INDICATORS.some(ind => lower.includes(ind))) {
    return { type: 'casual', shouldSearch: false };
  }
  if (CODE_INDICATORS.some(ind => lower.includes(ind)) || /```/.test(query)) {
    return { type: 'code', shouldSearch: false };
  }
  if (FACTUAL_INDICATORS.some(ind => lower.includes(ind))) {
    return { type: lower.length > 100 ? 'research' : 'factual', shouldSearch: true };
  }
  if (lower.length > 150) {
    return { type: 'research', shouldSearch: true };
  }
  return { type: 'creative', shouldSearch: false };
}

// ─────────────────────────────────────────────────────
// 1.5 SYSTEM PROMPT (Iterative Synthesis & Professional Mode)
// ─────────────────────────────────────────────────────

const CORE_IDENTITY = `You are EASIT.ai — an elite, lightning-fast AI assistant powered by Google Gemini and advanced search grounding.

## CORE DIRECTIVES
- Your responses must be PERFECTLY STRUCTURED, HIGHLY PROFESSIONAL, and 100% NON-REDUNDANT.
- Deliver information immediately without fluff, filler words, or repeating the user's prompt.
- Never hallucinate. If data is unknown or missing from your search context, state it clearly.
- Your identity is EASIT.ai. Never claim to be another AI.`;

const OUTPUT_FORMAT = `
## RESPONSE ARCHITECTURE
1. **Direct Answer**: The precise answer in 1-2 powerful sentences.
2. **Key Insights**: Bulleted list of verified facts, data points, or code snippets. Use tables if comparing data.
3. **Data Confidence**: Briefly state confidence level based on retrieved sources (e.g., "Verified via real-time search").
- Avoid meta-commentary like "Here is the response" or "I have conducted deep research". Just deliver the output.`;

const QUICK_MODE = `
## CASUAL/QUICK MODE
- Answer instantly and warmly.
- No structural overhead (no headers) unless needed for clarity.`;

const PERSONA_MAPS = {
  tone: {
    friendly: "Tone: Professional but accessible.",
    professional: "Tone: Strictly formal, objective, and authoritative.",
    humorous: "Tone: Witty but maintain high accuracy.",
    empathetic: "Tone: Supportive and highly responsive."
  },
  verbosity: {
    concise: "Verbosity: Ultra-concise. Maximize information density.",
    balanced: "Verbosity: Balanced. Clear, structured, zero redundancy.",
    detailed: "Verbosity: Comprehensive, exhaustively researched, structured with headings."
  },
  style: {
    casual: "Style: Clear, modern plain English.",
    formal: "Style: Academic/Executive briefing standard.",
    technical: "Style: Expert-level technical precision."
  }
} as const;

export function buildSystemInstruction(
  persona: PersonaSettings,
  mode: QueryMode = 'verified'
): string {
  const toneInstr = PERSONA_MAPS.tone[persona.tone] || PERSONA_MAPS.tone.friendly;
  const verbInstr = PERSONA_MAPS.verbosity[persona.verbosity] || PERSONA_MAPS.verbosity.balanced;
  const styleInstr = PERSONA_MAPS.style[persona.style] || PERSONA_MAPS.style.casual;

  const personaBlock = `\n## EXECUTION PARAMETERS\n- ${toneInstr}\n- ${verbInstr}\n- ${styleInstr}`;

  if (mode === 'quick') {
    return `${CORE_IDENTITY}\n${personaBlock}\n${QUICK_MODE}`;
  }
  
  if (mode === 'consensus') {
    // Specialized prompt for Deep Research
    return `${CORE_IDENTITY}
    
## DEEP RESEARCH PROTOCOL
You are acting as the EASIT.ai Deep Research Engine.
1. Synthesize all retrieved search data meticulously.
2. Cross-validate conflicting claims.
3. Structure the final report with:
   - Executive Summary
   - Comprehensive Analysis (use headers, tables, bullet points)
   - Source Confidence Assessment
4. DO NOT explain your methodology. Produce the final report immediately.
${personaBlock}`;
  }

  return `${CORE_IDENTITY}\n${OUTPUT_FORMAT}\n${personaBlock}`;
}

// ─────────────────────────────────────────────────────
// 2. SERVER COMMUNICATION (Streaming)
// ─────────────────────────────────────────────────────

export interface GenerateOptions {
  query: string;
  conversationHistory?: Message[];
  persona?: PersonaSettings;
  enableSearch?: boolean;
  onChunk?: (partialText: string) => void;
  signal?: AbortSignal;
  model?: string;         // Selected model ID (e.g., 'gemini-2.5-flash', 'openai/gpt-4o')
  systemInstruction?: string;
  mode?: string;
  temperature?: number;
}

export interface ConsensusResult {
  text: string;
  sources: Source[];
  consensusMetadata: VerificationMetadata;
}

export async function generateWithConsensus(options: GenerateOptions): Promise<ConsensusResult> {
  const apiKey = getApiKey();
  
  if (!options.onChunk) {
    // Non-streaming fallback
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query: options.query,
        conversationHistory: options.conversationHistory,
        persona: options.persona,
        enableSearch: options.enableSearch,
        stream: false,
        model: options.model || 'gemini-2.5-flash'
      }),
      signal: options.signal
    });
    
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return {
      text: data.text,
      sources: data.sources,
      consensusMetadata: data.verificationReport
    };
  }

  // Streaming request via SSE
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query: options.query,
      conversationHistory: options.conversationHistory,
      persona: options.persona,
      enableSearch: options.enableSearch,
      stream: true,
      model: options.model || 'gemini-2.5-flash'
    }),
    signal: options.signal
  });

  if (!res.ok) throw new Error(await res.text());
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let finalSources: Source[] = [];
  let finalMetadata: any = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          let data;
          try {
            data = JSON.parse(line.slice(6));
          } catch (e) {
            continue; // Ignore incomplete JSON chunks, wait for the rest
          }
          
          if (data.error) throw new Error(data.error);
          
          if (data.correction && data.text) {
             fullText = data.text;
             options.onChunk(fullText);
          } else if (data.text) {
            fullText += data.text;
            options.onChunk(fullText);
          }
          
          if (data.done) {
            finalSources = data.sources || [];
            finalMetadata = data.verificationReport;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Parse confidence for the metadata
  const modelConfidenceMatch = fullText.match(/\*{0,2}Confidence:\s*(\d{1,3})%/i);
  const modelConfidence = modelConfidenceMatch ? Math.min(100, Math.max(0, parseInt(modelConfidenceMatch[1], 10))) : 65;

  let finalConfidence = modelConfidence;
  if (finalMetadata && finalMetadata.claims && finalMetadata.claims.length > 0) {
     finalConfidence = Math.round((modelConfidence * 0.4) + (finalMetadata.adjustedConfidence * 0.6));
  } else if (!finalMetadata) {
    // Fallback if verification report missing
    finalMetadata = {
      totalClaims: 0,
      verifiedClaims: 0,
      unverifiedClaims: 0,
      verificationRate: 0,
      claims: [],
      adjustedConfidence: modelConfidence
    };
  }

  const consensusMetadata: VerificationMetadata = {
    confidenceScore: finalConfidence,
    verificationStatus: finalSources.length > 0 
      ? (finalMetadata.verificationRate >= 60 ? 'verified' : 'partial')
      : 'unverified',
    searchGrounded: finalSources.length > 0,
    totalClaims: finalMetadata.totalClaims || 0,
    verifiedClaims: finalMetadata.verifiedClaims || 0,
    verificationRate: finalMetadata.verificationRate || 0,
    claimChecks: finalMetadata.claims || [],
    responseTimeMs: finalMetadata.responseTimeMs || 0,
    factSourcesUsed: finalSources.filter(s => s.title.startsWith('[')).length
  };

  return {
    text: fullText,
    sources: finalSources,
    consensusMetadata
  };
}

// ─────────────────────────────────────────────────────
// 3. AUTO-TITLE GENERATION
// ─────────────────────────────────────────────────────

export async function generateTitle(query: string): Promise<string> {
  const words = query.split(/\s+/).slice(0, 5).join(' ');
  return words.length > 40 ? words.slice(0, 37) + '...' : words;
}

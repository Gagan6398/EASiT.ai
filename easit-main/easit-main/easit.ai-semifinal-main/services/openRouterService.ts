/**
 * EASIT.ai — OpenRouter Model Marketplace Service
 * 
 * Provides access to world-class AI models (GPT-4o, Claude, Llama, Mistral, etc.)
 * through OpenRouter's unified API. Free Gemini models use the user's own key.
 * Premium models route through OpenRouter with 1.5x markup for founder revenue.
 */

import type { ModelInfo } from '../types.ts';

// ─── Model Catalog (1.5x markup applied to OpenRouter base prices) ───

export const MODEL_CATALOG: ModelInfo[] = [
  // ── FREE TIER (Gemini — uses user's own API key) ──
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    tier: 'free',
    inputPricePer1k: 0,
    outputPricePer1k: 0,
    contextWindow: 1048576,
    description: 'Lightning-fast free model with 1M context. Best for everyday tasks.',
    icon: '⚡'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    tier: 'free',
    inputPricePer1k: 0,
    outputPricePer1k: 0,
    contextWindow: 1048576,
    description: 'Google\'s most capable model. Deep reasoning & analysis.',
    icon: '🧠'
  },

  // ── PREMIUM TIER (OpenRouter — 1.5x markup) ──
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    tier: 'premium',
    inputPricePer1k: 0.375,   // Base: $0.0025/1K → 1.5x = $0.00375 → 0.375¢
    outputPricePer1k: 1.5,    // Base: $0.01/1K → 1.5x = $0.015 → 1.5¢
    contextWindow: 128000,
    description: 'OpenAI\'s flagship multimodal model. Excellent all-rounder.',
    icon: '🟢'
  },
  {
    id: 'openai/gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'OpenAI',
    tier: 'premium',
    inputPricePer1k: 0.06,
    outputPricePer1k: 0.24,
    contextWindow: 1048576,
    description: 'Fast & affordable OpenAI model with 1M context.',
    icon: '🟡'
  },
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    tier: 'premium',
    inputPricePer1k: 0.45,
    outputPricePer1k: 2.25,
    contextWindow: 200000,
    description: 'Anthropic\'s best model. Exceptional at coding & analysis.',
    icon: '🟠'
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    tier: 'premium',
    inputPricePer1k: 0.12,
    outputPricePer1k: 0.6,
    contextWindow: 200000,
    description: 'Fast Anthropic model. Great speed-to-quality ratio.',
    icon: '🟤'
  },
  {
    id: 'meta-llama/llama-4-maverick',
    name: 'Llama 4 Maverick',
    provider: 'Meta',
    tier: 'premium',
    inputPricePer1k: 0.03,
    outputPricePer1k: 0.075,
    contextWindow: 1048576,
    description: 'Meta\'s latest open model. Excellent value for money.',
    icon: '🦙'
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    tier: 'premium',
    inputPricePer1k: 0.105,
    outputPricePer1k: 0.345,
    contextWindow: 163840,
    description: 'Chain-of-thought reasoning model. Top-tier for math & logic.',
    icon: '🔵'
  },
  {
    id: 'mistralai/mistral-medium-3',
    name: 'Mistral Medium 3',
    provider: 'Mistral',
    tier: 'premium',
    inputPricePer1k: 0.06,
    outputPricePer1k: 0.24,
    contextWindow: 131072,
    description: 'Mistral\'s balanced model. Great for multilingual tasks.',
    icon: '🔴'
  },
];

export function getModelById(modelId: string): ModelInfo | undefined {
  return MODEL_CATALOG.find(m => m.id === modelId);
}

export function getFreeModels(): ModelInfo[] {
  return MODEL_CATALOG.filter(m => m.tier === 'free');
}

export function getPremiumModels(): ModelInfo[] {
  return MODEL_CATALOG.filter(m => m.tier === 'premium');
}

/**
 * Estimates cost in cents for a given model and token count.
 */
export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = getModelById(modelId);
  if (!model || model.tier === 'free') return 0;
  return (model.inputPricePer1k * inputTokens / 1000) + (model.outputPricePer1k * outputTokens / 1000);
}

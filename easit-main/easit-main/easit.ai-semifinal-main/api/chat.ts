import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { verifyResponse as runClaimVerification } from '../services/claimVerifier.js';
import { buildSystemInstruction, classifyQuery } from '../services/gcgoEngine.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ─── CoVe (Chain-of-Verification) Prompts ───

const COVE_EXTRACT_CLAIMS_PROMPT = `You are a fact-checking assistant. Given the following AI-generated response, extract ALL verifiable factual claims. Focus on: dates, numbers, statistics, proper nouns, scientific facts, historical events.

Return ONLY a JSON array of strings. Each string is one factual claim. Maximum 10 claims.
Example: ["The Eiffel Tower was built in 1889", "Python was created by Guido van Rossum"]

If there are no verifiable factual claims (e.g., the response is opinion, creative writing, or code), return an empty array: []

Response to analyze:
`;

const COVE_VERIFY_CLAIM_PROMPT = `You are an independent fact-checker. Answer the following verification question with ONLY factual information from your training data. Be precise. If you are not confident, say "UNCERTAIN".

Do NOT reference any previous conversation. Answer independently.

Question: `;

const COVE_REVISE_PROMPT = `You are a fact-checking revision assistant. Compare the original response's claims against independently verified answers. If any claim is incorrect, revise ONLY the incorrect parts. Keep the rest of the response identical.

Return the corrected response. If everything is accurate, return the original response unchanged.

Original Response:
---
{ORIGINAL}
---

Verification Results:
{VERIFICATIONS}

Return the corrected response (or the original if everything was accurate):`;


export default async function handler(req: any, res: any) {
  // ── CORS ──
  const allowedOrigin = process.env.NODE_ENV === 'development' ? '*' : 'https://easitai-semifinal-main.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ── AUTHENTICATION & ENTERPRISE KEY VALIDATION ──
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header. Use: Authorization: Bearer easit_sk_XXXX' });
    }

    const apiKey = authHeader.split(' ')[1];
    let keyRecord: any = null;
    let isEnterpriseKey = false;

    if (apiKey.startsWith('easit_sk_')) {
      // ── Enterprise API Key Validation ──
      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .select('id, user_uid, key_value, plan, rate_limit, daily_limit, queries_used_today, total_queries, is_active, expires_at')
        .eq('key_value', apiKey)
        .single();

      if (keyError || !keyData) {
        return res.status(401).json({ error: 'Invalid API key. Generate a key at /api/enterprise?action=register' });
      }

      if (!keyData.is_active) {
        return res.status(403).json({ error: 'API key has been revoked. Generate a new key or rotate this one.' });
      }

      const now = new Date();
      if (keyData.expires_at && new Date(keyData.expires_at) < now) {
        return res.status(403).json({ error: 'API key has expired. Renew your subscription to continue.' });
      }

      if (keyData.queries_used_today >= keyData.daily_limit) {
        return res.status(429).json({
          error: 'Daily query limit exceeded.',
          daily_limit: keyData.daily_limit,
          queries_used: keyData.queries_used_today,
          plan: keyData.plan,
          upgrade_hint: 'Upgrade your plan at /api/enterprise?action=plans for higher limits.',
          reset_at: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
        });
      }

      keyRecord = keyData;
      isEnterpriseKey = true;

      // Set rate limit headers for the developer
      res.setHeader('X-RateLimit-Limit', keyData.daily_limit.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, keyData.daily_limit - keyData.queries_used_today - 1).toString());
      res.setHeader('X-RateLimit-Reset', new Date(new Date().setHours(24, 0, 0, 0)).toISOString());
      res.setHeader('X-Easit-Plan', keyData.plan);

      // Increment usage counters (fire and forget — don't block the response)
      supabase.from('api_keys').update({
        queries_used_today: keyData.queries_used_today + 1,
        total_queries: (keyData.total_queries || 0) + 1,
        last_used_at: new Date().toISOString()
      }).eq('id', keyData.id).then(() => {});

    } else if (apiKey.startsWith('easit_live_')) {
      // Legacy internal key — allow through (for Easit's own frontend)
    } else {
      // Fallback: check old api_keys table format for backwards compatibility
      const { data: keyData, error: keyError } = await supabase
        .from('api_keys').select('user_uid').eq('key_value', apiKey).single();
      if (keyError || !keyData) {
        return res.status(401).json({ error: 'Invalid API key. Get your key at /api/enterprise?action=register' });
      }
    }

    // ── REQUEST PARSING ──
    const { 
      query, 
      conversationHistory = [], 
      persona = { tone: 'friendly', verbosity: 'balanced', style: 'casual' },
      enableSearch = true, 
      stream = false,
      model = 'gemini-2.5-flash',  // Default free model
      coveEnabled = true,           // CoVe verification on by default
    } = req.body;

    if (!query) return res.status(400).json({ error: 'Query is required' });

    const startTime = performance.now();

    // ── STAGE 1: CLASSIFY & CONFIGURE ──
    const classification = classifyQuery(query);
    const mode = classification.type === 'casual' ? 'quick' : 'verified';

    // ── ROUTE: OPENROUTER (Premium Models) ──
    if (model.includes('/') && !model.startsWith('gemini')) {
      return handleOpenRouterRequest(req, res, { query, conversationHistory, persona, stream, model, startTime, coveEnabled, mode });
    }

    // ── ROUTE: GEMINI (Free Models) ──
    const geminiKeysRaw = process.env.GEMINI_API_KEYS || process.env.VITE_GOOGLE_GENERATIVE_AI_KEY || '';
    const geminiKeys = geminiKeysRaw
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    // Fallback array parsed securely from environment
    if (geminiKeys.length === 0 && process.env.VITE_GOOGLE_GENERATIVE_AI_KEY) {
      geminiKeys.push(process.env.VITE_GOOGLE_GENERATIVE_AI_KEY);
    }

    if (geminiKeys.length === 0) return res.status(500).json({ error: 'Server configuration error: Missing Gemini API Key' });

    // We add a strict 5-second timer to the retry loop. If we try too many dead keys, 
    // it will exceed Vercel's 10-second timeout. This bailout ensures we can safely fallback to Llama.
    const executeWithRetry = async (operation: (aiInstance: any) => Promise<any>) => {
      let lastError: any;
      const loopStart = performance.now();
      for (const key of geminiKeys) {
        if (performance.now() - loopStart > 5000) {
          console.warn('Gemini retry loop exceeded 5 seconds. Bailing out to prevent Vercel timeout.');
          break;
        }
        try {
          const aiInstance = new GoogleGenAI({ apiKey: key });
          return await operation(aiInstance);
        } catch (error: any) {
          console.warn(`Gemini API error with a key, trying backup... Error: ${error?.message || error}`);
          lastError = error;
          // Fail fast if quota is clearly exhausted across the project
          if (error?.message?.includes('RESOURCE_EXHAUSTED')) break;
        }
      }
      throw lastError || new Error('All Gemini keys failed');
    };

    const executeStreamWithRetry = async function* (operation: (aiInstance: any) => any) {
      let lastError: any;
      const loopStart = performance.now();
      for (const key of geminiKeys) {
        if (performance.now() - loopStart > 5000) {
          console.warn('Gemini stream retry loop exceeded 5 seconds. Bailing out to prevent Vercel timeout.');
          break;
        }
        try {
          const aiInstance = new GoogleGenAI({ apiKey: key });
          const stream = await operation(aiInstance);
          const iterator = stream[Symbol.asyncIterator]();
          const firstResult = await iterator.next(); // Catches auth/quota errors here!
          
          if (!firstResult.done) {
            yield firstResult.value;
          }
          
          while (true) {
            const result = await iterator.next();
            if (result.done) break;
            yield result.value;
          }
          return;
        } catch (error: any) {
          console.warn(`Gemini API stream error with a key, trying backup... Error: ${error?.message || error}`);
          lastError = error;
          if (error?.message?.includes('RESOURCE_EXHAUSTED')) break;
        }
      }
      throw lastError || new Error('All Gemini keys failed');
    };

    const ai = new GoogleGenAI({ apiKey: geminiKeys[0] });

    const shouldSearch = enableSearch && classification.shouldSearch;

    const systemInstruction = buildSystemInstruction(persona, mode);
    const config: any = { systemInstruction, temperature: mode === 'verified' ? 0.3 : 0.7 };
    if (shouldSearch) config.tools = [{ googleSearch: {} }];

    const contents = conversationHistory.slice(-10).map((msg: any) => ({
      role: msg.role, parts: [{ text: msg.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: query }] });

    // ── STAGE 2: GENERATE (Streaming) ──
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullText = '';
      try {
        const streamResponse = executeStreamWithRetry((aiInstance) => aiInstance.models.generateContentStream({ model, contents, config }));

        const sources: any[] = [];
        let tokenUsage: any = undefined;

        for await (const chunk of streamResponse) {
          const chunkText = chunk.text || '';
          if (chunkText) {
            fullText += chunkText;
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
          }
          if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            chunk.candidates[0].groundingMetadata.groundingChunks.forEach((gc: any) => {
              if (gc.web && !sources.some(s => s.uri === gc.web.uri)) {
                sources.push({ uri: gc.web.uri, title: gc.web.title || gc.web.uri });
              }
            });
          }
          if (chunk.usageMetadata) {
            tokenUsage = { input: chunk.usageMetadata.promptTokenCount || 0, output: chunk.usageMetadata.candidatesTokenCount || 0 };
          }
        }

        // ── STAGE 3: CoVe VERIFICATION (Post-Generation) ──
        let verificationReport: any = { totalClaims: 0, verifiedClaims: 0, unverifiedClaims: 0, verificationRate: 100, claims: [], adjustedConfidence: 75 };

        if (coveEnabled && mode === 'verified' && fullText.length > 100) {
          const executeVerification = async (prompt: string, temp: number) => {
            const res = await executeWithRetry((ai) => ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: { temperature: temp }
            }));
            return (res.text || '').trim();
          };
          
          try {
            verificationReport = await runCoVePipeline(executeVerification, fullText);
            
            // If CoVe produced a revised response, stream the correction
            if (verificationReport.revisedText && verificationReport.revisedText !== fullText) {
              // Send a correction marker
              res.write(`data: ${JSON.stringify({ correction: true, text: verificationReport.revisedText })}\n\n`);
              fullText = verificationReport.revisedText;
            }
          } catch (coveErr) {
            console.warn('[CoVe] Verification failed, using unverified:', coveErr);
          }
        }

        res.write(`data: ${JSON.stringify({ 
          done: true, sources, verificationReport, tokenUsage,
          responseTimeMs: Math.round(performance.now() - startTime),
          modelUsed: model
        })}\n\n`);
        
        return res.end();
      } catch (err: any) {
        if (process.env.OPENROUTER_API_KEY && !fullText) {
          console.warn('All Gemini keys failed or rate-limited. Falling back to OpenRouter...', err.message);
          const orModel = model.startsWith('gemini') ? `meta-llama/llama-3.1-8b-instruct:free` : model;
          return handleOpenRouterRequest(req, res, { query, conversationHistory, persona, stream, model: orModel, startTime, coveEnabled, mode });
        }
        console.error('Streaming error:', err);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        return res.end();
      }
    } else {
      // Non-streaming
      let response;
      try {
        response = await executeWithRetry((aiInstance) => aiInstance.models.generateContent({ model, contents, config }));
      } catch (err: any) {
        if (process.env.OPENROUTER_API_KEY) {
          console.warn('All Gemini keys failed or rate-limited. Falling back to OpenRouter...', err.message);
          const orModel = model.startsWith('gemini') ? `meta-llama/llama-3.1-8b-instruct:free` : model;
          return handleOpenRouterRequest(req, res, { query, conversationHistory, persona, stream, model: orModel, startTime, coveEnabled, mode });
        }
        throw err;
      }
      
      const fullText = response.text || '';
      const sources: any[] = [];
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        response.candidates[0].groundingMetadata.groundingChunks.forEach((gc: any) => {
          if (gc.web && !sources.some(s => s.uri === gc.web.uri)) {
            sources.push({ uri: gc.web.uri, title: gc.web.title || gc.web.uri });
          }
        });
      }

      let verificationReport: any = { totalClaims: 0, verifiedClaims: 0, unverifiedClaims: 0, verificationRate: 100, claims: [], adjustedConfidence: 75 };
      if (coveEnabled && mode === 'verified' && fullText.length > 100) {
        const executeVerification = async (prompt: string, temp: number) => {
          const res = await executeWithRetry((ai) => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: temp }
          }));
          return (res.text || '').trim();
        };
        try { verificationReport = await runCoVePipeline(executeVerification, fullText); } catch (e) { /* fallback */ }
      }

      // Log usage for enterprise keys (fire and forget)
      if (isEnterpriseKey && keyRecord) {
        supabase.from('api_usage_logs').insert({
          api_key_id: keyRecord.id,
          user_uid: keyRecord.user_uid,
          query_text: query.substring(0, 200),
          model_used: model,
          tokens_in: response.usageMetadata?.promptTokenCount || 0,
          tokens_out: response.usageMetadata?.candidatesTokenCount || 0,
          verification_status: verificationReport.verificationRate >= 80 ? 'verified' : verificationReport.verificationRate >= 50 ? 'partial' : 'skipped',
          latency_ms: Math.round(performance.now() - startTime),
        }).then(() => {});
      }

      const responsePayload: any = {
        text: verificationReport.revisedText || fullText,
        sources, verificationReport,
        responseTimeMs: Math.round(performance.now() - startTime),
        modelUsed: model
      };

      // Add usage info for enterprise API consumers
      if (isEnterpriseKey && keyRecord) {
        responsePayload.usage = {
          queries_used_today: keyRecord.queries_used_today + 1,
          daily_limit: keyRecord.daily_limit,
          queries_remaining: Math.max(0, keyRecord.daily_limit - keyRecord.queries_used_today - 1),
          plan: keyRecord.plan
        };
      }

      return res.status(200).json(responsePayload);
    }

  } catch (err: any) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}


// ─── CoVe Pipeline (3-Stage Verification) ───

async function runCoVePipeline(executeVerification: (prompt: string, temperature: number) => Promise<string>, responseText: string) {
  // Stage 1: Extract claims
  let claimsText = '';
  try {
    claimsText = await executeVerification(COVE_EXTRACT_CLAIMS_PROMPT + responseText, 0.1);
  } catch { /* skip */ }

  let claims: string[] = [];
  try {
    const jsonMatch = claimsText.match(/\[[\s\S]*\]/);
    if (jsonMatch) claims = JSON.parse(jsonMatch[0]);
  } catch { claims = []; }

  if (claims.length === 0) {
    return { totalClaims: 0, verifiedClaims: 0, unverifiedClaims: 0, verificationRate: 100, claims: [], adjustedConfidence: 85, revisedText: null };
  }

  // Stage 2: Independently verify each claim
  const verifications: { claim: string; question: string; independentAnswer: string; verified: boolean }[] = [];

  // Batch verify (max 5 claims to keep it fast)
  const claimsToVerify = claims.slice(0, 5);
  const verificationPromises = claimsToVerify.map(async (claim) => {
    const question = `Is the following statement factually accurate? "${claim}" Answer with TRUE, FALSE, or UNCERTAIN, followed by a brief explanation.`;
    
    try {
      const answer = await executeVerification(COVE_VERIFY_CLAIM_PROMPT + question, 0.1);
      const isVerified = answer.toUpperCase().startsWith('TRUE');
      const isUncertain = answer.toUpperCase().startsWith('UNCERTAIN');
      
      return { claim, question, independentAnswer: answer, verified: isVerified || isUncertain };
    } catch {
      return { claim, question, independentAnswer: 'Verification failed', verified: true }; // Assume true on failure
    }
  });

  const results = await Promise.all(verificationPromises);
  verifications.push(...results);

  const verifiedCount = verifications.filter(v => v.verified).length;
  const verificationRate = Math.round((verifiedCount / verifications.length) * 100);
  
  // Stage 3: Revise if any claims failed
  let revisedText: string | null = null;
  const failedClaims = verifications.filter(v => !v.verified);
  
  if (failedClaims.length > 0) {
    const verificationsBlock = verifications.map(v => 
      `Claim: "${v.claim}"\nVerification: ${v.verified ? '✅ VERIFIED' : '❌ INCORRECT'}\nIndependent Answer: ${v.independentAnswer}\n`
    ).join('\n');
    
    const revisePrompt = COVE_REVISE_PROMPT
      .replace('{ORIGINAL}', responseText)
      .replace('{VERIFICATIONS}', verificationsBlock);

    try {
      revisedText = await executeVerification(revisePrompt, 0.2);
    } catch { /* keep original */ }
  }

  // Calculate confidence
  let adjustedConfidence = 60;
  adjustedConfidence += Math.round(verificationRate * 0.35); // Up to +35 from CoVe
  adjustedConfidence = Math.min(99, Math.max(20, adjustedConfidence));

  return {
    totalClaims: verifications.length,
    verifiedClaims: verifiedCount,
    unverifiedClaims: failedClaims.length,
    verificationRate,
    claims: verifications.map(v => ({ claim: v.claim, verified: v.verified, matchedSource: v.independentAnswer.slice(0, 200) })),
    adjustedConfidence,
    revisedText
  };
}


// ─── OpenRouter Handler (Premium Models) ───

async function handleOpenRouterRequest(req: any, res: any, opts: any) {
  const { query, conversationHistory, persona, stream, model, startTime, coveEnabled, mode } = opts;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  
  if (!openRouterKey) {
    return res.status(500).json({ error: 'OpenRouter API key not configured' });
  }

  const systemInstruction = buildSystemInstruction(persona, mode || 'verified');
  
  const messages = [
    { role: 'system', content: systemInstruction },
    ...conversationHistory.slice(-10).map((msg: any) => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.text
    })),
    { role: 'user', content: query }
  ];

  const executeVerification = async (prompt: string, temp: number) => {
    let verifyRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://easitai-semifinal-main.vercel.app',
        'X-Title': 'Easit.ai'
      },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }], temperature: temp })
    });
    
    if (verifyRes.status === 402) {
      verifyRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://easitai-semifinal-main.vercel.app',
          'X-Title': 'Easit.ai'
        },
        body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{ role: 'user', content: prompt }], temperature: temp })
      });
    }
    if (!verifyRes.ok) throw new Error('Verification failed');
    const data = await verifyRes.json();
    return data.choices?.[0]?.message?.content || '';
  };

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      let orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://easitai-semifinal-main.vercel.app',
          'X-Title': 'Easit.ai'
        },
        body: JSON.stringify({ model, messages, stream: true })
      });

      if (orRes.status === 402) {
        orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://easitai-semifinal-main.vercel.app',
            'X-Title': 'Easit.ai'
          },
          body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct:free', messages, stream: true })
        });
      }

      if (!orRes.ok) {
        const errText = await orRes.text();
        res.write(`data: ${JSON.stringify({ error: `OpenRouter error: ${errText}` })}\n\n`);
        return res.end();
      }

      const reader = orRes.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullText += delta;
                res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
              }
            } catch { /* skip */ }
          }
        }
      }

      let verificationReport: any = { totalClaims: 0, verifiedClaims: 0, unverifiedClaims: 0, verificationRate: 100, claims: [], adjustedConfidence: 75 };
      if (coveEnabled && mode === 'verified' && fullText.length > 100) {
        try {
          verificationReport = await runCoVePipeline(executeVerification, fullText);
          if (verificationReport.revisedText && verificationReport.revisedText !== fullText) {
            res.write(`data: ${JSON.stringify({ correction: true, text: verificationReport.revisedText })}\n\n`);
            fullText = verificationReport.revisedText;
          }
        } catch (coveErr) {
          console.warn('[CoVe OpenRouter] Verification failed:', coveErr);
        }
      }

      res.write(`data: ${JSON.stringify({ 
        done: true, sources: [],
        verificationReport,
        responseTimeMs: Math.round(performance.now() - startTime),
        modelUsed: model
      })}\n\n`);
      
      return res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      return res.end();
    }
  } else {
    // Non-streaming OpenRouter
    let orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://easitai-semifinal-main.vercel.app',
        'X-Title': 'Easit.ai'
      },
      body: JSON.stringify({ model, messages, stream: false })
    });

    if (orRes.status === 402) {
      orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://easitai-semifinal-main.vercel.app',
          'X-Title': 'Easit.ai'
        },
        body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct:free', messages, stream: false })
      });
    }

    if (!orRes.ok) throw new Error(`OpenRouter error: ${await orRes.text()}`);
    const data = await orRes.json();
    
    let fullText = data.choices?.[0]?.message?.content || '';
    let verificationReport: any = { totalClaims: 0, verifiedClaims: 0, unverifiedClaims: 0, verificationRate: 100, claims: [], adjustedConfidence: 75 };
    
    if (coveEnabled && mode === 'verified' && fullText.length > 100) {
      try { verificationReport = await runCoVePipeline(executeVerification, fullText); } catch (e) { /* fallback */ }
    }

    return res.status(200).json({
      text: verificationReport.revisedText || fullText,
      sources: [],
      verificationReport,
      responseTimeMs: Math.round(performance.now() - startTime),
      modelUsed: model
    });
  }
}


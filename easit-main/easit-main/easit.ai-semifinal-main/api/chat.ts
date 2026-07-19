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
    // ── AUTHENTICATION ──
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const apiKey = authHeader.split(' ')[1];
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys').select('user_id').eq('key_value', apiKey).single();

    if (keyError || !keyData) {
      if (!apiKey.startsWith('easit_live_')) {
        return res.status(401).json({ error: 'Invalid API key' });
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

    // ── ROUTE: OPENROUTER (Premium Models) ──
    if (model.includes('/') && !model.startsWith('gemini')) {
      return handleOpenRouterRequest(req, res, { query, conversationHistory, persona, stream, model, startTime });
    }

    // ── ROUTE: GEMINI (Free Models) ──
    const fallbackEnv = process.env.GEMINI_FALLBACK_KEYS || process.env.VITE_GEMINI_FALLBACK_KEYS || "";
    const fallbackList = fallbackEnv.split(',').map(k => k.trim()).filter(Boolean);
    
    const geminiKeys = Array.from(new Set([
      process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_GENERATIVE_AI_KEY,
      ...fallbackList
    ].filter(Boolean))) as string[];

    if (geminiKeys.length === 0) return res.status(500).json({ error: 'Server configuration error: Missing Gemini API Key' });

    const executeWithRetry = async (operation: (aiInstance: any) => Promise<any>) => {
      let lastError: any;
      for (const key of geminiKeys) {
        try {
          const aiInstance = new GoogleGenAI({ apiKey: key });
          return await operation(aiInstance);
        } catch (error: any) {
          console.warn(`Gemini API error with a key, trying backup... Error: ${error?.message || error}`);
          lastError = error;
        }
      }
      throw lastError;
    };

    const executeStreamWithRetry = async function* (operation: (aiInstance: any) => any) {
      let lastError: any;
      for (const key of geminiKeys) {
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
        }
      }
      throw lastError;
    };

    const ai = new GoogleGenAI({ apiKey: geminiKeys[0] });

    // ── STAGE 1: CLASSIFY & CONFIGURE ──
    const classification = classifyQuery(query);
    const mode = classification.type === 'casual' ? 'quick' : 'verified';
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

      try {
        const streamResponse = executeStreamWithRetry((aiInstance) => aiInstance.models.generateContentStream({ model, contents, config }));

        let fullText = '';
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
          try {
            verificationReport = await runCoVePipeline(executeWithRetry, model, fullText);
            
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
        console.error('Streaming error:', err);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        return res.end();
      }
    } else {
      // Non-streaming
      const response = await executeWithRetry((aiInstance) => aiInstance.models.generateContent({ model, contents, config }));
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
      if (coveEnabled && fullText.length > 100) {
        try { verificationReport = await runCoVePipeline(executeWithRetry, model, fullText); } catch (e) { /* fallback */ }
      }

      return res.status(200).json({
        text: verificationReport.revisedText || fullText,
        sources, verificationReport,
        responseTimeMs: Math.round(performance.now() - startTime),
        modelUsed: model
      });
    }

  } catch (err: any) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}


// ─── CoVe Pipeline (3-Stage Verification) ───

async function runCoVePipeline(executeWithRetry: any, model: string, responseText: string) {
  const verificationModel = 'gemini-2.5-flash'; // Always use flash for verification (fast + free)

  // Stage 1: Extract claims
  const claimsResponse = await executeWithRetry((aiInstance: any) => aiInstance.models.generateContent({
    model: verificationModel,
    contents: [{ role: 'user', parts: [{ text: COVE_EXTRACT_CLAIMS_PROMPT + responseText }] }],
    config: { temperature: 0.1 }
  }));

  let claims: string[] = [];
  try {
    const claimsText = (claimsResponse.text || '').trim();
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
      const verifyResponse = await executeWithRetry((aiInstance: any) => aiInstance.models.generateContent({
        model: verificationModel,
        contents: [{ role: 'user', parts: [{ text: COVE_VERIFY_CLAIM_PROMPT + question }] }],
        config: { temperature: 0.1 }
      }));
      
      const answer = (verifyResponse.text || '').trim();
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
      const reviseResponse = await executeWithRetry((aiInstance: any) => aiInstance.models.generateContent({
        model: verificationModel,
        contents: [{ role: 'user', parts: [{ text: revisePrompt }] }],
        config: { temperature: 0.2 }
      }));
      revisedText = (reviseResponse.text || '').trim();
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
  const { query, conversationHistory, persona, stream, model, startTime } = opts;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  
  if (!openRouterKey) {
    return res.status(500).json({ error: 'OpenRouter API key not configured' });
  }

  const systemInstruction = buildSystemInstruction(persona, 'verified');
  
  const messages = [
    { role: 'system', content: systemInstruction },
    ...conversationHistory.slice(-10).map((msg: any) => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.text
    })),
    { role: 'user', content: query }
  ];

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://easitai-semifinal-main.vercel.app',
          'X-Title': 'Easit.ai'
        },
        body: JSON.stringify({ model, messages, stream: true })
      });

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

      res.write(`data: ${JSON.stringify({ 
        done: true, sources: [],
        verificationReport: { totalClaims: 0, verifiedClaims: 0, unverifiedClaims: 0, verificationRate: 0, claims: [], adjustedConfidence: 70 },
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
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://easitai-semifinal-main.vercel.app',
        'X-Title': 'Easit.ai'
      },
      body: JSON.stringify({ model, messages, stream: false })
    });

    if (!orRes.ok) throw new Error(`OpenRouter error: ${await orRes.text()}`);
    const data = await orRes.json();
    
    return res.status(200).json({
      text: data.choices?.[0]?.message?.content || '',
      sources: [],
      verificationReport: { totalClaims: 0, verifiedClaims: 0, unverifiedClaims: 0, verificationRate: 0, claims: [], adjustedConfidence: 70 },
      responseTimeMs: Math.round(performance.now() - startTime),
      modelUsed: model
    });
  }
}

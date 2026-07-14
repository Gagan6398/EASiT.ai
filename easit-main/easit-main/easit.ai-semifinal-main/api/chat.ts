import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { gatherGroundingContext } from '../services/factSources.ts';
import { verifyResponse as runClaimVerification } from '../services/claimVerifier.ts';
import { buildSystemInstruction, classifyQuery } from '../services/gcgoEngine.ts'; // We'll just import helpers

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: any, res: any) {
  // ── CORS ──
  // Only allow our frontend
  const allowedOrigin = process.env.NODE_ENV === 'development' ? '*' : 'https://easitai-semifinal-main.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── AUTHENTICATION ──
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const apiKey = authHeader.split(' ')[1];
    
    // Database lookup for real authentication
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('user_id')
      .eq('key_value', apiKey)
      .single();

    if (keyError || !keyData) {
      // For MVP, we still allow the easit_live_ prefix if they haven't set up the DB fully,
      // but in production, we should reject this.
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
      stream = false 
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_GENERATIVE_AI_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: 'Server configuration error: Missing Gemini API Key' });
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const startTime = performance.now();

    // ── STAGE 1: CLASSIFY & GATHER ──
    const classification = classifyQuery(query);
    const mode = classification.type === 'casual' ? 'quick' : 'verified';
    const shouldSearch = enableSearch && classification.shouldSearch;

    let groundingContext = { facts: [], rawContext: '', fetchTimeMs: 0 };
    if (shouldSearch && mode === 'verified') {
      groundingContext = await gatherGroundingContext(query) as any;
    }

    const systemInstruction = buildSystemInstruction(persona, mode) + groundingContext.rawContext;
    const config: any = {
      systemInstruction,
      temperature: mode === 'verified' ? 0.3 : 0.7,
    };
    if (shouldSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    // Build history
    const contents = conversationHistory.slice(-10).map((msg: any) => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: query }] });

    // ── STAGE 2: GENERATE & STREAM ──
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const streamResponse = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents,
          config
        });

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
            tokenUsage = { 
              input: chunk.usageMetadata.promptTokenCount || 0, 
              output: chunk.usageMetadata.candidatesTokenCount || 0 
            };
          }
        }

        // ── STAGE 3: VERIFY (Post-generation) ──
        const verificationReport = runClaimVerification(fullText, groundingContext.facts as any);
        
        // Add pre-fetched sources to the final sources list
        for (const fact of groundingContext.facts as any[]) {
          if (fact.url && !sources.some(s => s.uri === fact.url)) {
            sources.push({ uri: fact.url, title: `[${fact.source.toUpperCase()}] ${fact.title}` });
          }
        }

        // Send final metadata
        res.write(`data: ${JSON.stringify({ 
          done: true, 
          sources,
          verificationReport,
          tokenUsage,
          responseTimeMs: Math.round(performance.now() - startTime)
        })}\n\n`);
        
        return res.end();
      } catch (err: any) {
        console.error('Streaming error:', err);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        return res.end();
      }
    } else {
      // Non-streaming response
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config
      });

      const fullText = response.text || '';
      const sources: any[] = [];
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        response.candidates[0].groundingMetadata.groundingChunks.forEach((gc: any) => {
          if (gc.web && !sources.some(s => s.uri === gc.web.uri)) {
            sources.push({ uri: gc.web.uri, title: gc.web.title || gc.web.uri });
          }
        });
      }

      const verificationReport = runClaimVerification(fullText, groundingContext.facts as any);
      
      for (const fact of groundingContext.facts as any[]) {
        if (fact.url && !sources.some(s => s.uri === fact.url)) {
          sources.push({ uri: fact.url, title: `[${fact.source.toUpperCase()}] ${fact.title}` });
        }
      }

      return res.status(200).json({
        text: fullText,
        sources,
        verificationReport,
        responseTimeMs: Math.round(performance.now() - startTime)
      });
    }

  } catch (err: any) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}

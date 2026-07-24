/**
 * EASIT.AI — Enterprise API Management Endpoint
 * 
 * Handles: User registration, API key generation/rotation/revocation,
 * usage tracking, and plan management.
 * 
 * All enterprise API keys (easit_sk_XXXX) are ACCESS keys for external developers.
 * Easit's internal Gemini/Llama keys are never exposed — they power the engine behind the scenes.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ─── Plan Configuration ───
const PLAN_CONFIG: Record<string, { rate_limit: number; daily_limit: number; monthly_limit: number; price_usd: number }> = {
  free:       { rate_limit: 5,   daily_limit: 25,     monthly_limit: 750,     price_usd: 0 },
  starter:    { rate_limit: 20,  daily_limit: 200,    monthly_limit: 6000,    price_usd: 19 },
  pro:        { rate_limit: 60,  daily_limit: 1000,   monthly_limit: 30000,   price_usd: 79 },
  enterprise: { rate_limit: 200, daily_limit: 10000,  monthly_limit: 300000,  price_usd: 299 },
};

// ─── Helper: Generate Unique IDs ───
function generateUserUID(): string {
  const hex = crypto.randomBytes(8).toString('hex');
  return `easit_usr_${hex}`;
}

function generateAPIKey(): string {
  const hex = crypto.randomBytes(32).toString('hex');
  return `easit_sk_${hex}`;
}

function getKeyPrefix(key: string): string {
  return key.substring(0, 16) + '...';
}

// ─── Helper: Auth Check (Bearer token = user's Supabase JWT or existing API key) ───
async function authenticateRequest(authHeader: string | undefined): Promise<{ user_uid: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];

  // Check if it's an enterprise user token (easit_usr_ prefix means they passed their UID as auth)
  // In production, this would be a JWT. For MVP, we accept the user_uid directly.
  if (token.startsWith('easit_usr_')) {
    const { data } = await supabase
      .from('enterprise_users')
      .select('user_uid')
      .eq('user_uid', token)
      .single();
    if (data) return { user_uid: data.user_uid };
  }

  // Check if it's an existing API key being used to manage the account
  if (token.startsWith('easit_sk_')) {
    const { data } = await supabase
      .from('api_keys')
      .select('user_uid')
      .eq('key_value', token)
      .eq('is_active', true)
      .single();
    if (data) return { user_uid: data.user_uid };
  }

  return null;
}

// ─── Main Handler ───
export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST,GET,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.body || {};
  const url = new URL(req.url, `https://${req.headers.host}`);
  const queryAction = url.searchParams.get('action') || action;

  try {
    switch (queryAction) {
      case 'register':       return await handleRegister(req, res);
      case 'generate_key':   return await handleGenerateKey(req, res);
      case 'list_keys':      return await handleListKeys(req, res);
      case 'revoke_key':     return await handleRevokeKey(req, res);
      case 'rotate_key':     return await handleRotateKey(req, res);
      case 'usage':          return await handleUsage(req, res);
      case 'plan':           return await handlePlan(req, res);
      case 'plans':          return await handleListPlans(req, res);
      default:
        return res.status(400).json({
          error: 'Invalid action',
          available_actions: ['register', 'generate_key', 'list_keys', 'revoke_key', 'rotate_key', 'usage', 'plan', 'plans'],
          docs: 'https://easitai-semifinal-main.vercel.app/docs/api'
        });
    }
  } catch (error: any) {
    console.error('Enterprise API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error?.message || 'Unknown error' });
  }
}

// ──────────────────────────────────────────
// ACTION: Register a new Enterprise User
// ──────────────────────────────────────────
async function handleRegister(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name, company } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Check if user already exists
  const { data: existing } = await supabase
    .from('enterprise_users')
    .select('user_uid, email, plan')
    .eq('email', email)
    .single();

  if (existing) {
    return res.status(409).json({
      error: 'User already registered',
      user_uid: existing.user_uid,
      email: existing.email,
      plan: existing.plan,
      message: 'Use your existing user_uid to manage API keys.'
    });
  }

  const user_uid = generateUserUID();

  const { data, error } = await supabase.from('enterprise_users').insert({
    user_uid,
    email,
    name: name || '',
    company: company || '',
    plan: 'free',
  }).select().single();

  if (error) return res.status(500).json({ error: 'Failed to register', details: error.message });

  return res.status(201).json({
    success: true,
    message: 'Enterprise account created successfully',
    user_uid: data.user_uid,
    email: data.email,
    plan: data.plan,
    plan_limits: PLAN_CONFIG['free'],
    next_step: 'Use your user_uid with action=generate_key to create your first API key.',
    important: 'Save your user_uid securely. It is your unique Easit identification number.'
  });
}

// ──────────────────────────────────────────
// ACTION: Generate a new API Key
// ──────────────────────────────────────────
async function handleGenerateKey(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await authenticateRequest(req.headers.authorization);
  const user_uid = auth?.user_uid || req.body.user_uid;

  if (!user_uid) {
    return res.status(401).json({ error: 'Authentication required. Provide user_uid in body or Bearer token in Authorization header.' });
  }

  // Verify user exists and get their plan
  const { data: user, error: userError } = await supabase
    .from('enterprise_users')
    .select('user_uid, plan, plan_expires_at')
    .eq('user_uid', user_uid)
    .single();

  if (userError || !user) return res.status(404).json({ error: 'User not found. Register first with action=register.' });

  // Check max keys per plan
  const { count } = await supabase
    .from('api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('user_uid', user_uid)
    .eq('is_active', true);

  const maxKeys: Record<string, number> = { free: 2, starter: 5, pro: 10, enterprise: 50 };
  if ((count || 0) >= (maxKeys[user.plan] || 2)) {
    return res.status(403).json({ error: `Maximum active keys reached for ${user.plan} plan (${maxKeys[user.plan]}). Revoke unused keys first.` });
  }

  const label = req.body.label || 'Default';
  const planConfig = PLAN_CONFIG[user.plan] || PLAN_CONFIG['free'];
  const apiKey = generateAPIKey();

  const { data: keyData, error: keyError } = await supabase.from('api_keys').insert({
    user_uid,
    key_value: apiKey,
    key_prefix: getKeyPrefix(apiKey),
    label,
    plan: user.plan,
    rate_limit: planConfig.rate_limit,
    daily_limit: planConfig.daily_limit,
    expires_at: user.plan_expires_at,
  }).select().single();

  if (keyError) return res.status(500).json({ error: 'Failed to generate key', details: keyError.message });

  return res.status(201).json({
    success: true,
    message: 'API key generated successfully',
    api_key: apiKey,
    key_id: keyData.id,
    label: keyData.label,
    plan: keyData.plan,
    rate_limit: `${keyData.rate_limit} requests/minute`,
    daily_limit: `${keyData.daily_limit} requests/day`,
    expires_at: keyData.expires_at,
    warning: 'This is the ONLY time your full API key will be shown. Save it securely now.',
    usage_example: {
      curl: `curl -X POST https://easitai-semifinal-main.vercel.app/api/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{"query": "What is the capital of France?", "coveEnabled": true}'`,
      python: `import requests\n\nresponse = requests.post(\n    "https://easitai-semifinal-main.vercel.app/api/chat",\n    headers={"Authorization": "Bearer ${apiKey}"},\n    json={"query": "What is the capital of France?", "coveEnabled": True}\n)\nprint(response.json())`,
      javascript: `const response = await fetch("https://easitai-semifinal-main.vercel.app/api/chat", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "Authorization": "Bearer ${apiKey}"\n  },\n  body: JSON.stringify({ query: "What is the capital of France?", coveEnabled: true })\n});\nconst data = await response.json();\nconsole.log(data);`
    }
  });
}

// ──────────────────────────────────────────
// ACTION: List all API Keys for a user
// ──────────────────────────────────────────
async function handleListKeys(req: any, res: any) {
  const auth = await authenticateRequest(req.headers.authorization);
  const user_uid = auth?.user_uid || req.body?.user_uid || new URL(req.url, `https://${req.headers.host}`).searchParams.get('user_uid');

  if (!user_uid) return res.status(401).json({ error: 'Authentication required.' });

  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, key_prefix, label, plan, rate_limit, daily_limit, queries_used_today, total_queries, is_active, expires_at, created_at, last_used_at')
    .eq('user_uid', user_uid)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch keys', details: error.message });

  return res.status(200).json({
    user_uid,
    total_keys: keys?.length || 0,
    active_keys: keys?.filter(k => k.is_active).length || 0,
    keys: keys || []
  });
}

// ──────────────────────────────────────────
// ACTION: Revoke an API Key
// ──────────────────────────────────────────
async function handleRevokeKey(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await authenticateRequest(req.headers.authorization);
  const user_uid = auth?.user_uid || req.body.user_uid;
  const key_id = req.body.key_id;

  if (!user_uid || !key_id) {
    return res.status(400).json({ error: 'user_uid and key_id are required.' });
  }

  const { data, error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', key_id)
    .eq('user_uid', user_uid)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Key not found or already revoked.' });

  return res.status(200).json({
    success: true,
    message: 'API key revoked successfully',
    key_prefix: data.key_prefix,
    key_id: data.id
  });
}

// ──────────────────────────────────────────
// ACTION: Rotate an API Key (revoke old + generate new)
// ──────────────────────────────────────────
async function handleRotateKey(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await authenticateRequest(req.headers.authorization);
  const user_uid = auth?.user_uid || req.body.user_uid;
  const key_id = req.body.key_id;

  if (!user_uid || !key_id) {
    return res.status(400).json({ error: 'user_uid and key_id are required.' });
  }

  // Revoke old key
  const { data: oldKey } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', key_id)
    .eq('user_uid', user_uid)
    .select('label, plan')
    .single();

  if (!oldKey) return res.status(404).json({ error: 'Key not found.' });

  // Generate new key with same config
  const planConfig = PLAN_CONFIG[oldKey.plan] || PLAN_CONFIG['free'];
  const newApiKey = generateAPIKey();

  const { data: newKey, error } = await supabase.from('api_keys').insert({
    user_uid,
    key_value: newApiKey,
    key_prefix: getKeyPrefix(newApiKey),
    label: oldKey.label + ' (rotated)',
    plan: oldKey.plan,
    rate_limit: planConfig.rate_limit,
    daily_limit: planConfig.daily_limit,
  }).select().single();

  if (error) return res.status(500).json({ error: 'Failed to rotate key', details: error.message });

  return res.status(200).json({
    success: true,
    message: 'API key rotated successfully. Old key is now revoked.',
    new_api_key: newApiKey,
    new_key_id: newKey?.id,
    warning: 'Save your new API key securely. The old key is permanently deactivated.'
  });
}

// ──────────────────────────────────────────
// ACTION: Get Usage Statistics
// ──────────────────────────────────────────
async function handleUsage(req: any, res: any) {
  const auth = await authenticateRequest(req.headers.authorization);
  const user_uid = auth?.user_uid || req.body?.user_uid || new URL(req.url, `https://${req.headers.host}`).searchParams.get('user_uid');

  if (!user_uid) return res.status(401).json({ error: 'Authentication required.' });

  // Get user plan
  const { data: user } = await supabase
    .from('enterprise_users')
    .select('plan, plan_expires_at')
    .eq('user_uid', user_uid)
    .single();

  if (!user) return res.status(404).json({ error: 'User not found.' });

  // Aggregate usage across all active keys
  const { data: keys } = await supabase
    .from('api_keys')
    .select('queries_used_today, total_queries, daily_limit')
    .eq('user_uid', user_uid)
    .eq('is_active', true);

  const totalUsedToday = keys?.reduce((sum, k) => sum + (k.queries_used_today || 0), 0) || 0;
  const totalLifetime = keys?.reduce((sum, k) => sum + (k.total_queries || 0), 0) || 0;
  const totalDailyLimit = keys?.reduce((sum, k) => sum + (k.daily_limit || 0), 0) || 0;

  // Get recent usage logs
  const { data: recentLogs } = await supabase
    .from('api_usage_logs')
    .select('model_used, tokens_in, tokens_out, verification_status, latency_ms, created_at')
    .eq('user_uid', user_uid)
    .order('created_at', { ascending: false })
    .limit(20);

  const planConfig = PLAN_CONFIG[user.plan] || PLAN_CONFIG['free'];

  return res.status(200).json({
    user_uid,
    plan: user.plan,
    plan_expires_at: user.plan_expires_at,
    usage: {
      queries_used_today: totalUsedToday,
      daily_limit: totalDailyLimit,
      queries_remaining_today: Math.max(0, totalDailyLimit - totalUsedToday),
      total_lifetime_queries: totalLifetime,
      monthly_limit: planConfig.monthly_limit,
    },
    recent_activity: recentLogs || []
  });
}

// ──────────────────────────────────────────
// ACTION: Get Plan Details
// ──────────────────────────────────────────
async function handlePlan(req: any, res: any) {
  const auth = await authenticateRequest(req.headers.authorization);
  const user_uid = auth?.user_uid || req.body?.user_uid || new URL(req.url, `https://${req.headers.host}`).searchParams.get('user_uid');

  if (!user_uid) return res.status(401).json({ error: 'Authentication required.' });

  const { data: user } = await supabase
    .from('enterprise_users')
    .select('*')
    .eq('user_uid', user_uid)
    .single();

  if (!user) return res.status(404).json({ error: 'User not found.' });

  const planConfig = PLAN_CONFIG[user.plan] || PLAN_CONFIG['free'];
  const expiresAt = new Date(user.plan_expires_at);
  const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return res.status(200).json({
    user_uid: user.user_uid,
    email: user.email,
    name: user.name,
    company: user.company,
    current_plan: {
      name: user.plan,
      price_usd: planConfig.price_usd,
      rate_limit: `${planConfig.rate_limit} req/min`,
      daily_limit: `${planConfig.daily_limit} req/day`,
      monthly_limit: `${planConfig.monthly_limit} req/month`,
      expires_at: user.plan_expires_at,
      days_remaining: daysRemaining,
      reminder_sent: user.reminder_sent,
    },
    upgrade_options: Object.entries(PLAN_CONFIG)
      .filter(([name]) => name !== user.plan)
      .map(([name, config]) => ({ plan: name, ...config }))
  });
}

// ──────────────────────────────────────────
// ACTION: List all available plans
// ──────────────────────────────────────────
async function handleListPlans(_req: any, res: any) {
  const plans = Object.entries(PLAN_CONFIG).map(([name, config]) => ({
    plan: name,
    price: config.price_usd === 0 ? 'Free' : `$${config.price_usd}/month`,
    rate_limit: `${config.rate_limit} requests/minute`,
    daily_limit: `${config.daily_limit} requests/day`,
    monthly_limit: `${config.monthly_limit} requests/month`,
    features: name === 'free'
      ? ['Basic CoVe verification', '2 API keys max', 'Community support']
      : name === 'starter'
      ? ['Full CoVe + Source citations', '5 API keys', 'Email support', 'Overage: $0.005/query']
      : name === 'pro'
      ? ['Full CoVe + Deep Verify', '10 API keys', 'Priority support', 'Overage: $0.003/query', 'Webhook notifications']
      : ['Full CoVe + Priority SLA', '50 API keys', 'Dedicated support', 'Overage: $0.001/query', 'Custom model routing', '99.9% uptime SLA']
  }));

  return res.status(200).json({
    plans,
    launch_offers: [
      { name: 'Early Adopter 50% Off', description: 'First 100 users get 50% off any paid plan for 6 months' },
      { name: 'Annual Discount', description: 'Pay yearly and get 2 months free (17% savings)' },
      { name: 'Startup Credit', description: 'Startups with <$1M revenue get $500 in free API credits' },
      { name: 'Open Source Bonus', description: 'Open-source projects get Free tier with 100 queries/day (4x normal)' }
    ]
  });
}

/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) return (import.meta as any).env[key];
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://placeholder.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'placeholder-key';
if (!getEnv('VITE_SUPABASE_URL') || !getEnv('VITE_SUPABASE_ANON_KEY')) {
  console.warn('Supabase URL or Anon Key is missing. Check your .env file or Vercel environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

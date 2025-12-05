import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const url = requireEnv('EXPO_PUBLIC_SUPABASE_URL');
    const anonKey = requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    supabase = createClient(url, anonKey, {
      auth: {
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }
  return supabase;
}

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // For demo mode - provide dummy values if environment variables are missing
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('Missing Supabase env vars - using demo mode');
    const dummyUrl = 'https://demo.supabase.co';
    const dummyKey = 'demo-key';
    return createBrowserClient(dummyUrl, dummyKey);
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
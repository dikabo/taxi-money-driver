import { createBrowserClient } from '@supabase/ssr';

/**
 * File: /lib/auth/supabase-client.ts
 * Purpose: Creates a Supabase client for use in Client Components (in the browser).
 */

export function createClient() {
  // Create a singleton client for the browser
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
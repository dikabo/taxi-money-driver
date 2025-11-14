import {
  createServerClient as createSupabaseServerClient,
  type CookieOptions,
} from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

/**
 * File: /lib/auth/supabase-server.ts
 */

// 1. CLIENT FOR HANDLING USER SESSIONS (COOKIES)
export function createCookieServerClient(
  cookieStore: ReadonlyRequestCookies
): SupabaseClient {
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Use the ANON key
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch { /* (Ignored) */ }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch { /* (Ignored) */ }
        },
      },
    }
  );
}

// 2. CLIENT FOR ADMIN ACTIONS (like creating a user)
export function createAdminServerClient(
  cookieStore: ReadonlyRequestCookies
): SupabaseClient {
  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!, // Use the SERVICE key
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch { /* (Ignored) */ }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch { /* (Ignored) */ }
        },
      },
    }
  );
  return supabase;
}
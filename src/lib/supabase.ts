import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Cloud sync is opt-in. With no credentials configured the app runs exactly as
 * it did before — local storage only, no sign-in, no network.
 */
export const isCloudConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isCloudConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Narrows the nullable client at the call site. */
export function requireClient(): SupabaseClient {
  if (!supabase) throw new Error('Cloud sync is not configured');
  return supabase;
}

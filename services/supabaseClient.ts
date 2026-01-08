
import { createClient } from '@supabase/supabase-js';

// Provided by Architect: https://zoovefufpmmzrfjophlx.supabase.co
const ARCHITECT_URL = 'https://zoovefufpmmzrfjophlx.supabase.co';

const supabaseUrl = process.env.SUPABASE_URL || ARCHITECT_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

/**
 * Checks if the cloud bridge is fully configured.
 * We require a valid URL and a key that is at least a reasonable length.
 */
export const isCloudEnabled = !!(
  supabaseUrl && 
  supabaseUrl.length > 10 &&
  supabaseAnonKey && 
  supabaseAnonKey.length > 10
);

// A stub implementation to prevent runtime crashes when cloud persistence is not configured
const mockSupabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error("Bridge not configured") }),
    signUp: async () => ({ data: { user: null, session: null }, error: new Error("Bridge not configured") }),
    signOut: async () => ({ error: null }),
  },
  from: () => ({
    upsert: async () => ({ error: new Error("Bridge not configured") }),
    insert: async () => ({ error: new Error("Bridge not configured") }),
    select: () => ({
      order: () => ({
        then: (cb: any) => cb({ data: [], error: null }),
        catch: (cb: any) => cb(new Error("Bridge not configured"))
      }),
      then: (cb: any) => cb({ data: [], error: null }),
      catch: (cb: any) => cb(new Error("Bridge not configured"))
    }),
  }),
} as any;

/**
 * Initialize the client. If cloud is not enabled, we use the mock
 * to ensure the UI doesn't crash.
 */
export const supabase = isCloudEnabled 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : mockSupabase;

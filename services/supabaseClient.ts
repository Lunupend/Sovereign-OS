
import { createClient } from '@supabase/supabase-js';

// Provided by Architect: https://zoovefufpmmzrfjophlx.supabase.co
const DEFAULT_URL = 'https://zoovefufpmmzrfjophlx.supabase.co';

const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Ensure we have a valid URL and a Key before attempting to initialize. 
// supabase-js throws if the URL is empty or doesn't look like a URL.
export const isCloudEnabled = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
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

// Only create the client if the substrate is fully ready
export const supabase = isCloudEnabled 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : mockSupabase;

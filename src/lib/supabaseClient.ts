import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for storage / server-side use (matches Medlinq).
 * Auth is handled by NextAuth, not Supabase — this client is for Storage and
 * any direct Supabase APIs. Import it only where needed (not at build root).
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

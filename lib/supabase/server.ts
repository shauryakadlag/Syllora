import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/database";

/**
 * Server-side Supabase client for public read operations.
 *
 * Strictly uses the public anonymous credentials (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
 * and operates under PostgreSQL Row Level Security (RLS).
 *
 * NEVER imports or uses SUPABASE_SERVICE_ROLE_KEY.
 */
let serverClient: SupabaseClient<Database> | null = null;

export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (serverClient) {
    return serverClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase public configuration. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
  }

  serverClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serverClient;
}

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

let _serverClient: SupabaseClient | null = null;
let _anonClient: SupabaseClient | null = null;

/** Server-side client with service role key (API routes only) */
export function getServerClient(): SupabaseClient {
  if (_serverClient) return _serverClient;
  _serverClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return _serverClient;
}

/** Anon client for client-side use */
export function getAnonClient(): SupabaseClient {
  if (_anonClient) return _anonClient;
  _anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return _anonClient;
}

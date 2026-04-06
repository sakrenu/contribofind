import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Missing Supabase environment variables");
    }
    _client = createClient(url, key);
  }
  return _client;
}

// Convenience export — only call this at runtime (not at module evaluation time)
export const supabase = {
  get client() {
    return getSupabaseClient();
  },
  from: (table: string) => getSupabaseClient().from(table),
};

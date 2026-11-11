import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfigured } from "@/lib/config";

export function createBrowserSupabase() {
  if (!supabaseConfigured) {
    throw new Error("Supabase não está configurado.");
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

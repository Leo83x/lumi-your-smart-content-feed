import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url =
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof process !== "undefined" ? process.env.SUPABASE_URL : "") ||
  "";
const anon =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof process !== "undefined" ? process.env.SUPABASE_PUBLISHABLE_KEY : "") ||
  "";

export const supabase: SupabaseClient = createClient(url, anon, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "lumi-auth",
  },
});

export const isSupabaseConfigured = Boolean(url && anon);
export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-placeholder",
  };
}

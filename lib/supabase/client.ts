import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "../utils";

export function createClient() {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient(url, key);
}

import { createServerSupabase } from "./supabase/server";
import type { Profile, Role } from "./types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", auth.user.id)
    .single();

  return (data as Profile | null) ?? null;
}

export async function ensureAdmin() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { ok: false as const, status: 401, error: "No autenticado" };
  }

  if (profile.role !== "admin") {
    return { ok: false as const, status: 403, error: "Solo admin" };
  }

  return { ok: true as const, profile };
}

export async function ensureCliente() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { ok: false as const, status: 401, error: "No autenticado" };
  }

  if (profile.role !== "cliente") {
    return { ok: false as const, status: 403, error: "Solo cliente" };
  }

  return { ok: true as const, profile };
}

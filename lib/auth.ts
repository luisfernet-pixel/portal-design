import { redirect } from "next/navigation";
import { createServerSupabase } from "./supabase/server";
import { Profile, Role } from "./types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", auth.user.id)
    .single();

  return data as Profile | null;
}

export async function requireRole(role: Role) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== role) redirect(profile.role === "admin" ? "/admin" : "/cliente");
  return profile;
}

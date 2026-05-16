import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { listPortalManagedClients } from "@/lib/portal-client-scope";

async function ensureAdmin() {
  const supabase = await createServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, status: 401, error: "No autenticado" } as const;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).single();
  if (!profile || profile.role !== "admin") return { ok: false, status: 403, error: "Solo admin" } as const;

  return { ok: true } as const;
}

export async function GET() {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const admin = createAdminSupabase();
    const clients = await listPortalManagedClients(admin);
    return NextResponse.json({ clients });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar clientes";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

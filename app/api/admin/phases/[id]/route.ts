import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

async function ensureAdmin() {
  const supabase = await createServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, status: 401, error: "No autenticado" } as const;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).single();
  if (!profile || profile.role !== "admin") return { ok: false, status: 403, error: "Solo admin" } as const;

  return { ok: true } as const;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;

  const body = await request.json();
  const updatePayload = {
    name: String(body.name ?? "").trim(),
    sort_order: Number(body.sort_order ?? 1),
    active: Boolean(body.active ?? true),
  };

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("project_phases")
    .update(updatePayload)
    .eq("id", id)
    .select("id,name,sort_order,active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ phase: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;

  const admin = createAdminSupabase();
  const { error } = await admin.from("project_phases").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

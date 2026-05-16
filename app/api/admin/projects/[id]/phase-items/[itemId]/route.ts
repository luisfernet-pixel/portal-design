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

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id, itemId } = await params;
  const body = await request.json();

  const payload = {
    project_id: id,
    phase_group: cleanText(body.phase_group) || "Fase",
    code: cleanText(body.code),
    name: cleanText(body.name),
    status: cleanText(body.status) || "no_iniciada",
    progress: Number(body.progress ?? 0),
    deliverable: cleanText(body.deliverable) || null,
    planned_start: body.planned_start || null,
    planned_end: body.planned_end || null,
    actual_end: body.actual_end || null,
    risk: cleanText(body.risk) || "bajo",
    client_note: cleanText(body.client_note) || null,
    sort_order: Number(body.sort_order ?? 1),
  };

  if (!payload.code || !payload.name) {
    return NextResponse.json({ error: "Codigo y nombre son obligatorios" }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("project_phase_items")
    .update(payload)
    .eq("id", itemId)
    .eq("project_id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id, itemId } = await params;

  const admin = createAdminSupabase();
  const { error } = await admin.from("project_phase_items").delete().eq("id", itemId).eq("project_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}


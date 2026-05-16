import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizeProjectStatus } from "@/lib/project-status";

async function ensureAdmin() {
  const supabase = await createServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, status: 401, error: "No autenticado" } as const;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).single();
  if (!profile || profile.role !== "admin") return { ok: false, status: 403, error: "Solo admin" } as const;

  return { ok: true } as const;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;

  const admin = createAdminSupabase();
  const [projectRes, galleryRes, decisionsRes, documentsRes, updatesRes, phaseItemsRes] = await Promise.all([
    admin.from("projects").select("*").eq("id", id).single(),
    admin.from("gallery_items").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    admin.from("decisions").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    admin.from("documents").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    admin.from("construction_updates").select("*").eq("project_id", id).order("update_date", { ascending: false }),
    admin.from("project_phase_items").select("*").eq("project_id", id).order("sort_order", { ascending: true }),
  ]);

  if (projectRes.error) {
    return NextResponse.json({ error: projectRes.error.message }, { status: 400 });
  }

  return NextResponse.json({
    project: projectRes.data,
    gallery: galleryRes.data ?? [],
    decisions: decisionsRes.data ?? [],
    documents: documentsRes.data ?? [],
    updates: updatesRes.data ?? [],
    phaseItems: phaseItemsRes.data ?? [],
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;

  const body = await request.json();
  const admin = createAdminSupabase();

  const payload = {
    name: String(body.name ?? "").trim(),
    client_id: String(body.client_id ?? "").trim(),
    status: normalizeProjectStatus(body.status),
    phase: String(body.phase ?? "Diagnostico").trim(),
    progress: Number(body.progress ?? 0),
    next_step: String(body.next_step ?? "").trim(),
    summary: String(body.summary ?? "").trim(),
    start_date: body.start_date || null,
    estimated_delivery: body.estimated_delivery || null,
  };

  const { data, error } = await admin
    .from("projects")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ project: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;

  const admin = createAdminSupabase();
  await admin.from("comments").delete().eq("project_id", id);
  await admin.from("gallery_items").delete().eq("project_id", id);
  await admin.from("decisions").delete().eq("project_id", id);
  await admin.from("documents").delete().eq("project_id", id);
  await admin.from("construction_updates").delete().eq("project_id", id);
  await admin.from("project_phase_items").delete().eq("project_id", id);

  const { error } = await admin.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}



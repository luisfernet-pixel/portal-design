import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

type UpdateDeliverableBody = {
  phase_id?: string;
  title?: string;
  description?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: "plano" | "render" | "documento" | "otro";
  status?: "pendiente" | "aprobado" | "con_observaciones";
};

export async function PATCH(req: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const body = (await req.json()) as UpdateDeliverableBody;

  const payload: Record<string, unknown> = {};

  if (typeof body.phase_id === "string") payload.phase_id = body.phase_id.trim();
  if (typeof body.title === "string") payload.title = body.title.trim();
  if (typeof body.description === "string") payload.description = body.description.trim() || null;
  if (body.description === null) payload.description = null;
  if (typeof body.file_url === "string") payload.file_url = body.file_url.trim() || null;
  if (body.file_url === null) payload.file_url = null;
  if (typeof body.file_name === "string") payload.file_name = body.file_name.trim() || null;
  if (body.file_name === null) payload.file_name = null;
  if (typeof body.file_type === "string") payload.file_type = body.file_type;
  if (typeof body.status === "string") payload.status = body.status;

  if (body.status === "aprobado") {
    payload.approved_at = new Date().toISOString();
    payload.approved_by = guard.profile.id;
  }

  if (body.status === "pendiente" || body.status === "con_observaciones") {
    payload.approved_at = null;
    payload.approved_by = null;
  }

  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("deliverables")
    .update(payload)
    .eq("id", id)
    .select(`
      id,
      project_id,
      phase_id,
      title,
      description,
      file_url,
      file_name,
      file_type,
      status,
      uploaded_at,
      approved_at,
      approved_by
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ deliverable: data });
}

export async function DELETE(_: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const admin = createAdminSupabase();

  const { error } = await admin.from("deliverables").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

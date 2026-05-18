import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

type UpdateProjectBody = {
  name?: string;
  description?: string | null;
  client_id?: string;
  status?: "activo" | "pausado" | "terminado";
  current_phase_id?: string | null;
};

export async function GET(_: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("projects")
    .select(`
      id,
      client_id,
      name,
      description,
      status,
      current_phase_id,
      created_at,
      updated_at,
      profiles:client_id (id, email, full_name, role),
      phases:project_phases!project_phases_project_id_fkey (id, project_id, name, description, order_index, status, progress, created_at),
      deliverables (id, project_id, phase_id, title, description, file_url, file_name, file_type, status, uploaded_at, approved_at, approved_by)
    `)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ project: data });
}

export async function PATCH(req: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const body = (await req.json()) as UpdateProjectBody;

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.name === "string") payload.name = body.name.trim();
  if (typeof body.description === "string") payload.description = body.description.trim() || null;
  if (body.description === null) payload.description = null;
  if (typeof body.client_id === "string") payload.client_id = body.client_id.trim();
  if (typeof body.status === "string") payload.status = body.status;
  if (body.current_phase_id === null || typeof body.current_phase_id === "string") {
    payload.current_phase_id = body.current_phase_id;
  }

  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("projects")
    .update(payload)
    .eq("id", id)
    .select(`
      id,
      client_id,
      name,
      description,
      status,
      current_phase_id,
      created_at,
      updated_at
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ project: data });
}

export async function DELETE(_: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const admin = createAdminSupabase();

  const { error } = await admin.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

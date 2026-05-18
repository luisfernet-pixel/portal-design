import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

type CreateDeliverableBody = {
  phase_id?: string;
  title?: string;
  description?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: "plano" | "render" | "documento" | "otro";
  status?: "pendiente" | "aprobado" | "con_observaciones";
};

export async function GET(_: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id: projectId } = await params;
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("deliverables")
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
      approved_by,
      phase:phase_id (id, name, order_index, status, progress),
      approver:approved_by (id, email, full_name, role)
    `)
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ deliverables: data ?? [] });
}

export async function POST(req: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id: projectId } = await params;
  const body = (await req.json()) as CreateDeliverableBody;

  const phaseId = body.phase_id?.trim();
  const title = body.title?.trim();
  const description = body.description?.trim() || null;
  const fileUrl = body.file_url?.trim() || null;
  const fileName = body.file_name?.trim() || null;
  const fileType = body.file_type ?? "otro";
  const status = body.status ?? "pendiente";

  if (!phaseId || !title) {
    return NextResponse.json({ error: "phase_id y title son obligatorios" }, { status: 400 });
  }

  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("deliverables")
    .insert({
      project_id: projectId,
      phase_id: phaseId,
      title,
      description,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
      status,
      approved_at: status === "aprobado" ? new Date().toISOString() : null,
      approved_by: status === "aprobado" ? guard.profile.id : null,
    })
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

  return NextResponse.json({ deliverable: data }, { status: 201 });
}

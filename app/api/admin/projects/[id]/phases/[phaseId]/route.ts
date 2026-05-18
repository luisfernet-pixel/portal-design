import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string; phaseId: string }> };

type UpdatePhaseBody = {
  name?: string;
  description?: string | null;
  order_index?: number;
  status?: "pendiente" | "activa" | "completada";
  progress?: number;
};

export async function PATCH(req: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id: projectId, phaseId } = await params;
  const body = (await req.json()) as UpdatePhaseBody;

  const payload: Record<string, unknown> = {};

  if (typeof body.name === "string") payload.name = body.name.trim();
  if (typeof body.description === "string") payload.description = body.description.trim() || null;
  if (body.description === null) payload.description = null;
  if (typeof body.order_index === "number") payload.order_index = body.order_index;
  if (typeof body.status === "string") payload.status = body.status;
  if (typeof body.progress === "number") payload.progress = body.progress;

  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("project_phases")
    .update(payload)
    .eq("id", phaseId)
    .eq("project_id", projectId)
    .select("id, project_id, name, description, order_index, status, progress, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (payload.status === "activa") {
    await admin.from("project_phases").update({ status: "pendiente" }).eq("project_id", projectId).neq("id", phaseId).eq("status", "activa");
    await admin.from("projects").update({ current_phase_id: phaseId, updated_at: new Date().toISOString() }).eq("id", projectId);
  }

  return NextResponse.json({ phase: data });
}

export async function DELETE(_: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id: projectId, phaseId } = await params;
  const admin = createAdminSupabase();

  const { error } = await admin
    .from("project_phases")
    .delete()
    .eq("id", phaseId)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: project } = await admin
    .from("projects")
    .select("current_phase_id")
    .eq("id", projectId)
    .maybeSingle();

  if (project?.current_phase_id === phaseId) {
    await admin
      .from("projects")
      .update({ current_phase_id: null, updated_at: new Date().toISOString() })
      .eq("id", projectId);
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureCliente } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const guard = await ensureCliente();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id: projectId } = await params;
  const admin = createAdminSupabase();

  const { data: project, error: projectError } = await admin
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
      current_phase:current_phase_id (id, project_id, name, description, order_index, status, progress, created_at)
    `)
    .eq("id", projectId)
    .eq("client_id", guard.profile.id)
    .single();

  if (projectError) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const { data: phases, error: phasesError } = await admin
    .from("project_phases")
    .select("id, project_id, name, description, order_index, status, progress, created_at")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });

  if (phasesError) return NextResponse.json({ error: phasesError.message }, { status: 400 });

  const activePhaseId = project.current_phase_id;
  const includeHistory = _.url.includes("includeHistory=1");

  let deliverablesQuery = admin
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
      approver:approved_by (id, email, full_name, role)
    `)
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false });

  if (!includeHistory) {
    deliverablesQuery = deliverablesQuery.eq("phase_id", activePhaseId);
  }

  const { data: deliverables, error: deliverablesError } = await deliverablesQuery;

  if (deliverablesError) return NextResponse.json({ error: deliverablesError.message }, { status: 400 });

  return NextResponse.json({
    project: {
      ...project,
      client_label: guard.profile.full_name ?? guard.profile.email ?? "Cliente",
    },
    phases: phases ?? [],
    deliverables: deliverables ?? [],
  });
}

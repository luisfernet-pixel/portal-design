import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureCliente } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const guard = await ensureCliente();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id: deliverableId } = await params;
  const admin = createAdminSupabase();

  const { data: current, error: currentError } = await admin
    .from("deliverables")
    .select("id, project_id")
    .eq("id", deliverableId)
    .single();

  if (currentError) return NextResponse.json({ error: "Entregable no encontrado" }, { status: 404 });

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, client_id")
    .eq("id", current.project_id)
    .eq("client_id", guard.profile.id)
    .single();

  if (projectError || !project) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const { data, error } = await admin
    .from("deliverables")
    .update({
      status: "aprobado",
      approved_at: new Date().toISOString(),
      approved_by: guard.profile.id,
    })
    .eq("id", deliverableId)
    .select("id, project_id, phase_id, title, status, approved_at, approved_by")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ deliverable: data });
}

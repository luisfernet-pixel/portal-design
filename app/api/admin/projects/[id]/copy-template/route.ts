import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id: projectId } = await params;
  const admin = createAdminSupabase();

  const { data: templates, error: templatesError } = await admin
    .from("phase_templates")
    .select("name, description, order_index")
    .eq("is_default", true)
    .order("order_index", { ascending: true });

  if (templatesError) return NextResponse.json({ error: templatesError.message }, { status: 400 });
  if (!templates || templates.length === 0) {
    return NextResponse.json({ error: "No hay fases plantilla para copiar" }, { status: 400 });
  }

  const rows = templates.map((t, i) => ({
    project_id: projectId,
    name: t.name,
    description: t.description,
    order_index: t.order_index ?? i + 1,
    status: i === 0 ? "activa" : "pendiente",
    progress: 0,
  }));

  const { data: inserted, error: insertError } = await admin
    .from("project_phases")
    .insert(rows)
    .select("id, project_id, name, description, order_index, status, progress, created_at")
    .order("order_index", { ascending: true });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  const activePhase = inserted?.find((p) => p.status === "activa");
  await admin
    .from("projects")
    .update({
      current_phase_id: activePhase?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  return NextResponse.json({ phases: inserted ?? [], copied: inserted?.length ?? 0 }, { status: 201 });
}

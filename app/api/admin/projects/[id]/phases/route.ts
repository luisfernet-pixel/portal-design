import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

type CreatePhaseBody = {
  name?: string;
  description?: string | null;
  order_index?: number;
  status?: "pendiente" | "activa" | "completada";
  progress?: number;
};

export async function GET(_: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id: projectId } = await params;
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("project_phases")
    .select("id, project_id, name, description, order_index, status, progress, created_at")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ phases: data ?? [] });
}

export async function POST(req: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id: projectId } = await params;
  const body = (await req.json()) as CreatePhaseBody;

  const name = body.name?.trim();
  const description = body.description?.trim() || null;
  const status = body.status ?? "pendiente";
  const progress = typeof body.progress === "number" ? body.progress : 0;

  if (!name) {
    return NextResponse.json({ error: "Nombre de fase obligatorio" }, { status: 400 });
  }

  const admin = createAdminSupabase();

  let orderIndex = body.order_index;
  if (typeof orderIndex !== "number") {
    const { data: last, error: lastError } = await admin
      .from("project_phases")
      .select("order_index")
      .eq("project_id", projectId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastError) return NextResponse.json({ error: lastError.message }, { status: 400 });
    orderIndex = (last?.order_index ?? 0) + 1;
  }

  const { data, error } = await admin
    .from("project_phases")
    .insert({
      project_id: projectId,
      name,
      description,
      order_index: orderIndex,
      status,
      progress,
    })
    .select("id, project_id, name, description, order_index, status, progress, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ phase: data }, { status: 201 });
}

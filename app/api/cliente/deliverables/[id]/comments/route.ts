import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureCliente } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

type CreateCommentBody = {
  body?: string;
};

async function assertClientAccessToDeliverable(deliverableId: string, clientId: string) {
  const admin = createAdminSupabase();

  const { data: deliverable, error: deliverableError } = await admin
    .from("deliverables")
    .select("id, project_id")
    .eq("id", deliverableId)
    .single();

  if (deliverableError || !deliverable) return { ok: false as const, status: 404, error: "Entregable no encontrado" };

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id")
    .eq("id", deliverable.project_id)
    .eq("client_id", clientId)
    .single();

  if (projectError || !project) return { ok: false as const, status: 403, error: "Sin acceso" };

  return { ok: true as const, projectId: deliverable.project_id };
}

export async function GET(_: Request, { params }: Params) {
  const guard = await ensureCliente();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id: deliverableId } = await params;
  const access = await assertClientAccessToDeliverable(deliverableId, guard.profile.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("comments")
    .select(`
      id,
      deliverable_id,
      project_id,
      author_id,
      body,
      created_at,
      author:author_id (id, email, full_name, role)
    `)
    .eq("deliverable_id", deliverableId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(req: Request, { params }: Params) {
  const guard = await ensureCliente();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id: deliverableId } = await params;
  const access = await assertClientAccessToDeliverable(deliverableId, guard.profile.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = (await req.json()) as CreateCommentBody;
  const text = body.body?.trim();

  if (!text) return NextResponse.json({ error: "Comentario obligatorio" }, { status: 400 });

  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("comments")
    .insert({
      deliverable_id: deliverableId,
      project_id: access.projectId,
      author_id: guard.profile.id,
      body: text,
    })
    .select(`
      id,
      deliverable_id,
      project_id,
      author_id,
      body,
      created_at
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ comment: data }, { status: 201 });
}

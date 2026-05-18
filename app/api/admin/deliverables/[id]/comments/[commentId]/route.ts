import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string; commentId: string }> };

type UpdateBody = {
  body?: string;
};

export async function PATCH(req: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id: deliverableId, commentId } = await params;
  const body = (await req.json()) as UpdateBody;
  const text = body.body?.trim();
  if (!text) return NextResponse.json({ error: "Comentario obligatorio" }, { status: 400 });

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("comments")
    .update({ body: text })
    .eq("id", commentId)
    .eq("deliverable_id", deliverableId)
    .select("id, deliverable_id, project_id, author_id, body, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ comment: data });
}

export async function DELETE(_: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id: deliverableId, commentId } = await params;
  const admin = createAdminSupabase();
  const { error } = await admin
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("deliverable_id", deliverableId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

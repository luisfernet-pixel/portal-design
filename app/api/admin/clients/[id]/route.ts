import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureAdmin } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;

  const body = await request.json();
  const admin = createAdminSupabase();

  const { data: existing, error: existingError } = await admin
    .from("profiles")
    .select("id,role")
    .eq("id", id)
    .eq("role", "cliente")
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.full_name !== undefined) updatePayload.full_name = String(body.full_name ?? "").trim();
  if (body.email !== undefined) updatePayload.email = String(body.email ?? "").trim().toLowerCase();
  if (body.role !== undefined) {
    const nextRole = String(body.role);
    if (nextRole !== "cliente") {
      return NextResponse.json({ error: "Solo se permite el rol cliente en este portal" }, { status: 400 });
    }
    updatePayload.role = nextRole;
  }

  const nextPassword = body.password !== undefined ? String(body.password ?? "").trim() : "";
  if (body.password !== undefined && nextPassword.length > 0 && nextPassword.length < 6) {
    return NextResponse.json({ error: "La nueva clave debe tener al menos 6 caracteres" }, { status: 400 });
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error: profileError } = await admin.from("profiles").update(updatePayload).eq("id", id);
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  if (body.email !== undefined || body.full_name !== undefined || nextPassword) {
    const authUpdate: { email?: string; password?: string; user_metadata?: { full_name?: string } } = {};
    if (body.email !== undefined) authUpdate.email = String(body.email ?? "").trim().toLowerCase();
    if (nextPassword) authUpdate.password = nextPassword;
    if (body.full_name !== undefined) authUpdate.user_metadata = { full_name: String(body.full_name ?? "").trim() };

    const { error: authError } = await admin.auth.admin.updateUserById(id, authUpdate);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { data, error } = await admin
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ client: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;

  const admin = createAdminSupabase();

  const { data: existing, error: existingError } = await admin
    .from("profiles")
    .select("id,role")
    .eq("id", id)
    .eq("role", "cliente")
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  await admin.from("projects").delete().eq("client_id", id);
  const { error } = await admin.from("profiles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.auth.admin.deleteUser(existing.id);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureAdmin } from "@/lib/auth";

export async function GET() {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("role", "cliente")
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ clients: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const fullName = String(body.full_name ?? "").trim();

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: "Completa email, password y nombre" }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { source_app: "portal-design" },
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "No se pudo crear el usuario" }, { status: 400 });
  }

  const userId = created.user.id;
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, email, full_name: fullName, role: "cliente" }, { onConflict: "id" });

  if (profileError) {
    return NextResponse.json({ error: `Usuario creado pero fallo perfil: ${profileError.message}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true, user_id: userId }, { status: 201 });
}

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

async function ensureAdmin() {
  const supabase = await createServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, status: 401, error: "No autenticado" } as const;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).single();
  if (!profile || profile.role !== "admin") return { ok: false, status: 403, error: "Solo admin" } as const;

  return { ok: true } as const;
}

export async function GET() {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("project_phases")
    .select("id,name,sort_order,active")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ phases: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const sortOrder = Number(body.sort_order ?? 1);
  const active = Boolean(body.active ?? true);

  if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("project_phases")
    .insert({ name, sort_order: sortOrder, active })
    .select("id,name,sort_order,active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ phase: data });
}

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { DEFAULT_PHASE_ITEMS } from "@/lib/default-phase-items";

async function ensureAdmin() {
  const supabase = await createServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, status: 401, error: "No autenticado" } as const;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).single();
  if (!profile || profile.role !== "admin") return { ok: false, status: 403, error: "Solo admin" } as const;
  return { ok: true } as const;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;

  const admin = createAdminSupabase();
  const { error: deleteError } = await admin.from("project_phase_items").delete().eq("project_id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  const phaseRows = DEFAULT_PHASE_ITEMS.map((item) => ({
    project_id: id,
    phase_group: item.phase_group,
    code: item.code,
    name: item.name,
    status: "no_iniciada",
    progress: 0,
    risk: "bajo",
    sort_order: item.sort_order,
  }));

  const { error: insertError } = await admin.from("project_phase_items").insert(phaseRows);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  const { data, error } = await admin
    .from("project_phase_items")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, items: data ?? [] });
}


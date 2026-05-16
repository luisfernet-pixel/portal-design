import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizeProjectStatus } from "@/lib/project-status";
import { DEFAULT_PHASE_ITEMS } from "@/lib/default-phase-items";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Solo admin" }, { status: 403 });

    const body = await request.json();
    const payload = {
      name: String(body.name ?? "").trim(),
      client_id: String(body.client_id ?? "").trim(),
      status: normalizeProjectStatus(body.status),
      phase: String(body.phase ?? "Diagnostico").trim(),
      progress: Number(body.progress ?? 0),
      next_step: String(body.next_step ?? "").trim(),
      summary: String(body.summary ?? "").trim(),
      start_date: body.start_date || null,
      estimated_delivery: body.estimated_delivery || null,
    };

    if (!payload.name || !payload.client_id) {
      return NextResponse.json({ error: "Nombre y cliente son obligatorios" }, { status: 400 });
    }

    const admin = createAdminSupabase();
    const { data: created, error } = await admin
      .from("projects")
      .insert(payload)
      .select("id,name,client_id,created_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const phaseRows = DEFAULT_PHASE_ITEMS.map((item) => ({
      project_id: created.id,
      phase_group: item.phase_group,
      code: item.code,
      name: item.name,
      status: "no_iniciada",
      progress: 0,
      risk: "bajo",
      sort_order: item.sort_order,
    }));

    const { error: phaseError } = await admin.from("project_phase_items").insert(phaseRows);
    if (phaseError) {
      await admin.from("projects").delete().eq("id", created.id);
      return NextResponse.json({ error: `Proyecto creado pero no se pudo inicializar subfases: ${phaseError.message}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, project: created });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}



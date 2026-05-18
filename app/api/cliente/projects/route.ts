import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureCliente } from "@/lib/auth";

export async function GET() {
  const guard = await ensureCliente();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("projects")
    .select(`
      id,
      client_id,
      name,
      description,
      status,
      current_phase_id,
      created_at,
      updated_at,
      current_phase:current_phase_id (id, project_id, name, description, order_index, status, progress, created_at)
    `)
    .eq("client_id", guard.profile.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ projects: data ?? [] });
}

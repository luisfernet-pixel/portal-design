import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureAdmin } from "@/lib/auth";

type CreateProjectBody = {
  name?: string;
  client_id?: string;
  description?: string | null;
  status?: "activo" | "pausado" | "terminado";
};

export async function GET() {
  const guard = await ensureAdmin();
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
      profiles:client_id (id, email, full_name, role),
      current_phase:current_phase_id (id, project_id, name, description, order_index, status, progress, created_at)
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(req: Request) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = (await req.json()) as CreateProjectBody;

  const name = body.name?.trim();
  const clientId = body.client_id?.trim();
  const description = body.description?.trim() || null;
  const status = body.status ?? "activo";

  if (!name || !clientId) {
    return NextResponse.json({ error: "Nombre y cliente son obligatorios" }, { status: 400 });
  }

  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("projects")
    .insert({
      name,
      client_id: clientId,
      description,
      status,
      current_phase_id: null,
    })
    .select(`
      id,
      client_id,
      name,
      description,
      status,
      current_phase_id,
      created_at,
      updated_at
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ project: data }, { status: 201 });
}

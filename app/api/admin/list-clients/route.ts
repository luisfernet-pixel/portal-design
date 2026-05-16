import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { listPortalManagedClients } from "@/lib/portal-client-scope";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).single();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Solo admin" }, { status: 403 });
    }

    const admin = createAdminSupabase();
    const data = await listPortalManagedClients(admin);

    const clients = data.map((c: any) => ({
      id: c.id,
      label: c.full_name ?? c.email ?? c.id,
      email: c.email ?? "",
      role: c.role,
    }));

    return NextResponse.json({ clients });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

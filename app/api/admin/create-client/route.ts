import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { PORTAL_SOURCE_APP } from "@/lib/portal-client-scope";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Solo admin puede crear clientes" }, { status: 403 });
    }

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
      user_metadata: { full_name: fullName, source_app: PORTAL_SOURCE_APP },
      app_metadata: { source_app: PORTAL_SOURCE_APP },
    });

    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message ?? "No se pudo crear el usuario" }, { status: 400 });
    }

    const userId = created.user.id;

    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          full_name: fullName,
          role: "cliente",
        },
        { onConflict: "id" }
      );

    if (profileError) {
      return NextResponse.json({ error: `Usuario creado pero fallo perfil: ${profileError.message}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user_id: userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

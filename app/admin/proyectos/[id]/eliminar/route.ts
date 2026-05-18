import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const guard = await ensureAdmin();
  if (!guard.ok) return NextResponse.redirect(new URL("/login", req.url));

  const { id } = await params;
  const admin = createAdminSupabase();
  await admin.from("projects").delete().eq("id", id);

  return NextResponse.redirect(new URL("/admin", req.url));
}

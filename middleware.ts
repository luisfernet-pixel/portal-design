import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user && (path.startsWith("/admin") || path.startsWith("/cliente"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && path === "/login") {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    return NextResponse.redirect(new URL(profile?.role === "admin" ? "/admin" : "/cliente", request.url));
  }

  if (user && (path.startsWith("/admin") || path.startsWith("/cliente"))) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (path.startsWith("/admin") && profile?.role !== "admin") return NextResponse.redirect(new URL("/cliente", request.url));
    if (path.startsWith("/cliente") && profile?.role !== "cliente") return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/cliente/:path*", "/login"],
};

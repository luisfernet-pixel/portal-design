"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const DEMO_ADMIN_EMAIL = process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL ?? "admin@portal.app";
const DEMO_ADMIN_PASSWORD = process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? "Admin123!";
const DEMO_CLIENT_EMAIL = process.env.NEXT_PUBLIC_DEMO_CLIENT_EMAIL ?? "delapaz@portal.app";
const DEMO_CLIENT_PASSWORD = process.env.NEXT_PUBLIC_DEMO_CLIENT_PASSWORD ?? "123456";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWith(emailValue: string, passwordValue: string) {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: signInError, data } = await supabase.auth.signInWithPassword({ email: emailValue, password: passwordValue });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    window.location.href = profile?.role === "admin" ? "/admin" : "/cliente";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await signInWith(email, password);
  }

  return (
    <main className="app-shell" style={{ maxWidth: 390, minHeight: "92vh", display: "flex", alignItems: "center" }}>
      <section className="card" style={{ width: "100%", padding: 14 }}>
        <span className="brand-chip">Portal Design</span>
        <h1 style={{ margin: "7px 0 4px", fontSize: 23, lineHeight: 1.08, color: "#ebfbff" }}>Gestion Digital de Proyectos</h1>
        <p style={{ margin: "0 0 10px", color: "#95a9c2", fontSize: 13 }}>Ingresa con tu email y contrasena.</p>

        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Contrasena" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error ? <p style={{ margin: 0, color: "#ff9494", fontSize: 10 }}>{error}</p> : null}
          <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Ingresando..." : "Ingresar"}</button>
        </form>

        <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid rgba(138,190,217,.35)" }}>
          <p style={{ margin: "0 0 7px", fontSize: 10, color: "#95a9c2" }}>Acceso rapido temporal (demo):</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn-soft" type="button" disabled={loading} onClick={() => { setEmail(DEMO_ADMIN_EMAIL); setPassword(DEMO_ADMIN_PASSWORD); }}>Usar datos Admin</button>
            <button className="btn-soft" type="button" disabled={loading} onClick={() => { setEmail(DEMO_CLIENT_EMAIL); setPassword(DEMO_CLIENT_PASSWORD); }}>Usar datos Cliente</button>
            <button className="btn-soft" type="button" disabled={loading} onClick={() => signInWith(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD)}>Entrar Admin directo</button>
            <button className="btn-soft" type="button" disabled={loading} onClick={() => signInWith(DEMO_CLIENT_EMAIL, DEMO_CLIENT_PASSWORD)}>Entrar Cliente directo</button>
          </div>
          <p style={{ margin: "7px 0 0", fontSize: 9, color: "#7996b6" }}>
            Si falla el acceso directo, pulsa "Usar datos..." y luego "Ingresar".
          </p>
        </div>
      </section>
    </main>
  );
}

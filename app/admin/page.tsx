import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ProjectCard } from "@/components/ProjectCard";
import LogoutButton from "../logout-button";
import { requireRole } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export default async function AdminDashboard() {
  await requireRole("admin");
  const supabase = createAdminSupabase();

  const { data: projectsRaw } = await supabase
    .from("projects")
    .select("id,name,client_id,status,phase,progress,next_step,summary,start_date,estimated_delivery,created_at,updated_at,profiles:client_id(full_name,email)")
    .order("updated_at", { ascending: false });
  const projects = (projectsRaw ?? []).map((p: any) => ({
    ...p,
    profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
  }));

  const total = projects.length;
  const activos = projects.filter((p) => ["activo"].includes((p.status || "").toLowerCase())).length;
  const pendientes = (await supabase.from("decisions").select("id", { count: "exact", head: true }).eq("status", "pendiente")).count ?? 0;

  return (
    <AppShell title="Dashboard Admin" subtitle="Resumen general de proyectos" actions={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Link href="/admin/clientes" className="btn-soft">Clientes</Link><Link href="/admin/fases" className="btn-soft">Fases</Link><Link href="/admin/proyectos/nuevo" className="btn-primary">Nuevo proyecto</Link><LogoutButton /></div>}>
      <section className="grid-kpis" style={{ marginBottom: 10 }}>
        <article className="card kpi" style={{ padding: 10, background: "linear-gradient(140deg,rgba(255,255,255,.06),rgba(24,28,37,.96) 68%)" }}><p>Cantidad de proyectos</p><h3>{total}</h3></article>
        <article className="card kpi" style={{ padding: 10, background: "linear-gradient(140deg,rgba(245,158,11,.14),rgba(24,28,37,.96) 68%)" }}><p>Proyectos activos</p><h3>{activos}</h3></article>
        <article className="card kpi" style={{ padding: 10, background: "linear-gradient(140deg,rgba(229,83,45,.14),rgba(24,28,37,.96) 68%)" }}><p>Decisiones pendientes</p><h3>{pendientes}</h3></article>
      </section>
      <section style={{ display: "grid", gap: 12 }}>
        {projects.map((project) => <ProjectCard key={project.id} project={project} href={`/admin/proyectos/${project.id}`} />)}
      </section>
      {projects.length === 0 ? (
        <section className="card" style={{ marginTop: 10, padding: 12, borderColor: "rgba(255,255,255,.12)", background: "linear-gradient(120deg,rgba(255,255,255,.05),rgba(229,83,45,.12))" }}>
          <h3 style={{ margin: "0 0 4px", color: "#f4f6fb", fontSize: 16 }}>Empieza en 2 pasos</h3>
          <p style={{ margin: 0, color: "#b3bac7", fontSize: 13 }}>
            1) Crea un cliente. 2) Crea un proyecto y asignalo a ese cliente.
          </p>
        </section>
      ) : null}
    </AppShell>
  );
}



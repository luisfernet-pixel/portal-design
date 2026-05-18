import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProjectCard } from "@/components/ProjectCard";
import LogoutButton from "../logout-button";
import { ensureCliente } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export default async function ClienteDashboard() {
  const guard = await ensureCliente();
  if (!guard.ok) redirect("/login");
  const profile = guard.profile;

  const admin = createAdminSupabase();
  const { data: projectsRaw, error: projectsError } = await admin
    .from("projects")
    .select("id,client_id,name,description,status,current_phase_id,created_at,updated_at,profiles:client_id(full_name,email),current_phase:current_phase_id(name,progress),phases:project_phases!project_phases_project_id_fkey(id,name,order_index,status,progress,created_at)")
    .eq("client_id", profile.id)
    .order("updated_at", { ascending: false });

  if (projectsError) {
    return (
      <AppShell title="Mis proyectos" subtitle="Estado y decisiones pendientes" actions={<LogoutButton />}>
        <section className="card" style={{ padding: 12 }}>
          <p style={{ margin: 0, color: "#ff9c9c" }}>{projectsError.message}</p>
        </section>
      </AppShell>
    );
  }

  const projects = projectsRaw ?? [];

  return (
    <AppShell title="Mis proyectos" subtitle="Estado y decisiones pendientes" actions={<LogoutButton />}>
      <section style={{ display: "grid", gap: 12 }}>
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} href={`/cliente/proyectos/${project.id}`} />
        ))}
      </section>
    </AppShell>
  );
}

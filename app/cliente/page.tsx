import { AppShell } from "@/components/AppShell";
import { ProjectCard } from "@/components/ProjectCard";
import LogoutButton from "../logout-button";
import { requireRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function ClienteDashboard() {
  const profile = await requireRole("cliente");
  const supabase = await createServerSupabase();
  const { data: projectsRaw } = await supabase.from("projects").select("*, profiles:client_id(full_name,email)").eq("client_id", profile.id).order("updated_at", { ascending: false });
  const projects = projectsRaw ?? [];

  return <AppShell title="Mis proyectos" subtitle="Estado y decisiones pendientes" actions={<LogoutButton />}><section style={{ display: "grid", gap: 12 }}>{projects.map((project) => <ProjectCard key={project.id} project={project} href={`/cliente/proyectos/${project.id}`} />)}</section></AppShell>;
}

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ProgressBar } from "@/components/ProgressBar";
import LogoutButton from "../logout-button";
import { redirect } from "next/navigation";
import { ensureAdmin } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ProjectAlertsBadge } from "@/components/ProjectAlertsBadge";
import { ConfirmPostForm } from "@/components/ConfirmPostForm";

export default async function AdminDashboardPage() {
  const guard = await ensureAdmin();
  if (!guard.ok) redirect("/login");
  const admin = createAdminSupabase();

  type DashboardRow = {
    id: string;
    name: string;
    status: string;
    current_phase?: { name?: string; progress?: number } | { name?: string; progress?: number }[] | null;
    deliverables?: { id: string; status: string }[] | null;
    profiles?: { full_name?: string; email?: string } | { full_name?: string; email?: string }[] | null;
  };

  const { data: projects } = await admin
    .from("projects")
    .select("id,name,status,current_phase:current_phase_id(name,progress),deliverables:deliverables(id,status),profiles:client_id(full_name,email)")
    .order("updated_at", { ascending: false });

  const rows = (projects ?? []) as DashboardRow[];

  type Group = { key: string; label: string; projects: DashboardRow[] };
  const groupsMap = new Map<string, Group>();

  for (const project of rows) {
    const profile = Array.isArray(project.profiles) ? project.profiles[0] : project.profiles;
    const label = profile?.full_name ?? profile?.email ?? "Sin cliente";
    const key = profile?.email ?? label;

    const existing = groupsMap.get(key);
    if (existing) {
      existing.projects.push(project);
    } else {
      groupsMap.set(key, { key, label, projects: [project] });
    }
  }

  const groups = Array.from(groupsMap.values());

  return (
    <AppShell
      title="Dashboard Admin"
      subtitle="Resumen de proyectos"
      actions={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/clientes" className="btn-soft">Clientes</Link>
          <Link href="/admin/proyectos/nuevo" className="btn-primary">Nuevo proyecto</Link>
          <LogoutButton />
        </div>
      }
    >
      <section style={{ display: "grid", gap: 10 }}>
        {groups.map((group, idx) => (
          <details key={group.key} className="card" open={idx === 0} style={{ padding: 12 }}>
            <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <strong>{group.label}</strong>
              <span style={{ fontSize: 12, color: "#b4bfd0" }}>
                {group.projects.length} proyecto{group.projects.length === 1 ? "" : "s"}
              </span>
            </summary>

            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {group.projects.map((project) => {
                const phase = Array.isArray(project.current_phase) ? project.current_phase[0] : project.current_phase;
                const progress = typeof phase?.progress === "number" ? phase.progress : 0;
                return (
                  <article key={project.id} className="card" style={{ padding: 12, display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <strong>{project.name}</strong>
                        <ProjectAlertsBadge projectId={project.id} role="admin" />
                      </div>
                      <span style={{ fontSize: 12, color: "#b4bfd0" }}>{project.status}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "#b4bfd0" }}>
                      Fase actual: {phase?.name ?? "Sin fase activa"} ({progress}%)
                    </p>
                    <ProgressBar value={progress} tone="info" />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link href={`/admin/proyectos/${project.id}`} className="btn-soft">Abrir proyecto</Link>
                      <Link href={`/admin/proyectos/${project.id}/editar`} className="btn-secondary">Editar</Link>
                      <ConfirmPostForm
                        action={`/admin/proyectos/${project.id}/eliminar`}
                        className="btn-secondary"
                        confirmText={`Vas a eliminar el proyecto \"${project.name}\". Esta accion no se puede deshacer. Quieres continuar?`}
                      >
                        Eliminar
                      </ConfirmPostForm>
                    </div>
                  </article>
                );
              })}
            </div>
          </details>
        ))}
      </section>
    </AppShell>
  );
}

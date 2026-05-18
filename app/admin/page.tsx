import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ProgressBar } from "@/components/ProgressBar";
import LogoutButton from "../logout-button";
import { redirect } from "next/navigation";
import { ensureAdmin } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ProjectAlertsBadge } from "@/components/ProjectAlertsBadge";
import { ConfirmPostForm } from "@/components/ConfirmPostForm";
import { StatusBadge } from "@/components/StatusBadge";

export default async function AdminDashboardPage() {
  const guard = await ensureAdmin();
  if (!guard.ok) redirect("/login");
  const admin = createAdminSupabase();

  type PhaseRow = {
    id: string;
    name: string;
    order_index: number;
    status: string;
    progress: number | null;
  };

  type DashboardRow = {
    id: string;
    name: string;
    status: string;
    updated_at: string;
    current_phase_id?: string | null;
    current_phase?: { name?: string; progress?: number } | { name?: string; progress?: number }[] | null;
    phases?: PhaseRow[] | null;
    deliverables?: { id: string; status: string }[] | null;
    profiles?: { full_name?: string; email?: string } | { full_name?: string; email?: string }[] | null;
  };

  const { data: projects } = await admin
    .from("projects")
    .select("id,name,status,updated_at,current_phase_id,current_phase:current_phase_id(name,progress),phases:project_phases!project_phases_project_id_fkey(id,name,order_index,status,progress,created_at),deliverables:deliverables(id,status),profiles:client_id(full_name,email)")
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
        {groups.map((group) => (
          <details key={group.key} className="card" style={{ padding: 12 }}>
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
                const phases = Array.isArray(project.phases) ? [...project.phases].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)) : [];
                const currentPhaseId = typeof project.current_phase_id === "string" ? project.current_phase_id : null;
                const averageProgress = phases.length
                  ? Math.round(phases.reduce((acc, p) => acc + (typeof p.progress === "number" ? p.progress : 0), 0) / phases.length)
                  : Math.round(progress);

                return (
                  <details key={project.id} className="card" style={{ padding: 12 }}>
                    <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <strong>{project.name}</strong>
                        <ProjectAlertsBadge projectId={project.id} role="admin" />
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <StatusBadge value={project.status} />
                      </span>
                    </summary>

                    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                      {phases.length > 0 ? (
                        <div style={{ paddingTop: 6, display: "grid", gap: 10 }}>
                          <div style={{ display: "grid", gap: 8 }}>
                            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#d5ecff" }}>Avance General</p>
                            <ProgressBar value={averageProgress} tone="accent" thickness={12} />
                            <p style={{ margin: 0, fontSize: 14, color: "#8ea8c9" }}>{averageProgress}%</p>
                          </div>

                          <details>
                            <summary style={{ cursor: "pointer", fontSize: 22, fontWeight: 900, letterSpacing: 0.2, color: "#ffffff" }}>
                              Fases
                            </summary>

                            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                              {phases.map((p) => {
                                const phaseProgress = typeof p.progress === "number" ? Math.max(0, Math.min(100, p.progress)) : 0;
                                const isCurrent = (currentPhaseId && p.id === currentPhaseId) || p.status === "activa";
                                const labelRight = phaseProgress >= 100 ? "Fase Completada 100%" : `${phaseProgress}%`;

                                return (
                                  <div key={p.id} style={{ display: "grid", gap: 6 }}>
                                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                                      <p style={{ margin: 0, fontSize: isCurrent ? 14 : 12, fontWeight: isCurrent ? 800 : 600, color: isCurrent ? "var(--info)" : "#b8c3d6" }}>
                                        {p.order_index}. {p.name}
                                        {isCurrent ? <span style={{ color: "#ffffff", fontWeight: 700 }}> Fase Activa</span> : null}
                                      </p>
                                      <p style={{ margin: 0, fontSize: 12, color: phaseProgress >= 100 ? "var(--info)" : "#8ea8c9", fontWeight: phaseProgress >= 100 ? 800 : 500 }}>
                                        {labelRight}
                                      </p>
                                    </div>
                                    <ProgressBar value={phaseProgress} tone={isCurrent ? "info" : "muted"} />
                                  </div>
                                );
                              })}
                            </div>
                          </details>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 6 }}>
                          <p style={{ margin: 0, fontSize: 13, color: "#b4bfd0" }}>
                            Fase actual: {phase?.name ?? "Sin fase activa"} ({progress}%)
                          </p>
                          <ProgressBar value={progress} tone="info" />
                        </div>
                      )}

                      <p style={{ margin: "0 0 2px", fontSize: 13, color: "#8ea8c9" }}>
                        <strong>Ultimo movimiento:</strong> {new Date(project.updated_at).toLocaleString("es-BO")}
                      </p>

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
                    </div>
                  </details>
                );
              })}
            </div>
          </details>
        ))}
      </section>
    </AppShell>
  );
}

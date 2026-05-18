import Link from "next/link";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";
import { ProjectAlertsBadge } from "@/components/ProjectAlertsBadge";

type PhaseRow = {
  id: string;
  name: string;
  order_index: number;
  status: string;
  progress: number | null;
};

type ProjectCardProject = {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  current_phase_id?: string | null;
  profiles?: { full_name?: string | null; email?: string | null } | { full_name?: string | null; email?: string | null }[] | null;
  current_phase?: { name?: string | null; progress?: number | null } | { name?: string | null; progress?: number | null }[] | null;
  phases?: PhaseRow[] | null;
};

export function ProjectCard({ project, href }: { project: ProjectCardProject; href: string }) {
  const client = Array.isArray(project.profiles) ? project.profiles[0] : project.profiles;
  const currentPhase = Array.isArray(project.current_phase) ? project.current_phase[0] : project.current_phase;
  const phaseName = currentPhase?.name ?? "Sin fase activa";
  const phaseProgress = typeof currentPhase?.progress === "number" ? currentPhase.progress : 0;
  const phases = Array.isArray(project.phases) ? [...project.phases].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)) : [];
  const currentPhaseId = typeof project.current_phase_id === "string" ? project.current_phase_id : null;
  const averageProgress = phases.length
    ? Math.round(phases.reduce((acc, p) => acc + (typeof p.progress === "number" ? p.progress : 0), 0) / phases.length)
    : Math.round(phaseProgress);
  void phaseName;

  return (
    <article className="card" style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 24, lineHeight: 1, color: "#eafdff" }}>{project.name}</h3>
          <p style={{ margin: "4px 0 0", color: "#95a9c2", fontSize: 14 }}>{client?.full_name ?? client?.email ?? "Cliente"}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ProjectAlertsBadge projectId={project.id} role="cliente" />
          <StatusBadge value={project.status} />
        </div>
      </div>
      {phases.length > 0 ? (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.10)", display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#d5ecff" }}>Avance General</p>
            <ProgressBar value={averageProgress} tone="accent" thickness={12} />
            <p style={{ margin: 0, fontSize: 14, color: "#8ea8c9" }}>{averageProgress}%</p>
          </div>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: 0.2, color: "#ffffff" }}>Fases</p>
          <div style={{ display: "grid", gap: 8 }}>
            {phases.map((p) => {
              const progress = typeof p.progress === "number" ? Math.max(0, Math.min(100, p.progress)) : 0;
              const isCurrent = (currentPhaseId && p.id === currentPhaseId) || p.status === "activa";
              return (
                <div key={p.id} style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                    <p style={{ margin: 0, fontSize: isCurrent ? 14 : 12, fontWeight: isCurrent ? 800 : 600, color: isCurrent ? "var(--info)" : "#b8c3d6" }}>
                      {p.order_index}. {p.name}
                      {isCurrent ? <span style={{ color: "#ffffff", fontWeight: 700 }}> Fase Activa</span> : null}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: progress >= 100 ? "var(--info)" : "#8ea8c9", fontWeight: progress >= 100 ? 800 : 500 }}>
                      {progress >= 100 ? "Fase Completada 100%" : `${progress}%`}
                    </p>
                  </div>
                  <ProgressBar value={progress} tone={isCurrent ? "info" : "muted"} />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <p style={{ margin: "7px 0 10px", fontSize: 13, color: "#8ea8c9" }}><strong>Ultimo movimiento:</strong> {new Date(project.updated_at).toLocaleString("es-BO")}</p>
      <Link href={href} className="btn-primary" style={{ fontSize: 16, padding: "8px 12px" }}>Entrar al proyecto</Link>
    </article>
  );
}

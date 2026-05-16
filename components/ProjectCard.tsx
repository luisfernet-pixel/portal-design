import Link from "next/link";
import { Project } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";

export function ProjectCard({ project, href }: { project: Project; href: string }) {
  return (
    <article className="card" style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 24, lineHeight: 1, color: "#eafdff" }}>{project.name}</h3>
          <p style={{ margin: "4px 0 0", color: "#95a9c2", fontSize: 14 }}>{(project as any).profiles?.full_name ?? (project as any).profiles?.email ?? "Cliente"}</p>
        </div>
        <StatusBadge value={project.status} />
      </div>
      <p style={{ margin: "9px 0 5px", fontSize: 15, color: "#d5ecff" }}><strong>Fase:</strong> {project.phase}</p>
      <ProgressBar value={project.progress ?? 0} />
      <p style={{ margin: "6px 0 0", fontSize: 14, color: "#8ac5e9" }}>Progreso: {project.progress ?? 0}%</p>
      <p style={{ margin: "7px 0 10px", fontSize: 13, color: "#8ea8c9" }}><strong>Ultimo movimiento:</strong> {new Date(project.updated_at).toLocaleDateString("es-BO")}</p>
      <Link href={href} className="btn-primary" style={{ fontSize: 16, padding: "8px 12px" }}>Entrar al proyecto</Link>
    </article>
  );
}

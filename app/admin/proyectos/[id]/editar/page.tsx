"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ClientOption = { id: string; full_name: string | null; email: string | null };
type Phase = {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  status: "pendiente" | "activa" | "completada";
  progress: number;
};

type ProjectPayload = {
  id: string;
  name: string;
  description: string | null;
  client_id: string;
  status: "activo" | "pausado" | "terminado";
};

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const projectId = typeof params?.id === "string" ? params.id : "";

  const [project, setProject] = useState<ProjectPayload | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseDescription, setNewPhaseDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProject, setSavingProject] = useState(false);
  const [savingPhase, setSavingPhase] = useState(false);
  const [error, setError] = useState("");

  async function loadAll() {
    if (!projectId) return;
    setError("");
    const [projectRes, clientsRes, phasesRes] = await Promise.all([
      fetch(`/api/admin/projects/${projectId}`, { cache: "no-store" }),
      fetch("/api/admin/clients", { cache: "no-store" }),
      fetch(`/api/admin/projects/${projectId}/phases`, { cache: "no-store" }),
    ]);

    const projectJson = await projectRes.json();
    const clientsJson = await clientsRes.json();
    const phasesJson = await phasesRes.json();

    if (!projectRes.ok) return setError(projectJson.error ?? "No se pudo cargar proyecto");
    if (!clientsRes.ok) return setError(clientsJson.error ?? "No se pudo cargar clientes");
    if (!phasesRes.ok) return setError(phasesJson.error ?? "No se pudo cargar fases");

    setProject(projectJson.project);
    setClients(clientsJson.clients ?? []);
    setPhases(phasesJson.phases ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(t);
  }, [projectId]);

  async function saveProject() {
    if (!project) return;
    setSavingProject(true);
    setError("");
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: project.name,
        description: project.description,
        client_id: project.client_id,
        status: project.status,
      }),
    });
    const json = await res.json();
    setSavingProject(false);
    if (!res.ok) return setError(json.error ?? "No se pudo guardar proyecto");
    await loadAll();
  }

  async function addPhase() {
    if (!newPhaseName.trim()) return;
    setSavingPhase(true);
    setError("");
    const res = await fetch(`/api/admin/projects/${projectId}/phases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newPhaseName.trim(),
        description: newPhaseDescription.trim() || null,
      }),
    });
    const json = await res.json();
    setSavingPhase(false);
    if (!res.ok) return setError(json.error ?? "No se pudo crear fase");
    setNewPhaseName("");
    setNewPhaseDescription("");
    await loadAll();
  }

  async function savePhase(phase: Phase) {
    setSavingPhase(true);
    setError("");
    const res = await fetch(`/api/admin/projects/${projectId}/phases/${phase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: phase.name,
        description: phase.description,
        order_index: phase.order_index,
        status: phase.status,
        progress: phase.progress,
      }),
    });
    const json = await res.json();
    setSavingPhase(false);
    if (!res.ok) return setError(json.error ?? "No se pudo guardar fase");
    await loadAll();
  }

  async function deletePhase(phaseId: string) {
    if (!window.confirm("Eliminar esta fase?")) return;
    setSavingPhase(true);
    setError("");
    const res = await fetch(`/api/admin/projects/${projectId}/phases/${phaseId}`, { method: "DELETE" });
    const json = await res.json();
    setSavingPhase(false);
    if (!res.ok) return setError(json.error ?? "No se pudo eliminar fase");
    await loadAll();
  }

  if (loading) return <main className="app-shell">Cargando...</main>;
  if (!project) return <main className="app-shell">Proyecto no disponible.</main>;

  return (
    <main className="app-shell" style={{ display: "grid", gap: 12, maxWidth: 1200 }}>
      <section className="card" style={{ padding: 12, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Editar proyecto</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/admin/proyectos/${projectId}`} className="btn-soft">Abrir proyecto</Link>
          <Link href="/admin" className="btn-secondary">Volver</Link>
        </div>
      </section>

      {error ? <p style={{ margin: 0, color: "#ff9c9c", fontSize: 13 }}>{error}</p> : null}

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
        <section className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Parametros</h3>
          <input className="input" value={project.name} onChange={(e) => setProject((prev) => (prev ? { ...prev, name: e.target.value } : prev))} placeholder="Nombre" />
          <textarea className="textarea" value={project.description ?? ""} onChange={(e) => setProject((prev) => (prev ? { ...prev, description: e.target.value } : prev))} placeholder="Descripcion" rows={4} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select className="input" value={project.client_id} onChange={(e) => setProject((prev) => (prev ? { ...prev, client_id: e.target.value } : prev))}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name ?? c.email ?? c.id}</option>
              ))}
            </select>
            <select className="input" value={project.status} onChange={(e) => setProject((prev) => (prev ? { ...prev, status: e.target.value as ProjectPayload["status"] } : prev))}>
              <option value="activo">activo</option>
              <option value="pausado">pausado</option>
              <option value="terminado">terminado</option>
            </select>
          </div>
          <button type="button" className="btn-primary" onClick={() => void saveProject()} disabled={savingProject}>
            {savingProject ? "Guardando..." : "Guardar proyecto"}
          </button>
        </section>

        <section className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Fases</h3>

          <div style={{ display: "grid", gap: 8, border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: 10 }}>
            <input className="input" placeholder="Nueva fase" value={newPhaseName} onChange={(e) => setNewPhaseName(e.target.value)} />
            <textarea className="textarea" placeholder="Descripcion fase" value={newPhaseDescription} onChange={(e) => setNewPhaseDescription(e.target.value)} rows={3} />
            <button type="button" className="btn-soft" onClick={() => void addPhase()} disabled={savingPhase}>
              {savingPhase ? "Guardando..." : "Crear fase"}
            </button>
          </div>

          {phases.map((phase) => (
            <article key={phase.id} style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: 10, display: "grid", gap: 8 }}>
              <input
                className="input"
                value={phase.name}
                onChange={(e) =>
                  setPhases((prev) => prev.map((p) => (p.id === phase.id ? { ...p, name: e.target.value } : p)))
                }
              />
              <textarea
                className="textarea"
                value={phase.description ?? ""}
                onChange={(e) =>
                  setPhases((prev) => prev.map((p) => (p.id === phase.id ? { ...p, description: e.target.value } : p)))
                }
                rows={3}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#9db0c6" }}>Orden</span>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={phase.order_index}
                    onChange={(e) =>
                      setPhases((prev) => prev.map((p) => (p.id === phase.id ? { ...p, order_index: Number(e.target.value || 1) } : p)))
                    }
                  />
                </label>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#9db0c6" }}>Avance %</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={100}
                    value={phase.progress}
                    onChange={(e) =>
                      setPhases((prev) => prev.map((p) => (p.id === phase.id ? { ...p, progress: Number(e.target.value || 0) } : p)))
                    }
                  />
                </label>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#9db0c6" }}>Estado</span>
                  <select
                    className="input"
                    value={phase.status}
                    onChange={(e) =>
                      setPhases((prev) => prev.map((p) => (p.id === phase.id ? { ...p, status: e.target.value as Phase["status"] } : p)))
                    }
                  >
                    <option value="pendiente">pendiente</option>
                    <option value="activa">activa</option>
                    <option value="completada">completada</option>
                  </select>
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn-primary" onClick={() => void savePhase(phase)} disabled={savingPhase}>
                  Guardar fase
                </button>
                <button type="button" className="btn-secondary" onClick={() => void deletePhase(phase.id)} disabled={savingPhase}>
                  Eliminar fase
                </button>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

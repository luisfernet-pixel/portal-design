"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Phase, Deliverable } from "@/lib/types";
import { PhaseTimeline } from "@/components/PhaseTimeline";
import { DeliverableCard } from "@/components/DeliverableCard";
import { DeliverableUpload } from "@/components/DeliverableUpload";
import { createClient } from "@/lib/supabase/client";
import { markDeliverableSeen, setSeenCommentAt, setSeenStatus } from "@/lib/alerts-client";

type ProjectPayload = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  current_phase_id: string | null;
};

export default function AdminProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = typeof params?.id === "string" ? params.id : "";

  const [project, setProject] = useState<ProjectPayload | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);
  const [progressByPhase, setProgressByPhase] = useState<Record<string, number>>({});
  const [savingProgressByPhase, setSavingProgressByPhase] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const prevDeliverablesCount = useRef<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? null));
  }, []);

  async function loadAll(showNotice = false) {
    if (!projectId) return;
    setError("");

    const [projectRes, phasesRes, deliverablesRes] = await Promise.all([
      fetch(`/api/admin/projects/${projectId}`, { cache: "no-store" }),
      fetch(`/api/admin/projects/${projectId}/phases`, { cache: "no-store" }),
      fetch(`/api/admin/projects/${projectId}/deliverables`, { cache: "no-store" }),
    ]);

    const projectJson = await projectRes.json();
    const phasesJson = await phasesRes.json();
    const deliverablesJson = await deliverablesRes.json();

    if (!projectRes.ok) return setError(projectJson.error ?? "No se pudo cargar proyecto");
    if (!phasesRes.ok) return setError(phasesJson.error ?? "No se pudo cargar fases");
    if (!deliverablesRes.ok) return setError(deliverablesJson.error ?? "No se pudo cargar entregables");

    setProject(projectJson.project ?? null);
    setPhases(phasesJson.phases ?? []);
    const nextDeliverables = (deliverablesJson.deliverables ?? []) as Deliverable[];
    if (showNotice && prevDeliverablesCount.current !== null && nextDeliverables.length > prevDeliverablesCount.current) {
      setNotice("Llegó un nuevo entregable.");
    }
    prevDeliverablesCount.current = nextDeliverables.length;
    setDeliverables(nextDeliverables);
    setProgressByPhase(
      Object.fromEntries(
        (phasesJson.phases ?? []).map((phase: Phase) => [phase.id, Math.max(0, Math.min(100, Number(phase.progress ?? 0)))])
      )
    );

    const current = projectJson.project?.current_phase_id ?? null;
    setSelectedPhaseId(current ?? phasesJson.phases?.[0]?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    const boot = window.setTimeout(() => {
      void loadAll();
    }, 0);
    const id = window.setInterval(() => {
      void loadAll(true);
    }, 20000);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(id);
    };
  }, [projectId]);

  useEffect(() => {
    if (!viewerId) return;
    if (!projectId) return;
    if (deliverables.length === 0) return;

    const nowIso = new Date().toISOString();
    for (const item of deliverables) {
      markDeliverableSeen(viewerId, projectId, item.id);
      setSeenStatus(viewerId, item.id, item.status);
      setSeenCommentAt(viewerId, item.id, nowIso);
    }
  }, [viewerId, projectId, deliverables]);

  const filteredDeliverables = useMemo(() => {
    if (!selectedPhaseId) return [];
    return deliverables.filter((d) => d.phase_id === selectedPhaseId);
  }, [deliverables, selectedPhaseId]);

  async function activatePhase(phaseId: string) {
    const res = await fetch(`/api/admin/projects/${projectId}/phases/${phaseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "activa" }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "No se pudo activar fase");
      return;
    }
    await loadAll();
  }

  async function updatePhaseProgress(phaseId: string) {
    const raw = progressByPhase[phaseId];
    const progress = Math.max(0, Math.min(100, Number(raw ?? 0)));

    setSavingProgressByPhase((prev) => ({ ...prev, [phaseId]: true }));
    setError("");

    const res = await fetch(`/api/admin/projects/${projectId}/phases/${phaseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress }),
    });
    const json = await res.json();
    setSavingProgressByPhase((prev) => ({ ...prev, [phaseId]: false }));

    if (!res.ok) {
      setError(json.error ?? "No se pudo actualizar el avance");
      return;
    }

    setPhases((prev) => prev.map((phase) => (phase.id === phaseId ? { ...phase, progress } : phase)));
  }

  async function deleteDeliverable(id: string) {
    const ok = window.confirm("Vas a eliminar este entregable.");
    if (!ok) return;

    const res = await fetch(`/api/admin/deliverables/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) return setError(json.error ?? "No se pudo eliminar");

    if (editingDeliverable?.id === id) setEditingDeliverable(null);
    await loadAll();
  }

  function startEditDeliverable(item: Deliverable) {
    setEditingDeliverable(item);
    setError("");
  }

  function cancelEditDeliverable() {
    setEditingDeliverable(null);
  }

  async function handleUpdatedDeliverable() {
    setEditingDeliverable(null);
    await loadAll();
  }

  if (loading) return <main className="app-shell">Cargando...</main>;
  if (!project) return <main className="app-shell">Proyecto no disponible.</main>;

  return (
    <main className="app-shell" style={{ display: "grid", gap: 12 }}>
      <section className="card" style={{ padding: 12, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>{project.name}</h1>
          <p style={{ margin: "6px 0 0", color: "#b4bfd0", fontSize: 13 }}>{project.description ?? "Sin descripcion"}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin" className="btn-secondary">Volver</Link>
        </div>
      </section>

      {error ? <p style={{ margin: 0, color: "#ff9c9c", fontSize: 13 }}>{error}</p> : null}
      {notice ? <p style={{ margin: 0, color: "var(--info)", fontSize: 13 }}>{notice}</p> : null}

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 12, alignItems: "start" }}>
        <article className="card" style={{ padding: 12, display: "grid", gap: 10, alignSelf: "start" }}>
          <h3 style={{ margin: 0 }}>Fases</h3>
          <PhaseTimeline
            phases={phases}
            selectedPhaseId={selectedPhaseId}
            onSelectPhase={(phase) => setSelectedPhaseId(phase.id)}
          />
          {selectedPhaseId ? (
            <button className="btn-soft" type="button" onClick={() => activatePhase(selectedPhaseId)}>
              Marcar esta fase como activa
            </button>
          ) : null}
          <div style={{ display: "grid", gap: 8 }}>
            {phases.map((phase) => (
              <div key={phase.id} style={{ display: "grid", gap: 6 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#aab6c7" }}>
                  {phase.order_index}. {phase.name}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={100}
                    value={progressByPhase[phase.id] ?? 0}
                    onChange={(e) => {
                      const value = Number(e.target.value || 0);
                      setProgressByPhase((prev) => ({ ...prev, [phase.id]: Math.max(0, Math.min(100, value)) }));
                    }}
                    style={{ width: 100 }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => updatePhaseProgress(phase.id)}
                    disabled={savingProgressByPhase[phase.id]}
                  >
                    {savingProgressByPhase[phase.id] ? "Guardando..." : "Guardar avance"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Entregable</h3>

          <DeliverableUpload
            key={editingDeliverable?.id ?? "new"}
            projectId={projectId}
            phases={phases}
            fixedPhaseId={selectedPhaseId}
            onCreated={loadAll}
            editingDeliverable={editingDeliverable}
            onUpdated={handleUpdatedDeliverable}
            onCancelEdit={cancelEditDeliverable}
          />

          <div style={{ display: "grid", gap: 10 }}>
            {filteredDeliverables.map((item) => (
              <DeliverableCard key={item.id} item={item} role="admin" onEdit={() => startEditDeliverable(item)} onDelete={deleteDeliverable} />
            ))}
            {filteredDeliverables.length === 0 ? (
              <p style={{ margin: 0, color: "#9aa6b8", fontSize: 13 }}>No hay entregables en esta fase.</p>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Phase, Deliverable } from "@/lib/types";
import { PhaseProgress } from "@/components/PhaseProgress";
import { DeliverableCard } from "@/components/DeliverableCard";
import { createClient } from "@/lib/supabase/client";
import { setSeenCommentAt } from "@/lib/alerts-client";

type ProjectPayload = {
  id: string;
  name: string;
  client_label?: string;
  description: string | null;
  status: string;
  current_phase_id: string | null;
  current_phase?: Phase | null;
};

export default function ClienteProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = typeof params?.id === "string" ? params.id : "";

  const [project, setProject] = useState<ProjectPayload | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [showPrevious, setShowPrevious] = useState(false);
  const prevDeliverablesCount = useRef<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? null));
  }, []);

  async function loadAll(showNotice = false) {
    if (!projectId) return;
    setError("");

    const res = await fetch(`/api/cliente/projects/${projectId}?includeHistory=1`, { cache: "no-store" });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "No se pudo cargar");
      setLoading(false);
      return;
    }

    setProject(json.project ?? null);
    setPhases(json.phases ?? []);
    const nextDeliverables = (json.deliverables ?? []) as Deliverable[];
    if (showNotice && prevDeliverablesCount.current !== null && nextDeliverables.length > prevDeliverablesCount.current) {
      setNotice("Llegó un nuevo entregable.");
    }
    prevDeliverablesCount.current = nextDeliverables.length;
    setDeliverables(nextDeliverables);
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
    if (deliverables.length === 0) return;
    const nowIso = new Date().toISOString();
    for (const item of deliverables) {
      setSeenCommentAt(viewerId, item.id, nowIso);
    }
  }, [viewerId, deliverables]);

  const currentPhase = useMemo(() => {
    if (!project?.current_phase_id) return null;
    return phases.find((p) => p.id === project.current_phase_id) ?? null;
  }, [project, phases]);

  const nextPhase = useMemo(() => {
    if (!currentPhase) return null;
    return phases.find((p) => p.order_index === currentPhase.order_index + 1) ?? null;
  }, [phases, currentPhase]);

  const activeDeliverables = useMemo(() => {
    if (!project?.current_phase_id) return [] as Deliverable[];
    return deliverables.filter((item) => item.phase_id === project.current_phase_id);
  }, [deliverables, project?.current_phase_id]);

  const previousPhases = useMemo(() => {
    if (!currentPhase) return [] as Phase[];
    return phases
      .filter((p) => p.order_index < currentPhase.order_index)
      .sort((a, b) => a.order_index - b.order_index);
  }, [phases, currentPhase]);

  const previousDeliverablesByPhase = useMemo(() => {
    return Object.fromEntries(previousPhases.map((phase) => [phase.id, deliverables.filter((d) => d.phase_id === phase.id)]));
  }, [previousPhases, deliverables]);

  async function approve(id: string) {
    const res = await fetch(`/api/cliente/deliverables/${id}/approve`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) return setError(json.error ?? "No se pudo aprobar");
    await loadAll();
  }

  async function observe(id: string) {
    const res = await fetch(`/api/cliente/deliverables/${id}/observe`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) return setError(json.error ?? "No se pudo registrar observacion");
    await loadAll();
  }

  if (loading) return <main className="app-shell">Cargando...</main>;
  if (!project) return <main className="app-shell">Proyecto no disponible.</main>;

  return (
    <main className="app-shell" style={{ display: "grid", gap: 12 }}>
      <section className="card" style={{ padding: 12, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>{project.client_label ? `${project.client_label} · ${project.name}` : project.name}</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#b4bfd0" }}>{project.description ?? "Sin descripcion"}</p>
        </div>
        <Link href="/cliente" className="btn-secondary">Volver</Link>
      </section>

      {error ? <p style={{ margin: 0, color: "#ff9c9c", fontSize: 13 }}>{error}</p> : null}
      {notice ? <p style={{ margin: 0, color: "var(--info)", fontSize: 13 }}>{notice}</p> : null}

      <PhaseProgress currentPhase={currentPhase} nextPhase={nextPhase} />

      <section className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0 }}>Entregables de fase activa</h3>
        {activeDeliverables.map((item) => (
          <DeliverableCard
            key={item.id}
            item={item}
            role="cliente"
            onApprove={approve}
            onObserve={observe}
          />
        ))}
        {activeDeliverables.length === 0 ? (
          <p style={{ margin: 0, color: "#9aa6b8", fontSize: 13 }}>No hay entregables para esta fase.</p>
        ) : null}
      </section>

      <section className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
        <button type="button" className="btn-soft" onClick={() => setShowPrevious((prev) => !prev)}>
          {showPrevious ? "Ocultar fases anteriores" : "Ver fases anteriores"}
        </button>

        {showPrevious ? (
          previousPhases.length > 0 ? (
            <div style={{ display: "grid", gap: 12 }}>
              {previousPhases.map((phase) => {
                const items = (previousDeliverablesByPhase[phase.id] ?? []) as Deliverable[];
                return (
                  <article key={phase.id} style={{ display: "grid", gap: 8, border: "1px solid rgba(255,255,255,.10)", borderRadius: 10, padding: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 15 }}>{phase.order_index}. {phase.name}</h4>
                    {items.length > 0 ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {items.map((item) => (
                          <DeliverableCard key={item.id} item={item} role="cliente" readOnly />
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "#9aa6b8", fontSize: 13 }}>Sin entregables en esta fase.</p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p style={{ margin: 0, color: "#9aa6b8", fontSize: 13 }}>No hay fases anteriores para este proyecto.</p>
          )
        ) : null}
      </section>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";

export type PhaseItem = {
  id: string;
  project_id: string;
  phase_group: string;
  code: string;
  name: string;
  status: string;
  progress: number;
  deliverable: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_end: string | null;
  risk: string;
  client_note: string | null;
  sort_order: number;
};

const STATUS_OPTIONS = [
  "no_iniciada",
  "en_curso",
  "revision_interna",
  "revision_cliente",
  "aprobada",
  "bloqueada",
];

const RISK_OPTIONS = ["bajo", "medio", "alto"];

type NewItem = {
  phase_group: string;
  code: string;
  name: string;
  status: string;
  progress: number;
  deliverable: string;
  planned_start: string;
  planned_end: string;
  risk: string;
  client_note: string;
  sort_order: number;
};

const defaultItem: NewItem = {
  phase_group: "Fase A",
  code: "",
  name: "",
  status: "no_iniciada",
  progress: 0,
  deliverable: "",
  planned_start: "",
  planned_end: "",
  risk: "bajo",
  client_note: "",
  sort_order: 1,
};

function groupByPhase(items: PhaseItem[]) {
  const map = new Map<string, PhaseItem[]>();
  for (const item of items) {
    const key = item.phase_group || "Sin grupo";
    const current = map.get(key) ?? [];
    current.push(item);
    map.set(key, current);
  }
  return Array.from(map.entries());
}

function phaseToneByIndex(index: number) {
  const palette = [
    { bg: "rgba(37,99,235,.14)", border: "rgba(37,99,235,.55)", title: "#dbeafe" },   // blue
    { bg: "rgba(5,150,105,.14)", border: "rgba(5,150,105,.55)", title: "#d1fae5" },    // emerald
    { bg: "rgba(217,119,6,.14)", border: "rgba(217,119,6,.55)", title: "#fef3c7" },     // amber
    { bg: "rgba(220,38,38,.14)", border: "rgba(220,38,38,.55)", title: "#fee2e2" },     // red
    { bg: "rgba(124,58,237,.14)", border: "rgba(124,58,237,.55)", title: "#ede9fe" },   // violet
    { bg: "rgba(8,145,178,.14)", border: "rgba(8,145,178,.55)", title: "#cffafe" },      // cyan
  ];
  return palette[index % palette.length];
}

export function ProjectPhasePlanManager({ projectId, initialItems }: { projectId: string; initialItems: PhaseItem[] }) {
  const [items, setItems] = useState<PhaseItem[]>(initialItems);
  const [newItem, setNewItem] = useState<NewItem>({ ...defaultItem, sort_order: initialItems.length + 1 });
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const groups = groupByPhase(initialItems).map(([name]) => name);
    const initial: Record<string, boolean> = {};
    for (const name of groups) initial[name] = true;
    return initial;
  });

  const completion = useMemo(() => {
    if (!items.length) return 0;
    const approved = items.filter((item) => item.status === "aprobada").length;
    return Math.round((approved / items.length) * 100);
  }, [items]);

  const groupedItems = useMemo(() => groupByPhase(items), [items]);

  useEffect(() => {
    setCollapsedGroups((prev) => {
      const next = { ...prev };
      for (const [groupName] of groupedItems) {
        if (next[groupName] === undefined) next[groupName] = true;
      }
      return next;
    });
  }, [groupedItems]);

  async function load() {
    const res = await fetch(`/api/admin/projects/${projectId}/phase-items`, { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.error ?? "No se pudieron cargar subfases");
      return;
    }
    setItems(payload.items ?? []);
  }

  async function createItem() {
    setError("");
    if (!newItem.code.trim() || !newItem.name.trim()) {
      setError("Codigo y nombre son obligatorios.");
      return;
    }

    setCreating(true);
    const res = await fetch(`/api/admin/projects/${projectId}/phase-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    });
    const payload = await res.json();
    setCreating(false);

    if (!res.ok) {
      setError(payload.error ?? "No se pudo crear subfase");
      return;
    }

    setNewItem({ ...defaultItem, sort_order: items.length + 2 });
    await load();
  }

  async function saveItem(item: PhaseItem) {
    setError("");
    setSavingId(item.id);
    const res = await fetch(`/api/admin/projects/${projectId}/phase-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const payload = await res.json();
    setSavingId(null);
    if (!res.ok) {
      setError(payload.error ?? "No se pudo guardar subfase");
      return;
    }
    await load();
  }

  async function removeItem(item: PhaseItem) {
    const confirmed = window.confirm(`Borrar subfase '${item.code} ${item.name}'?`);
    if (!confirmed) return;

    setError("");
    setSavingId(item.id);
    const res = await fetch(`/api/admin/projects/${projectId}/phase-items/${item.id}`, { method: "DELETE" });
    const payload = await res.json();
    setSavingId(null);
    if (!res.ok) {
      setError(payload.error ?? "No se pudo borrar subfase");
      return;
    }
    await load();
  }

  async function resetDefaultPlan() {
    const confirmed = window.confirm("Esto borrara las subfases actuales de este proyecto y cargara nuevamente A1-C3. Deseas continuar?");
    if (!confirmed) return;
    setError("");
    setResetting(true);
    const res = await fetch(`/api/admin/projects/${projectId}/phase-items/reset`, { method: "POST" });
    const payload = await res.json();
    setResetting(false);
    if (!res.ok) {
      setError(payload.error ?? "No se pudo reiniciar subfases");
      return;
    }
    setItems(payload.items ?? []);
  }

  function toggleGroup(groupName: string) {
    setCollapsedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  }

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ padding: 12 }}>
        <h3 style={{ margin: "0 0 6px", color: "#f3f6fb" }}>Plan por fases y subfases</h3>
        <p style={{ margin: "0 0 10px", color: "#b8c3d6" }}>
          {items.length} subfases registradas · {completion}% de subfases aprobadas
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button className="btn-secondary" type="button" onClick={resetDefaultPlan} disabled={resetting}>
            {resetting ? "Reiniciando..." : "Reiniciar subfases base (A1-C3)"}
          </button>
        </div>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 0.8fr 1.8fr 1fr auto" }}>
          <input className="input" placeholder="Grupo (Ej: Fase A)" value={newItem.phase_group} onChange={(e) => setNewItem((prev) => ({ ...prev, phase_group: e.target.value }))} />
          <input className="input" placeholder="Codigo (A1)" value={newItem.code} onChange={(e) => setNewItem((prev) => ({ ...prev, code: e.target.value }))} />
          <input className="input" placeholder="Nombre de subfase" value={newItem.name} onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))} />
          <input className="input" type="number" min={0} max={100} value={newItem.progress} onChange={(e) => setNewItem((prev) => ({ ...prev, progress: Number(e.target.value) }))} />
          <button className="btn-primary" type="button" onClick={createItem} disabled={creating}>{creating ? "Guardando..." : "Agregar"}</button>
        </div>
      </div>

      {error ? <p style={{ margin: 0, color: "#ff9c9c" }}>{error}</p> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {groupedItems.map(([groupName, groupItems], groupIndex) => {
          const isCollapsed = collapsedGroups[groupName] ?? false;
          const tone = phaseToneByIndex(groupIndex);

          return (
            <article key={groupName} className="card" style={{ padding: 12, background: tone.bg, border: `1px solid ${tone.border}` }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleGroup(groupName)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleGroup(groupName);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h4 style={{ margin: 0, color: tone.title }}>{groupName}</h4>
                  <button
                    className="btn-soft"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGroup(groupName);
                    }}
                  >
                    {isCollapsed ? "Expandir fase" : "Colapsar fase"}
                  </button>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9aa9c0" }}>{groupItems.length} subfases</p>
              </div>

              {!isCollapsed ? (
                <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                  {groupItems.map((item) => (
                    <article key={item.id} style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: 12 }}>
                      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 0.8fr 1.8fr 1fr 1fr 1fr" }}>
                        <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>Grupo
                          <input className="input" value={item.phase_group} onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, phase_group: e.target.value } : x))} />
                        </label>
                        <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>Codigo
                          <input className="input" value={item.code} onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, code: e.target.value } : x))} />
                        </label>
                        <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>Nombre
                          <input className="input" value={item.name} onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, name: e.target.value } : x))} />
                        </label>
                        <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>Estado
                          <select className="select" value={item.status} onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, status: e.target.value } : x))}>
                            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                        </label>
                        <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>Riesgo
                          <select className="select" value={item.risk} onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, risk: e.target.value } : x))}>
                            {RISK_OPTIONS.map((risk) => <option key={risk} value={risk}>{risk}</option>)}
                          </select>
                        </label>
                        <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>Progreso %
                          <input className="input" type="number" min={0} max={100} value={item.progress} onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, progress: Number(e.target.value) } : x))} />
                        </label>
                      </div>

                      <div style={{ marginTop: 8, display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr 1.3fr" }}>
                        <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>Inicio plan
                          <input className="input" type="date" value={item.planned_start ?? ""} onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, planned_start: e.target.value || null } : x))} />
                        </label>
                        <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>Fin plan
                          <input className="input" type="date" value={item.planned_end ?? ""} onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, planned_end: e.target.value || null } : x))} />
                        </label>
                        <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>Fin real
                          <input className="input" type="date" value={item.actual_end ?? ""} onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, actual_end: e.target.value || null } : x))} />
                        </label>
                        <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>Entregable visible
                          <input className="input" value={item.deliverable ?? ""} onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, deliverable: e.target.value } : x))} placeholder="Ej: Plano PDF, render, acta" />
                        </label>
                      </div>

                      <label style={{ display: "grid", gap: 4, color: "#d7deea", marginTop: 8 }}>Nota para cliente
                        <textarea className="textarea" value={item.client_note ?? ""} onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, client_note: e.target.value } : x))} />
                      </label>

                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <StatusBadge value={item.status} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn-primary" type="button" onClick={() => saveItem(item)} disabled={savingId === item.id}>Guardar</button>
                          <button className="btn-secondary" type="button" onClick={() => removeItem(item)} disabled={savingId === item.id}>Borrar</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}



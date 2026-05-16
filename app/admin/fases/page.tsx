"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Phase = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
};

export default function AdminPhasesPage() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [newPhase, setNewPhase] = useState({ name: "", sort_order: 1, active: true });
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/phases", { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.error ?? "No se pudieron cargar fases");
      return;
    }
    setPhases(payload.phases ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createPhase() {
    const res = await fetch("/api/admin/phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPhase),
    });
    const payload = await res.json();
    if (!res.ok) {
      alert(payload.error ?? "No se pudo crear fase");
      return;
    }
    setNewPhase({ name: "", sort_order: phases.length + 1, active: true });
    await load();
  }

  async function savePhase(phase: Phase) {
    setSavingId(phase.id);
    const res = await fetch(`/api/admin/phases/${phase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(phase),
    });
    const payload = await res.json();
    setSavingId(null);

    if (!res.ok) {
      alert(payload.error ?? "No se pudo guardar");
      return;
    }
    await load();
  }

  async function deletePhase(phase: Phase) {
    const confirmed = window.confirm(`Borrar fase '${phase.name}'? Esta accion no se puede deshacer.`);
    if (!confirmed) return;

    setSavingId(phase.id);
    const res = await fetch(`/api/admin/phases/${phase.id}`, { method: "DELETE" });
    const payload = await res.json();
    setSavingId(null);

    if (!res.ok) {
      alert(payload.error ?? "No se pudo borrar fase");
      return;
    }
    await load();
  }

  return (
    <main className="app-shell">
      <section className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, color: "#f3f6fb" }}>Fases del proyecto</h1>
          <Link href="/admin" className="btn-secondary">Volver al dashboard</Link>
        </div>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "2fr 1fr auto", alignItems: "end", marginTop: 12 }}>
          <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>
            Nombre
            <input className="input" value={newPhase.name} onChange={(e) => setNewPhase((prev) => ({ ...prev, name: e.target.value }))} />
          </label>
          <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>
            Orden
            <input className="input" type="number" value={newPhase.sort_order} onChange={(e) => setNewPhase((prev) => ({ ...prev, sort_order: Number(e.target.value) }))} />
          </label>
          <button className="btn-primary" onClick={createPhase}>Nueva fase</button>
        </div>
      </section>

      {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}

      <section style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {phases.map((p) => (
          <article className="card" key={p.id} style={{ padding: 12 }}>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "2fr 1fr 1fr auto auto", alignItems: "end" }}>
              <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>
                Nombre
                <input className="input" value={p.name} onChange={(e) => setPhases((prev) => prev.map((x) => x.id === p.id ? { ...x, name: e.target.value } : x))} />
              </label>
              <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>
                Orden
                <input className="input" type="number" value={p.sort_order} onChange={(e) => setPhases((prev) => prev.map((x) => x.id === p.id ? { ...x, sort_order: Number(e.target.value) } : x))} />
              </label>
              <label style={{ display: "grid", gap: 4, color: "#d7deea" }}>
                Activa
                <select className="select" value={String(p.active)} onChange={(e) => setPhases((prev) => prev.map((x) => x.id === p.id ? { ...x, active: e.target.value === "true" } : x))}>
                  <option value="true">si</option>
                  <option value="false">no</option>
                </select>
              </label>
              <button className="btn-primary" onClick={() => savePhase(p)} disabled={savingId === p.id}>Guardar</button>
              <button className="btn-secondary" onClick={() => deletePhase(p)} disabled={savingId === p.id}>Borrar</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

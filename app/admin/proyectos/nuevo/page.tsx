"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PROJECT_STATUS_OPTIONS } from "@/lib/project-status";

const phases = ["Diagnostico", "Diseno conceptual", "Anteproyecto", "Revision del cliente", "Diseno final", "Documentacion", "Aprobado"];

const fieldLabelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 14,
  fontWeight: 600,
  color: "#d7deea",
};

type ClientOption = { id: string; label: string; email?: string; role?: string };

export default function NewProjectPage() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    client_id: "",
    status: "activo",
    phase: phases[0],
    progress: 0,
    next_step: "",
    summary: "",
    start_date: "",
    estimated_delivery: "",
  });

  useEffect(() => {
    async function loadClients() {
      const res = await fetch("/api/admin/list-clients", { cache: "no-store" });
      const payload = await res.json();

      if (!res.ok) {
        setError(`No se pudieron cargar clientes: ${payload.error ?? "error"}`);
        return;
      }

      const mapped: ClientOption[] = payload.clients ?? [];
      setClients(mapped);
      if (mapped.length === 1) {
        setForm((prev) => ({ ...prev, client_id: mapped[0].id }));
      }
    }

    loadClients();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.client_id) {
      setError("Debes seleccionar un cliente antes de guardar.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/admin/create-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await res.json();

    if (!res.ok) {
      setSaving(false);
      setError(`No se pudo crear el proyecto: ${payload.error ?? "error"}`);
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <main className="app-shell">
      <section className="card" style={{ padding: 18, maxWidth: 860 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <h1 style={{ margin: 0, color: "#f3f6fb" }}>Nuevo proyecto</h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/admin" className="btn-secondary">Volver al dashboard</Link>
            <Link href="/admin/clientes" className="btn-soft">Ir a clientes</Link>
          </div>
        </div>

        {clients.length === 0 ? (
          <section style={{ marginBottom: 12, padding: 12, border: "1px solid #fed7aa", borderRadius: 10, background: "#fff7ed" }}>
            <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#9a3412" }}>No hay clientes para seleccionar</p>
            <p style={{ margin: 0, fontSize: 13, color: "#9a3412" }}>
              Crea un cliente y luego vuelve a esta pantalla.
            </p>
            <Link href="/admin/clientes" className="btn-soft" style={{ marginTop: 10 }}>
              Ir a Clientes
            </Link>
          </section>
        ) : null}

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <label style={fieldLabelStyle}>
            Nombre del proyecto
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>

          <label style={fieldLabelStyle}>
            Cliente asignado
            <select className="select" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required>
              <option value="">Seleccionar cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>

          <label style={fieldLabelStyle}>
            Estado del proyecto
            <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {PROJECT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>

          <label style={fieldLabelStyle}>
            Fase actual
            <select className="select" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>
              {phases.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>

          <label style={fieldLabelStyle}>
            Progreso manual (%)
            <input className="input" type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} />
          </label>

          <label style={fieldLabelStyle}>
            Proximo paso
            <input className="input" value={form.next_step} onChange={(e) => setForm({ ...form, next_step: e.target.value })} />
          </label>

          <label style={fieldLabelStyle}>
            Resumen del proyecto
            <textarea className="textarea" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          </label>

          <label style={fieldLabelStyle}>
            Fecha de inicio
            <input className="input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </label>

          <label style={fieldLabelStyle}>
            Fecha estimada de entrega
            <input className="input" type="date" value={form.estimated_delivery} onChange={(e) => setForm({ ...form, estimated_delivery: e.target.value })} />
          </label>

          {error ? <p style={{ margin: 0, color: "#dc2626", fontSize: 13 }}>{error}</p> : null}

          <button className="btn-primary" disabled={saving}>
            {saving ? "Guardando..." : "Guardar proyecto"}
          </button>
        </form>
      </section>
    </main>
  );
}

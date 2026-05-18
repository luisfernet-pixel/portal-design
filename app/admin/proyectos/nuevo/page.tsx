"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ClientOption = { id: string; full_name: string | null; email: string | null };

export default function NewProjectPage() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState<"activo" | "pausado" | "terminado">("activo");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadClients() {
      const res = await fetch("/api/admin/clients", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) return setError(json.error ?? "No se pudo cargar clientes");
      setClients(json.clients ?? []);
    }
    loadClients();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Completa el nombre del proyecto.");
      return;
    }

    if (!clientId) {
      setError("Elige un cliente de la lista.");
      return;
    }

    setSaving(true);
    const createRes = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        client_id: clientId,
        status,
      }),
    });

    const createJson = await createRes.json();
    if (!createRes.ok) {
      setSaving(false);
      setError(createJson.error ?? "No se pudo crear proyecto");
      return;
    }

    const projectId = createJson.project.id;

    await fetch(`/api/admin/projects/${projectId}/copy-template`, { method: "POST" });

    window.location.href = `/admin/proyectos/${projectId}`;
  }

  return (
    <main className="app-shell">
      <section className="card" style={{ maxWidth: 760, padding: 16, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <h1 style={{ margin: 0 }}>Nuevo proyecto</h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/admin/clientes" className="btn-soft">Crear cliente</Link>
            <Link href="/admin" className="btn-secondary">Volver</Link>
          </div>
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          <input className="input" placeholder="Nombre del proyecto" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea className="textarea" placeholder="Descripcion (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />

          <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">{clients.length ? "Selecciona un cliente" : "Cargando clientes..."}</option>
            {clients.map((c) => {
              const namePart = (c.full_name ?? "").trim();
              const emailPart = (c.email ?? "").trim();
              const label = namePart && emailPart ? `${namePart} — ${emailPart}` : namePart || emailPart || "(Sin nombre)";
              return (
                <option key={c.id} value={c.id}>
                  {label}
                </option>
              );
            })}
          </select>
          <p style={{ margin: 0, fontSize: 12, color: "#9db0c6" }}>
            Si el cliente no existe, créalo en “Crear cliente” y luego vuelve aquí.
          </p>

          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as "activo" | "pausado" | "terminado")}>
            <option value="activo">activo</option>
            <option value="pausado">pausado</option>
            <option value="terminado">terminado</option>
          </select>

          {error ? <p style={{ margin: 0, color: "#ff9c9c", fontSize: 13 }}>{error}</p> : null}
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Crear proyecto"}
          </button>
        </form>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Client = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  password?: string;
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  color: "#d7deea",
};

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newClient, setNewClient] = useState({ full_name: "", email: "", password: "" });

  async function load() {
    const res = await fetch("/api/admin/clients", { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.error ?? "No se pudo cargar clientes");
      return;
    }
    setClients(payload.clients ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/admin/create-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClient),
    });

    const payload = await res.json();
    setCreating(false);

    if (!res.ok) {
      setError(payload.error ?? "No se pudo crear cliente");
      return;
    }

    setMessage("Cliente creado correctamente.");
    setNewClient({ full_name: "", email: "", password: "" });
    await load();
  }

  async function saveClient(client: Client) {
    setSavingId(client.id);
    setError("");
    setMessage("");

    const res = await fetch(`/api/admin/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: client.full_name ?? "",
        email: client.email ?? "",
        role: client.role,
        password: client.password ?? "",
      }),
    });
    const payload = await res.json();
    setSavingId(null);

    if (!res.ok) {
      alert(payload.error ?? "No se pudo guardar");
      return;
    }

    setMessage("Cliente actualizado.");
    await load();
  }

  async function deleteClient(client: Client) {
    const confirmed = window.confirm(
      `Esto eliminara al cliente ${client.email ?? client.id} y sus proyectos asociados. Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;

    setSavingId(client.id);
    setError("");
    setMessage("");

    const res = await fetch(`/api/admin/clients/${client.id}`, { method: "DELETE" });
    const payload = await res.json();
    setSavingId(null);

    if (!res.ok) {
      alert(payload.error ?? "No se pudo eliminar cliente");
      return;
    }

    setMessage("Cliente eliminado.");
    await load();
  }

  return (
    <main className="app-shell" style={{ display: "grid", gap: 12 }}>
      <section className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, color: "#f3f6fb" }}>Clientes</h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/admin" className="btn-secondary">Volver al dashboard</Link>
            <Link href="/admin/proyectos/nuevo" className="btn-primary">Nuevo proyecto</Link>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 18 }}>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0, color: "#f3f6fb" }}>Crear cliente</h2>
        </div>

        <form onSubmit={createClient} style={{ display: "grid", gap: 12 }}>
          <label style={labelStyle}>
            Nombre completo
            <input
              className="input"
              value={newClient.full_name}
              onChange={(e) => setNewClient((prev) => ({ ...prev, full_name: e.target.value }))}
              required
            />
          </label>

          <label style={labelStyle}>
            Email
            <input
              className="input"
              type="email"
              value={newClient.email}
              onChange={(e) => setNewClient((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </label>

          <label style={labelStyle}>
            Password temporal
            <input
              className="input"
              type="text"
              value={newClient.password}
              onChange={(e) => setNewClient((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
          </label>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn-primary" disabled={creating}>
              {creating ? "Creando..." : "Crear cliente"}
            </button>
            {message ? <p style={{ margin: 0, color: "#7fd0ac" }}>{message}</p> : null}
            {error ? <p style={{ margin: 0, color: "#ff8f8f" }}>{error}</p> : null}
          </div>
        </form>
      </section>

      <section className="card" style={{ padding: 18 }}>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0, color: "#f3f6fb" }}>Clientes existentes</h2>
        </div>

        <section style={{ display: "grid", gap: 12 }}>
          {clients.map((c) => (
            <article key={c.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={labelStyle}>
                  Nombre
                  <input
                    className="input"
                    value={c.full_name ?? ""}
                    onChange={(e) =>
                      setClients((prev) =>
                        prev.map((x) => (x.id === c.id ? { ...x, full_name: e.target.value } : x))
                      )
                    }
                  />
                </label>
                <label style={labelStyle}>
                  Email
                  <input
                    className="input"
                    value={c.email ?? ""}
                    onChange={(e) =>
                      setClients((prev) =>
                        prev.map((x) => (x.id === c.id ? { ...x, email: e.target.value } : x))
                      )
                    }
                  />
                </label>
                <label style={labelStyle}>
                  Rol
                  <select
                    className="select"
                    value={c.role}
                    onChange={(e) =>
                      setClients((prev) =>
                        prev.map((x) => (x.id === c.id ? { ...x, role: e.target.value } : x))
                      )
                    }
                  >
                    <option value="cliente">cliente</option>
                  </select>
                </label>
                <label style={labelStyle}>
                  Nueva clave
                  <input
                    className="input"
                    type="password"
                    placeholder="Dejar vacio para no cambiar"
                    value={c.password ?? ""}
                    onChange={(e) =>
                      setClients((prev) =>
                        prev.map((x) => (x.id === c.id ? { ...x, password: e.target.value } : x))
                      )
                    }
                  />
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn-primary" onClick={() => saveClient(c)} disabled={savingId === c.id}>
                    Guardar cambios
                  </button>
                  <button className="btn-secondary" onClick={() => deleteClient(c)} disabled={savingId === c.id}>
                    Borrar cliente
                  </button>
                </div>
              </div>
            </article>
          ))}

          {clients.length === 0 ? (
            <p style={{ margin: 0, color: "#aeb7c6" }}>Aun no hay clientes cargados.</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}

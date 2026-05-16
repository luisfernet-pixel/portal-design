"use client";

import { createClient } from "@/lib/supabase/client";
import { CommentsBox } from "./CommentsBox";

export function DecisionsSection({ projectId, role, items, onChanged }: { projectId: string; role: "admin" | "cliente"; items: any[]; onChanged?: () => void | Promise<void>; }) {
  const supabase = createClient();

  async function approve(id: string) {
    const { error } = await supabase
      .from("decisions")
      .update({ status: "aprobada", approved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      alert(`No se pudo aprobar la decision: ${error.message}`);
      return;
    }
    if (onChanged) {
      await onChanged();
      return;
    }
    location.reload();
  }

  async function remove(id: string) {
    const confirmed = window.confirm("Eliminar esta decision? Esta accion no se puede deshacer.");
    if (!confirmed) return;
    await supabase.from("decisions").delete().eq("id", id);
    if (onChanged) {
      await onChanged();
      return;
    }
    location.reload();
  }

  return <div style={{ display: "grid", gap: 10 }}>{items.map((item) => (
    <article className="card" key={item.id} style={{ padding: 12 }}>
      <p style={{ margin: 0, fontWeight: 600 }}>{item.title}</p>
      <p style={{ margin: "4px 0", fontSize: 13 }}>{item.description}</p>
      <p style={{ margin: "2px 0", fontSize: 12, color: "#aeb7c6" }}>Estado: {item.status} | Prioridad: {item.priority}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {role === "cliente" && item.status === "pendiente" ? <button type="button" className="btn-primary" onClick={() => approve(item.id)}>Aprobar decision</button> : null}
        {role === "admin" ? <button type="button" className="btn-secondary" onClick={() => remove(item.id)}>Eliminar</button> : null}
      </div>
      <CommentsBox projectId={projectId} targetType="decision" targetId={item.id} />
    </article>
  ))}</div>;
}


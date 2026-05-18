"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSeenCommentAt, isOppositeRole, setSeenCommentAt } from "@/lib/alerts-client";
import { UnreadBadge } from "@/components/UnreadBadge";

type Author = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: "admin" | "cliente" | null;
};

type CommentItem = {
  id: string;
  deliverable_id: string;
  project_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: Author | null;
};

type Props = {
  deliverableId: string;
  role: "admin" | "cliente";
  readOnly?: boolean;
};

export function DeliverableCommentsThread({ deliverableId, role, readOnly = false }: Props) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [notice, setNotice] = useState("");
  const [unread, setUnread] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const basePath = useMemo(
    () => (role === "admin" ? `/api/admin/deliverables/${deliverableId}/comments` : `/api/cliente/deliverables/${deliverableId}/comments`),
    [deliverableId, role]
  );

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function load(showNotice = false) {
    let res: Response | null = null;
    let json: any = null;

    try {
      res = await fetch(basePath, { cache: "no-store" });
      json = await res.json();
    } catch (err: unknown) {
      const e = err as { name?: string };
      if (e?.name === "AbortError") return;
      setError("No se pudo cargar mensajes");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(json.error ?? "No se pudo cargar mensajes");
      setLoading(false);
      return;
    }

    const next = (json.comments ?? []) as CommentItem[];
    if (showNotice && next.length > comments.length) setNotice("Nuevo mensaje recibido.");
    setComments(next);
    setLoading(false);

    if (userId && next.length > 0) {
      const last = next[next.length - 1];
      const prevSeen = getSeenCommentAt(userId, deliverableId);
      const prevTime = prevSeen ? Date.parse(prevSeen) : 0;
      let nextUnread = 0;
      for (const c of next) {
        const t = Date.parse(c.created_at);
        if (!Number.isFinite(t) || t <= prevTime) continue;
        if (isOppositeRole(c.author?.role, role)) nextUnread += 1;
      }
      setUnread(nextUnread);
      setSeenCommentAt(userId, deliverableId, last.created_at);
      return;
    }

    setUnread(0);
  }

  useEffect(() => {
    const boot = window.setTimeout(() => {
      void load();
    }, 0);
    const id = window.setInterval(() => {
      void load(true);
    }, 15000);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(id);
    };
  }, [basePath, userId]);

  async function sendComment() {
    const body = text.trim();
    if (!body) return;

    setSaving(true);
    setError("");
    const res = await fetch(basePath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo enviar mensaje");
      return;
    }

    setText("");
    setNotice("");
    await load();
  }

  async function saveEdit(commentId: string) {
    const body = editingText.trim();
    if (!body) return;
    setSaving(true);
    setError("");
    const res = await fetch(`${basePath}/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo editar");
      return;
    }

    setEditingId(null);
    setEditingText("");
    await load();
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm("Eliminar este mensaje?")) return;
    setSaving(true);
    setError("");
    const res = await fetch(`${basePath}/${commentId}`, { method: "DELETE" });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo eliminar");
      return;
    }
    await load();
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontSize: 12, color: "#9db0c6" }}>Mensajes del entregable</p>
        <UnreadBadge count={unread} title="Mensajes nuevos" />
      </div>
      {notice ? <p style={{ margin: 0, fontSize: 12, color: "var(--info)" }}>{notice}</p> : null}
      {loading ? <p style={{ margin: 0, fontSize: 12, color: "#9db0c6" }}>Cargando mensajes...</p> : null}
      {!loading && comments.length === 0 ? <p style={{ margin: 0, fontSize: 12, color: "#9db0c6" }}>Sin mensajes todavía.</p> : null}

      {comments.map((comment) => {
        const isAdmin = comment.author?.role === "admin";
        return (
          <article
            key={comment.id}
            style={{
              borderRadius: 8,
              padding: 8,
              background: isAdmin ? "rgba(88, 153, 255, .14)" : "rgba(255, 166, 101, .15)",
              border: isAdmin ? "1px solid rgba(88,153,255,.35)" : "1px solid rgba(255,166,101,.35)",
              display: "grid",
              gap: 6,
            }}
          >
            {editingId === comment.id ? (
              <textarea className="textarea" value={editingText} onChange={(e) => setEditingText(e.target.value)} rows={3} />
            ) : (
              <p style={{ margin: 0, fontSize: 13 }}>{comment.body}</p>
            )}
            <p style={{ margin: 0, fontSize: 11, color: "#b7c2d6" }}>
              {isAdmin ? "Admin" : "Cliente"} · {new Date(comment.created_at).toLocaleString("es-BO")}
            </p>
            {role === "admin" && !readOnly ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {editingId === comment.id ? (
                  <>
                    <button type="button" className="btn-primary" onClick={() => void saveEdit(comment.id)} disabled={saving}>
                      Guardar
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setEditingId(null)} disabled={saving}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn-soft" onClick={() => { setEditingId(comment.id); setEditingText(comment.body); }}>
                      Editar
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => void deleteComment(comment.id)} disabled={saving}>
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </article>
        );
      })}

      {!readOnly ? (
        <>
          <textarea
            className="textarea"
            placeholder={role === "admin" ? "Responder al cliente..." : "Escribe tu observación o respuesta..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
          {error ? <p style={{ margin: 0, fontSize: 12, color: "#ff9c9c" }}>{error}</p> : null}
          <button type="button" className="btn-secondary" onClick={() => void sendComment()} disabled={saving}>
            {saving ? "Enviando..." : "Enviar mensaje"}
          </button>
        </>
      ) : null}
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CommentTargetType = "project" | "gallery" | "decision" | "update" | "document";

type CommentRow = {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  author_role?: "admin" | "cliente" | null;
  author_name?: string | null;
};

export function CommentsBox({
  projectId,
  targetType,
  targetId,
}: {
  projectId: string;
  targetType: CommentTargetType;
  targetId: string;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadComments() {
    const supabase = createClient();
    setLoading(true);
    setError("");

    const [{ data: authData }, commentsRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("comments")
        .select("id,text,created_at,user_id,author_role,author_name")
        .eq("project_id", projectId)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .order("created_at", { ascending: true }),
    ]);

    setCurrentUserId(authData.user?.id ?? null);

    if (commentsRes.error) {
      setError(commentsRes.error.message);
      setComments([]);
      setLoading(false);
      return;
    }

    setComments((commentsRes.data ?? []) as CommentRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadComments();
  }, [projectId, targetType, targetId]);

  async function saveComment() {
    if (!text.trim()) return;
    const supabase = createClient();
    setSaving(true);
    setError("");

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      setError("Debes iniciar sesion para comentar.");
      return;
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role,full_name,email")
      .eq("id", auth.user.id)
      .single();

    const { error: insertError } = await supabase.from("comments").insert({
      project_id: projectId,
      user_id: auth.user.id,
      author_role: currentProfile?.role ?? null,
      author_name: currentProfile?.full_name ?? currentProfile?.email ?? null,
      target_type: targetType,
      target_id: targetId,
      text: text.trim(),
    });

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    setText("");
    setSaving(false);
    await loadComments();
  }

  function authorLabel(comment: CommentRow) {
    const role = comment.author_role;
    const customerName = comment.author_name?.trim() || "Cliente";
    const who = role === "admin" ? "Decorazon" : role === "cliente" ? customerName : "Decorazon";
    if (comment.user_id === currentUserId) return `Tu comentario (${who})`;
    return who;
  }

  return (
    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
      {loading ? <p style={{ margin: 0, fontSize: 12, color: "#aeb7c6" }}>Cargando comentarios...</p> : null}
      {!loading && comments.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {comments.map((comment) => (
            <article
              key={comment.id}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: "#edf2fa" }}>{comment.text}</p>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#8f9caf" }}>
                {authorLabel(comment)} -{" "}
                {new Date(comment.created_at).toLocaleString("es-BO")}
              </p>
            </article>
          ))}
        </div>
      ) : null}
      {!loading && comments.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "#8f9caf" }}>Aun no hay comentarios.</p>
      ) : null}
      <textarea
        className="textarea"
        placeholder="Agregar comentario"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {error ? <p style={{ margin: 0, fontSize: 12, color: "#ff9c9c" }}>{error}</p> : null}
      <button type="button" className="btn-secondary" onClick={saveComment} disabled={saving} style={{ marginTop: 2 }}>
        {saving ? "Guardando..." : "Comentar"}
      </button>
    </div>
  );
}


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
  const [currentUserRole, setCurrentUserRole] = useState<"admin" | "cliente" | null>(null);
  const [rolesByUserId, setRolesByUserId] = useState<Record<string, "admin" | "cliente">>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [updatingCommentId, setUpdatingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
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
    if (authData.user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();
      setCurrentUserRole((profile?.role as "admin" | "cliente" | null) ?? null);
    } else {
      setCurrentUserRole(null);
    }

    if (commentsRes.error) {
      setError(commentsRes.error.message);
      setComments([]);
      setRolesByUserId({});
      setLoading(false);
      return;
    }

    const nextComments = (commentsRes.data ?? []) as CommentRow[];
    setComments(nextComments);

    const uniqueUserIds = Array.from(new Set(nextComments.map((comment) => comment.user_id).filter(Boolean)));
    if (uniqueUserIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id,role").in("id", uniqueUserIds);
      const nextRoles: Record<string, "admin" | "cliente"> = {};
      for (const profile of profiles ?? []) {
        if (profile.id && (profile.role === "admin" || profile.role === "cliente")) {
          nextRoles[profile.id] = profile.role;
        }
      }
      setRolesByUserId(nextRoles);
    } else {
      setRolesByUserId({});
    }

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

  function resolveRole(comment: CommentRow): "admin" | "cliente" | null {
    return (
      comment.author_role ??
      rolesByUserId[comment.user_id] ??
      (comment.user_id === currentUserId ? currentUserRole : null)
    );
  }

  function authorLabel(comment: CommentRow) {
    const role = resolveRole(comment);
    const customerName = comment.author_name?.trim() || "Cliente";
    const who = role === "admin" ? "Decorazon" : role === "cliente" ? customerName : "Decorazon";
    if (comment.user_id === currentUserId) return `Tu comentario (${who})`;
    return who;
  }

  function canManageComment(comment: CommentRow) {
    void comment;
    return currentUserRole === "admin";
  }

  function startEdit(comment: CommentRow) {
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
    setError("");
  }

  function cancelEdit() {
    setEditingCommentId(null);
    setEditingText("");
  }

  async function saveEditedComment(comment: CommentRow) {
    const nextText = editingText.trim();
    if (!nextText) {
      setError("El comentario no puede estar vacio.");
      return;
    }

    const supabase = createClient();
    setUpdatingCommentId(comment.id);
    setError("");

    const { error: updateError } = await supabase
      .from("comments")
      .update({ text: nextText })
      .eq("id", comment.id)
      .eq("project_id", projectId)
      .eq("target_type", targetType)
      .eq("target_id", targetId);

    if (updateError) {
      setUpdatingCommentId(null);
      setError(updateError.message);
      return;
    }

    setUpdatingCommentId(null);
    cancelEdit();
    await loadComments();
  }

  async function deleteComment(comment: CommentRow) {
    const confirmed = window.confirm("Vas a borrar este comentario. Esta accion no se puede deshacer.");
    if (!confirmed) return;

    const supabase = createClient();
    setDeletingCommentId(comment.id);
    setError("");

    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", comment.id)
      .eq("project_id", projectId)
      .eq("target_type", targetType)
      .eq("target_id", targetId);

    if (deleteError) {
      setDeletingCommentId(null);
      setError(deleteError.message);
      return;
    }

    setDeletingCommentId(null);
    if (editingCommentId === comment.id) cancelEdit();
    await loadComments();
  }

  function commentTone(comment: CommentRow) {
    const resolvedRole = resolveRole(comment);

    if (resolvedRole === "admin") {
      return {
        background: "rgba(83, 153, 255, .14)",
        border: "1px solid rgba(83, 153, 255, .45)",
        text: "#e8f1ff",
        meta: "#a8c8ff",
      };
    }

    return {
      background: "rgba(255, 160, 92, .12)",
      border: "1px solid rgba(255, 160, 92, .45)",
      text: "#fff2e8",
      meta: "#ffcaa7",
    };
  }

  return (
    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
      {loading ? <p style={{ margin: 0, fontSize: 12, color: "#aeb7c6" }}>Cargando comentarios...</p> : null}
      {!loading && comments.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {comments.map((comment) => (
            (() => {
              const tone = commentTone(comment);
              return (
            <article
              key={comment.id}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                background: tone.background,
                border: tone.border,
              }}
            >
              {editingCommentId === comment.id ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <textarea
                    className="textarea"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    disabled={updatingCommentId === comment.id}
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => saveEditedComment(comment)}
                      disabled={updatingCommentId === comment.id}
                    >
                      {updatingCommentId === comment.id ? "Guardando..." : "Guardar"}
                    </button>
                    <button type="button" className="btn-secondary" onClick={cancelEdit} disabled={updatingCommentId === comment.id}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: tone.text }}>{comment.text}</p>
              )}
              <p style={{ margin: "6px 0 0", fontSize: 11, color: tone.meta }}>
                {authorLabel(comment)} -{" "}
                {new Date(comment.created_at).toLocaleString("es-BO")}
              </p>
              {canManageComment(comment) && editingCommentId !== comment.id ? (
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn-soft" onClick={() => startEdit(comment)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => deleteComment(comment)}
                    disabled={deletingCommentId === comment.id}
                  >
                    {deletingCommentId === comment.id ? "Borrando..." : "Borrar"}
                  </button>
                </div>
              ) : null}
            </article>
              );
            })()
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


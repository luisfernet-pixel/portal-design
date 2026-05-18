"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Deliverable } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { DeliverableCommentsThread } from "@/components/DeliverableCommentsThread";
import { getSeenDeliverableIds, markDeliverableSeen, setSeenStatus } from "@/lib/alerts-client";
import { DeliverableUnreadBadge } from "@/components/DeliverableUnreadBadge";
import { UnreadBadge } from "@/components/UnreadBadge";

type Props = {
  item: Deliverable;
  role: "admin" | "cliente";
  readOnly?: boolean;
  onApprove?: (id: string) => Promise<void> | void;
  onObserve?: (id: string) => Promise<void> | void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => Promise<void> | void;
};

type FileEntry = {
  name: string;
  url: string;
};

const iconBtnStyle = {
  width: 34,
  height: 34,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  borderRadius: 8,
} as const;

function parseList(value: string | null | undefined) {
  if (!value) return [] as string[];
  const source = value.trim();
  if (!source) return [] as string[];
  if (source.startsWith("[")) {
    try {
      const parsed = JSON.parse(source);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      return [source];
    }
  }
  if (source.includes("\n")) return source.split("\n").map((v) => v.trim()).filter(Boolean);
  return [source];
}

function isPdf(url: string) {
  return /\.pdf($|\?)/i.test(url);
}

function isImage(url: string) {
  return /\.(png|jpe?g|webp|gif|bmp|svg)($|\?)/i.test(url);
}

async function uploadWithFallback(path: string, file: File) {
  const supabase = createClient();
  const candidates = ["project-documents", "deliverables"];
  let lastError = "No se pudo subir el archivo.";

  for (const bucket of candidates) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return { ok: true as const, url: data.publicUrl };
    }
    lastError = error.message || lastError;
  }

  return { ok: false as const, error: lastError };
}

export function DeliverableCard({ item, role, readOnly = false, onApprove, onObserve, onEdit, onDelete }: Props) {
  const canClientAct = !readOnly && role === "cliente" && (item.status === "pendiente" || item.status === "con_observaciones");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showObserveBox, setShowObserveBox] = useState(false);
  const [observeText, setObserveText] = useState("");
  const [sendingObserve, setSendingObserve] = useState(false);
  const [observeError, setObserveError] = useState("");
  const [savingFiles, setSavingFiles] = useState(false);
  const [fileError, setFileError] = useState("");

  const [localFiles, setLocalFiles] = useState<FileEntry[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!viewerId) return;
    if (!item?.project_id || !item?.id) return;
    if (collapsed) return;
    markDeliverableSeen(viewerId, item.project_id, item.id);
    setSeenStatus(viewerId, item.id, item.status);
  }, [viewerId, item.id, item.project_id, item.status, collapsed]);

  const isNewDeliverable = useMemo(() => {
    if (!viewerId) return false;
    if (!item?.project_id || !item?.id) return false;
    const seen = getSeenDeliverableIds(viewerId, item.project_id);
    return !seen.includes(item.id);
  }, [viewerId, item.id, item.project_id]);

  const files = useMemo(() => {
    if (localFiles) return localFiles;

    const urls = parseList(item.file_url).map((url) =>
      url.replace("/storage/v1/object/public/deliverables/", "/storage/v1/object/public/project-documents/")
    );
    const names = parseList(item.file_name);

    return urls.map((url, index) => ({
      url,
      name: names[index] ?? `archivo_${index + 1}`,
    }));
  }, [item.file_url, item.file_name, localFiles]);

  async function patchFiles(nextFiles: FileEntry[]) {
    setSavingFiles(true);
    setFileError("");

    const res = await fetch(`/api/admin/deliverables/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url: JSON.stringify(nextFiles.map((f) => f.url)),
        file_name: JSON.stringify(nextFiles.map((f) => f.name)),
        ...(item.status === "con_observaciones" ? { status: "pendiente" } : {}),
      }),
    });
    const json = await res.json();
    setSavingFiles(false);

    if (!res.ok) {
      setFileError(json.error ?? "No se pudo actualizar archivos.");
      return false;
    }

    setLocalFiles(nextFiles);
    return true;
  }

  async function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    await patchFiles(next);
  }

  async function replaceFile(index: number, file: File) {
    const safePrefix = `${item.project_id}/${item.phase_id}`;
    const path = `${safePrefix}/${file.lastModified}-${file.name}`;
    const uploaded = await uploadWithFallback(path, file);
    if (!uploaded.ok) {
      setFileError(uploaded.error);
      return;
    }

    const next = files.map((entry, i) =>
      i === index ? { ...entry, url: uploaded.url, name: file.name } : entry
    );
    await patchFiles(next);
  }

  async function submitObserve() {
    const text = observeText.trim();
    setObserveError("");

    if (!text) {
      setObserveError("Escribe una observacion antes de enviar.");
      return;
    }

    setSendingObserve(true);
    const res = await fetch(`/api/cliente/deliverables/${item.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    const json = await res.json();
    setSendingObserve(false);

    if (!res.ok) {
      setObserveError(json.error ?? "No se pudo enviar la observacion.");
      return;
    }

    setObserveText("");
    setShowObserveBox(false);
    await onObserve?.(item.id);
  }

  return (
    <article
      style={{
        border: "1px solid rgba(255,255,255,.12)",
        borderRadius: 12,
        padding: 12,
        background: "rgba(255,255,255,.03)",
        display: "grid",
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          width: "100%",
          background: "transparent",
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 8,
          padding: "8px 10px",
          cursor: "pointer",
          color: "inherit",
        }}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Abrir entregable" : "Cerrar entregable"}
      >
        <strong style={{ fontSize: 14, textAlign: "left" }}>{item.title}</strong>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {role === "cliente" && isNewDeliverable ? <UnreadBadge count={1} variant="success" title="Nuevo entregable" /> : null}
          <DeliverableUnreadBadge deliverableId={item.id} role={role} />
          <StatusBadge value={item.status} />
          <span style={{ fontSize: 12, color: "#9db0c6" }}>{collapsed ? "▼" : "▲"}</span>
        </div>
      </button>

      {!collapsed ? (
        <>

      <p style={{ margin: 0, fontSize: 12, color: "#aab6c7" }}>
        Tipo: {item.file_type} · Subido: {new Date(item.uploaded_at).toLocaleString("es-BO")}
      </p>

      {item.description ? <p style={{ margin: 0, fontSize: 13 }}>{item.description}</p> : null}

      {files.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {files.map((entry, index) => (
            <div key={`${entry.url}-${index}`} style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: 8, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#9db0c6" }}>Archivo {index + 1}</p>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-soft"
                    style={iconBtnStyle}
                    title="Abrir archivo"
                    aria-label="Abrir archivo"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M14 5h5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 14L19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M19 13v6H5V5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>

                  {role === "admin" ? (
                    <label className="btn-soft" style={iconBtnStyle} title="Reemplazar archivo" aria-label="Reemplazar archivo">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M13 7l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <input
                        type="file"
                        hidden
                        disabled={savingFiles}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          void replaceFile(index, file);
                        }}
                      />
                    </label>
                  ) : null}

                  {role === "admin" ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={iconBtnStyle}
                      title="Eliminar archivo"
                      aria-label="Eliminar archivo"
                      disabled={savingFiles}
                      onClick={() => {
                        void removeFile(index);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>

              {isImage(entry.url) ? (
                <img src={entry.url} alt={`Preview ${index + 1}`} style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8 }} />
              ) : isPdf(entry.url) ? (
                <iframe title={`PDF ${index + 1}`} src={entry.url} style={{ width: "100%", height: 220, border: "none", borderRadius: 8, background: "#fff" }} />
              ) : (
                <div style={{ display: "grid", gap: 4 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#9db0c6" }}>Documento</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#c7d1df", wordBreak: "break-all" }}>{entry.name}</p>
                </div>
              )}
            </div>
          ))}
          {fileError ? <p style={{ margin: 0, fontSize: 12, color: "#ff9c9c" }}>{fileError}</p> : null}
        </div>
      ) : null}

      {canClientAct ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn-primary" onClick={() => onApprove?.(item.id)}>
            Aprobar
          </button>
          <button type="button" className="btn-secondary" onClick={() => setShowObserveBox((prev) => !prev)}>
            Hacer observacion
          </button>
        </div>
      ) : null}

      {canClientAct && showObserveBox ? (
        <div style={{ display: "grid", gap: 8 }}>
          <textarea
            className="textarea"
            placeholder="Escribe tu observacion"
            value={observeText}
            onChange={(e) => setObserveText(e.target.value)}
            rows={4}
          />
          {observeError ? <p style={{ margin: 0, color: "#ff9c9c", fontSize: 12 }}>{observeError}</p> : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn-primary" onClick={submitObserve} disabled={sendingObserve}>
              {sendingObserve ? "Enviando..." : "Enviar observacion"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowObserveBox(false)} disabled={sendingObserve}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      <DeliverableCommentsThread deliverableId={item.id} role={role} readOnly={readOnly} />

      {role === "admin" ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn-soft" style={iconBtnStyle} onClick={() => onEdit?.(item.id)} title="Editar entregable" aria-label="Editar entregable">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 7l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className="btn-secondary" style={iconBtnStyle} onClick={() => onDelete?.(item.id)} title="Eliminar entregable" aria-label="Eliminar entregable">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : null}
        </>
      ) : null}
    </article>
  );
}

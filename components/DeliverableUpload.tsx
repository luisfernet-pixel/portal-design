"use client";

import { useEffect, useMemo, useState } from "react";
import { Deliverable, DeliverableStatus, DeliverableType, Phase } from "@/lib/types";
import { UploadBox } from "@/components/UploadBox";

type Props = {
  projectId: string;
  phases: Phase[];
  fixedPhaseId?: string | null;
  onCreated?: () => void;
  editingDeliverable?: Deliverable | null;
  onUpdated?: () => void;
  onCancelEdit?: () => void;
};

export function DeliverableUpload({ projectId, phases, fixedPhaseId, onCreated, editingDeliverable, onUpdated, onCancelEdit }: Props) {
  function toArray(value: string | null | undefined) {
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
    return [source];
  }

  const initialPhaseId = editingDeliverable?.phase_id ?? fixedPhaseId ?? phases[0]?.id ?? "";
  const [phaseId, setPhaseId] = useState(initialPhaseId);
  const initialPhase = phases.find((p) => p.id === initialPhaseId);
  const [title, setTitle] = useState(editingDeliverable?.title ?? (initialPhase?.name ?? ""));
  const [description, setDescription] = useState(editingDeliverable?.description ?? "");
  const [fileType, setFileType] = useState<DeliverableType>(editingDeliverable?.file_type ?? "otro");
  const [status, setStatus] = useState<DeliverableStatus>(editingDeliverable?.status ?? "pendiente");
  const [fileUrls, setFileUrls] = useState<string[]>(toArray(editingDeliverable?.file_url));
  const [fileNames, setFileNames] = useState<string[]>(toArray(editingDeliverable?.file_name));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(editingDeliverable?.id);
  const currentPhase = phases.find((p) => p.id === phaseId) ?? null;

  // In create mode, follow the selected phase from the left panel and sync title automatically.
  useEffect(() => {
    if (isEditing) return;
    if (!fixedPhaseId) return;
    if (fixedPhaseId === phaseId) return;
    setPhaseId(fixedPhaseId);
    const next = phases.find((p) => p.id === fixedPhaseId);
    setTitle(next?.name ?? "");
  }, [fixedPhaseId, phaseId, phases, isEditing]);

  const phasePath = useMemo(() => {
    if (!phaseId) return "";
    return `${projectId}/${phaseId}`;
  }, [projectId, phaseId]);

  async function submit() {
    setError("");

    if (!phaseId || !title.trim()) {
      setError("Completa fase y titulo.");
      return;
    }

    setSaving(true);

    const endpoint = isEditing ? `/api/admin/deliverables/${editingDeliverable?.id}` : `/api/admin/projects/${projectId}/deliverables`;
    const method = isEditing ? "PATCH" : "POST";

    const nextStatus: DeliverableStatus =
      isEditing && editingDeliverable?.status === "con_observaciones" ? "pendiente" : status;

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase_id: phaseId,
        title: title.trim(),
        description: description.trim() || null,
        file_url: JSON.stringify(fileUrls),
        file_name: JSON.stringify(fileNames),
        file_type: fileType,
        status: nextStatus,
      }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? `No se pudo ${isEditing ? "editar" : "crear"} el entregable.`);
      return;
    }

    setTitle("");
    setDescription("");
    setFileUrls([]);
    setFileNames([]);

    if (isEditing) onUpdated?.();
    else onCreated?.();
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {isEditing ? <p style={{ margin: 0, fontSize: 12, color: "#9db0c6" }}>Editando entregable</p> : null}

      <p style={{ margin: 0, fontSize: 12, color: "#9db0c6" }}>
        Fase seleccionada: {currentPhase ? `${currentPhase.order_index}. ${currentPhase.name}` : "Sin fase"}
      </p>

      <input className="input" placeholder="Titulo del entregable" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="textarea" placeholder="Descripcion (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />

      <select className="input" value={fileType} onChange={(e) => setFileType(e.target.value as DeliverableType)}>
        <option value="plano">plano</option>
        <option value="render">render</option>
        <option value="documento">documento</option>
        <option value="otro">otro</option>
      </select>

      <select className="input" value={status} onChange={(e) => setStatus(e.target.value as DeliverableStatus)}>
        <option value="pendiente">pendiente</option>
        <option value="aprobado">aprobado</option>
        <option value="con_observaciones">con observaciones</option>
      </select>

      <UploadBox
        bucket="project-documents"
        pathPrefix={phasePath}
        onUploaded={({ publicUrl, path }) => {
          setFileUrls((prev) => Array.from(new Set([...prev, publicUrl])));
          setFileNames((prev) => {
            const next = path.split("/").pop() ?? "";
            return next ? Array.from(new Set([...prev, next])) : prev;
          });
          setError("");
        }}
        onError={(message) => setError(message)}
      />

      {fileUrls.length > 0 ? (
        <div style={{ display: "grid", gap: 6 }}>
          {fileUrls.map((url, index) => (
            <div
              key={`${url}-${index}`}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 8,
                padding: "6px 8px",
              }}
            >
              <p style={{ margin: 0, fontSize: 12, color: "#9db0c6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fileNames[index] ?? `Archivo ${index + 1}`}
              </p>
              <button
                type="button"
                className="btn-secondary"
                title="Quitar archivo"
                aria-label="Quitar archivo"
                onClick={() => {
                  setFileUrls((prev) => prev.filter((_, i) => i !== index));
                  setFileNames((prev) => prev.filter((_, i) => i !== index));
                }}
                style={{ width: 32, height: 32, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {fileUrls.length > 0 ? <p style={{ margin: 0, fontSize: 12, color: "#9db0c6" }}>Archivos cargados: {fileUrls.length}</p> : null}
      {error ? <p style={{ margin: 0, fontSize: 12, color: "#ff9c9c" }}>{error}</p> : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn-primary" onClick={submit} disabled={saving}>
          {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear entregable"}
        </button>
        {isEditing ? (
          <button type="button" className="btn-secondary" onClick={onCancelEdit} disabled={saving}>
            Cancelar
          </button>
        ) : null}
      </div>
    </div>
  );
}

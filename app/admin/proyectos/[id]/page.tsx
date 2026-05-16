"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GallerySection } from "@/components/GallerySection";
import { DecisionsSection } from "@/components/DecisionsSection";
import { DocumentsSection } from "@/components/DocumentsSection";
import { UpdatesSection } from "@/components/UpdatesSection";
import { CommentsBox } from "@/components/CommentsBox";
import { ProjectSectionPanel } from "@/components/ProjectSectionPanel";
import { ProjectPhasePlanManager, type PhaseItem } from "@/components/ProjectPhasePlanManager";
import { PROJECT_STATUS_OPTIONS } from "@/lib/project-status";
import { createClient } from "@/lib/supabase/client";

const galleryTypes = ["propuesta", "referencia", "material", "render"];
const decisionPriorities = ["baja", "media", "alta"];
const documentCategories = ["Planos", "Contrato", "Presupuesto", "Presentacion", "Otros"];

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#d7deea",
};

type Client = { id: string; label: string };
type SectionKey = "gallery" | "decisions" | "documents" | "updates";
type PhaseOption = { id: string; name: string; sort_order: number; active: boolean };

type UploadResult = { publicUrl: string; path: string };

const emptySectionMap: Record<SectionKey, string> = {
  gallery: "",
  decisions: "",
  documents: "",
  updates: "",
};

export default function AdminProjectDetail() {
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const projectId = typeof params?.id === "string" ? params.id : "";
  const [project, setProject] = useState<any>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [phaseItems, setPhaseItems] = useState<PhaseItem[]>([]);
  const [phases, setPhases] = useState<PhaseOption[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sectionErrors, setSectionErrors] = useState<Record<SectionKey, string>>(emptySectionMap);
  const [sectionMessages, setSectionMessages] = useState<Record<SectionKey, string>>(emptySectionMap);
  const [sectionSaving, setSectionSaving] = useState<Record<SectionKey, boolean>>({
    gallery: false,
    decisions: false,
    documents: false,
    updates: false,
  });
  const [galleryForm, setGalleryForm] = useState({
    title: "",
    description: "",
    type: galleryTypes[0],
    file: null as File | null,
  });
  const [decisionForm, setDecisionForm] = useState({
    title: "",
    description: "",
    priority: decisionPriorities[1],
  });
  const [documentForm, setDocumentForm] = useState({
    title: "",
    category: documentCategories[0],
    file: null as File | null,
  });
  const [updateForm, setUpdateForm] = useState({
    title: "",
    description: "",
    update_date: new Date().toISOString().slice(0, 10),
    file: null as File | null,
  });
  const selectedClientLabel = clients.find((c) => c.id === project?.client_id)?.label ?? "Sin cliente";

  function setSectionFeedback(section: SectionKey, next: { error?: string; message?: string }) {
    setSectionErrors((prev) => ({ ...prev, [section]: next.error ?? "" }));
    setSectionMessages((prev) => ({ ...prev, [section]: next.message ?? "" }));
  }

  async function uploadFile(bucket: string, file: File): Promise<UploadResult> {
    const safeName = file.name.replace(/\s+/g, "-");
    const path = `${project.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { publicUrl: data.publicUrl, path };
  }

  async function load(showLoader = false) {
    if (!projectId) {
      setError("No se encontro el identificador del proyecto.");
      setProject(null);
      setLoading(false);
      return;
    }

    if (showLoader || !project) {
      setLoading(true);
    }
    setError("");

    try {
      const [clientRes, detailRes, phasesRes] = await Promise.all([
        fetch("/api/admin/list-clients", { cache: "no-store" }),
        fetch(`/api/admin/projects/${projectId}`, { cache: "no-store" }),
        fetch("/api/admin/phases", { cache: "no-store" }),
      ]);

      const clientPayload = await clientRes.json();
      const detailPayload = await detailRes.json();
      const phasesPayload = await phasesRes.json();

      if (!clientRes.ok) {
        throw new Error(clientPayload.error ?? "No se pudieron cargar los clientes");
      }

      if (!detailRes.ok) {
        throw new Error(detailPayload.error ?? "No se pudo cargar el proyecto");
      }

      if (!phasesRes.ok) {
        throw new Error(phasesPayload.error ?? "No se pudieron cargar las fases");
      }

      const mapped = (clientPayload.clients ?? []).map((c: any) => ({
        id: c.id,
        label: c.full_name ?? c.email ?? c.id,
      }));

      setClients(mapped);
      setProject(detailPayload.project ?? null);
      setGallery(detailPayload.gallery ?? []);
      setDecisions(detailPayload.decisions ?? []);
      setDocuments(detailPayload.documents ?? []);
      setUpdates(detailPayload.updates ?? []);
      setPhaseItems(detailPayload.phaseItems ?? []);
      setPhases((phasesPayload.phases ?? []) as PhaseOption[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el proyecto");
      setProject(null);
    } finally {
      if (showLoader || !project) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    load(true);
  }, [projectId]);

  if (loading) return <main className="app-shell">Cargando...</main>;

  if (!project) {
    return (
      <main className="app-shell" style={{ display: "grid", gap: 12 }}>
        <section className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, color: "#f3f6fb" }}>Proyecto no disponible</h1>
            <Link href="/admin" className="btn-secondary">Volver al dashboard</Link>
          </div>
          <p style={{ margin: "10px 0 0", color: "#ff9c9c" }}>{error || "No se pudo abrir este proyecto."}</p>
        </section>
      </main>
    );
  }

  async function saveProject() {
    setError("");
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.error ?? "No se pudo guardar proyecto");
      return;
    }
    setProject(payload.project);
    alert("Proyecto actualizado");
  }

  async function deleteProject() {
    const confirmed = window.confirm(
      `Vas a borrar el proyecto '${project.name}' y todo su contenido (galeria, decisiones, documentos, avances y comentarios). Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;

    const res = await fetch(`/api/admin/projects/${project.id}`, { method: "DELETE" });
    const payload = await res.json();
    if (!res.ok) {
      alert(payload.error ?? "No se pudo borrar proyecto");
      return;
    }
    window.location.href = "/admin";
  }

  async function createGalleryItem(e: React.FormEvent) {
    e.preventDefault();
    if (!galleryForm.file) {
      setSectionFeedback("gallery", { error: "Selecciona una imagen para la galeria." });
      return;
    }

    setSectionSaving((prev) => ({ ...prev, gallery: true }));
    setSectionFeedback("gallery", {});

    try {
      const upload = await uploadFile("project-gallery", galleryForm.file);
      const { error: insertError } = await supabase.from("gallery_items").insert({
        project_id: project.id,
        title: galleryForm.title.trim(),
        description: galleryForm.description.trim(),
        type: galleryForm.type,
        image_url: upload.publicUrl,
        image_path: upload.path,
      });

      if (insertError) throw new Error(insertError.message);

      setGalleryForm({ title: "", description: "", type: galleryTypes[0], file: null });
      setSectionFeedback("gallery", { message: "Imagen agregada a la galeria." });
      await load(false);
    } catch (uploadError) {
      setSectionFeedback("gallery", {
        error: uploadError instanceof Error ? uploadError.message : "No se pudo guardar la imagen.",
      });
    } finally {
      setSectionSaving((prev) => ({ ...prev, gallery: false }));
    }
  }

  async function createDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!decisionForm.title.trim()) {
      setSectionFeedback("decisions", { error: "Pon un titulo para la decision." });
      return;
    }

    setSectionSaving((prev) => ({ ...prev, decisions: true }));
    setSectionFeedback("decisions", {});

    try {
      const { error: insertError } = await supabase.from("decisions").insert({
        project_id: project.id,
        title: decisionForm.title.trim(),
        description: decisionForm.description.trim(),
        priority: decisionForm.priority,
      });

      if (insertError) throw new Error(insertError.message);

      setDecisionForm({ title: "", description: "", priority: decisionPriorities[1] });
      setSectionFeedback("decisions", { message: "Decision creada correctamente." });
      await load(false);
    } catch (decisionError) {
      setSectionFeedback("decisions", {
        error: decisionError instanceof Error ? decisionError.message : "No se pudo crear la decision.",
      });
    } finally {
      setSectionSaving((prev) => ({ ...prev, decisions: false }));
    }
  }

  async function createDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!documentForm.file) {
      setSectionFeedback("documents", { error: "Selecciona un archivo para el documento." });
      return;
    }
    if (!documentForm.title.trim()) {
      setSectionFeedback("documents", { error: "Pon un nombre para el documento." });
      return;
    }

    setSectionSaving((prev) => ({ ...prev, documents: true }));
    setSectionFeedback("documents", {});

    try {
      const upload = await uploadFile("project-documents", documentForm.file);
      const { error: insertError } = await supabase.from("documents").insert({
        project_id: project.id,
        title: documentForm.title.trim(),
        category: documentForm.category,
        file_url: upload.publicUrl,
        file_path: upload.path,
      });

      if (insertError) throw new Error(insertError.message);

      setDocumentForm({ title: "", category: documentCategories[0], file: null });
      setSectionFeedback("documents", { message: "Documento subido correctamente." });
      await load(false);
    } catch (documentError) {
      setSectionFeedback("documents", {
        error: documentError instanceof Error ? documentError.message : "No se pudo subir el documento.",
      });
    } finally {
      setSectionSaving((prev) => ({ ...prev, documents: false }));
    }
  }

  async function createUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!updateForm.title.trim()) {
      setSectionFeedback("updates", { error: "Pon un titulo para este avance." });
      return;
    }
    if (!updateForm.description.trim()) {
      setSectionFeedback("updates", { error: "Describe que paso en este avance." });
      return;
    }

    setSectionSaving((prev) => ({ ...prev, updates: true }));
    setSectionFeedback("updates", {});

    try {
      let upload: UploadResult | null = null;
      if (updateForm.file) {
        upload = await uploadFile("project-updates", updateForm.file);
      }

      const { error: insertError } = await supabase.from("construction_updates").insert({
        project_id: project.id,
        title: updateForm.title.trim(),
        description: updateForm.description.trim(),
        image_url: upload?.publicUrl ?? null,
        image_path: upload?.path ?? null,
        update_date: updateForm.update_date,
      });

      if (insertError) throw new Error(insertError.message);

      setUpdateForm({
        title: "",
        description: "",
        update_date: new Date().toISOString().slice(0, 10),
        file: null,
      });
      setSectionFeedback("updates", { message: "Avance guardado correctamente." });
      await load(false);
    } catch (updateError) {
      setSectionFeedback("updates", {
        error: updateError instanceof Error ? updateError.message : "No se pudo guardar el avance.",
      });
    } finally {
      setSectionSaving((prev) => ({ ...prev, updates: false }));
    }
  }

  return (
    <main className="app-shell" style={{ display: "grid", gap: 14 }}>
      <section className="card" style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin" className="btn-secondary">Volver al dashboard</Link>
          <Link href="/admin/proyectos/nuevo" className="btn-soft">Nuevo proyecto</Link>
          <button type="button" className="btn-secondary" onClick={deleteProject}>Borrar proyecto</button>
        </div>
      </section>

      <section className="card" style={{ padding: 10 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#b7c2d6" }}>
          Proyecto: <strong style={{ color: "#f2f6fb" }}>{project.name}</strong> · Cliente:{" "}
          <strong style={{ color: "#f2f6fb" }}>{selectedClientLabel}</strong>
        </p>
      </section>

      <ProjectSectionPanel variant="project" badgeText="Configuracion base">
          <div style={{ display: "grid", gap: 10 }}>
            <label style={labelStyle}>Nombre<input className="input" value={project.name ?? ""} onChange={(e) => setProject({ ...project, name: e.target.value })} /></label>
            <label style={labelStyle}>Cliente<select className="select" value={project.client_id ?? ""} onChange={(e) => setProject({ ...project, client_id: e.target.value })}><option value="">Seleccionar</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
            <label style={labelStyle}>Estado<select className="select" value={project.status ?? "activo"} onChange={(e) => setProject({ ...project, status: e.target.value })}>{PROJECT_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label style={labelStyle}>Fase<select className="select" value={project.phase ?? ""} onChange={(e) => setProject({ ...project, phase: e.target.value })}>
              {project.phase && !phases.some((p) => p.active !== false && p.name === project.phase) ? (
                <option value={project.phase}>{project.phase} (actual)</option>
              ) : null}
              <option value="">Seleccionar</option>
              {phases.filter((p) => p.active !== false).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((phase) => (
                <option key={phase.id} value={phase.name}>{phase.name}</option>
              ))}
            </select></label>
            <label style={labelStyle}>Progreso %<input className="input" type="number" min={0} max={100} value={project.progress ?? 0} onChange={(e) => setProject({ ...project, progress: Number(e.target.value) })} /></label>
            <label style={labelStyle}>Proximo paso<input className="input" value={project.next_step ?? ""} onChange={(e) => setProject({ ...project, next_step: e.target.value })} /></label>
            <label style={labelStyle}>Resumen<textarea className="textarea" value={project.summary ?? ""} onChange={(e) => setProject({ ...project, summary: e.target.value })} /></label>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
            <button type="button" className="btn-primary" onClick={saveProject}>Guardar cambios</button>
          </div>
          {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}
          <CommentsBox projectId={project.id} targetType="project" targetId={project.id} />
      </ProjectSectionPanel>

      <ProjectSectionPanel
        variant="updates"
        count={phaseItems.length}
        title="Plan de fases y subfases"
        subtitle="Control de estado, entregables y fechas para informar al cliente con claridad."
        hint="Este panel organiza el cronograma en subfases para mostrar avance real y siguiente paso."
      >
        <ProjectPhasePlanManager projectId={project.id} initialItems={phaseItems} />
      </ProjectSectionPanel>

      <ProjectSectionPanel variant="gallery" count={gallery.length}>
        <form onSubmit={createGalleryItem} style={{ display: "grid", gap: 10 }}>
          <label style={labelStyle}>Titulo<input className="input" value={galleryForm.title} onChange={(e) => setGalleryForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Ej: Fachada principal render dia" /></label>
          <label style={labelStyle}>Tipo<select className="select" value={galleryForm.type} onChange={(e) => setGalleryForm((prev) => ({ ...prev, type: e.target.value }))}>{galleryTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <label style={labelStyle}>Descripcion<textarea className="textarea" value={galleryForm.description} onChange={(e) => setGalleryForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Que se esta mostrando o que debe revisar el cliente" /></label>
          <label style={labelStyle}>Imagen<input className="input" type="file" accept="image/*" onChange={(e) => setGalleryForm((prev) => ({ ...prev, file: e.target.files?.[0] ?? null }))} /></label>
          {sectionErrors.gallery ? <p style={{ margin: 0, color: "#ff9c9c" }}>{sectionErrors.gallery}</p> : null}
          {sectionMessages.gallery ? <p style={{ margin: 0, color: "#7fd0ac" }}>{sectionMessages.gallery}</p> : null}
          <button type="submit" className="btn-primary" disabled={sectionSaving.gallery}>{sectionSaving.gallery ? "Guardando..." : "Agregar imagen"}</button>
        </form>
        <GallerySection projectId={project.id} role="admin" items={gallery} onChanged={() => load(false)} />
      </ProjectSectionPanel>

      <ProjectSectionPanel variant="decisions" count={decisions.length}>
        <form onSubmit={createDecision} style={{ display: "grid", gap: 10 }}>
          <label style={labelStyle}>Titulo<input className="input" value={decisionForm.title} onChange={(e) => setDecisionForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Ej: Aprobacion de distribucion de cocina" /></label>
          <label style={labelStyle}>Prioridad<select className="select" value={decisionForm.priority} onChange={(e) => setDecisionForm((prev) => ({ ...prev, priority: e.target.value }))}>{decisionPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
          <label style={labelStyle}>Descripcion<textarea className="textarea" value={decisionForm.description} onChange={(e) => setDecisionForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Que debe decidir el cliente y que implicaciones tiene" /></label>
          {sectionErrors.decisions ? <p style={{ margin: 0, color: "#ff9c9c" }}>{sectionErrors.decisions}</p> : null}
          {sectionMessages.decisions ? <p style={{ margin: 0, color: "#7fd0ac" }}>{sectionMessages.decisions}</p> : null}
          <button type="submit" className="btn-primary" disabled={sectionSaving.decisions}>{sectionSaving.decisions ? "Guardando..." : "Agregar decision"}</button>
        </form>
        <DecisionsSection projectId={project.id} role="admin" items={decisions} onChanged={() => load(false)} />
      </ProjectSectionPanel>

      <ProjectSectionPanel variant="documents" count={documents.length}>
        <form onSubmit={createDocument} style={{ display: "grid", gap: 10 }}>
          <label style={labelStyle}>Nombre del documento<input className="input" value={documentForm.title} onChange={(e) => setDocumentForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Ej: Plano electrico planta alta" /></label>
          <label style={labelStyle}>Categoria<select className="select" value={documentForm.category} onChange={(e) => setDocumentForm((prev) => ({ ...prev, category: e.target.value }))}>{documentCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          <label style={labelStyle}>Archivo<input className="input" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" onChange={(e) => setDocumentForm((prev) => ({ ...prev, file: e.target.files?.[0] ?? null }))} /></label>
          {sectionErrors.documents ? <p style={{ margin: 0, color: "#ff9c9c" }}>{sectionErrors.documents}</p> : null}
          {sectionMessages.documents ? <p style={{ margin: 0, color: "#7fd0ac" }}>{sectionMessages.documents}</p> : null}
          <button type="submit" className="btn-primary" disabled={sectionSaving.documents}>{sectionSaving.documents ? "Guardando..." : "Subir documento"}</button>
        </form>
        <DocumentsSection projectId={project.id} items={documents} role="admin" onChanged={() => load(false)} />
      </ProjectSectionPanel>

      <ProjectSectionPanel variant="updates" count={updates.length}>
        <form onSubmit={createUpdate} style={{ display: "grid", gap: 10 }}>
          <label style={labelStyle}>Titulo<input className="input" value={updateForm.title} onChange={(e) => setUpdateForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Ej: Vaciado de losa completado" /></label>
          <label style={labelStyle}>Fecha<input className="input" type="date" value={updateForm.update_date} onChange={(e) => setUpdateForm((prev) => ({ ...prev, update_date: e.target.value }))} /></label>
          <label style={labelStyle}>Descripcion<textarea className="textarea" value={updateForm.description} onChange={(e) => setUpdateForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Que se hizo, que falta y cualquier observacion importante" /></label>
          <label style={labelStyle}>Foto opcional<input className="input" type="file" accept="image/*" onChange={(e) => setUpdateForm((prev) => ({ ...prev, file: e.target.files?.[0] ?? null }))} /></label>
          {sectionErrors.updates ? <p style={{ margin: 0, color: "#ff9c9c" }}>{sectionErrors.updates}</p> : null}
          {sectionMessages.updates ? <p style={{ margin: 0, color: "#7fd0ac" }}>{sectionMessages.updates}</p> : null}
          <button type="submit" className="btn-primary" disabled={sectionSaving.updates}>{sectionSaving.updates ? "Guardando..." : "Registrar avance"}</button>
        </form>
        <UpdatesSection projectId={project.id} items={updates} role="admin" onChanged={() => load(false)} />
      </ProjectSectionPanel>
    </main>
  );
}




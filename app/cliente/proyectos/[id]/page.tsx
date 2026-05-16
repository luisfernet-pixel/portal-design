import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { GallerySection } from "@/components/GallerySection";
import { DecisionsSection } from "@/components/DecisionsSection";
import { DocumentsSection } from "@/components/DocumentsSection";
import { UpdatesSection } from "@/components/UpdatesSection";
import { CommentsBox } from "@/components/CommentsBox";
import { ProjectSectionPanel } from "@/components/ProjectSectionPanel";
import { ProjectPhaseTimeline } from "@/components/ProjectPhaseTimeline";

export default async function ClienteProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole("cliente");
  const supabase = await createServerSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("client_id", profile.id)
    .single();

  if (!project) notFound();

  const [{ data: galleryRaw }, { data: decisionsRaw }, { data: documentsRaw }, { data: updatesRaw }, { data: phaseItemsRaw }] =
    await Promise.all([
      supabase.from("gallery_items").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
      supabase.from("decisions").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
      supabase.from("documents").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
      supabase
        .from("construction_updates")
        .select("*")
        .eq("project_id", project.id)
        .order("update_date", { ascending: false }),
      supabase.from("project_phase_items").select("*").eq("project_id", project.id).order("sort_order", { ascending: true }),
    ]);

  const gallery = galleryRaw ?? [];
  const decisions = decisionsRaw ?? [];
  const documents = documentsRaw ?? [];
  const updates = updatesRaw ?? [];
  const phaseItems = phaseItemsRaw ?? [];

  return (
    <AppShell title={project.name} subtitle="Vista del cliente">
      <div style={{ display: "grid", gap: 14 }}>
        <section className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/cliente" className="btn-secondary">Volver al dashboard</Link>
          </div>
        </section>

        <section className="card" style={{ padding: 10 }}>
          <p style={{ margin: 0, fontSize: 12, color: "#b7c2d6" }}>
            Proyecto: <strong style={{ color: "#f2f6fb" }}>{project.name}</strong> · Cliente:{" "}
            <strong style={{ color: "#f2f6fb" }}>{profile.full_name ?? profile.email ?? "Cliente"}</strong>
          </p>
        </section>

        <ProjectSectionPanel variant="project" badgeText="Resumen">
          <p style={{ margin: 0, color: "#e7edf7" }}><strong>Estado:</strong> {project.status}</p>
          <p style={{ margin: 0, color: "#e7edf7" }}><strong>Fase:</strong> {project.phase}</p>
          <p style={{ margin: 0, color: "#e7edf7" }}><strong>Progreso:</strong> {project.progress}%</p>
          <p style={{ margin: 0, color: "#e7edf7" }}><strong>Proximo paso:</strong> {project.next_step || "Sin definir"}</p>
          <p style={{ margin: 0, color: "#e7edf7" }}><strong>Resumen del proyecto:</strong> {project.summary || "Sin resumen cargado."}</p>
          <CommentsBox projectId={project.id} targetType="project" targetId={project.id} />
        </ProjectSectionPanel>

        <ProjectSectionPanel
          variant="updates"
          count={phaseItems.length}
          title="Cronograma por subfases"
          subtitle="Aqui puedes ver exactamente en que etapa esta cada frente de trabajo."
          hint="Cada subfase muestra su estado, progreso, entregable y fechas para que tengas visibilidad total."
        >
          <ProjectPhaseTimeline items={phaseItems} />
        </ProjectSectionPanel>

        <ProjectSectionPanel variant="gallery" count={gallery.length}>
          <GallerySection projectId={project.id} role="cliente" items={gallery} />
        </ProjectSectionPanel>

        <ProjectSectionPanel variant="decisions" count={decisions.length}>
          <DecisionsSection projectId={project.id} role="cliente" items={decisions} />
        </ProjectSectionPanel>

        <ProjectSectionPanel variant="documents" count={documents.length}>
          <DocumentsSection projectId={project.id} items={documents} role="cliente" />
        </ProjectSectionPanel>

        <ProjectSectionPanel variant="updates" count={updates.length}>
          <UpdatesSection projectId={project.id} items={updates} role="cliente" />
        </ProjectSectionPanel>
      </div>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CommentsBox } from "./CommentsBox";

const pdfPattern = /\.pdf($|\?)/i;
const imagePattern = /\.(png|jpe?g|webp|gif|bmp|svg)($|\?)/i;

export function DocumentsSection({
  projectId,
  items,
  role = "cliente",
  onChanged,
}: {
  projectId: string;
  items: any[];
  role?: "admin" | "cliente";
  onChanged?: () => void | Promise<void>;
}) {
  const supabase = createClient();

  async function remove(doc: any) {
    const confirmed = window.confirm(`Eliminar el documento '${doc.title}'? Esta accion no se puede deshacer.`);
    if (!confirmed) return;

    await supabase.from("documents").delete().eq("id", doc.id);
    if (doc.file_path) {
      await supabase.storage.from("project-documents").remove([doc.file_path]);
    }

    if (onChanged) {
      await onChanged();
    }
  }

  return <div style={{ display: "grid", gap: 10 }}>{items.map((doc) => {
    const isPdf = pdfPattern.test(doc.file_url || "");
    const isImage = imagePattern.test(doc.file_url || "");

    return (
      <article className="card" key={doc.id} style={{ padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{doc.title}</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#aeb7c6" }}>{doc.category}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={doc.file_url} target="_blank" className="btn-secondary">Abrir</Link>
            {role === "admin" ? <button type="button" className="btn-secondary" onClick={() => remove(doc)}>Eliminar</button> : null}
          </div>
        </div>
        {isPdf ? <iframe src={doc.file_url} title={doc.title} style={{ width: "100%", height: 360, border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, background: "#0f131b" }} /> : null}
        {isImage ? <img src={doc.file_url} alt={doc.title} style={{ width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)" }} /> : null}
        {!isPdf && !isImage ? <p style={{ margin: 0, fontSize: 13, color: "#aeb7c6" }}>Vista previa no disponible para este tipo de archivo.</p> : null}
        <p style={{ margin: 0, fontSize: 12, color: "#8f9caf" }}>
          {isPdf ? "Puedes abrir el PDF en una pestaña nueva para hacer zoom y navegar mejor." : "Abre el archivo para revisarlo y usa los comentarios debajo para dejar observaciones."}
        </p>
        <CommentsBox projectId={projectId} targetType="document" targetId={doc.id} />
      </article>
    );
  })}</div>;
}


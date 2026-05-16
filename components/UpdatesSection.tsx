"use client";

import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { CommentsBox } from "./CommentsBox";

const imagePattern = /\.(png|jpe?g|webp|gif|bmp|svg)($|\?)/i;

export function UpdatesSection({ projectId, items, role = "cliente", onChanged }: { projectId: string; items: any[]; role?: "admin" | "cliente"; onChanged?: () => void | Promise<void>; }) {
  const supabase = createClient();

  async function remove(item: any) {
    const confirmed = window.confirm(`Eliminar el avance '${item.title}'? Esta accion no se puede deshacer.`);
    if (!confirmed) return;

    await supabase.from("construction_updates").delete().eq("id", item.id);
    if (item.image_path) {
      await supabase.storage.from("project-updates").remove([item.image_path]);
    }

    if (onChanged) {
      await onChanged();
    }
  }

  return <div style={{ display: "grid", gap: 10 }}>{items.map((item) => {
    const hasImagePreview = imagePattern.test(item.image_url || "");

    return (
      <article className="card" key={item.id} style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{item.title}</p>
            <p style={{ margin: "3px 0", fontSize: 13, color: "#aeb7c6" }}>{item.update_date}</p>
          </div>
          {role === "admin" ? <button type="button" className="btn-secondary" onClick={() => remove(item)}>Eliminar</button> : null}
        </div>
        {item.image_url && hasImagePreview ? <Image src={item.image_url} alt={item.title} width={480} height={300} style={{ width: "100%", height: 170, borderRadius: 8, objectFit: "cover" }} /> : null}
        {item.image_url && !hasImagePreview ? <a href={item.image_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ width: "fit-content" }}>Abrir archivo adjunto</a> : null}
        <p style={{ margin: "8px 0" }}>{item.description}</p>
        <CommentsBox projectId={projectId} targetType="update" targetId={item.id} />
      </article>
    );
  })}</div>;
}


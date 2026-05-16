"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CommentsBox } from "./CommentsBox";

export function GallerySection({ projectId, role, items, onChanged }: { projectId: string; role: "admin" | "cliente"; items: any[]; onChanged?: () => void | Promise<void>; }) {
  const supabase = createClient();
  const [localItems, setLocalItems] = useState<any[]>(items);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [messageById, setMessageById] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  async function approve(id: string) {
    setApprovingId(id);
    setMessageById((prev) => ({ ...prev, [id]: "" }));

    const { error } = await supabase.from("gallery_items").update({ status: "aprobada" }).eq("id", id);
    if (error) {
      setApprovingId(null);
      alert(`No se pudo aprobar la imagen: ${error.message}`);
      return;
    }

    setLocalItems((prev) => prev.map((item) => item.id === id ? { ...item, status: "aprobada" } : item));
    setMessageById((prev) => ({ ...prev, [id]: "Aprobacion enviada al admin." }));

    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const profileRes = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
      await supabase.from("comments").insert({
        project_id: projectId,
        user_id: auth.user.id,
        author_role: profileRes.data?.role ?? null,
        target_type: "gallery",
        target_id: id,
        text: "Aprobado por cliente.",
      });
    }

    setApprovingId(null);

    if (onChanged) {
      await onChanged();
    }
  }

  async function remove(id: string, path: string) {
    const confirmed = window.confirm("Eliminar esta imagen de la galeria? Esta accion no se puede deshacer.");
    if (!confirmed) return;
    await supabase.from("gallery_items").delete().eq("id", id);
    await supabase.storage.from("project-gallery").remove([path]);
    if (onChanged) {
      await onChanged();
      return;
    }
    setLocalItems((prev) => prev.filter((item) => item.id !== id));
  }

  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>{localItems.map((item) => (
    <article className="card" key={item.id} style={{ padding: 12 }}>
      <Image src={item.image_url} alt={item.title} width={480} height={320} style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 8 }} />
      <p style={{ margin: "10px 0 2px", fontWeight: 600 }}>{item.title}</p>
      <p style={{ margin: 0, fontSize: 13, color: "#aeb7c6" }}>{item.type} | {item.status}</p>
      <p style={{ margin: "6px 0", fontSize: 13 }}>{item.description}</p>
      {role === "cliente" ? (
        <button
          type="button"
          className="btn-primary"
          onClick={() => approve(item.id)}
          disabled={item.status === "aprobada" || approvingId === item.id}
        >
          {item.status === "aprobada" ? "Opcion aprobada" : approvingId === item.id ? "Enviando..." : "Aprobar esta opcion"}
        </button>
      ) : null}
      {messageById[item.id] ? <p style={{ margin: "6px 0 0", fontSize: 12, color: "#7fd0ac" }}>{messageById[item.id]}</p> : null}
      {role === "admin" ? <button type="button" className="btn-secondary" onClick={() => remove(item.id, item.image_path)} style={{ marginTop: 8 }}>Eliminar</button> : null}
      <CommentsBox projectId={projectId} targetType="gallery" targetId={item.id} />
    </article>
  ))}</div>;
}

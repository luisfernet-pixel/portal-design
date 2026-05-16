"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function UploadBox({ bucket, pathPrefix, onUploaded }: { bucket: string; pathPrefix: string; onUploaded: (payload: { publicUrl: string; path: string }) => void; }) {
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    const supabase = createClient();
    setLoading(true);
    const path = `${pathPrefix}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded({ publicUrl: data.publicUrl, path });
    }
    setLoading(false);
  }

  return (
    <label className="btn-secondary" style={{ display: "inline-flex" }}>
      {loading ? "Subiendo..." : "Subir archivo"}
      <input type="file" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </label>
  );
}

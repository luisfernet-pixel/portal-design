"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function UploadBox({
  bucket,
  pathPrefix,
  onUploaded,
  onError,
}: {
  bucket: string;
  pathPrefix: string;
  onUploaded: (payload: { publicUrl: string; path: string }) => void;
  onError?: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [pickedFileNames, setPickedFileNames] = useState<string[]>([]);

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    const supabase = createClient();
    setLoading(true);
    onError?.("");

    for (const file of files) {
      const safePrefix = pathPrefix?.trim() ? pathPrefix.trim() : "deliverables";
      const path = `${safePrefix}/${Date.now()}-${file.name}`;

      const candidates = Array.from(new Set([bucket, "deliverables", "project-documents"].filter(Boolean)));
      let uploaded = false;
      let lastError = "No se pudo subir el archivo.";

      for (const candidate of candidates) {
        const { error } = await supabase.storage.from(candidate).upload(path, file, { upsert: true });
        if (!error) {
          const { data } = supabase.storage.from(candidate).getPublicUrl(path);
          onUploaded({ publicUrl: data.publicUrl, path });
          uploaded = true;
          break;
        }
        lastError = error.message || lastError;
      }

      if (!uploaded) onError?.(`${file.name}: ${lastError}`);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label className="btn-secondary" style={{ display: "inline-flex", width: "fit-content" }}>
        {loading ? "Subiendo..." : "Subir archivo"}
        <input
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const list = e.target.files ? Array.from(e.target.files) : [];
            if (list.length === 0) return;
            setPickedFileNames(list.map((f) => f.name));
            void handleFiles(list);
          }}
        />
      </label>
      {pickedFileNames.length > 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "#9db0c6" }}>
          Seleccionado: {pickedFileNames.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

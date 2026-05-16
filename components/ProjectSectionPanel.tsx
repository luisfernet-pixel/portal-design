"use client";

import { ReactNode } from "react";

type SectionVariant = "project" | "gallery" | "decisions" | "documents" | "updates";

const panelTheme: Record<
  SectionVariant,
  {
    title: string;
    accent: string;
    subtitle: string;
    hint?: string;
    countLabel: string;
  }
> = {
  project: {
    title: "Datos del proyecto",
    accent: "rgba(148, 163, 184, .28)",
    subtitle: "Nombre, cliente, estado, fase, progreso y resumen general del proyecto.",
    countLabel: "base",
  },
  gallery: {
    title: "Galeria de diseno",
    accent: "rgba(124, 58, 237, .38)",
    subtitle: "Sube o revisa imagenes de propuestas, referencias, materiales y renders.",
    countLabel: "imagenes",
  },
  decisions: {
    title: "Decisiones",
    accent: "rgba(245, 158, 11, .38)",
    subtitle: "Items que requieren aprobacion o definicion del cliente.",
    countLabel: "decisiones",
  },
  documents: {
    title: "Documentos",
    accent: "rgba(59, 130, 246, .38)",
    subtitle: "PDFs, planos, contratos y archivos tecnicos del proyecto.",
    countLabel: "documentos",
  },
  updates: {
    title: "Avance de obra",
    accent: "rgba(34, 197, 94, .34)",
    subtitle: "Bitacora de lo que realmente va pasando en la obra.",
    hint: "Aqui se registra que ya se hizo, que esta en proceso y que observaciones importantes hay en campo.",
    countLabel: "avances",
  },
};

function SectionIcon({ variant }: { variant: SectionVariant }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (variant) {
    case "project":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M8 2v4M16 2v4M3 10h18" />
        </svg>
      );
    case "gallery":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="M21 16l-5-5-6 6-3-3-4 4" />
        </svg>
      );
    case "decisions":
      return (
        <svg {...common}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "documents":
      return (
        <svg {...common}>
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
          <path d="M14 2v5h5M9 13h6M9 17h6M9 9h1" />
        </svg>
      );
    case "updates":
      return (
        <svg {...common}>
          <path d="M12 3v18M3 12h18" />
          <path d="M5 19l14-14" />
        </svg>
      );
  }
}

function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ProjectSectionPanel({
  variant,
  count,
  children,
  defaultOpen = false,
  title,
  subtitle,
  hint,
  badgeText,
}: {
  variant: SectionVariant;
  count?: number;
  children: ReactNode;
  defaultOpen?: boolean;
  title?: string;
  subtitle?: string;
  hint?: string;
  badgeText?: string;
}) {
  const theme = panelTheme[variant];
  const panelTitle = title ?? theme.title;
  const panelSubtitle = subtitle ?? theme.subtitle;
  const panelHint = hint ?? theme.hint;
  const badge = badgeText ?? (count === undefined ? null : `${count} ${theme.countLabel}`);
  const backgroundAccent = theme.accent.replace(".38", ".12").replace(".34", ".12").replace(".28", ".10");

  return (
    <details
      className="card project-section-panel"
      open={defaultOpen}
      style={{
        padding: 0,
        overflow: "hidden",
        borderColor: theme.accent,
        boxShadow: `0 0 0 1px ${theme.accent} inset`,
      }}
    >
      <summary
        className="project-section-summary"
        style={{
          listStyle: "none",
          cursor: "pointer",
          padding: 16,
          display: "grid",
          gap: 6,
          background: `linear-gradient(180deg, ${backgroundAccent}, rgba(20,24,32,.12))`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f4f7fb",
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.1)",
              }}
            >
              <SectionIcon variant={variant} />
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ margin: 0, color: "#f3f6fb" }}>{panelTitle}</h2>
              <span className="project-section-chevron" aria-hidden="true">
                <ChevronIcon />
              </span>
            </div>
          </div>
          {badge ? (
            <span
              style={{
                borderRadius: 999,
                padding: "5px 10px",
                fontSize: 12,
                fontWeight: 700,
                color: "#f5f7fb",
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.1)",
              }}
            >
              {badge}
            </span>
          ) : null}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#b7c2d4" }}>{panelSubtitle}</p>
        {panelHint ? <p style={{ margin: 0, fontSize: 12, color: "#8f9caf" }}>{panelHint}</p> : null}
      </summary>
      <div className="project-section-content" style={{ padding: 16, display: "grid", gap: 14 }}>
        {children}
      </div>
    </details>
  );
}

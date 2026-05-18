"use client";

import { useEffect, useMemo, useState } from "react";

export function ProgressBar({
  value,
  tone = "accent",
  thickness = 8,
}: {
  value: number;
  tone?: "accent" | "info" | "muted";
  thickness?: number;
}) {
  const target = useMemo(() => Math.max(0, Math.min(100, Number(value ?? 0))), [value]);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setShown(target));
    return () => window.cancelAnimationFrame(id);
  }, [target]);

  const background =
    tone === "info"
      ? "linear-gradient(90deg, rgba(121, 198, 255, .75), var(--info))"
      : tone === "muted"
        ? "linear-gradient(90deg, rgba(255,255,255,.22), rgba(255,255,255,.30))"
        : "linear-gradient(90deg,var(--accent-soft),var(--accent))";

  return (
    <div
      style={{
        width: "100%",
        background: "rgba(255,255,255,.10)",
        borderRadius: 999,
        height: thickness,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${shown}%`,
          height: "100%",
          borderRadius: 999,
          background,
          transition: "width 2600ms cubic-bezier(.2,.9,.2,1)",
          willChange: "width",
        }}
      />
    </div>
  );
}

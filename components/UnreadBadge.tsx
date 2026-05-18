export function UnreadBadge({
  count,
  title,
  variant = "accent",
}: {
  count: number;
  title?: string;
  variant?: "accent" | "success" | "approved" | "danger";
}) {
  if (!count || count <= 0) return null;

  const text = count > 99 ? "99+" : String(count);

  const palette =
    variant === "success"
      ? {
          background: "var(--info)",
          shadow: "rgba(121, 198, 255, 0.18)",
          border: "rgba(255,255,255,.16)",
          color: "#0b0f16",
        }
      : variant === "approved"
        ? {
            background: "#7fd0ac",
            shadow: "rgba(127, 208, 172, 0.2)",
          border: "rgba(255,255,255,.18)",
          color: "#0b0f16",
        }
      : variant === "danger"
        ? {
            background: "#c62828",
            shadow: "rgba(198, 40, 40, 0.28)",
            border: "rgba(255,255,255,.18)",
            color: "#fff3f3",
          }
        : {
            background: "var(--accent)",
            shadow: "rgba(229, 83, 45, 0.22)",
            border: "rgba(255,255,255,.18)",
            color: "#11141b",
          };

  return (
    <span
      title={title}
      style={{
        minWidth: 20,
        height: 20,
        padding: "0 6px",
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: palette.background,
        color: palette.color,
        fontSize: 12,
        fontWeight: 800,
        lineHeight: 1,
        boxShadow: `0 6px 16px ${palette.shadow}`,
        border: `1px solid ${palette.border}`,
      }}
    >
      {text}
    </span>
  );
}

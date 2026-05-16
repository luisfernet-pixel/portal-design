const map: Record<string, string> = {
  pendiente: "#f59e0b",
  aprobada: "#3db98c",
  no_iniciada: "#7f8aa0",
  en_curso: "#3b82f6",
  revision_interna: "#a855f7",
  revision_cliente: "#f59e0b",
  bloqueada: "#ef4444",
  activa: "#e5532d",
  activo: "#e5532d",
  pausado: "#f59e0b",
  inactivo: "#8b93a7",
};

export function StatusBadge({ value }: { value: string }) {
  const color = map[value.toLowerCase()] ?? "#9ca3af";
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 999,
        padding: "4px 9px",
        background: `${color}22`,
        color,
        border: `1px solid ${color}4d`,
      }}
    >
      {value}
    </span>
  );
}

import { StatusBadge } from "@/components/StatusBadge";
import type { PhaseItem } from "@/components/ProjectPhasePlanManager";

function groupByPhase(items: PhaseItem[]) {
  const map = new Map<string, PhaseItem[]>();
  for (const item of items) {
    const key = item.phase_group || "Sin grupo";
    const current = map.get(key) ?? [];
    current.push(item);
    map.set(key, current);
  }
  return Array.from(map.entries());
}

function phaseToneByIndex(index: number) {
  const palette = [
    { bg: "rgba(37,99,235,.14)", border: "rgba(37,99,235,.55)", title: "#dbeafe" },
    { bg: "rgba(5,150,105,.14)", border: "rgba(5,150,105,.55)", title: "#d1fae5" },
    { bg: "rgba(217,119,6,.14)", border: "rgba(217,119,6,.55)", title: "#fef3c7" },
    { bg: "rgba(220,38,38,.14)", border: "rgba(220,38,38,.55)", title: "#fee2e2" },
    { bg: "rgba(124,58,237,.14)", border: "rgba(124,58,237,.55)", title: "#ede9fe" },
    { bg: "rgba(8,145,178,.14)", border: "rgba(8,145,178,.55)", title: "#cffafe" },
  ];
  return palette[index % palette.length];
}

export function ProjectPhaseTimeline({ items }: { items: PhaseItem[] }) {
  if (!items.length) {
    return <p style={{ margin: 0, color: "#b8c3d6" }}>Aun no hay subfases definidas para este proyecto.</p>;
  }

  const grouped = groupByPhase(items);

  return (
    <section style={{ display: "grid", gap: 12 }}>
      {grouped.map(([groupName, groupItems], groupIndex) => {
        const tone = phaseToneByIndex(groupIndex);
        return (
        <details key={groupName} className="card" style={{ padding: 12, background: tone.bg, border: `1px solid ${tone.border}` }} open>
          <summary
            style={{
              cursor: "pointer",
              listStyle: "none",
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: 0, color: tone.title }}>{groupName}</h3>
            <span style={{ fontSize: 12, color: "#b8c3d6" }}>{groupItems.length} subfases</span>
          </summary>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {groupItems.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 10,
                  padding: 10,
                  background: "rgba(15,20,27,.5)",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <p style={{ margin: 0, color: "#f1f5fb", fontWeight: 700 }}>{item.code} · {item.name}</p>
                  <StatusBadge value={item.status} />
                </div>
                <p style={{ margin: 0, color: "#b8c3d6" }}>Progreso: {item.progress}%</p>
                {item.deliverable ? <p style={{ margin: 0, color: "#d7deea" }}>Entregable: {item.deliverable}</p> : null}
                {item.client_note ? <p style={{ margin: 0, color: "#c6d1e3" }}>Nota: {item.client_note}</p> : null}
                <p style={{ margin: 0, color: "#93a2ba", fontSize: 12 }}>
                  Plan: {item.planned_start || "--"} a {item.planned_end || "--"} · Fin real: {item.actual_end || "--"}
                </p>
              </div>
            ))}
          </div>
        </details>
      );})}
    </section>
  );
}



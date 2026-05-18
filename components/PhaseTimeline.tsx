import { Phase } from "@/lib/types";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";

type Props = {
  phases: Phase[];
  selectedPhaseId?: string | null;
  onSelectPhase?: (phase: Phase) => void;
};

export function PhaseTimeline({ phases, selectedPhaseId, onSelectPhase }: Props) {
  if (!phases.length) {
    return <p style={{ margin: 0, color: "#9aa6b8", fontSize: 13 }}>Aun no hay fases.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {phases.map((phase) => {
        const isSelected = selectedPhaseId === phase.id;

        return (
          <button
            key={phase.id}
            type="button"
            onClick={() => onSelectPhase?.(phase)}
            style={{
              textAlign: "left",
              borderRadius: 12,
              padding: 12,
              border: isSelected ? "1px solid rgba(229,83,45,.65)" : "1px solid rgba(255,255,255,.1)",
              background: isSelected ? "rgba(229,83,45,.12)" : "rgba(255,255,255,.03)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 14 }}>{phase.order_index}. {phase.name}</strong>
              <StatusBadge value={phase.status} />
            </div>

            {phase.description ? (
              <p style={{ margin: "6px 0 10px", fontSize: 12, color: "#b4bfd0" }}>{phase.description}</p>
            ) : null}

            <ProgressBar value={phase.progress} tone={phase.status === "activa" ? "info" : "accent"} />
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#8fa0b7" }}>{phase.progress}%</p>
          </button>
        );
      })}
    </div>
  );
}

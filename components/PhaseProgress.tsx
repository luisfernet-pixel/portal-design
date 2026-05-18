import { Phase } from "@/lib/types";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";

type Props = {
  currentPhase: Phase | null;
  nextPhase: Phase | null;
};

export function PhaseProgress({ currentPhase, nextPhase }: Props) {
  if (!currentPhase) {
    return (
      <section
        style={{
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 14,
          padding: 14,
          background: "rgba(255,255,255,.03)",
        }}
      >
        <p style={{ margin: 0, color: "#9aa6b8" }}>Aun no hay fase activa.</p>
      </section>
    );
  }

  return (
    <section
      style={{
        border: "1px solid rgba(255,255,255,.12)",
        borderRadius: 14,
        padding: 14,
        background: "rgba(255,255,255,.03)",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{currentPhase.name}</h3>
        <StatusBadge value={currentPhase.status} />
      </div>

      {currentPhase.description ? (
        <p style={{ margin: 0, fontSize: 13, color: "#aab6c7" }}>{currentPhase.description}</p>
      ) : null}

      <ProgressBar value={currentPhase.progress} tone="info" />
      <p style={{ margin: 0, fontSize: 12, color: "#9db0c6" }}>Avance actual: {currentPhase.progress}%</p>

      <p style={{ margin: 0, fontSize: 12, color: "#9db0c6" }}>
        Proxima fase: {nextPhase ? nextPhase.name : "Sin fase siguiente"}
      </p>
    </section>
  );
}

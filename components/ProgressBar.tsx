export function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ width: "100%", background: "rgba(255,255,255,.10)", borderRadius: 999, height: 8 }}>
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: "100%",
          borderRadius: 999,
          background: "linear-gradient(90deg,#f1784f,#e5532d)",
        }}
      />
    </div>
  );
}

export function AppShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode; }) {
  return (
    <div className="app-shell">
      <header className="shell-head" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <span className="brand-chip">Portal Design</span>
          <h1 style={{ margin: "7px 0 3px", fontSize: 31, lineHeight: 0.98, color: "#f2f5fb" }}>{title}</h1>
          {subtitle ? <p style={{ margin: 0, color: "#a0a7b5", fontSize: 18, lineHeight: 1.08 }}>{subtitle}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}

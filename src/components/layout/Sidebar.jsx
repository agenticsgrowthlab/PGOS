import { T } from "../../lib/tokens";
import { useApp } from "../../contexts/AppContext";

export function Sidebar({ view, setView }) {
  const { initiatives } = useApp();
  const approved = initiatives.filter(i => i.approved).length;
  const total = initiatives.length;

  const active = (id) => view === id;
  const navBtn = (id, label, indent = false) => (
    <button key={id} onClick={() => setView(id)}
      style={{
        width: "100%", textAlign: "left",
        padding: indent ? "6px 16px 6px 24px" : "8px 16px",
        background: active(id) ? T.goldD : "transparent",
        border: "none",
        borderLeft: `3px solid ${active(id) ? T.gold : "transparent"}`,
        cursor: "pointer",
        display: "flex", alignItems: "center",
      }}>
      <span style={{
        fontSize: 12,
        fontWeight: active(id) ? 800 : 700,
        color: active(id) ? T.gold : T.white,
        letterSpacing: "0.01em",
      }}>{label}</span>
    </button>
  );

  const sep = (key) => (
    <div key={key} style={{ height: 1, background: T.border, margin: "6px 12px" }} />
  );

  const sectionLabel = (label) => (
    <div style={{ padding: "8px 16px 2px", fontSize: 9, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
      {label}
    </div>
  );

  return (
    <div style={{
      width: 220, background: T.ink2, borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", flexShrink: 0,
      position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: T.white, letterSpacing: "-0.03em" }}>
          <span style={{ color: T.gold }}>P</span>GOS
        </div>
        <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 1 }}>
          Product Growth OS
        </div>
      </div>

      {/* Stats */}
      <div style={{ fontSize: 11, color: T.muted, padding: "8px 16px 4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {approved} approved · {total} total
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "4px 0", overflow: "auto" }}>

        {navBtn("dashboard", "Dashboard")}
        {navBtn("foundation", "Foundation")}

        {sep("s1")}

        {/* Stage pipeline — compact */}
        <div style={{ padding: "4px 16px 2px", fontSize: 9, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Pipeline Stages
        </div>

        {navBtn("ideas",      "Stage 1 · Ideas")}
        {navBtn("discovery",  "Stage 2 · Discovery")}
        {navBtn("execreview", "Stage 3 · Exec Review")}
        {navBtn("portfolio",  "Stage 4 · Portfolio")}
        {navBtn("definition", "Stage 5 · Definition")}
        {navBtn("delivery",   "Stage 6 · Delivery")}
        {navBtn("handoff",    "Stage 7 · Handoff")}
        {navBtn("measure",    "Stage 8 · Measure")}
        {navBtn("outcome",    "Stage 9 · Outcome Summary")}

        {sep("s2")}

        {/* Chatty hint */}
        <div style={{ padding: "5px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: T.gold }}>◆</span>
          <span style={{ fontSize: 11, color: T.muted, fontStyle: "italic" }}>Chatty — bottom right ↘</span>
        </div>

        {sep("s3")}

        {sectionLabel("References")}
        {navBtn("ref_framework", "NCM PM Framework")}
        {navBtn("ref_guide",     "How To Use PGOS")}

      </nav>

      {/* Pipeline progress bar */}
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>Pipeline Progress</div>
        <div style={{ height: 3, background: T.ink3, borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${(approved / Math.max(total, 1)) * 100}%`,
            background: `linear-gradient(90deg,${T.steel},${T.gold})`,
            transition: "width 0.4s",
          }} />
        </div>
      </div>
    </div>
  );
}

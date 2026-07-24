import { T } from "../../lib/tokens";
import { useApp } from "../../contexts/AppContext";

const NAV = [
  ["dashboard",    "◎", "Dashboard"],
  ["foundation",   "⊞", "Foundation"],
  ["sep1"],
  ["ideas",        "◇", "Ideas  · Stage 1"],
  ["discovery",    "◈", "Discovery  · Stage 2"],
  ["execreview",   "▦", "Exec Review  · Stage 3"],
  ["portfolio",    "△", "Portfolio  · Stage 4"],
  ["definition",   "◉", "Definition  · Stage 5"],
  ["delivery",     "⊕", "Delivery  · Stage 6"],
  ["handoff",      "⊞", "Handoff  · Stage 7"],
  ["sep2"],
  ["chatty_note",  "◆", "Chatty (bottom right)"],
  ["sep3"],
  ["ref_framework","⊟", "Framework Deck"],
  ["ref_guide",    "⊘", "How To Use PGOS"],
];

export function Sidebar({ view, setView }) {
  const { initiatives } = useApp();

  const approved = initiatives.filter(i => i.approved).length;
  const total = initiatives.length;

  return (
    <div style={{ width: 220, background: T.ink2, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0, position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 50 }}>
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
      <div style={{ fontSize: 11, color: T.muted, padding: "10px 16px 4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {approved} approved · {total} total
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "4px 0", overflow: "auto" }}>
        {NAV.map((item, idx) => {
          if (item[0].startsWith("sep")) {
            return <div key={idx} style={{ height: 1, background: T.border, margin: "8px 12px" }} />;
          }
          const [id, icon, label] = item;
          const isActive = view === id;

          if (id === "chatty_note") {
            return (
              <div key={id} style={{ padding: "6px 16px", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: T.gold, fontSize: 13 }}>{icon}</span>
                <span style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>Chatty — bottom right ↘</span>
              </div>
            );
          }

          return (
            <button key={id} onClick={() => setView(id)}
              style={{ width: "100%", textAlign: "left", padding: "9px 16px", background: isActive ? T.goldD : "transparent", border: "none", borderLeft: `3px solid ${isActive ? T.gold : "transparent"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: isActive ? T.gold : T.muted }}>{icon}</span>
              <span style={{ fontSize: 13, color: isActive ? T.gold : T.muted, fontWeight: isActive ? 700 : 400 }}>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Pipeline progress bar */}
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>Pipeline Progress</div>
        <div style={{ height: 3, background: T.ink3, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(approved / Math.max(total, 1)) * 100}%`, background: `linear-gradient(90deg,${T.steel},${T.gold})`, transition: "width 0.4s" }} />
        </div>
      </div>
    </div>
  );
}

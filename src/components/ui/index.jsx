import { T, css } from "../../lib/tokens";

// ─── Tag ──────────────────────────────────────────────────────
export function Tag({ label, color, bg }) {
  return <span style={css.tag(color, bg)}>{label}</span>;
}

// ─── AIBox ────────────────────────────────────────────────────
export function AIBox({ label = "◆ AI Advisor", children, loading, color = T.gold }) {
  return (
    <div style={{ background: "rgba(212,168,67,0.05)", border: `1px solid rgba(212,168,67,0.2)`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "13px 16px", marginTop: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      {loading
        ? <span style={{ color: T.muted, fontStyle: "italic", fontSize: 13 }}>Generating…</span>
        : <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{children}</div>
      }
    </div>
  );
}

// ─── ScoreRing ────────────────────────────────────────────────
export function ScoreRing({ score, color, size = 60 }) {
  const r = size / 2 - 4, circ = 2 * Math.PI * r, dash = circ * (score / 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.ink3} strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.5s" }} />
    </svg>
  );
}

// ─── PivotSlider ──────────────────────────────────────────────
export function PivotSlider({ label, letter, value, onChange, color, weight }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: T.body }}><strong style={{ color }}>{letter}</strong> — {label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{value?.toFixed(1)} <span style={{ fontSize: 10, color: T.muted }}>({weight})</span></span>
      </div>
      <input type="range" min={0} max={10} step={0.1} value={value || 5}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: color, cursor: "pointer", margin: 0 }} />
    </div>
  );
}

// ─── LoadingScreen ────────────────────────────────────────────
export function LoadingScreen({ message = "Loading PGOS…" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: T.ink, flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 36, fontWeight: 900, color: T.white }}><span style={{ color: T.gold }}>P</span>GOS</div>
      <div style={{ fontSize: 13, color: T.muted }}>{message}</div>
      <div style={{ width: 40, height: 3, background: T.goldD, borderRadius: 2, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", height: "100%", width: "60%", background: T.gold, borderRadius: 2, animation: "slide 1.2s ease-in-out infinite" }} />
      </div>
      <style>{`@keyframes slide { 0%{left:-60%} 100%{left:100%} }`}</style>
    </div>
  );
}

// ─── ErrorScreen ──────────────────────────────────────────────
export function ErrorScreen({ message }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: T.ink, flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 20, color: T.red, fontWeight: 700 }}>⚠ Setup Required</div>
      <div style={{ fontSize: 13, color: T.muted, maxWidth: 420, textAlign: "center", lineHeight: 1.7 }}>{message}</div>
      <div style={{ fontSize: 12, color: T.body, marginTop: 8 }}>See <code style={{ color: T.gold }}>README.md</code> for setup instructions.</div>
    </div>
  );
}

// ─── AddNoteInput ────────────────────────────────────────────
export function AddNoteInput({ onAdd }) {
  const [author, setAuthor] = React.useState("");
  const [note, setNote] = React.useState("");
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <input style={{ ...css.input, width: 160 }} value={author} onChange={e => setAuthor(e.target.value)} placeholder="Name, Role" />
      <input style={{ ...css.input, flex: 1 }} value={note} onChange={e => setNote(e.target.value)}
        placeholder="Note from meeting or review…"
        onKeyDown={e => e.key === "Enter" && note && author && (onAdd(author, note), setAuthor(""), setNote(""))} />
      <button style={css.btnOut} onClick={() => { if (note && author) { onAdd(author, note); setAuthor(""); setNote(""); } }}>Add</button>
    </div>
  );
}

// Need React imported for AddNoteInput
import React from "react";

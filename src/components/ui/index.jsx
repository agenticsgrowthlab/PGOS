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

// ─── PIVOT Score Modal ─────────────────────────────────────────
import { calcPivot, pivotTier } from "../../lib/tokens";

export function PivotModal({ ini, onClose }) {
  const pivot = ini?.pivot || {};
  const score = calcPivot(pivot);
  const tier  = pivotTier(score);

  const dims = [
    { key: "p", label: "Potential",   weight: 0.25, color: T.gold  },
    { key: "i", label: "Innovation",  weight: 0.20, color: "#2E6DA4" },
    { key: "v", label: "Value",       weight: 0.15, color: "#22C55E" },
    { key: "o", label: "Opportunity", weight: 0.20, color: "#F59E0B" },
    { key: "t", label: "Timing",      weight: 0.20, color: "#EF4444" },
  ];

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#111827", border: `1px solid ${T.gold}40`, borderRadius: 14, padding: 28, width: 480, maxWidth: "90vw", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>PIVOT Score™ — How It's Calculated</div>
            <div style={{ fontSize: 12, color: "#6B7A99" }}>{ini?.title || "Initiative"}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6B7A99", fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>✕</button>
        </div>

        {/* Big score */}
        <div style={{ textAlign: "center", marginBottom: 20, padding: "16px 0", background: "#1C2640", borderRadius: 10, border: `1px solid ${tier.color}40` }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: tier.color, lineHeight: 1 }}>{score.toFixed(1)}</div>
          <div style={{ fontSize: 11, color: "#6B7A99", marginTop: 4 }}>out of 100</div>
          <div style={{ display: "inline-block", background: tier.bg || tier.color + "22", color: tier.color, border: `1px solid ${tier.color}`, borderRadius: 6, padding: "4px 14px", fontSize: 12, fontWeight: 800, marginTop: 10, letterSpacing: "0.06em" }}>{tier.label}</div>
        </div>

        {/* Formula */}
        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#6B7A99", background: "#243050", borderRadius: 6, padding: "8px 12px", marginBottom: 18, textAlign: "center" }}>
          (P×0.25 + I×0.20 + V×0.15 + O×0.20 + T×0.20) × 4 = Score
        </div>

        {/* Dimension rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {dims.map(d => {
            const raw = Number(pivot[d.key] || 0);
            const scaled = raw * 4;
            const weighted = scaled * d.weight;
            const barPct = (raw / 5) * 100;
            return (
              <div key={d.key} style={{ background: "#1C2640", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: d.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: d.color }}>{d.key.toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF" }}>{d.label}</div>
                      <div style={{ fontSize: 10, color: "#6B7A99" }}>{(d.weight * 100).toFixed(0)}% weight</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7A99", fontFamily: "monospace" }}>
                    {raw.toFixed(1)} × 4 = <span style={{ color: d.color }}>{scaled.toFixed(1)}</span>
                    {" × "}{(d.weight * 100).toFixed(0)}% = <span style={{ color: T.gold, fontWeight: 700 }}>{weighted.toFixed(2)}</span>
                  </div>
                </div>
                <div style={{ height: 4, background: "#243050", borderRadius: 2 }}>
                  <div style={{ height: 4, width: `${barPct}%`, background: d.color, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: tier.color + "18", border: `1px solid ${tier.color}40`, borderRadius: 8, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF" }}>Total Score</div>
          <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 900, color: tier.color }}>{score.toFixed(1)} / 100</div>
        </div>

        {/* Tier bands */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
          {[["80–100","COMMIT","#22C55E"],["60–79","CONSIDER","#F59E0B"],["40–59","DEFER","#6B7A99"],["0–39","KILL","#EF4444"]].map(([range, label, color]) => (
            <div key={label} style={{ textAlign: "center", background: tier.label === label ? color + "22" : "#1C2640", border: `2px solid ${tier.label === label ? color : color + "33"}`, borderRadius: 6, padding: "6px 8px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color }}>{label}</div>
              <div style={{ fontSize: 9, color: "#6B7A99", marginTop: 2 }}>{range}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
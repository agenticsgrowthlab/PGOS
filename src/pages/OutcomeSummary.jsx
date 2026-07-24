// src/pages/OutcomeSummary.jsx — Stage 9: Outcome Summary
// Executive narrative, OKR linkage, PIVOT predicted vs actual, lessons learned, next action

import { useState, useEffect, useCallback } from "react";
import { useApp } from "../contexts/AppContext";
import { updateInitiative, callAI } from "../lib/api";

const T = {
  bg:     "#0A0F1E",
  card:   "#111827",
  ink2:   "#1C2640",
  ink3:   "#243050",
  gold:   "#D4A843",
  loud:   "#F0F4FF",
  muted:  "#6B7A99",
  green:  "#22C55E",
  grnD:   "#14532D",
  red:    "#EF4444",
  redD:   "#7F1D1D",
  amber:  "#F59E0B",
};

const css = {
  page:    { color: T.loud, fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.5 },
  h2:      { fontSize: 22, fontWeight: 800, color: T.loud, marginBottom: 4 },
  sub:     { fontSize: 13, color: T.muted, marginBottom: 24 },
  card:    { background: T.card, border: "1px solid #1E2D4A", borderRadius: 10, padding: 20, marginBottom: 16 },
  secHead: { fontSize: 12, fontWeight: 700, color: T.gold, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 },
  label:   { fontSize: 12, color: T.muted, marginBottom: 4, display: "block" },
  input:   { background: T.ink2, border: "1px solid #2A3A5C", borderRadius: 6, padding: "8px 12px", color: T.loud, fontSize: 13, width: "100%", boxSizing: "border-box" },
  ta:      { background: T.ink2, border: "1px solid #2A3A5C", borderRadius: 6, padding: "8px 12px", color: T.loud, fontSize: 13, width: "100%", boxSizing: "border-box", resize: "vertical" },
  btnGold: { background: T.gold, color: "#0A0F1E", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13 },
  btnOut:  { background: "transparent", color: T.gold, border: `1px solid ${T.gold}`, borderRadius: 6, padding: "7px 14px", fontWeight: 600, cursor: "pointer", fontSize: 13 },
  btnGhost:{ background: T.ink2, color: T.loud, border: "none", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 13 },
};

const NEXT_ACTIONS = [
  { value: "iterate",  label: "Iterate",  desc: "Double down — keep improving, fix what's not working", color: T.amber },
  { value: "expand",   label: "Expand",   desc: "Scale it — roll out to more users, new markets, or new capabilities", color: T.green },
  { value: "sunset",   label: "Sunset",   desc: "Wind down — not delivering enough value to justify continued investment", color: T.red },
  { value: "archive",  label: "Archive",  desc: "Complete — shipped, targets met, no further work planned", color: T.muted },
];

function PivotCompare({ ini }) {
  const predictedTotal = ini.pivot
    ? Object.values(ini.pivot).reduce((a, b) => a + Number(b || 0), 0) * 4
    : null;

  // Rough "actual" composite from outcomes
  const adoptionScore = Math.min(5, (ini.adoption_rate || 0) / 8); // 40% = 5
  const npsScore = Math.min(5, ((ini.nps_score || 0) + 100) / 40); // NPS 100 = 5
  const bizScore = ini.target_met ? 5 : 2.5;
  const actualTotal = ((adoptionScore + npsScore + bizScore) / 3) * 20; // scale to ~100

  const delta = predictedTotal !== null ? actualTotal - predictedTotal : null;
  const deltaColor = delta === null ? T.muted : delta >= 0 ? T.green : T.red;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
      <div style={{ background: T.ink2, borderRadius: 8, padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>PIVOT™ Predicted</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: T.gold }}>{predictedTotal !== null ? predictedTotal.toFixed(0) : "—"}</div>
        <div style={{ fontSize: 11, color: T.muted }}>/ 100 pre-investment</div>
      </div>
      <div style={{ background: T.ink2, borderRadius: 8, padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Actual Outcome Score</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: T.loud }}>{actualTotal.toFixed(0)}</div>
        <div style={{ fontSize: 11, color: T.muted }}>/ 100 post-launch composite</div>
      </div>
      <div style={{ background: T.ink2, borderRadius: 8, padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Prediction Accuracy</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: deltaColor }}>
          {delta !== null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}` : "—"}
        </div>
        <div style={{ fontSize: 11, color: T.muted }}>vs prediction</div>
      </div>
    </div>
  );
}

function OKRLinkage({ ini, okrs }) {
  const okr = (okrs || []).find(o => o.id === ini.okr_id);
  if (!okr) return (
    <div style={{ color: T.muted, fontSize: 13 }}>No OKR linked to this initiative.</div>
  );

  const outcomeStrength = ini.target_met ? "strong" : (ini.adoption_rate || 0) >= 20 ? "partial" : "weak";
  const statusColor = outcomeStrength === "strong" ? T.green : outcomeStrength === "partial" ? T.amber : T.red;
  const statusLabel = outcomeStrength === "strong" ? "✓ Achieved" : outcomeStrength === "partial" ? "◑ Partially Achieved" : "✗ Below Target";

  return (
    <div style={{ background: T.ink2, borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: T.loud, marginBottom: 4 }}>{okr.objective || okr.title}</div>
          {okr.description && <div style={{ fontSize: 13, color: T.muted }}>{okr.description}</div>}
        </div>
        <div style={{ background: statusColor + "22", color: statusColor, border: `1px solid ${statusColor}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
          {statusLabel}
        </div>
      </div>
    </div>
  );
}

export default function OutcomeSummary() {
  const { initiatives = [], okrs = [], refreshInitiatives } = useApp();
  const [selId, setSelId] = useState("");
  const [aiNarrative, setAiNarrative] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const ini = initiatives.find(i => i.id === selId) || null;

  useEffect(() => {
    if (initiatives.length && !selId) {
      const withData = (initiatives || []).find(i => i.launch_date || i.adoption_rate);
      setSelId(withData?.id || initiatives[0]?.id || "");
    }
  }, [initiatives]);

  const save = useCallback(async (fields) => {
    if (!ini) return;
    setSaving(true);
    try {
      await updateInitiative({ id: ini.id, ...fields });
      await refreshInitiatives();
    } finally {
      setSaving(false);
    }
  }, [ini, refreshInitiatives]);

  const runAI = async () => {
    if (!ini) return;
    setAiLoading(true);
    setAiNarrative("");
    try {
      const okr = (okrs || []).find(o => o.id === ini.okr_id) || null;
      const res = await callAI("outcome_summary", { ini, okr });
      const narrative = res?.data || "No narrative returned.";
      setAiNarrative(narrative);
      // Auto-save to initiative
      await save({ outcome_summary: narrative });
    } catch (e) {
      setAiNarrative("Error: " + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={css.page}>
      <div style={css.h2}>Stage 9 — Outcome Summary</div>
      <div style={css.sub}>The full story — from idea to outcome. Did we win? What did we learn? What's next?</div>

      {/* Initiative Selector */}
      <div style={css.card}>
        <label style={css.label}>Select Initiative</label>
        <select style={{ ...css.input, maxWidth: 500 }} value={selId} onChange={e => { setSelId(e.target.value); setAiNarrative(""); }}>
          <option value="">— Select an initiative —</option>
          {initiatives.map(i => (
            <option key={i.id} value={i.id}>{i.slug} · {i.title}</option>
          ))}
        </select>
      </div>

      {ini && (
        <>
          {/* PIVOT Predicted vs Actual */}
          <div style={css.card}>
            <div style={css.secHead}>PIVOT™ Predicted vs Actual Outcome</div>
            <PivotCompare ini={ini} />
            <div style={{ fontSize: 12, color: T.muted, marginTop: 10 }}>
              Actual score is a composite of adoption rate, NPS, and target achievement. A positive delta means the initiative outperformed its pre-investment prediction.
            </div>
          </div>

          {/* OKR Linkage */}
          <div style={css.card}>
            <div style={css.secHead}>OKR Achievement</div>
            <OKRLinkage ini={ini} okrs={okrs} />
          </div>

          {/* Final Outcomes Recap */}
          <div style={css.card}>
            <div style={css.secHead}>Final Outcome Metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {[
                ["Adoption Rate", `${ini.adoption_rate || 0}%`, ini.adoption_rate >= 40 ? T.green : ini.adoption_rate >= 20 ? T.amber : T.red],
                ["Monthly Active Users", Number(ini.monthly_active_users||0).toLocaleString(), T.loud],
                ["NPS Score", ini.nps_score || 0, ini.nps_score >= 40 ? T.green : ini.nps_score >= 20 ? T.amber : T.red],
                ["CSAT", `${ini.csat_score || 0}/5.0`, ini.csat_score >= 4 ? T.green : ini.csat_score >= 3 ? T.amber : T.red],
                ["Call Deflection", `${ini.call_deflection_pct || 0}%`, T.loud],
                ["Revenue Realized", `$${Number(ini.revenue_realized||0).toLocaleString()}`, T.loud],
                ["Cost Savings", `$${Number(ini.cost_savings_realized||0).toLocaleString()}`, T.loud],
                ["Target Met", ini.target_met ? "YES ✓" : "NOT YET", ini.target_met ? T.green : T.amber],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: T.ink2, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: T.muted }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Lessons Learned */}
          <div style={css.card}>
            <div style={css.secHead}>Lessons Learned</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>
              What would we do differently? What should every PM on the next initiative know?
            </div>
            <textarea rows={6} style={css.ta}
              defaultValue={ini.lessons_learned || ""}
              placeholder={`1. What we'd do differently...\n2. What surprised us...\n3. What we'd tell the next team...`}
              onBlur={e => save({ lessons_learned: e.target.value })}
            />
          </div>

          {/* Next Action */}
          <div style={css.card}>
            <div style={css.secHead}>What's Next?</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {NEXT_ACTIONS.map(({ value, label, desc, color }) => {
                const active = ini.next_action === value;
                return (
                  <div key={value}
                    onClick={() => save({ next_action: value })}
                    style={{
                      background: active ? color + "22" : T.ink2,
                      border: `2px solid ${active ? color : T.ink3}`,
                      borderRadius: 10,
                      padding: 14,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}>
                    <div style={{ fontWeight: 700, color: active ? color : T.loud, marginBottom: 4, fontSize: 15 }}>{label}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>{desc}</div>
                  </div>
                );
              })}
            </div>
            {saving && <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>Saving…</div>}
          </div>

          {/* AI Executive Narrative */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button style={css.btnGold} onClick={runAI} disabled={aiLoading}>
              {aiLoading ? "Writing Narrative…" : "◆ Generate Executive Outcome Narrative"}
            </button>
            {(aiNarrative || ini.outcome_summary) && (
              <button style={css.btnGhost} onClick={() => navigator.clipboard.writeText(aiNarrative || ini.outcome_summary)}>Copy</button>
            )}
          </div>

          {aiLoading && (
            <div style={{ ...css.card, border: `1px solid ${T.gold}40`, background: "#0D1726" }}>
              <div style={{ ...css.secHead, marginBottom: 8 }}>◆ Outcome Summary Advisor</div>
              <div style={{ color: T.muted, fontSize: 13 }}>Writing your executive narrative…</div>
            </div>
          )}

          {(aiNarrative || ini.outcome_summary) && !aiLoading && (
            <div style={{ ...css.card, border: `1px solid ${T.gold}40`, background: "#0D1726" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={css.secHead}>◆ Executive Outcome Narrative</div>
                <button style={css.btnGhost} onClick={runAI} disabled={aiLoading}>↻ Regenerate</button>
              </div>
              <pre style={{ color: T.loud, fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>
                {aiNarrative || ini.outcome_summary}
              </pre>
            </div>
          )}

          {/* Editable Outcome Summary (manual override) */}
          <div style={css.card}>
            <div style={css.secHead}>Outcome Summary (Editable)</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>Override or refine the AI narrative. This is what goes into your PPT.</div>
            <textarea rows={10} style={css.ta}
              key={ini.id}
              defaultValue={ini.outcome_summary || ""}
              placeholder="Paste or write your executive outcome narrative here…"
              onBlur={e => save({ outcome_summary: e.target.value })}
            />
          </div>
        </>
      )}
    </div>
  );
}
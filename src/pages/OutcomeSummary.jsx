// src/pages/OutcomeSummary.jsx — Stage 11: Outcome Summary

import { useState, useEffect, useCallback } from "react";
import { useApp } from "../contexts/AppContext";
import { updateInitiative, callAI } from "../lib/api";

const T = {
  bg:    "#0A0F1E",
  card:  "#111827",
  ink2:  "#1C2640",
  ink3:  "#243050",
  gold:  "#D4A843",
  steel: "#2E6DA4",
  loud:  "#F0F4FF",
  muted: "#6B7A99",
  green: "#22C55E",
  red:   "#EF4444",
  amber: "#F59E0B",
  border:"#1E2D4A",
};

const css = {
  page:    { color: T.loud, fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.5 },
  h2:      { fontSize: 22, fontWeight: 800, color: T.loud, marginBottom: 4 },
  sub:     { fontSize: 13, color: T.muted, marginBottom: 24 },
  card:    { background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 20, marginBottom: 16 },
  secHead: { fontSize: 11, fontWeight: 700, color: T.gold, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 14 },
  label:   { fontSize: 11, color: T.muted, marginBottom: 4, display: "block" },
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

// ─── PIVOT Predicted vs Actual ────────────────────────────────
function PivotCompare({ ini }) {
  const predictedTotal = ini.pivot
    ? Object.values(ini.pivot).reduce((a, b) => a + Number(b || 0), 0) * 4
    : null;

  const adoptionScore = Math.min(5, (Number(ini.adoption_rate) || 0) / 8);
  const npsScore      = Math.min(5, ((Number(ini.nps_score) || 0) + 100) / 40);
  const bizScore      = ini.target_met ? 5 : (Number(ini.adoption_rate) || 0) >= 20 ? 3 : 1.5;
  const actualTotal   = ((adoptionScore + npsScore + bizScore) / 3) * 20;

  const hasActuals = !!(ini.adoption_rate || ini.nps_score || ini.target_met);
  const delta = (predictedTotal !== null && hasActuals) ? actualTotal - predictedTotal : null;
  const deltaColor = delta === null ? T.muted : delta >= 0 ? T.green : T.red;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
      {[
        ["PIVOT™ Predicted", predictedTotal !== null ? predictedTotal.toFixed(0) : "—", T.gold, "/ 100 pre-investment"],
        ["Actual Outcome Score", hasActuals ? actualTotal.toFixed(0) : "—", T.loud, "/ 100 post-launch composite"],
        ["Prediction Accuracy", delta !== null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}` : "—", deltaColor, "vs prediction"],
      ].map(([label, value, color, sub]) => (
        <div key={label} style={{ background: T.ink2, borderRadius: 8, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 900, color }}>{value}</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── OKR Linkage — reads from foundation.okrs ─────────────────
function OKRLinkage({ ini, okrs }) {
  // Match by id (number or string) defensively
  const okr = (okrs || []).find(o =>
    String(o.id) === String(ini.okr_id) ||
    o.id === ini.okr_id
  );

  if (!okr) {
    return (
      <div style={{ color: T.muted, fontSize: 13 }}>
        {ini.okr_id
          ? `OKR id "${ini.okr_id}" not found in foundation. Check the OKR is still active.`
          : "No OKR linked. Go to Initiative Detail and select the OKR this initiative supports."}
      </div>
    );
  }

  const adoptionPct = Number(ini.adoption_rate) || 0;
  const outcomeStrength = ini.target_met ? "strong" : adoptionPct >= 20 ? "partial" : "weak";
  const statusColor = outcomeStrength === "strong" ? T.green : outcomeStrength === "partial" ? T.amber : T.red;
  const statusLabel = outcomeStrength === "strong" ? "✓ Achieved" : outcomeStrength === "partial" ? "◑ Partially Achieved" : "✗ Below Target";

  return (
    <div style={{ background: T.ink2, borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: T.loud, marginBottom: 4 }}>
            {okr.objective || okr.title || "Untitled OKR"}
          </div>
          {okr.description && (
            <div style={{ fontSize: 13, color: T.muted }}>{okr.description}</div>
          )}
          {okr.keyResults?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: T.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Key Results</div>
              {okr.keyResults.map((kr, i) => (
                <div key={i} style={{ fontSize: 12, color: T.muted, padding: "3px 0", borderBottom: `1px solid ${T.ink3}` }}>
                  {typeof kr === "string" ? kr : kr.text || kr.description || JSON.stringify(kr)}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ background: statusColor + "22", color: statusColor, border: `1px solid ${statusColor}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
          {statusLabel}
        </div>
      </div>
    </div>
  );
}

// ─── Editable metric field ────────────────────────────────────
function MetricInput({ label, value, field, type = "number", placeholder, prefix, suffix, onSave }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => setLocal(value ?? ""), [value]);

  return (
    <div>
      <label style={css.label}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {prefix && <span style={{ color: T.muted, fontSize: 13 }}>{prefix}</span>}
        <input
          type={type === "number" ? "number" : "text"}
          style={{ ...css.input, maxWidth: 160 }}
          value={local}
          placeholder={placeholder || "0"}
          onChange={e => setLocal(e.target.value)}
          onBlur={() => {
            const parsed = type === "number" ? (local === "" ? null : Number(local)) : local;
            onSave({ [field]: parsed });
          }}
        />
        {suffix && <span style={{ color: T.muted, fontSize: 13 }}>{suffix}</span>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function OutcomeSummary() {
  const { initiatives = [], foundation, refreshInitiatives } = useApp();

  // ✅ FIX: okrs live under foundation, not context root
  const okrs = foundation?.okrs || [];

  const [selId, setSelId]     = useState("");
  const [aiNarrative, setAiNarrative] = useState("");
  const [aiLoading, setAiLoading]     = useState(false);
  const [saving, setSaving]   = useState(false);

  const ini = initiatives.find(i => String(i.id) === String(selId)) || null;

  useEffect(() => {
    if (initiatives.length && !selId) {
      const withData = initiatives.find(i => i.launch_date || i.adoption_rate);
      setSelId(String(withData?.id || initiatives[0]?.id || ""));
    }
  }, [initiatives]);

  // Restore saved narrative when initiative changes
  useEffect(() => {
    setAiNarrative("");
  }, [selId]);

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
      const okr = okrs.find(o => String(o.id) === String(ini.okr_id)) || null;
      const res  = await callAI("outcome_summary", { ini, okr });
      const narrative = typeof res === "string" ? res : res?.data || res?.text || "No narrative returned.";
      setAiNarrative(narrative);
      await save({ outcome_summary: narrative });
    } catch (e) {
      setAiNarrative("Error: " + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Metric color helper
  const scoreColor = (val, goodThreshold, warnThreshold) => {
    const n = Number(val) || 0;
    if (n === 0) return T.muted;
    return n >= goodThreshold ? T.green : n >= warnThreshold ? T.amber : T.red;
  };

  return (
    <div style={css.page}>
      <div style={css.h2}>Outcome Summary · Stage 11</div>
      <div style={css.sub}>The full story — from idea to outcome. Enter actuals, review OKR achievement, and generate your executive narrative.</div>

      {/* Initiative Selector */}
      <div style={css.card}>
        <label style={css.label}>Select Initiative</label>
        <select style={{ ...css.input, maxWidth: 500 }} value={selId}
          onChange={e => { setSelId(e.target.value); setAiNarrative(""); }}>
          <option value="">— Select an initiative —</option>
          {initiatives.map(i => (
            <option key={i.id} value={String(i.id)}>{i.slug} · {i.title}</option>
          ))}
        </select>
      </div>

      {ini && (
        <>
          {/* OKR Linkage */}
          <div style={css.card}>
            <div style={css.secHead}>OKR Achievement</div>
            <OKRLinkage ini={ini} okrs={okrs} />
          </div>

          {/* Final Outcome Metrics — EDITABLE */}
          <div style={css.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={css.secHead} style={{ marginBottom: 0 }}>Final Outcome Metrics</div>
              {saving && <div style={{ fontSize: 11, color: T.muted }}>Saving…</div>}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
              Enter actuals post-launch. These drive the PIVOT™ comparison and executive narrative.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
              <MetricInput label="Launch Date" field="launch_date" type="date"
                value={ini.launch_date || ""} onSave={save}
                placeholder="YYYY-MM-DD" />
              <MetricInput label="Adoption Rate (%)" field="adoption_rate" type="number"
                value={ini.adoption_rate ?? ""} suffix="%" onSave={save}
                placeholder="e.g. 42" />
              <MetricInput label="Monthly Active Users" field="monthly_active_users" type="number"
                value={ini.monthly_active_users ?? ""} onSave={save}
                placeholder="e.g. 12500" />
              <MetricInput label="NPS Score" field="nps_score" type="number"
                value={ini.nps_score ?? ""} onSave={save}
                placeholder="e.g. 45 (-100 to 100)" />
              <MetricInput label="CSAT Score" field="csat_score" type="number"
                value={ini.csat_score ?? ""} suffix="/ 5.0" onSave={save}
                placeholder="e.g. 4.2" />
              <MetricInput label="Call Deflection (%)" field="call_deflection_pct" type="number"
                value={ini.call_deflection_pct ?? ""} suffix="%" onSave={save}
                placeholder="e.g. 18" />
              <MetricInput label="Revenue Realized ($)" field="revenue_realized" type="number"
                value={ini.revenue_realized ?? ""} prefix="$" onSave={save}
                placeholder="e.g. 250000" />
              <MetricInput label="Cost Savings ($)" field="cost_savings_realized" type="number"
                value={ini.cost_savings_realized ?? ""} prefix="$" onSave={save}
                placeholder="e.g. 180000" />
            </div>

            {/* Target Met toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: T.ink2, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: T.loud, fontSize: 13 }}>Primary Target Met</div>
                <div style={{ fontSize: 11, color: T.muted }}>Did this initiative hit its stated success metric?</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["YES ✓", true, T.green], ["NOT YET", false, T.amber]].map(([label, val, color]) => (
                  <button key={label}
                    onClick={() => save({ target_met: val })}
                    style={{
                      background: ini.target_met === val ? color + "22" : "transparent",
                      border: `2px solid ${ini.target_met === val ? color : T.ink3}`,
                      color: ini.target_met === val ? color : T.muted,
                      borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Read-only score summary */}
            {(ini.adoption_rate || ini.nps_score || ini.csat_score) ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                {[
                  ["Adoption", `${ini.adoption_rate || 0}%`, scoreColor(ini.adoption_rate, 40, 20)],
                  ["MAU", Number(ini.monthly_active_users || 0).toLocaleString(), T.loud],
                  ["NPS", ini.nps_score ?? "—", scoreColor(ini.nps_score, 40, 0)],
                  ["CSAT", ini.csat_score ? `${ini.csat_score}/5.0` : "—", scoreColor(ini.csat_score, 4, 3)],
                  ["Revenue", ini.revenue_realized ? `$${Number(ini.revenue_realized).toLocaleString()}` : "—", T.loud],
                  ["Savings", ini.cost_savings_realized ? `$${Number(ini.cost_savings_realized).toLocaleString()}` : "—", T.loud],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ background: T.ink3, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: T.muted, fontSize: 12, fontStyle: "italic" }}>
                Enter metrics above — they'll appear as a summary here once saved.
              </div>
            )}
          </div>

          {/* PIVOT Predicted vs Actual */}
          <div style={css.card}>
            <div style={css.secHead}>PIVOT™ Predicted vs Actual</div>
            <PivotCompare ini={ini} />
            <div style={{ fontSize: 12, color: T.muted, marginTop: 10 }}>
              Actual score is a composite of adoption rate, NPS, and target achievement.
              A positive delta means the initiative outperformed its pre-investment prediction.
            </div>
          </div>

          {/* Lessons Learned */}
          <div style={css.card}>
            <div style={css.secHead}>Lessons Learned</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>
              What would we do differently? What should every PM on the next initiative know?
            </div>
            <textarea rows={6} style={css.ta}
              key={`lessons-${ini.id}`}
              defaultValue={ini.lessons_learned || ""}
              placeholder={`1. What we'd do differently…\n2. What surprised us…\n3. What we'd tell the next team…`}
              onBlur={e => save({ lessons_learned: e.target.value })}
            />
          </div>

          {/* What's Next */}
          <div style={css.card}>
            <div style={css.secHead}>What's Next?</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {NEXT_ACTIONS.map(({ value, label, desc, color }) => {
                const active = ini.next_action === value;
                return (
                  <div key={value} onClick={() => save({ next_action: value })}
                    style={{ background: active ? color + "22" : T.ink2, border: `2px solid ${active ? color : T.ink3}`,
                      borderRadius: 10, padding: 14, cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ fontWeight: 700, color: active ? color : T.loud, marginBottom: 4, fontSize: 15 }}>{label}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>{desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Executive Narrative */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button style={css.btnGold} onClick={runAI} disabled={aiLoading}>
              {aiLoading ? "Writing Narrative…" : "◆ Generate Executive Outcome Narrative"}
            </button>
            {(aiNarrative || ini.outcome_summary) && (
              <button style={css.btnGhost}
                onClick={() => navigator.clipboard.writeText(aiNarrative || ini.outcome_summary || "")}>
                Copy
              </button>
            )}
          </div>

          {aiLoading && (
            <div style={{ ...css.card, border: `1px solid ${T.gold}40`, background: "#0D1726" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.gold, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 8 }}>◆ Outcome Summary Advisor</div>
              <div style={{ color: T.muted, fontSize: 13 }}>Writing your executive narrative…</div>
            </div>
          )}

          {(aiNarrative || ini.outcome_summary) && !aiLoading && (
            <div style={{ ...css.card, border: `1px solid ${T.gold}40`, background: "#0D1726" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.gold, letterSpacing: "0.09em", textTransform: "uppercase" }}>◆ Executive Outcome Narrative</div>
                <button style={css.btnGhost} onClick={runAI} disabled={aiLoading}>↻ Regenerate</button>
              </div>
              <div style={{ color: T.loud, fontSize: 13, lineHeight: 1.8 }}>
                {(aiNarrative || ini.outcome_summary || "").split("\n").map((line, i) => {
                  const clean = line.replace(/\*\*(.*?)\*\*/g, "$1").trim();
                  if (!clean || clean.match(/^-{3,}$/)) return null;
                  if (line.match(/^##\s/)) return <div key={i} style={{ fontSize: 11, fontWeight: 800, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 14, marginBottom: 4 }}>{clean.replace(/^#+\s*/, "")}</div>;
                  if (line.match(/^###\s/)) return <div key={i} style={{ fontSize: 13, fontWeight: 700, color: T.loud, marginTop: 10, marginBottom: 4 }}>{clean.replace(/^#+\s*/, "")}</div>;
                  if (line.match(/^[-*]\s/)) return <div key={i} style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, paddingLeft: 12, marginBottom: 2 }}>▪ {clean.replace(/^[-*]\s/, "")}</div>;
                  return <div key={i} style={{ fontSize: 13, color: T.loud, lineHeight: 1.8, marginBottom: 4 }}>{clean}</div>;
                }).filter(Boolean)}
              </div>
            </div>
          )}

          {/* Manual override */}
          <div style={css.card}>
            <div style={css.secHead}>Outcome Summary — Manual Edit</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>Override or refine the AI narrative. This is what goes into your PPT export.</div>
            <textarea rows={10} style={css.ta}
              key={`summary-${ini.id}`}
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
// src/pages/Measure.jsx — Stage 8: Measure
// Adoption metrics, customer feedback, business outcomes, time-series sparklines

import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { updateInitiative, listMetrics, createMetric, deleteMetric } from "../lib/api";
import { callAI } from "../lib/api";

const T = {
  bg:     "#0A0F1E",
  card:   "#111827",
  ink2:   "#1C2640",
  ink3:   "#243050",
  gold:   "#D4A843",
  goldD:  "#B8903A",
  loud:   "#F0F4FF",
  muted:  "#6B7A99",
  blue:   "#3B82F6",
  green:  "#22C55E",
  grnD:   "#14532D",
  red:    "#EF4444",
  redD:   "#7F1D1D",
  amber:  "#F59E0B",
  amberD: "#78350F",
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
  btnGhost:{ background: T.ink3, color: T.loud, border: "none", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 13 },
  btnDanger: { background: "transparent", color: T.red, border: `1px solid ${T.red}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 },
};

function KPICard({ label, value, unit = "", status, note }) {
  const statusColor = status === "good" ? T.green : status === "warn" ? T.amber : status === "bad" ? T.red : T.muted;
  return (
    <div style={{ ...css.card, marginBottom: 0, textAlign: "center" }}>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: statusColor }}>{value}<span style={{ fontSize: 14, fontWeight: 400, color: T.muted }}>{unit}</span></div>
      {note && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{note}</div>}
    </div>
  );
}

function Sparkline({ data, width = 180, height = 40 }) {
  if (!data || data.length < 2) return <div style={{ color: T.muted, fontSize: 12 }}>Not enough data</div>;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={T.gold} strokeWidth="2" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 6) - 3;
        return <circle key={i} cx={x} cy={y} r="2.5" fill={T.gold} />;
      })}
    </svg>
  );
}

function AIBox({ label, text, loading }) {
  return (
    <div style={{ ...css.card, border: `1px solid ${T.gold}40`, background: "#0D1726" }}>
      <div style={{ ...css.secHead, marginBottom: loading ? 8 : 12 }}>{label}</div>
      {loading
        ? <div style={{ color: T.muted, fontSize: 13 }}>◆ Analyzing metrics…</div>
        : <pre style={{ color: T.loud, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{text}</pre>
      }
    </div>
  );
}

export default function Measure() {
  const { initiatives, okrs, orgId, refreshInitiatives } = useApp();
  const [selId, setSelId] = useState("");
  const [metrics, setMetrics] = useState([]);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verbatimInput, setVerbatimInput] = useState("");
  const [newMetricDate, setNewMetricDate] = useState("");
  const [newMetricMAU, setNewMetricMAU] = useState("");
  const [newMetricDAU, setNewMetricDAU] = useState("");
  const [newMetricAdoption, setNewMetricAdoption] = useState("");
  const [newMetricNPS, setNewMetricNPS] = useState("");
  const [newMetricCSAT, setNewMetricCSAT] = useState("");
  const [newMetricCalls, setNewMetricCalls] = useState("");
  const [addingMetric, setAddingMetric] = useState(false);

  const ini = initiatives.find(i => i.id === selId) || null;

  // Load metrics when initiative changes
  useEffect(() => {
    if (!selId) return;
    listMetrics(selId).then(r => setMetrics(r?.data || [])).catch(() => setMetrics([]));
    setAiText("");
  }, [selId]);

  // Auto-select first initiative with launch data
  useEffect(() => {
    if (initiatives.length && !selId) {
      const withLaunch = initiatives.find(i => i.launch_date);
      setSelId(withLaunch?.id || initiatives[0]?.id || "");
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
    setAiText("");
    try {
      const res = await callAI("measure_insights", { ini, metrics });
      setAiText(res?.data || "No insights returned.");
    } catch (e) {
      setAiText("Error: " + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const addVerbatim = async () => {
    const v = verbatimInput.trim();
    if (!v || !ini) return;
    const updated = [...(ini.key_verbatims || []), v];
    await save({ key_verbatims: updated });
    setVerbatimInput("");
  };

  const removeVerbatim = async (idx) => {
    const updated = (ini.key_verbatims || []).filter((_, i) => i !== idx);
    await save({ key_verbatims: updated });
  };

  const addMetricRow = async () => {
    if (!selId || !newMetricDate) return;
    setAddingMetric(true);
    try {
      await createMetric({
        initiative_id: selId,
        metric_date: newMetricDate,
        mau: Number(newMetricMAU) || 0,
        dau: Number(newMetricDAU) || 0,
        adoption_rate: Number(newMetricAdoption) || 0,
        nps: Number(newMetricNPS) || 0,
        csat: Number(newMetricCSAT) || 0,
        calls_deflected: Number(newMetricCalls) || 0,
      });
      const r = await listMetrics(selId);
      setMetrics(r?.data || []);
      setNewMetricDate(""); setNewMetricMAU(""); setNewMetricDAU("");
      setNewMetricAdoption(""); setNewMetricNPS(""); setNewMetricCSAT(""); setNewMetricCalls("");
    } finally {
      setAddingMetric(false);
    }
  };

  const removeMetric = async (id) => {
    await deleteMetric(id);
    setMetrics(m => m.filter(x => x.id !== id));
  };

  // Compute NPS status
  const npsStatus = !ini ? null : ini.nps_score >= 40 ? "good" : ini.nps_score >= 20 ? "warn" : "bad";
  const adoptionStatus = !ini ? null : ini.adoption_rate >= 40 ? "good" : ini.adoption_rate >= 20 ? "warn" : "bad";
  const csatStatus = !ini ? null : ini.csat_score >= 4 ? "good" : ini.csat_score >= 3 ? "warn" : "bad";

  return (
    <div style={css.page}>
      <div style={css.h2}>Stage 8 — Measure</div>
      <div style={css.sub}>Post-launch adoption, customer feedback, and business outcomes. All data is editable and syncs to your initiative record.</div>

      {/* Initiative Selector */}
      <div style={css.card}>
        <label style={css.label}>Select Initiative</label>
        <select style={{ ...css.input, maxWidth: 500 }} value={selId} onChange={e => setSelId(e.target.value)}>
          <option value="">— Select an initiative —</option>
          {initiatives.map(i => (
            <option key={i.id} value={i.id}>
              {i.slug} · {i.title} {i.launch_date ? `(Launched ${i.launch_date})` : "(Pre-launch)"}
            </option>
          ))}
        </select>
      </div>

      {ini && (
        <>
          {/* Launch Date + Target Met */}
          <div style={css.card}>
            <div style={css.secHead}>Launch Details</div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={css.label}>Launch Date</label>
                <input type="date" style={{ ...css.input, maxWidth: 200 }} value={ini.launch_date || ""} onChange={e => save({ launch_date: e.target.value })} />
              </div>
              <div>
                <label style={css.label}>Target Met?</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[true, false].map(v => (
                    <button key={String(v)} style={{
                      ...css.btnOut,
                      background: ini.target_met === v ? (v ? T.green : T.red) : "transparent",
                      color: ini.target_met === v ? "#fff" : (v ? T.green : T.red),
                      border: `1px solid ${v ? T.green : T.red}`,
                    }} onClick={() => save({ target_met: v })}>
                      {v ? "✓ Yes" : "✗ Not Yet"}
                    </button>
                  ))}
                </div>
              </div>
              {saving && <div style={{ color: T.muted, fontSize: 12 }}>Saving…</div>}
            </div>
          </div>

          {/* KPI Cards */}
          <div style={css.secHead}>Adoption & Engagement KPIs</div>
          <div style={css.kpiGrid}>
            <KPICard label="Adoption Rate" value={ini.adoption_rate || 0} unit="%" status={adoptionStatus} note="Target: 40%" />
            <KPICard label="Monthly Active" value={Number(ini.monthly_active_users||0).toLocaleString()} status="neutral" note="MAU" />
            <KPICard label="Daily Active" value={Number(ini.daily_active_users||0).toLocaleString()} status="neutral" note="DAU" />
            <KPICard label="Feature Utilization" value={ini.feature_utilization || 0} unit="%" status={ini.feature_utilization >= 60 ? "good" : ini.feature_utilization >= 30 ? "warn" : "bad"} note="of users using core feature" />
            <KPICard label="NPS Score" value={ini.nps_score || 0} status={npsStatus} note="Industry avg: 22" />
            <KPICard label="CSAT" value={ini.csat_score || 0} unit="/5.0" status={csatStatus} note={`${ini.survey_responses || 0} responses`} />
          </div>

          {/* Editable KPI Fields */}
          <div style={css.card}>
            <div style={css.secHead}>Edit Adoption Metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              {[
                ["Adoption Rate (%)", "adoption_rate", "number"],
                ["Monthly Active Users", "monthly_active_users", "number"],
                ["Daily Active Users", "daily_active_users", "number"],
                ["Feature Utilization (%)", "feature_utilization", "number"],
              ].map(([label, field, type]) => (
                <div key={field}>
                  <label style={css.label}>{label}</label>
                  <input type={type} style={css.input} defaultValue={ini[field] || ""} onBlur={e => save({ [field]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          {/* Customer Feedback */}
          <div style={css.card}>
            <div style={css.secHead}>Customer Feedback</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
              {[
                ["NPS Score (-100 to 100)", "nps_score"],
                ["CSAT Score (0-5)", "csat_score"],
                ["Survey Responses", "survey_responses"],
                ["Call Deflection (%)", "call_deflection_pct"],
              ].map(([label, field]) => (
                <div key={field}>
                  <label style={css.label}>{label}</label>
                  <input type="number" style={css.input} defaultValue={ini[field] || ""} onBlur={e => save({ [field]: e.target.value })} />
                </div>
              ))}
            </div>

            {/* Verbatims */}
            <div style={{ ...css.secHead, marginTop: 4 }}>Key Customer Verbatims</div>
            <div style={{ marginBottom: 10 }}>
              {(ini.key_verbatims || []).map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, background: T.ink2, borderRadius: 6, padding: "8px 12px", fontSize: 13, color: T.loud, borderLeft: `3px solid ${T.gold}`, lineHeight: 1.5 }}>
                    "{v}"
                  </div>
                  <button style={css.btnDanger} onClick={() => removeVerbatim(i)}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...css.input, flex: 1 }} placeholder='Add verbatim — "Filing on my phone was way easier..."' value={verbatimInput} onChange={e => setVerbatimInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addVerbatim()} />
              <button style={css.btnOut} onClick={addVerbatim}>+ Add</button>
            </div>
          </div>

          {/* Business Outcomes */}
          <div style={css.card}>
            <div style={css.secHead}>Business Outcomes</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              {[
                ["Revenue Realized ($)", "revenue_realized"],
                ["Cost Savings ($)", "cost_savings_realized"],
              ].map(([label, field]) => (
                <div key={field}>
                  <label style={css.label}>{label}</label>
                  <input type="number" style={css.input} defaultValue={ini[field] || ""} onBlur={e => save({ [field]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          {/* Time-Series Trend Chart */}
          <div style={css.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={css.secHead}>Weekly Trend</div>
              <span style={{ fontSize: 11, color: T.muted }}>{metrics.length} data points</span>
            </div>
            {metrics.length >= 2 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                {[
                  { key: "mau", label: "Monthly Active Users" },
                  { key: "adoption_rate", label: "Adoption Rate (%)" },
                  { key: "nps", label: "NPS Score" },
                  { key: "csat", label: "CSAT Score" },
                ].map(({ key, label }) => (
                  <div key={key} style={{ background: T.ink2, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>{label}</div>
                    <Sparkline data={metrics.map(m => Number(m[key]) || 0)} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.muted, marginTop: 6 }}>
                      <span>{(metrics[0]?.metric_date || "").slice(5, 10)}</span>
                      <span>{metrics[metrics.length - 1]?.[key]}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: T.muted, fontSize: 13 }}>Add at least 2 weekly data rows to see trends.</div>
            )}

            {/* Add metric row */}
            <div style={{ marginTop: 20 }}>
              <div style={{ ...css.secHead, marginBottom: 8 }}>Add Weekly Data Row</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 8 }}>
                {[
                  ["Date", newMetricDate, setNewMetricDate, "date"],
                  ["MAU", newMetricMAU, setNewMetricMAU, "number"],
                  ["DAU", newMetricDAU, setNewMetricDAU, "number"],
                  ["Adoption %", newMetricAdoption, setNewMetricAdoption, "number"],
                  ["NPS", newMetricNPS, setNewMetricNPS, "number"],
                  ["CSAT", newMetricCSAT, setNewMetricCSAT, "number"],
                  ["Calls Defl.", newMetricCalls, setNewMetricCalls, "number"],
                ].map(([label, val, setter, type]) => (
                  <div key={label}>
                    <label style={{ ...css.label, fontSize: 11 }}>{label}</label>
                    <input type={type} style={{ ...css.input, padding: "6px 8px" }} value={val} onChange={e => setter(e.target.value)} />
                  </div>
                ))}
              </div>
              <button style={css.btnOut} onClick={addMetricRow} disabled={addingMetric || !newMetricDate}>
                {addingMetric ? "Adding…" : "+ Add Data Row"}
              </button>
            </div>

            {/* Metric table */}
            {metrics.length > 0 && (
              <div style={{ marginTop: 16, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: T.muted, borderBottom: `1px solid ${T.ink3}` }}>
                      {["Date","MAU","DAU","Adopt%","NPS","CSAT","Calls",""].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map(m => (
                      <tr key={m.id} style={{ borderBottom: `1px solid ${T.ink2}`, color: T.loud }}>
                        <td style={{ padding: "6px 8px" }}>{m.metric_date}</td>
                        <td style={{ padding: "6px 8px" }}>{Number(m.mau||0).toLocaleString()}</td>
                        <td style={{ padding: "6px 8px" }}>{Number(m.dau||0).toLocaleString()}</td>
                        <td style={{ padding: "6px 8px" }}>{m.adoption_rate}%</td>
                        <td style={{ padding: "6px 8px", color: m.nps >= 40 ? T.green : m.nps >= 20 ? T.amber : T.red }}>{m.nps}</td>
                        <td style={{ padding: "6px 8px" }}>{m.csat}</td>
                        <td style={{ padding: "6px 8px" }}>{Number(m.calls_deflected||0).toLocaleString()}</td>
                        <td style={{ padding: "6px 8px" }}>
                          <button style={css.btnDanger} onClick={() => removeMetric(m.id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PM Notes */}
          <div style={css.card}>
            <div style={css.secHead}>PM Measure Notes</div>
            <textarea rows={5} style={css.ta} defaultValue={ini.measure_notes || ""} placeholder="Capture context: what's driving numbers, what anomalies exist, what's the team doing to improve…" onBlur={e => save({ measure_notes: e.target.value })} />
          </div>

          {/* AI Insights */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button style={css.btnGold} onClick={runAI} disabled={aiLoading}>
              {aiLoading ? "Analyzing…" : "◆ AI Measure Insights"}
            </button>
            {aiText && <button style={css.btnGhost} onClick={() => navigator.clipboard.writeText(aiText)}>Copy</button>}
          </div>
          {(aiLoading || aiText) && <AIBox label="◆ AI Measure Analysis" text={aiText} loading={aiLoading} />}
        </>
      )}
    </div>
  );
}

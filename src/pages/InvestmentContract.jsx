import { useState, useEffect, useCallback } from "react";
import { T, css } from "../lib/tokens";
import { useApp } from "../contexts/AppContext";
import { updateInitiative, callAI } from "../lib/api";

const STAGES = ["idea","discovery","review","approved","definition","delivery","handoff"];

function Field({ label, value, onChange, placeholder, multiline, type = "text", suffix }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <span style={css.label}>{label}</span>
      <div style={{ display: "flex", alignItems: multiline ? "flex-start" : "center", gap: 8 }}>
        {multiline ? (
          <textarea
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            style={{ ...css.ta, flex: 1 }}
          />
        ) : (
          <input
            type={type}
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ ...css.input, flex: 1 }}
          />
        )}
        {suffix && <span style={{ fontSize: 12, color: T.muted, whiteSpace: "nowrap" }}>{suffix}</span>}
      </div>
    </div>
  );
}

export default function InvestmentContract() {
  const { initiatives, orgId, foundation, updateIni } = useApp();

  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm]             = useState({});
  const [secondaryMetrics, setSecondaryMetrics] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Eligible initiatives — approved or in definition/delivery
  const eligible = (initiatives || []).filter(i =>
    ["approved", "definition", "delivery", "handoff"].includes(i.stage)
  );

  const ini = eligible.find(i => i.id === selectedId) || eligible[0] || null;

  // Load initiative into form when selected changes
  useEffect(() => {
    if (!ini) return;
    setSelectedId(ini.id);
    setForm({
      contract_primary_metric:    ini.contract_primary_metric    || "",
      contract_baseline:          ini.contract_baseline          || "",
      contract_target:            ini.contract_target            || "",
      contract_telemetry_source:  ini.contract_telemetry_source  || "",
      contract_review_window:     ini.contract_review_window     || 90,
      contract_economic_outcome:  ini.contract_economic_outcome  || "",
      contract_ai_narrative:      ini.contract_ai_narrative      || "",
      contract_status:            ini.contract_status            || "draft",
    });
    try {
      const sm = JSON.parse(ini.contract_secondary_metrics || "[]");
      setSecondaryMetrics(Array.isArray(sm) ? sm : []);
    } catch {
      setSecondaryMetrics([]);
    }
  }, [ini?.id]);

  // Auto-generate on first load if contract is blank
  useEffect(() => {
    if (ini && !ini.contract_primary_metric && !generating) {
      handleGenerate();
    }
  }, [ini?.id]);

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  async function handleGenerate() {
    if (!ini) return;
    setGenerating(true);
    try {
      const res = await callAI("investment_contract", {
        initiative: ini,
        foundation,
        initiatives,
      });

      // Parse JSON response
      const raw = res.content || res.text || res;
      let parsed;
      try {
        const clean = (typeof raw === "string" ? raw : JSON.stringify(raw))
          .replace(/```json|```/g, "").trim();
        const start = clean.indexOf("{");
        const end   = clean.lastIndexOf("}");
        parsed = JSON.parse(clean.slice(start, end + 1));
      } catch {
        console.error("Contract JSON parse failed:", raw);
        return;
      }

      setForm(f => ({
        ...f,
        contract_primary_metric:   parsed.primary_metric   || f.contract_primary_metric,
        contract_baseline:         parsed.baseline         || f.contract_baseline,
        contract_target:           parsed.target           || f.contract_target,
        contract_telemetry_source: parsed.telemetry_source || f.contract_telemetry_source,
        contract_review_window:    parsed.review_window_days || f.contract_review_window,
        contract_economic_outcome: parsed.economic_outcome || f.contract_economic_outcome,
        contract_ai_narrative:     parsed.narrative        || f.contract_ai_narrative,
        contract_status:           "draft",
      }));
      if (Array.isArray(parsed.secondary_metrics)) {
        setSecondaryMetrics(parsed.secondary_metrics);
      }
    } catch (err) {
      console.error("Generate contract error:", err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(status) {
    if (!ini) return;
    setSaving(true);
    try {
      const payload = {
        id: ini.id,
        ...form,
        contract_secondary_metrics: JSON.stringify(secondaryMetrics),
        contract_status: status || form.contract_status,
      };
      await updateInitiative(payload);
      if (updateIni) updateIni(ini.id, () => ({ ...ini, ...payload }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (status === "confirmed") {
        setForm(f => ({ ...f, contract_status: "confirmed" }));
        setConfirming(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const isConfirmed = form.contract_status === "confirmed";
  const investment  = ini ? ((ini.investment_approved || ini.investment_requested || 0) / 1000000).toFixed(2) : "0.00";

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ ...css.h2, marginBottom: 4 }}>
          Investment Contract
          {isConfirmed && (
            <span style={{ marginLeft: 12, fontSize: 11, fontWeight: 700,
              color: T.green, border: `1px solid ${T.green}`, borderRadius: 10,
              padding: "2px 10px", verticalAlign: "middle" }}>
              ✓ Confirmed
            </span>
          )}
        </h1>
        <p style={css.sub}>
          Define what success looks like before delivery begins. This contract becomes the measurement standard for Stage 8 · Measure.
        </p>
      </div>

      {/* Initiative selector */}
      {eligible.length === 0 ? (
        <div style={{ ...css.card, textAlign: "center", padding: 40, color: T.muted }}>
          No approved or in-definition initiatives found.
          <br />
          <span style={{ fontSize: 12 }}>Approve an initiative in Stage 3 · Exec Review first.</span>
        </div>
      ) : (
        <>
          {/* Initiative selector — always visible */}
          <div style={{ marginBottom: 20 }}>
            <span style={css.label}>Initiative</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <select
                value={selectedId || ini?.id || ""}
                onChange={e => setSelectedId(e.target.value)}
                style={{ ...css.input, maxWidth: 480, fontSize: 14, fontWeight: 600 }}
              >
                {eligible.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.slug} · {i.title} {i.contract_status === "confirmed" ? "✓" : i.contract_primary_metric ? "◐" : "○"}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: T.muted }}>
                {eligible.length} initiative{eligible.length !== 1 ? "s" : ""} eligible · ✓ confirmed · ◐ draft · ○ not started
              </span>
            </div>
          </div>

          {ini && (
            <>
              {/* Initiative context banner */}
              <div style={{ ...css.card, background: T.ink3, borderColor: T.b2, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                      {ini.slug} · {ini.stage.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 6 }}>{ini.title}</div>
                    <div style={{ fontSize: 12, color: T.body, lineHeight: 1.6 }}>{ini.problem}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Investment Approved</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: T.gold }}>${investment}M</div>
                  </div>
                </div>
              </div>

              {/* AI Narrative */}
              {form.contract_ai_narrative && (
                <div style={{ ...css.card, borderColor: T.gold, background: "rgba(212,168,67,0.06)", marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                    ◆ Investment Thesis
                  </div>
                  <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.7 }}>{form.contract_ai_narrative}</div>
                </div>
              )}

              {/* Primary Metric */}
              <div style={css.card}>
                <div style={css.secHead}>Primary Outcome Metric</div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}>
                  <Field label="Primary Metric" value={form.contract_primary_metric}
                    onChange={set("contract_primary_metric")}
                    placeholder="e.g. FNOL abandonment rate" />
                  <Field label="Baseline (Current)" value={form.contract_baseline}
                    onChange={set("contract_baseline")}
                    placeholder="e.g. 43%" />
                  <Field label="Target" value={form.contract_target}
                    onChange={set("contract_target")}
                    placeholder="e.g. <10%" />
                </div>
              </div>

              {/* Secondary Metrics */}
              <div style={css.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={css.secHead}>Secondary Metrics</div>
                  <button
                    onClick={() => setSecondaryMetrics(sm => [...sm, { metric: "", baseline: "", target: "" }])}
                    style={{ ...css.btnGhost, fontSize: 11 }}
                  >+ Add Metric</button>
                </div>
                {secondaryMetrics.length === 0 && (
                  <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>No secondary metrics yet — click + Add Metric or let AI generate them.</div>
                )}
                {secondaryMetrics.map((sm, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, marginBottom: 10, alignItems: "center" }}>
                    <input value={sm.metric} onChange={e => {
                      const next = [...secondaryMetrics];
                      next[i] = { ...next[i], metric: e.target.value };
                      setSecondaryMetrics(next);
                    }} placeholder="Metric name" style={css.input} />
                    <input value={sm.baseline} onChange={e => {
                      const next = [...secondaryMetrics];
                      next[i] = { ...next[i], baseline: e.target.value };
                      setSecondaryMetrics(next);
                    }} placeholder="Baseline" style={css.input} />
                    <input value={sm.target} onChange={e => {
                      const next = [...secondaryMetrics];
                      next[i] = { ...next[i], target: e.target.value };
                      setSecondaryMetrics(next);
                    }} placeholder="Target" style={css.input} />
                    <button onClick={() => setSecondaryMetrics(sm => sm.filter((_, j) => j !== i))}
                      style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
                  </div>
                ))}
              </div>

              {/* Measurement Details */}
              <div style={css.card}>
                <div style={css.secHead}>Measurement Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
                  <Field label="Telemetry Source" value={form.contract_telemetry_source}
                    onChange={set("contract_telemetry_source")}
                    placeholder="e.g. GA4 funnel events, Mixpanel, CSV export from Salesforce" />
                  <Field label="Review Window" value={form.contract_review_window}
                    onChange={set("contract_review_window")}
                    type="number" suffix="days post-launch" />
                </div>
                <Field label="Expected Economic Outcome" value={form.contract_economic_outcome}
                  onChange={set("contract_economic_outcome")} multiline
                  placeholder="e.g. $34 reduction in cost per claim via call deflection. 43% → <10% abandonment generates estimated $2.1M annual savings." />
              </div>

              {/* Action bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{ ...css.btnOut, opacity: generating ? 0.5 : 1 }}
                >
                  {generating ? "◆ Generating…" : "◆ Regenerate with AI"}
                </button>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {saved && <span style={{ fontSize: 12, color: T.green }}>✓ Saved</span>}
                  <button
                    onClick={() => handleSave()}
                    disabled={saving}
                    style={{ ...css.btnGhost, opacity: saving ? 0.5 : 1 }}
                  >Save Draft</button>
                  {!isConfirmed ? (
                    <button
                      onClick={() => handleSave("confirmed")}
                      disabled={saving || !form.contract_primary_metric}
                      style={{
                        ...css.btnGold,
                        opacity: (!form.contract_primary_metric || saving) ? 0.5 : 1,
                        cursor: !form.contract_primary_metric ? "not-allowed" : "pointer",
                      }}
                    >
                      ✓ Confirm Contract
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSave("draft")}
                      style={{ ...css.btnGhost }}
                    >Reopen as Draft</button>
                  )}
                </div>
              </div>

              {!form.contract_primary_metric && (
                <div style={{ fontSize: 11, color: T.amber, marginTop: 8, textAlign: "right" }}>
                  A primary metric is required to confirm the contract.
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
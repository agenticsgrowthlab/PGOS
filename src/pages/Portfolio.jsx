import { useState, useRef, useEffect } from "react";
import { T, css, calcPivot, pivotTier, calcWSJF, wsjfColor, stageLabel, stageColor } from "../lib/tokens";
import { AIBox, Tag } from "../components/ui";
import { useApp } from "../contexts/AppContext";
import { callAI } from "../lib/api";

// ─── Portfolio ────────────────────────────────────────────────
export function Portfolio() {
  const { initiatives, foundation, updateIni } = useApp();
  const [aiSummary, setAiSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const getSummary = async () => {
    setLoading(true);
    const text = await callAI("portfolio_analysis", { foundation, initiatives }).catch(() => "");
    setAiSummary(text);
    setLoading(false);
  };

  const setPScore = (id, key, val) => {
    updateIni(id, d => ({
      ...d,
      portfolioScore: { ...d.portfolioScore, [key]: parseInt(val) || 0 },
      // also keep DB fields in sync
      ...(key === "bizValue" && { wsjf_biz_value: parseInt(val) || 0 }),
      ...(key === "timeCriticality" && { wsjf_time_crit: parseInt(val) || 0 }),
      ...(key === "riskReduction" && { wsjf_risk_reduction: parseInt(val) || 0 }),
      ...(key === "effort" && { wsjf_effort: parseInt(val) || 0 }),
    }));
  };

  const sorted = [...initiatives].sort((a, b) => calcWSJF(b) - calcWSJF(a));
  const fields = [["bizValue", "BV"], ["timeCriticality", "TC"], ["riskReduction", "RR"], ["effort", "Effort"]];

  return (
    <div>
      <div style={css.h2}>SAFe Portfolio Review</div>
      <div style={css.sub}>Stakeholder scoring, WSJF prioritization, and PI selection.</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button style={css.btnOut} onClick={getSummary}>◆ AI Portfolio Analysis</button>
      </div>
      {loading && <AIBox label="◆ Portfolio Advisor — Analyzing" loading />}
      {aiSummary && <AIBox label="◆ Portfolio Advisor — PI Recommendations">{aiSummary}</AIBox>}

      <div style={{ ...css.card, background: T.ink3, padding: "10px 16px", marginBottom: 0, borderRadius: "10px 10px 0 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px 80px", gap: 8, alignItems: "center" }}>
          {["Initiative", "Business Value", "Time Criticality", "Risk Reduction", "Effort (Job Size)", "WSJF", "PIVOT"].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
          ))}
        </div>
      </div>

      {sorted.map((ini, idx) => {
        const ps = ini.portfolioScore || {};
        const wsjf = calcWSJF(ini);
        const pivot = calcPivot(ini.pivot);
        const tier = pivotTier(pivot);
        const wc = wsjfColor(wsjf);
        return (
          <div key={ini.id} style={{ ...css.card, marginBottom: 4, borderRadius: idx === sorted.length - 1 ? "0 0 10px 10px" : "0", borderTop: "none", padding: "14px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px 80px", gap: 8, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.loud }}>{ini.title}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  <Tag label={stageLabel(ini.stage)} color={stageColor(ini.stage)} /> {ini.slug}
                </div>
              </div>
              {fields.map(([k, label]) => (
                <div key={k} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>{label} (1-10)</div>
                  <input type="number" min="1" max="10" value={ps[k] || ""}
                    onChange={e => setPScore(ini.id, k, e.target.value)}
                    style={{ ...css.input, textAlign: "center", fontSize: 16, fontWeight: 700, padding: "4px", color: T.gold, width: 52 }} />
                </div>
              ))}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>WSJF</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: wsjf > 0 ? wc : T.muted }}>{wsjf || "—"}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>PIVOT</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: tier.color }}>{pivot.toFixed(0)}</div>
                <Tag label={tier.label} color={tier.color} bg={tier.bg} />
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ ...css.card, marginTop: 16 }}>
        <div style={{ fontSize: 12, color: T.muted }}>
          <strong style={{ color: T.loud }}>WSJF</strong> = (Business Value + Time Criticality + Risk Reduction) ÷ Job Size · Higher WSJF = higher priority for next PI
        </div>
      </div>
    </div>
  );
}

// ─── PI Planning ──────────────────────────────────────────────
export function PIPlanning() {
  const { initiatives, foundation, updateIni } = useApp();
  const [loading, setLoading] = useState(false);
  const [piOutput, setPiOutput] = useState("");
  const approved = initiatives.filter(i => i.approved);
  const quarters = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025"];
  const stageQ = { idea: "Q3 2025", discovery: "Q3 2025", review: "Q2 2025", approved: "Q2 2025", definition: "Q2 2025", delivery: "Q1 2025", handoff: "Q1 2025" };

  const genPI = async () => {
    setLoading(true);
    const text = await callAI("pi_planning", { foundation, initiatives }).catch(() => "");
    // save to approved initiatives
    if (text) {
      approved.forEach(ini => updateIni(ini.id, d => ({ ...d, piPlanning: text })));
    }
    setPiOutput(text);
    setLoading(false);
  };

  return (
    <div>
      <div style={css.h2}>PI Planning</div>
      <div style={css.sub}>SAFe Program Increment planning — objectives, risks, dependencies, and timeline.</div>

      {/* Roadmap timeline */}
      <div style={css.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={css.secHead}>Roadmap Timeline — 2025</div>
          <Tag label={`${approved.length} Approved Initiatives`} color={T.green} bg={T.grnD} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
          {quarters.map(q => (
            <div key={q} style={{ background: T.ink3, borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.gold, marginBottom: 10 }}>{q}</div>
              {initiatives.filter(i => stageQ[i.stage] === q).map(ini => (
                <div key={ini.id} style={{ background: T.ink4, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: T.loud, fontWeight: 500 }}>{ini.title.substring(0, 28)}{ini.title.length > 28 ? "…" : ""}</div>
                  <div style={{ fontSize: 10, color: stageColor(ini.stage), marginTop: 2 }}>{stageLabel(ini.stage)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button style={css.btnGold} onClick={genPI} disabled={loading || !approved.length}>
          {loading ? "Generating…" : "◆ Generate PI Planning Package"}
        </button>
      </div>
      {loading && <AIBox label="◆ SAFe RTE — Building PI Package" loading />}
      {piOutput && (
        <div style={css.card}>
          <div style={{ fontWeight: 700, color: T.gold, marginBottom: 10 }}>PI Planning Package</div>
          <textarea rows={28} style={{ ...css.ta, fontSize: 12, lineHeight: 1.75 }} value={piOutput}
            onChange={e => setPiOutput(e.target.value)} />
        </div>
      )}
    </div>
  );
}

// ─── Handoff ─────────────────────────────────────────────────
export function Handoff() {
  const { initiatives, foundation } = useApp();
  const [selected, setSelected] = useState("");
  const [handoff, setHandoff] = useState("");
  const [loading, setLoading] = useState(false);
  const ini = initiatives.find(i => i.id === selected);
  const score = ini ? calcPivot(ini.pivot) : 0;
  const tier = ini ? pivotTier(score) : {};

  const generate = async () => {
    if (!ini) return;
    setLoading(true);
    const text = await callAI("handoff", {
      foundation, initiative: { ...ini, okrName: "", themeName: "", capabilityName: "" }, score, tier: tier.label,
    }).catch(() => "");
    setHandoff(text);
    setLoading(false);
  };

  const completeness = ini ? [
    ["Problem Statement", !!ini.problem],
    ["PIVOT Score", calcPivot(ini.pivot) > 0],
    ["Exec Brief", !!ini.execBrief],
    ["Personas", !!ini.personas],
    ["Journey Maps", !!ini.currentJourney],
    ["JTBD", !!ini.jtbd],
    ["Use Cases", !!ini.usecases],
    ["Epics & Stories", !!ini.epics],
    ["Risk Register", !!ini.riskReg],
    ["Approved", !!ini.approved],
  ] : [];

  return (
    <div>
      <div style={css.h2}>Engineering Handoff Packages</div>
      <div style={css.sub}>AI assembles everything into one complete, PI-ready delivery package.</div>

      <div style={{ marginBottom: 16 }}>
        <label style={css.label}>Select Initiative</label>
        <select style={{ ...css.input, maxWidth: 480 }} value={selected} onChange={e => { setSelected(e.target.value); setHandoff(""); }}>
          <option value="">— Select an initiative —</option>
          {initiatives.map(i => <option key={i.id} value={i.id}>{i.slug} · {i.title} {i.approved ? "✓" : ""}</option>)}
        </select>
      </div>

      {ini && (
        <>
          <div style={{ ...css.card, background: T.ink3, marginBottom: 16 }}>
            <div style={css.secHead}>Package Completeness</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {completeness.map(([label, done]) => (
                <div key={label} style={{ ...css.tag(done ? T.green : T.muted, done ? T.grnD : "transparent"), gap: 5 }}>
                  {done ? "✓" : "○"} {label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button style={css.btnGold} onClick={generate} disabled={loading}>
              {loading ? "Assembling…" : "◆ Generate Handoff Package"}
            </button>
            {handoff && <button style={css.btnGhost} onClick={() => navigator.clipboard.writeText(handoff)}>Copy All</button>}
          </div>
          {loading && <AIBox label="◆ Handoff Advisor — Assembling Package" loading />}
          {handoff && (
            <div style={css.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: T.gold }}>📦 {ini.title} — Engineering Handoff Package</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={css.btnGhost} onClick={generate}>↻ Regenerate</button>
                  <button style={css.btnOut} onClick={() => navigator.clipboard.writeText(handoff)}>Copy</button>
                </div>
              </div>
              <textarea rows={36} style={{ ...css.ta, fontSize: 12, lineHeight: 1.75 }} value={handoff} onChange={e => setHandoff(e.target.value)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Stage List View ──────────────────────────────────────────
export function StageList({ stageFilter, title, setView }) {
  const { initiatives } = useApp();

  const stageInits = initiatives.filter(i =>
    i.stage === stageFilter || (stageFilter === "review" && (i.stage === "review" || i.stage === "approved"))
  );

  return (
    <div>
      <div style={css.h2}>{title}</div>
      <div style={css.sub}>Initiatives at this stage.</div>
      {stageInits.length === 0 && (
        <div style={{ ...css.card, textAlign: "center", padding: 40, color: T.muted }}>
          No initiatives at this stage yet.{" "}
          <button style={{ ...css.btnOut, display: "inline" }} onClick={() => setView("ideas")}>Start in Ideas</button>
        </div>
      )}
      {stageInits.map(ini => {
        const score = calcPivot(ini.pivot);
        const tier = pivotTier(score);
        return (
          <div key={ini.id} style={{ ...css.card, cursor: "pointer", borderLeft: `3px solid ${stageColor(ini.stage)}` }}
            onClick={() => setView("initiative_" + ini.id)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.loud }}>{ini.title}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{ini.slug} · {ini.source_detail}</div>
              </div>
              <Tag label={stageLabel(ini.stage)} color={stageColor(ini.stage)} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: tier.color }}>{score.toFixed(0)}</div>
                <Tag label={tier.label} color={tier.color} bg={tier.bg} />
              </div>
              <span style={{ color: T.muted, fontSize: 18 }}>→</span>
            </div>
          </div>
        );
      })}
      <button style={{ ...css.btnOut, marginTop: 8 }} onClick={() => setView("ideas")}>+ New Idea</button>
    </div>
  );
}

// ─── Chatty ───────────────────────────────────────────────────
export function Chatty({ currentView }) {
  const { foundation, initiatives, userName } = useApp();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{
    role: "assistant",
    text: `Hi! I'm your product intelligence advisor. I know your full pipeline — ${initiatives.length} initiatives across all stages. What do you need?`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  // Update greeting when initiatives load
  useEffect(() => {
    setMsgs(m => [{
      ...m[0],
      text: `Hi! I'm your product intelligence advisor. I know your full pipeline — ${initiatives.length} initiatives across all stages. What do you need?`,
    }, ...m.slice(1)]);
  }, [initiatives.length]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input; setInput(""); setLoading(true);
    const history = msgs.slice(-8).map(m => ({ role: m.role, content: m.text }));
    setMsgs(m => [...m, { role: "user", text: userMsg }]);
    const text = await callAI("chatty", {
      foundation, initiatives, currentView, userName,
      question: userMsg, messages: history,
    }).catch(() => "I encountered an error. Please try again.");
    setMsgs(m => [...m, { role: "assistant", text }]);
    setLoading(false);
  };

  return (
    <>
      <button onClick={() => setOpen(o => !o)}
        style={{ position: "fixed", bottom: 24, right: 24, width: 52, height: 52, borderRadius: "50%", background: T.gold, border: "none", color: T.ink, fontSize: 22, cursor: "pointer", boxShadow: "0 4px 20px rgba(212,168,67,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
        {open ? "✕" : "◆"}
      </button>

      {open && (
        <div style={{ position: "fixed", bottom: 88, right: 24, width: 380, height: 520, background: T.ink2, border: `1px solid ${T.border}`, borderRadius: 14, display: "flex", flexDirection: "column", zIndex: 1000, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, color: T.gold }}>◆</span>
            <span style={{ fontWeight: 700, color: T.loud }}>Chatty</span>
            <span style={{ fontSize: 11, color: T.muted, marginLeft: 4 }}>Your Product Intelligence Advisor</span>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ marginBottom: 12, display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "85%", padding: "9px 13px", borderRadius: 10, fontSize: 13, lineHeight: 1.55, background: m.role === "user" ? T.goldD : T.ink3, color: m.role === "user" ? T.gold : T.body, border: `1px solid ${m.role === "user" ? T.goldB : T.border}`, whiteSpace: "pre-wrap" }}>{m.text}</div>
              </div>
            ))}
            {loading && <div style={{ color: T.gold, fontStyle: "italic", fontSize: 12, padding: "4px 12px" }}>◆ Thinking…</div>}
            <div ref={endRef} />
          </div>
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
            <input style={{ ...css.input, flex: 1, fontSize: 13 }} value={input} onChange={e => setInput(e.target.value)}
              placeholder="Ask anything about your portfolio…"
              onKeyDown={e => e.key === "Enter" && !loading && send()} />
            <button style={{ ...css.btnGold, padding: "8px 14px" }} onClick={send} disabled={loading || !input.trim()}>→</button>
          </div>
        </div>
      )}
    </>
  );
}

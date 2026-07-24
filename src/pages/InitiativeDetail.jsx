import { useState } from "react";
import { T, css, calcPivot, pivotTier, stageLabel, stageColor } from "../lib/tokens";
import { AIBox, Tag, ScoreRing, PivotSlider, AddNoteInput } from "../components/ui";
import { useApp } from "../contexts/AppContext";
import { callAI, createNote } from "../lib/api";

const SOURCES = ["Executive Idea","Customer Request","Competitive Threat","Regulatory Requirement","Market Opportunity","Engineering Recommendation","Data Insight","Partner Request"];

const TABS = [
  ["discovery","Discovery"], ["brief","Exec Brief"], ["personas","Personas"],
  ["journeys","Journey Maps"], ["jtbd","Jobs To Be Done"],
  ["usecases","Use Cases"], ["epics","Epics & Stories"], ["risks","Risks"],
];

const ADVICE = {
  discovery: "Check for gaps in your evidence — weak evidence = low PIVOT score = harder approval.",
  brief: "AI will anticipate CFO and CPO questions. Make sure your ROI is defensible.",
  personas: "Personas should come from real customer interview data — not assumptions.",
  journeys: "Map the painful current state first. The future state shows what you're promising.",
  jtbd: "Jobs-to-be-done anchors your feature decisions to real human motivations.",
  usecases: "Every use case becomes one epic. Be specific about the actor and system interaction.",
  epics: "Epics should map 1:1 to use cases. Stories should be completable in one sprint.",
  risks: "Identify owners now — unowned risks become blocked initiatives.",
};

const PIVOT_DEFS = [
  ["Potential Value",      "p", T.steel, "25%"],
  ["Intelligence Strength","i", T.ice,   "20%"],
  ["Velocity Risk",        "v", T.gold,  "15%"],
  ["Outcome Clarity",      "o", T.green, "20%"],
  ["Throughput Cost",      "t", T.amber, "20%"],
];

// ─── Initiative Detail ────────────────────────────────────────
export function InitiativeDetail({ ini, setView }) {
  const { foundation, updateIni, orgId } = useApp();
  const [tab, setTab] = useState("discovery");
  const [loading, setLoading] = useState(null);

  if (!ini) return null;

  const score = calcPivot(ini.pivot);
  const tier = pivotTier(score);
  const okr = (foundation?.okrs || []).find(o => o.id === ini.okr_id);
  const strategy = (foundation?.strategies || []).find(s => s.id === ini.theme_id);
  const capability = (foundation?.capabilities || []).find(c => c.id === ini.capability_id);

  const setIni = (updater) => updateIni(ini.id, updater);

  const gen = async (key, action, extraPayload = {}) => {
    setLoading(key);
    const text = await callAI(action, {
      foundation,
      initiative: {
        ...ini,
        okrName: okr?.objective || "",
        themeName: strategy?.name || "",
        capabilityName: capability?.name || "",
      },
      score,
      tier: tier.label,
      ...extraPayload,
    }).catch(() => "");
    // Map action key to ini field name
    const fieldMap = {
      pivot_coach: "pivotCoach", eng_estimate: "engEstimate",
      exec_brief: "execBrief", one_pager: "onePager",
      personas: "personas", current_journey: "currentJourney", future_journey: "futureJourney",
      jtbd: "jtbd", use_cases: "usecases", epics: "epics", risk_register: "riskReg",
    };
    setIni(d => ({ ...d, [fieldMap[action] || key]: text }));
    setLoading(null);
  };

  const addNote = async (author, note) => {
    if (!orgId) return;
    const res = await createNote({ initiative_id: ini.id, author, note }).catch(() => null);
    if (res?.data) {
      setIni(d => ({ ...d, stakeholderNotes: [...(d.stakeholderNotes || []), res.data] }));
    } else {
      // optimistic
      setIni(d => ({ ...d, stakeholderNotes: [...(d.stakeholderNotes || []), { author, note, created_at: new Date().toISOString() }] }));
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: T.muted, fontFamily: "monospace" }}>{ini.slug}</span>
            <Tag label={stageLabel(ini.stage)} color={stageColor(ini.stage)} />
            {ini.approved && <Tag label="✓ Approved" color={T.green} bg={T.grnD} />}
          </div>
          <div style={css.h2}>{ini.title}</div>
          <div style={{ fontSize: 12, color: T.muted }}>Source: {ini.source} · {ini.source_detail}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <ScoreRing score={score} color={tier.color} size={64} />
          <div style={{ fontSize: 22, fontWeight: 900, color: tier.color, marginTop: -44, lineHeight: 1 }}>{score.toFixed(0)}</div>
          <div style={{ fontSize: 10, marginTop: 44, color: T.muted }}>PIVOT</div>
          <Tag label={tier.label} color={tier.color} bg={tier.bg} />
        </div>
      </div>

      {/* Strategic links display */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[["OKR", okr?.objective?.substring(0, 50) + "…" || "Not linked", T.gold],
          ["Strategy", strategy?.name || "Not linked", T.ice],
          ["Capability", capability?.name || "Not linked", T.purple],
        ].map(([lbl, val, color]) => (
          <div key={lbl} style={{ background: T.ink2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{lbl}</div>
            <div style={{ fontSize: 12, color, fontWeight: 500, marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        <div>
          <label style={css.label}>Link OKR</label>
          <select style={{ ...css.input, fontSize: 12 }} value={ini.okr_id || ""}
            onChange={e => setIni(d => ({ ...d, okr_id: e.target.value || null }))}>
            <option value="">— Select OKR —</option>
            {(foundation?.okrs || []).map(o => <option key={o.id} value={o.id}>{o.objective?.substring(0, 50)}…</option>)}
          </select>
        </div>
        <div>
          <label style={css.label}>Strategic Theme</label>
          <select style={{ ...css.input, fontSize: 12 }} value={ini.theme_id || ""}
            onChange={e => setIni(d => ({ ...d, theme_id: e.target.value || null }))}>
            <option value="">— Select —</option>
            {(foundation?.strategies || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label style={css.label}>Business Capability</label>
          <select style={{ ...css.input, fontSize: 12 }} value={ini.capability_id || ""}
            onChange={e => setIni(d => ({ ...d, capability_id: e.target.value || null }))}>
            <option value="">— Select —</option>
            {(foundation?.capabilities || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 0, background: T.ink3, borderRadius: 8, padding: 3, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ ...css.btnGhost, border: "none", background: tab === id ? T.ink2 : "transparent", color: tab === id ? T.gold : T.muted, fontWeight: tab === id ? 700 : 400, margin: 2, fontSize: 12, borderRadius: 6 }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Advisor tip */}
      <div style={{ background: "rgba(212,168,67,0.04)", border: `1px solid ${T.goldB}`, borderRadius: 6, padding: "8px 12px", marginBottom: 14, display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span style={{ color: T.gold, fontSize: 12, marginTop: 1 }}>◆</span>
        <span style={{ fontSize: 12, color: T.body, lineHeight: 1.5 }}><strong style={{ color: T.gold }}>AI Advisor</strong> — {ADVICE[tab]}</span>
      </div>

      {/* ── DISCOVERY ── */}
      {tab === "discovery" && (
        <div>
          <div style={css.card}>
            <label style={css.label}>Business Problem</label>
            <textarea rows={4} style={css.ta} value={ini.problem}
              onChange={e => setIni(d => ({ ...d, problem: e.target.value }))} />
          </div>
          <div style={css.card}>
            <label style={css.label}>Opportunity</label>
            <textarea rows={3} style={css.ta} value={ini.opportunity}
              onChange={e => setIni(d => ({ ...d, opportunity: e.target.value }))} />
          </div>

          {/* PIVOT Score */}
          <div style={{ ...css.card, borderTop: `2px solid ${tier.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={css.secHead}>PIVOT Score™</div>
                <div style={{ fontSize: 42, fontWeight: 900, color: tier.color, lineHeight: 1, letterSpacing: "-0.04em" }}>{score.toFixed(1)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Tag label={tier.label} color={tier.color} bg={tier.bg} />
                <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>P·I·V·O·T weighted scoring</div>
                <button style={{ ...css.btnOut, marginTop: 8 }} onClick={() => gen("pivotCoach", "pivot_coach")}>◆ Coach Me</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
              {PIVOT_DEFS.map(([lbl, k, c, w]) => (
                <PivotSlider key={k} label={lbl} letter={k.toUpperCase()} value={ini.pivot?.[k] || 5} color={c} weight={w}
                  onChange={v => setIni(d => ({ ...d, pivot: { ...d.pivot, [k]: v } }))} />
              ))}
            </div>
            {(ini.pivotCoach || loading === "pivotCoach") && <AIBox label="◆ PIVOT Coach" loading={loading === "pivotCoach"}>{ini.pivotCoach}</AIBox>}
          </div>

          {/* Evidence */}
          <div style={css.card}>
            <div style={css.secHead}>Persuasion Evidence</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["Customer Interviews", "interviews"], ["Pain Confirmed", "painConfirmed"], ["Revenue Opportunity", "revenueOpp"], ["Cost Savings", "costSavings"], ["Competitive Landscape", "competitive"], ["NPS / Satisfaction", "nps"]].map(([lbl, k]) => (
                <div key={k}>
                  <label style={css.label}>{lbl}</label>
                  <input style={css.input} value={ini.evidence?.[k] || ""}
                    onChange={e => setIni(d => ({ ...d, evidence: { ...d.evidence, [k]: e.target.value } }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Investment */}
          <div style={css.card}>
            <div style={css.secHead}>Investment</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[["Investment Requested ($)", "requested"], ["Investment Approved ($)", "approved"]].map(([lbl, k]) => (
                <div key={k}>
                  <label style={css.label}>{lbl}</label>
                  <input style={css.input} type="number" value={ini.investment?.[k] || 0}
                    onChange={e => setIni(d => ({ ...d, investment: { ...d.investment, [k]: parseInt(e.target.value) || 0 } }))} />
                </div>
              ))}
              <div>
                <label style={css.label}>Eng Spend Estimate ($)</label>
                <input style={css.input} type="number" value={ini.engSpend?.estimate || 0}
                  onChange={e => setIni(d => ({ ...d, engSpend: { ...d.engSpend, estimate: parseInt(e.target.value) || 0 } }))} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={css.label}>Engineering Teams</label>
                <input style={css.input} type="number" value={ini.engSpend?.teams || 0}
                  onChange={e => setIni(d => ({ ...d, engSpend: { ...d.engSpend, teams: parseInt(e.target.value) || 0 } }))} />
              </div>
              <div>
                <label style={css.label}>Sprint Estimate</label>
                <input style={css.input} type="number" value={ini.engSpend?.sprints || 0}
                  onChange={e => setIni(d => ({ ...d, engSpend: { ...d.engSpend, sprints: parseInt(e.target.value) || 0 } }))} />
              </div>
            </div>
            <button style={{ ...css.btnGhost, fontSize: 11, marginTop: 8, width: "100%" }}
              onClick={() => gen("engEstimate", "eng_estimate")}>◆ AI Estimate</button>
            {(ini.engEstimate || loading === "engEstimate") && <AIBox label="◆ Engineering Advisor" loading={loading === "engEstimate"}>{ini.engEstimate}</AIBox>}
          </div>

          <div style={{ textAlign: "right" }}>
            <button style={css.btnGold} onClick={() => setIni(d => ({ ...d, stage: "review" }))}>Move to Executive Review →</button>
          </div>
        </div>
      )}

      {/* ── EXEC BRIEF ── */}
      {tab === "brief" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Executive Brief & One-Pager</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={css.btnOut} onClick={() => gen("execBrief", "exec_brief")}>◆ Generate Brief</button>
              <button style={css.btnGhost} onClick={() => gen("onePager", "one_pager")}>◆ One-Pager</button>
            </div>
          </div>
          {loading === "execBrief" && <AIBox label="◆ Executive Advisor — Drafting Brief" loading />}
          {ini.execBrief && (
            <div style={css.card}>
              <textarea rows={24} style={{ ...css.ta, fontSize: 13, lineHeight: 1.7 }} value={ini.execBrief}
                onChange={e => setIni(d => ({ ...d, execBrief: e.target.value }))} />
            </div>
          )}
          {ini.onePager && (
            <div style={{ ...css.card, borderLeft: `3px solid ${T.gold}` }}>
              <div style={{ fontWeight: 700, color: T.gold, marginBottom: 8 }}>One-Pager</div>
              <textarea rows={12} style={{ ...css.ta, fontSize: 13, lineHeight: 1.7 }} value={ini.onePager}
                onChange={e => setIni(d => ({ ...d, onePager: e.target.value }))} />
            </div>
          )}
          {loading === "onePager" && <AIBox label="◆ Executive Advisor — One-Pager" loading />}

          {/* Stakeholder Notes */}
          <div style={css.card}>
            <div style={css.secHead}>Meeting & Stakeholder Notes</div>
            {(ini.stakeholderNotes || []).map((n, i) => (
              <div key={i} style={{ background: T.ink3, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.gold }}>{n.author}</div>
                <div style={{ fontSize: 13, color: T.body, marginTop: 4 }}>{n.note}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>{n.created_at ? new Date(n.created_at).toLocaleString() : n.ts}</div>
              </div>
            ))}
            <AddNoteInput onAdd={addNote} />
          </div>

          {/* Version */}
          <div style={{ ...css.card, display: "flex", gap: 24 }}>
            {[["Version", "1.0"], ["Created", ini.approved_date || "Draft"], ["Status", ini.approved ? "Approved" : "Pending"]].map(([l, v]) => (
              <div key={l}><div style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase" }}>{l}</div><div style={{ fontSize: 14, color: T.loud, fontWeight: 600, marginTop: 2 }}>{v}</div></div>
            ))}
          </div>

          {/* Approval */}
          <div style={{ ...css.card, borderColor: ini.approved ? T.green : T.border, background: ini.approved ? T.grnD : T.ink2 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={!!ini.approved}
                onChange={e => setIni(d => ({ ...d, approved: e.target.checked, stage: e.target.checked ? "approved" : d.stage, approved_by: "Portfolio Review Board", approved_date: new Date().toLocaleDateString() }))}
                style={{ width: 20, height: 20, accentColor: T.green, cursor: "pointer" }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: ini.approved ? T.green : T.loud }}>{ini.approved ? "✓ Approved for Product Definition" : "Mark Approved — Advance to Definition"}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Approving advances this initiative to AI-powered Product Definition</div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* ── PERSONAS ── */}
      {tab === "personas" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Customer Personas</div>
            <button style={css.btnOut} onClick={() => gen("personas", "personas")}>◆ Generate Personas</button>
          </div>
          {loading === "personas" && <AIBox label="◆ UX Research Advisor — Building Personas" loading />}
          {ini.personas && <div style={css.card}><textarea rows={22} style={{ ...css.ta, fontSize: 13, lineHeight: 1.7 }} value={ini.personas} onChange={e => setIni(d => ({ ...d, personas: e.target.value }))} /></div>}
        </div>
      )}

      {/* ── JOURNEY MAPS ── */}
      {tab === "journeys" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Customer Journey Maps</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={css.btnOut} onClick={() => gen("currentJourney", "current_journey")}>◆ Current State</button>
              <button style={css.btnGhost} onClick={() => gen("futureJourney", "future_journey")}>◆ Future State</button>
            </div>
          </div>
          {loading === "currentJourney" && <AIBox label="◆ CX Advisor — Mapping Current State" loading />}
          {ini.currentJourney && (
            <div style={{ ...css.card, borderLeft: `3px solid ${T.amber}`, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: T.amber, marginBottom: 8 }}>Current State Journey</div>
              <textarea rows={12} style={{ ...css.ta, fontSize: 12, lineHeight: 1.65 }} value={ini.currentJourney} onChange={e => setIni(d => ({ ...d, currentJourney: e.target.value }))} />
            </div>
          )}
          {loading === "futureJourney" && <AIBox label="◆ CX Advisor — Mapping Future State" loading />}
          {ini.futureJourney && (
            <div style={{ ...css.card, borderLeft: `3px solid ${T.green}` }}>
              <div style={{ fontWeight: 700, color: T.green, marginBottom: 8 }}>Future State Journey</div>
              <textarea rows={12} style={{ ...css.ta, fontSize: 12, lineHeight: 1.65 }} value={ini.futureJourney} onChange={e => setIni(d => ({ ...d, futureJourney: e.target.value }))} />
            </div>
          )}
        </div>
      )}

      {/* ── JTBD ── */}
      {tab === "jtbd" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Jobs To Be Done</div>
            <button style={css.btnOut} onClick={() => gen("jtbd", "jtbd")}>◆ Generate JTBD</button>
          </div>
          {loading === "jtbd" && <AIBox label="◆ Product Advisor — Identifying Jobs" loading />}
          {ini.jtbd && <div style={css.card}><textarea rows={20} style={{ ...css.ta, fontSize: 13, lineHeight: 1.7 }} value={ini.jtbd} onChange={e => setIni(d => ({ ...d, jtbd: e.target.value }))} /></div>}
        </div>
      )}

      {/* ── USE CASES ── */}
      {tab === "usecases" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Use Cases</div>
            <button style={css.btnOut} onClick={() => gen("usecases", "use_cases")}>◆ Generate Use Cases</button>
          </div>
          {loading === "usecases" && <AIBox label="◆ Product Advisor — Writing Use Cases" loading />}
          {ini.usecases && <div style={css.card}><textarea rows={24} style={{ ...css.ta, fontSize: 13, lineHeight: 1.7 }} value={ini.usecases} onChange={e => setIni(d => ({ ...d, usecases: e.target.value }))} /></div>}
        </div>
      )}

      {/* ── EPICS & STORIES ── */}
      {tab === "epics" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Epics & User Stories</div>
            <button style={css.btnOut} onClick={() => gen("epics", "epics")}>◆ Generate Epics + Stories</button>
          </div>
          {loading === "epics" && <AIBox label="◆ Delivery Advisor — Creating Epics & Stories" loading />}
          {ini.epics && (
            <>
              <div style={css.card}><textarea rows={28} style={{ ...css.ta, fontSize: 12, lineHeight: 1.7 }} value={ini.epics} onChange={e => setIni(d => ({ ...d, epics: e.target.value }))} /></div>
              <AIBox label="◆ Delivery Advisor — Story Review">{`Ensure every story has testable acceptance criteria\nStories should be completable within a single sprint (2 weeks)\nEach epic maps to one use case — verify the traceability\nFlag any story that depends on another epic's completion as a dependency`}</AIBox>
            </>
          )}
        </div>
      )}

      {/* ── RISKS ── */}
      {tab === "risks" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Risk Register</div>
            <button style={css.btnOut} onClick={() => gen("riskReg", "risk_register")}>◆ Generate Risk Register</button>
          </div>
          {loading === "riskReg" && <AIBox label="◆ Risk Advisor — Identifying Risks" loading />}
          {ini.riskReg && <div style={css.card}><textarea rows={22} style={{ ...css.ta, fontSize: 13, lineHeight: 1.7 }} value={ini.riskReg} onChange={e => setIni(d => ({ ...d, riskReg: e.target.value }))} /></div>}
        </div>
      )}
    </div>
  );
}

// ─── Ideas (Stage 1 list + create) ───────────────────────────
export function Ideas({ setView }) {
  const { initiatives, foundation, addInitiative } = useApp();
  const [form, setForm] = useState({ title: "", source: "Executive Idea", sourceDetail: "", problem: "", opportunity: "" });
  const [aiQ, setAiQ] = useState(""); const [loadingQ, setLoadingQ] = useState(false);

  const askAI = async () => {
    if (!form.title) return;
    setLoadingQ(true);
    const text = await callAI("clarify", { foundation, initiative: { title: form.title, problem: form.problem } }).catch(() => "");
    setAiQ(text); setLoadingQ(false);
  };

  const create = async () => {
    if (!form.title.trim()) return;
    const ini = await addInitiative({
      title: form.title, source: form.source, source_detail: form.sourceDetail,
      problem: form.problem, opportunity: form.opportunity,
    });
    if (ini) setView("initiative_" + ini.id);
  };

  const ideas = initiatives.filter(i => i.stage === "idea");

  return (
    <div>
      <div style={css.h2}>Capture an Idea</div>
      <div style={css.sub}>Every great initiative starts here. AI will help you think it through.</div>

      <div style={css.card}>
        <label style={css.label}>Initiative Title</label>
        <input style={css.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Give this idea a working title" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={css.card}>
          <label style={css.label}>Source</label>
          <select style={{ ...css.input, cursor: "pointer" }} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
            {SOURCES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={css.card}>
          <label style={css.label}>Source Detail</label>
          <input style={css.input} value={form.sourceDetail} onChange={e => setForm(f => ({ ...f, sourceDetail: e.target.value }))} placeholder="e.g. Q4 executive kick-off, ticket #4421…" />
        </div>
      </div>
      <div style={css.card}>
        <label style={css.label}>Business Problem</label>
        <textarea rows={3} style={css.ta} value={form.problem} onChange={e => setForm(f => ({ ...f, problem: e.target.value }))} placeholder="What problem are we solving? Who experiences it?" />
      </div>
      <div style={css.card}>
        <label style={css.label}>Opportunity</label>
        <textarea rows={3} style={css.ta} value={form.opportunity} onChange={e => setForm(f => ({ ...f, opportunity: e.target.value }))} placeholder="What does solving this unlock?" />
        <button style={{ ...css.btnOut, marginTop: 10 }} onClick={askAI} disabled={!form.title}>◆ AI — Ask Me Questions</button>
        {(aiQ || loadingQ) && <AIBox label="◆ Product Intelligence — Clarifying Questions" loading={loadingQ}>{aiQ}</AIBox>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <div style={{ fontSize: 13, color: T.muted }}>Existing ideas: {ideas.length}</div>
        <button style={css.btnGold} onClick={create} disabled={!form.title.trim()}>Create Initiative →</button>
      </div>

      {ideas.length > 0 && (
        <div style={{ ...css.card, marginTop: 20 }}>
          <div style={css.secHead}>Open Ideas</div>
          {ideas.map(ini => (
            <div key={ini.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: T.ink3, borderRadius: 6, marginBottom: 6, cursor: "pointer" }}
              onClick={() => setView("initiative_" + ini.id)}>
              <span style={{ fontSize: 12, color: T.muted }}>{ini.slug}</span>
              <span style={{ fontSize: 13, color: T.loud, flex: 1 }}>{ini.title}</span>
              <Tag label={ini.source} color={T.muted} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { T, css, calcPivot, pivotTier, stageLabel, stageColor } from "../lib/tokens";
import { AIBox, Tag, ScoreRing, PivotSlider, AddNoteInput, PivotModal } from "../components/ui";
import { useApp } from "../contexts/AppContext";
import { callAI, createNote, updateInitiative } from "../lib/api";

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
  ["Potential",  "p", T.steel, "25%"],
  ["Innovation", "i", T.ice,   "20%"],
  ["Value",      "v", T.gold,  "15%"],
  ["Opportunity","o", T.green, "20%"],
  ["Timing",     "t", T.amber, "20%"],
];

// ─── Initiative Detail ────────────────────────────────────────
export function InitiativeDetail({ ini, setView }) {
  const { foundation, updateIni, orgId } = useApp();
  const [tab, setTab] = useState("discovery");
  const [loading, setLoading] = useState(null);
  const [pivotModal, setPivotModal] = useState(false);

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
        <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setPivotModal(true)} title="Click to see PIVOT math">
          <ScoreRing score={score} color={tier.color} size={64} />
          <div style={{ fontSize: 22, fontWeight: 900, color: tier.color, marginTop: -44, lineHeight: 1 }}>{score.toFixed(0)}</div>
          <div style={{ fontSize: 10, marginTop: 44, color: T.muted }}>PIVOT ⓘ</div>
          <Tag label={tier.label} color={tier.color} bg={tier.bg} />
        </div>
      </div>
      {pivotModal && <PivotModal ini={ini} onClose={() => setPivotModal(false)} />}

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

      {/* Approval bar — always visible */}
      <div style={{ ...css.card, borderColor: ini.approved ? T.green : T.gold, background: ini.approved ? "rgba(34,197,94,0.08)" : "rgba(212,168,67,0.06)", marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={!!ini.approved}
            onChange={async e => {
              const checked = e.target.checked;
              const newStage = checked ? "approved" : (ini.stage === "approved" ? "review" : ini.stage);
              const approvedDate = new Date().toLocaleDateString();
              setIni(d => ({ ...d, approved: checked, stage: newStage, approved_by: "Portfolio Review Board", approved_date: approvedDate }));
              await updateInitiative({ id: ini.id, approved: checked, stage: newStage, approved_by: "Portfolio Review Board", approved_date: approvedDate });
            }}
            style={{ width: 22, height: 22, accentColor: T.green, cursor: "pointer", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: ini.approved ? T.green : T.gold }}>
              {ini.approved ? "✓ Approved for Investment" : "Approve for Investment"}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
              {ini.approved
                ? `Approved${ini.approved_date ? " · " + ini.approved_date : ""}${ini.approved_by ? " · " + ini.approved_by : ""}`
                : "Check this box once leadership approves the investment decision."}
            </div>
          </div>
        </label>
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
                onChange={async e => {
                  const checked = e.target.checked;
                  const newStage = checked ? "approved" : ini.stage;
                  const approvedDate = new Date().toLocaleDateString();
                  setIni(d => ({ ...d, approved: checked, stage: newStage, approved_by: "Portfolio Review Board", approved_date: approvedDate }));
                  await updateInitiative({ id: ini.id, approved: checked, stage: newStage, approved_by: "Portfolio Review Board", approved_date: approvedDate });
                }}
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
  const { initiatives, foundation, addInitiative, updateIni } = useApp();
  const [form, setForm] = useState({ title: "", source: "Executive Idea", sourceDetail: "", problem: "", opportunity: "" });
  const [aiQ, setAiQ] = useState(""); const [loadingQ, setLoadingQ] = useState(false);

  // Wizard state
  const [wizardMode, setWizardMode] = useState(null); // null | "suggest" | "populate" | "wireframe"
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [userIdea, setUserIdea] = useState("");
  const [populating, setPopulating] = useState(false);
  const [populated, setPopulated] = useState(null); // the AI-populated fields

  // Wireframe mode state
  const [wireframeHtml, setWireframeHtml] = useState("");
  const [wireframeName, setWireframeName] = useState("");
  const [wireframeAnalyzing, setWireframeAnalyzing] = useState(false);

  const askAI = async () => {
    if (!form.title) return;
    setLoadingQ(true);
    const text = await callAI("clarify", { foundation, initiative: { title: form.title, problem: form.problem } }).catch(() => "");
    setAiQ(text); setLoadingQ(false);
  };

  // Mode 1: AI suggests initiatives
  const getSuggestions = async () => {
    setLoadingSuggest(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest_initiatives",
          payload: { foundation, initiatives },
        }),
      });
      const data = await res.json();
      const text = (data.text || "").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      setSuggestions(parsed);
    } catch(e) { console.error("suggest error", e); }
    setLoadingSuggest(false);
  };

  // Mode 2: Populate from user idea OR selected suggestion
  const populate = async (idea) => {
    setPopulating(true);
    setPopulated(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "populate_initiative",
          payload: { foundation, idea },
        }),
      });
      const data = await res.json();
      const text = (data.text || "").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      setPopulated(parsed);
    } catch(e) { console.error("populate error", e); }
    setPopulating(false);
  };

  // Mode 3: Populate from HTML wireframe
  const populateFromWireframe = async () => {
    if (!wireframeHtml.trim()) return;
    setWireframeAnalyzing(true);
    setPopulated(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "populate_initiative",
          payload: {
            foundation,
            idea: `[HTML WIREFRAME ANALYSIS]\n\nAnalyze the following HTML wireframe and infer the product initiative it represents. Extract:\n- What product/feature this wireframe is building\n- The user problem it solves\n- The opportunity it unlocks\n- Who the users are\n\nThen generate a complete initiative package exactly as you would for a text idea.\n\nWIREFRAME HTML:\n${wireframeHtml.slice(0, 12000)}`,
          },
        }),
      });
      const data = await res.json();
      const text = (data.text || "").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      setPopulated(parsed);
    } catch(e) { console.error("wireframe populate error", e); }
    setWireframeAnalyzing(false);
  };

  // Create from populated data
  const createFromPopulated = async () => {
    if (!populated) return;
    const ini = await addInitiative({
      title: populated.title,
      source: wizardMode === "wireframe" ? "HTML Wireframe" : selectedSuggestion ? "AI Suggestion" : "PM Idea",
      source_detail: wizardMode === "wireframe" ? wireframeName : selectedSuggestion ? "AI Portfolio Analysis" : userIdea,
      problem: populated.problem,
      opportunity: populated.opportunity,
    });
    if (ini) {
      // Save all the rich fields
      await updateInitiative({
        id: ini.id,
        evidence_interviews: populated.evidence_interviews,
        evidence_pain_confirmed: populated.evidence_pain_confirmed,
        evidence_revenue_opp: populated.evidence_revenue_opp,
        evidence_cost_savings: populated.evidence_cost_savings,
        evidence_competitive: populated.evidence_competitive,
        evidence_nps: populated.evidence_nps,
        pivot_p: populated.pivot_p,
        pivot_i: populated.pivot_i,
        pivot_v: populated.pivot_v,
        pivot_o: populated.pivot_o,
        pivot_t: populated.pivot_t,
        exec_brief: populated.exec_brief,
        personas: populated.personas,
        investment_requested: populated.investment_requested,
        eng_teams: populated.eng_teams,
        eng_sprints: populated.eng_sprints,
      });
      setView("initiative_" + ini.id);
    }
  };

  const create = async () => {
    if (!form.title.trim()) return;
    const ini = await addInitiative({
      title: form.title, source: form.source, source_detail: form.sourceDetail,
      problem: form.problem, opportunity: form.opportunity,
    });
    if (ini) setView("initiative_" + ini.id);
  };

  // Show all initiatives — this is the master list / capture page
  const ideas = [...initiatives].sort((a, b) => {
    const order = ["idea","discovery","review","approved","definition","delivery","handoff","closed"];
    return order.indexOf(a.stage) - order.indexOf(b.stage);
  });

  const cardStyle = { background: T.ink2, border: `1px solid ${T.border}`, borderRadius: 8, padding: 20, marginBottom: 16 };
  const PIVOT_LABELS = { pivot_p: "Problem", pivot_i: "Investment", pivot_v: "Value", pivot_o: "Org Fit", pivot_t: "Time Crit" };

  return (
    <div>
      <div style={css.h2}>Ideas · Stage 1</div>
      <div style={css.sub}>Capture a new initiative — manually or with AI doing the heavy lifting.</div>

      {/* ── Mode selector ── */}
      {!wizardMode && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div onClick={() => setWizardMode("manual")} style={{ ...cardStyle, cursor: "pointer", border: `1px solid ${T.border}`, textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✏️</div>
            <div style={{ fontWeight: 700, color: T.loud, marginBottom: 4 }}>Manual Entry</div>
            <div style={{ fontSize: 12, color: T.muted }}>I have a clear idea — let me fill in the details</div>
          </div>
          <div onClick={() => { setWizardMode("populate"); }} style={{ ...cardStyle, cursor: "pointer", border: `1px solid ${T.gold}40`, textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>◆</div>
            <div style={{ fontWeight: 700, color: T.gold, marginBottom: 4 }}>I Have an Idea</div>
            <div style={{ fontSize: 12, color: T.muted }}>Describe it in one sentence — AI does the rest</div>
          </div>
          <div onClick={() => { setWizardMode("suggest"); getSuggestions(); }} style={{ ...cardStyle, cursor: "pointer", border: `1px solid ${T.gold}40`, textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🧠</div>
            <div style={{ fontWeight: 700, color: T.gold, marginBottom: 4 }}>AI Suggest</div>
            <div style={{ fontSize: 12, color: T.muted }}>What should we build next? AI analyzes the portfolio</div>
          </div>
          <div onClick={() => setWizardMode("wireframe")} style={{ ...cardStyle, cursor: "pointer", border: `1px solid ${T.steel}40`, textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🖼</div>
            <div style={{ fontWeight: 700, color: T.steel, marginBottom: 4 }}>HTML Wireframe</div>
            <div style={{ fontSize: 12, color: T.muted }}>Upload a wireframe — AI reads the UI and builds the initiative</div>
          </div>
        </div>
      )}

      {/* ── Manual mode ── */}
      {wizardMode === "manual" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.loud }}>Manual Entry</div>
            <button style={css.btnGhost} onClick={() => setWizardMode(null)}>← Back</button>
          </div>
          <div style={cardStyle}>
            <label style={css.label}>Initiative Title</label>
            <input style={css.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Give this idea a working title" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={cardStyle}>
              <label style={css.label}>Source</label>
              <select style={{ ...css.input, cursor: "pointer" }} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={cardStyle}>
              <label style={css.label}>Source Detail</label>
              <input style={css.input} value={form.sourceDetail} onChange={e => setForm(f => ({ ...f, sourceDetail: e.target.value }))} placeholder="e.g. Q4 kick-off, ticket #4421…" />
            </div>
          </div>
          <div style={cardStyle}>
            <label style={css.label}>Business Problem</label>
            <textarea rows={3} style={css.ta} value={form.problem} onChange={e => setForm(f => ({ ...f, problem: e.target.value }))} placeholder="What problem are we solving? Who experiences it?" />
          </div>
          <div style={cardStyle}>
            <label style={css.label}>Opportunity</label>
            <textarea rows={3} style={css.ta} value={form.opportunity} onChange={e => setForm(f => ({ ...f, opportunity: e.target.value }))} placeholder="What does solving this unlock?" />
            <button style={{ ...css.btnOut, marginTop: 10 }} onClick={askAI} disabled={!form.title}>◆ AI — Ask Me Questions</button>
            {(aiQ || loadingQ) && <AIBox label="◆ Product Intelligence — Clarifying Questions" loading={loadingQ}>{aiQ}</AIBox>}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button style={css.btnGold} onClick={create} disabled={!form.title.trim()}>Create Initiative →</button>
          </div>
        </>
      )}

      {/* ── I Have an Idea mode ── */}
      {wizardMode === "populate" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.loud }}>◆ I Have an Idea — AI Will Do the Rest</div>
            <button style={css.btnGhost} onClick={() => { setWizardMode(null); setPopulated(null); setUserIdea(""); }}>← Back</button>
          </div>
          {!populated && (
            <div style={cardStyle}>
              <label style={css.label}>Describe your idea in one or two sentences</label>
              <textarea rows={4} style={css.ta} value={userIdea} onChange={e => setUserIdea(e.target.value)}
                placeholder="e.g. I want to build a self-serve onboarding flow so new customers can get value without talking to sales..." />
              <button style={{ ...css.btnGold, marginTop: 12 }} onClick={() => populate({ title: userIdea.slice(0, 80), idea: userIdea })} disabled={!userIdea.trim() || populating}>
                {populating ? "◆ AI is building your initiative..." : "◆ Build Full Initiative →"}
              </button>
            </div>
          )}
          {populated && !populating && (
            <>
              <div style={{ ...cardStyle, border: `1px solid ${T.gold}40`, background: "#0D1726" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>◆ AI-Generated Initiative Package</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: T.loud, marginBottom: 16 }}>{populated.title}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>PROBLEM</div>
                    <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.6 }}>{populated.problem}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>OPPORTUNITY</div>
                    <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.6 }}>{populated.opportunity}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {Object.entries(PIVOT_LABELS).map(([k, label]) => (
                    <div key={k} style={{ background: T.ink2, borderRadius: 6, padding: "6px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: T.muted }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: T.gold }}>{populated[k]}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>EXEC BRIEF</div>
                <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.6, marginBottom: 12 }}>{populated.exec_brief}</div>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>EVIDENCE FRAMING</div>
                <div style={{ fontSize: 12, color: T.loud, lineHeight: 1.6 }}>
                  Revenue opp: {populated.evidence_revenue_opp} · Competitive: {populated.evidence_competitive}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button style={css.btnGhost} onClick={() => { setPopulated(null); }}>↺ Regenerate</button>
                <button style={css.btnGold} onClick={createFromPopulated}>Create Initiative with All Fields →</button>
              </div>
            </>
          )}
          {populating && <div style={{ ...cardStyle, border: `1px solid ${T.gold}40`, textAlign: "center", padding: 40 }}>
            <div style={{ color: T.gold, fontWeight: 700, marginBottom: 8 }}>◆ Building your initiative...</div>
            <div style={{ color: T.muted, fontSize: 12 }}>AI is generating problem statement, opportunity, evidence framing, PIVOT scores, exec brief, and personas</div>
          </div>}
        </>
      )}

      {/* ── Wireframe mode ── */}
      {wizardMode === "wireframe" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.loud }}>🖼 HTML Wireframe → Initiative</div>
            <button style={css.btnGhost} onClick={() => { setWizardMode(null); setPopulated(null); setWireframeHtml(""); setWireframeName(""); }}>← Back</button>
          </div>

          {!populated && (
            <div style={cardStyle}>
              <label style={css.label}>Upload HTML Wireframe</label>
              <div style={{ marginBottom: 12 }}>
                <input
                  type="file"
                  accept=".html,.htm"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setWireframeName(file.name);
                    const reader = new FileReader();
                    reader.onload = ev => setWireframeHtml(ev.target.result || "");
                    reader.readAsText(file);
                  }}
                  style={{ color: T.loud, fontSize: 13 }}
                />
              </div>
              {wireframeName && (
                <div style={{ fontSize: 12, color: T.steel, marginBottom: 12 }}>
                  ✓ Loaded: <strong>{wireframeName}</strong> ({Math.round(wireframeHtml.length / 1024)}KB)
                </div>
              )}
              {wireframeHtml && (
                <>
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 1.6 }}>
                    AI will analyze the wireframe's UI structure, infer the product initiative, and generate a complete package — title, problem, opportunity, personas, PIVOT scores, and more.
                  </div>
                  <button
                    style={{ ...css.btnGold, marginTop: 4 }}
                    onClick={populateFromWireframe}
                    disabled={wireframeAnalyzing}
                  >
                    {wireframeAnalyzing ? "◆ AI is reading your wireframe..." : "◆ Analyze Wireframe & Build Initiative →"}
                  </button>
                </>
              )}
              {!wireframeHtml && (
                <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>
                  Accepts .html or .htm files. Works best with single-page wireframes or prototype screens.
                </div>
              )}
            </div>
          )}

          {populated && !wireframeAnalyzing && (
            <>
              <div style={{ ...cardStyle, border: `1px solid ${T.steel}40`, background: "#0D1726" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.steel, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>🖼 Wireframe Analysis — AI-Generated Initiative Package</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: T.loud, marginBottom: 16 }}>{populated.title}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>PROBLEM INFERRED FROM UI</div>
                    <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.6 }}>{populated.problem}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>OPPORTUNITY</div>
                    <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.6 }}>{populated.opportunity}</div>
                  </div>
                </div>
                {populated.exec_brief && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>EXECUTIVE BRIEF</div>
                    <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.6 }}>{populated.exec_brief}</div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {["pivot_p","pivot_i","pivot_v","pivot_o","pivot_t"].map(k => populated[k] && (
                    <span key={k} style={{ fontSize: 11, color: T.steel, background: T.steel + "22", borderRadius: 4, padding: "2px 8px" }}>
                      {k.replace("pivot_","")}={populated[k]}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button style={css.btnGhost} onClick={() => { setPopulated(null); setWireframeHtml(""); setWireframeName(""); }}>↺ Try Another</button>
                <button style={css.btnGold} onClick={createFromPopulated}>Create Initiative →</button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── AI Suggest mode ── */}
      {wizardMode === "suggest" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.loud }}>🧠 AI Portfolio Analysis — What Should We Build Next?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={css.btnGhost} onClick={() => { getSuggestions(); }} disabled={loadingSuggest}>↺ Refresh</button>
              <button style={css.btnGhost} onClick={() => { setWizardMode(null); setSuggestions([]); setPopulated(null); setSelectedSuggestion(null); }}>← Back</button>
            </div>
          </div>

          {loadingSuggest && <div style={{ ...cardStyle, border: `1px solid ${T.gold}40`, textAlign: "center", padding: 40 }}>
            <div style={{ color: T.gold, fontWeight: 700 }}>◆ Analyzing portfolio gaps...</div>
            <div style={{ color: T.muted, fontSize: 12, marginTop: 8 }}>Reviewing strategy, competitors, existing pipeline, and capability gaps</div>
          </div>}

          {!loadingSuggest && suggestions.length > 0 && !selectedSuggestion && !populated && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {suggestions.map((s, i) => (
                <div key={i} style={{ ...cardStyle, border: `1px solid ${T.gold}40`, cursor: "pointer" }}
                  onClick={() => setSelectedSuggestion(s)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: T.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                        {["🥇 Priority 1", "🥈 Priority 2", "🥉 Priority 3"][i]} · {s.source}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.loud, marginBottom: 8 }}>{s.title}</div>
                      <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.6, marginBottom: 8 }}>{s.problem}</div>
                      <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{s.rationale}</div>
                    </div>
                    <div style={{ marginLeft: 16, color: T.gold, fontSize: 18 }}>→</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedSuggestion && !populated && !populating && (
            <div style={cardStyle}>
              <div style={{ fontSize: 12, color: T.gold, fontWeight: 700, marginBottom: 8 }}>Selected: {selectedSuggestion.title}</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>AI will now fully populate this initiative with problem statement, evidence, PIVOT scores, exec brief, personas, and investment estimate.</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={css.btnGhost} onClick={() => setSelectedSuggestion(null)}>← Choose Different</button>
                <button style={css.btnGold} onClick={() => populate(selectedSuggestion)}>◆ Build Full Initiative →</button>
              </div>
            </div>
          )}

          {populating && <div style={{ ...cardStyle, border: `1px solid ${T.gold}40`, textAlign: "center", padding: 40 }}>
            <div style={{ color: T.gold, fontWeight: 700, marginBottom: 8 }}>◆ Building full initiative package...</div>
            <div style={{ color: T.muted, fontSize: 12 }}>Generating problem, opportunity, evidence, PIVOT scores, exec brief, personas</div>
          </div>}

          {populated && !populating && (
            <>
              <div style={{ ...cardStyle, border: `1px solid ${T.gold}40`, background: "#0D1726" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>◆ AI-Generated Initiative Package</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: T.loud, marginBottom: 16 }}>{populated.title}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>PROBLEM</div>
                    <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.6 }}>{populated.problem}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>OPPORTUNITY</div>
                    <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.6 }}>{populated.opportunity}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {Object.entries(PIVOT_LABELS).map(([k, label]) => (
                    <div key={k} style={{ background: T.ink2, borderRadius: 6, padding: "6px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: T.muted }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: T.gold }}>{populated[k]}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>EXEC BRIEF</div>
                <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.6, marginBottom: 12 }}>{populated.exec_brief}</div>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>EVIDENCE FRAMING</div>
                <div style={{ fontSize: 12, color: T.loud, lineHeight: 1.6 }}>
                  Revenue opp: {populated.evidence_revenue_opp} · Competitive: {populated.evidence_competitive}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button style={css.btnGhost} onClick={() => { setPopulated(null); setSelectedSuggestion(null); }}>↺ Regenerate</button>
                <button style={css.btnGold} onClick={createFromPopulated}>Create Initiative with All Fields →</button>
              </div>
            </>
          )}
        </>
      )}

      {ideas.length > 0 && (
        <div style={{ ...css.card, marginTop: 20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={css.secHead}>All Initiatives — Pipeline Overview</div>
            <div style={{ fontSize:11, color:T.muted }}>{ideas.length} total</div>
          </div>
          {ideas.map(ini => (
            <div key={ini.id}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:T.ink3, borderRadius:6, marginBottom:6, cursor:"pointer", borderLeft:`3px solid ${stageColor(ini.stage)}` }}
              onClick={() => setView("initiative_" + ini.id)}>
              <span style={{ fontSize:11, color:T.muted, minWidth:60 }}>{ini.slug}</span>
              <span style={{ fontSize:13, color:T.loud, flex:1, fontWeight:600 }}>{ini.title}</span>
              <Tag label={stageLabel(ini.stage)} color={stageColor(ini.stage)} />
              <span style={{ fontSize:11, color:T.muted }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
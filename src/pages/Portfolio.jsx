import { useState, useRef, useEffect, useCallback } from "react";
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

// ─── PI Planning — Interactive Gantt Timeline ─────────────────
const BAR_COLORS = [
  "#D4A843","#2E6DA4","#2ECC71","#9B59B6","#1ABC9C",
  "#E8913A","#E74C3C","#7FB3D3","#F39C12","#27AE60",
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getDefaultDates(ini) {
  const year = new Date().getFullYear();
  const stageDefaults = {
    idea:       [new Date(year,6,1),  new Date(year,8,30)],
    discovery:  [new Date(year,6,1),  new Date(year,8,30)],
    review:     [new Date(year,3,1),  new Date(year,5,30)],
    approved:   [new Date(year,3,1),  new Date(year,5,30)],
    definition: [new Date(year,3,1),  new Date(year,5,30)],
    delivery:   [new Date(year,0,1),  new Date(year,2,31)],
    handoff:    [new Date(year,0,1),  new Date(year,2,31)],
  };
  const [s, e] = stageDefaults[ini.stage] || [new Date(year,0,1), new Date(year,11,31)];
  return {
    start: ini.roadmap_start ? new Date(ini.roadmap_start) : s,
    end:   ini.roadmap_end   ? new Date(ini.roadmap_end)   : e,
  };
}

function toDateStr(d) {
  return d.toISOString().split("T")[0];
}

function GanttTimeline({ initiatives, updateIni }) {
  const timelineRef = useRef(null);
  const dragging = useRef(null);

  const year = new Date().getFullYear();
  const timelineStart = new Date(year, 0, 1);
  const timelineEnd   = new Date(year, 11, 31);
  const totalDays = (timelineEnd - timelineStart) / 86400000;

  const dayToPercent = (d) => ((d - timelineStart) / 86400000) / totalDays * 100;

  const onMouseDown = (e, id, type) => {
    e.preventDefault();
    const ini = initiatives.find(i => i.id === id);
    const { start, end } = getDefaultDates(ini);
    dragging.current = { id, type, startX: e.clientX, origStart: start, origEnd: end };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!dragging.current || !timelineRef.current) return;
    const { id, type, startX, origStart, origEnd } = dragging.current;
    const rect = timelineRef.current.getBoundingClientRect();
    const pxPerDay = rect.width / totalDays;
    const deltaDays = Math.round((e.clientX - startX) / pxPerDay);

    let newStart = new Date(origStart);
    let newEnd   = new Date(origEnd);

    if (type === "move") {
      newStart = new Date(origStart.getTime() + deltaDays * 86400000);
      newEnd   = new Date(origEnd.getTime()   + deltaDays * 86400000);
    } else if (type === "left") {
      newStart = new Date(origStart.getTime() + deltaDays * 86400000);
      if (newStart >= newEnd) newStart = new Date(newEnd.getTime() - 86400000 * 7);
    } else if (type === "right") {
      newEnd = new Date(origEnd.getTime() + deltaDays * 86400000);
      if (newEnd <= newStart) newEnd = new Date(newStart.getTime() + 86400000 * 7);
    }

    if (newStart < timelineStart) { const d = timelineStart - newStart; newStart = new Date(timelineStart); if (type==="move") newEnd = new Date(newEnd.getTime()+d); }
    if (newEnd > timelineEnd)     { const d = newEnd - timelineEnd;     newEnd = new Date(timelineEnd);     if (type==="move") newStart = new Date(newStart.getTime()-d); }

    updateIni(id, d => ({ ...d, roadmap_start: toDateStr(newStart), roadmap_end: toDateStr(newEnd) }));
  };

  const onMouseUp = () => {
    dragging.current = null;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  useEffect(() => () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }, []);

  return (
    <div style={css.card}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={css.secHead}>Program Roadmap — {year}</div>
        <div style={{ fontSize:11, color:T.muted }}>Drag bars to move · Drag edges to resize</div>
      </div>

      <div ref={timelineRef} style={{ position:"relative", marginBottom:8 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", marginBottom:6 }}>
          {MONTHS.map(m => (
            <div key={m} style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"center", borderRight:`1px solid ${T.border}`, paddingBottom:4 }}>{m}</div>
          ))}
        </div>

        <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, display:"grid", gridTemplateColumns:"repeat(4,1fr)", pointerEvents:"none", zIndex:0 }}>
          {["Q1","Q2","Q3","Q4"].map((q,i) => (
            <div key={q} style={{ background: i%2===0 ? "rgba(255,255,255,0.02)" : "transparent", borderRight:`1px solid ${T.border}` }}>
              <div style={{ fontSize:9, color:T.border, fontWeight:700, padding:"2px 6px" }}>{q}</div>
            </div>
          ))}
        </div>

        <div style={{ position:"relative", zIndex:1 }}>
          {initiatives.map((ini, idx) => {
            const { start, end } = getDefaultDates(ini);
            const left  = dayToPercent(start);
            const width = dayToPercent(end) - left;
            const color = ini.bar_color || BAR_COLORS[idx % BAR_COLORS.length];

            return (
              <div key={ini.id} style={{ position:"relative", height:36, marginBottom:6 }}>
                <div style={{ position:"absolute", right:`${100 - left + 0.5}%`, top:"50%", transform:"translateY(-50%)", fontSize:10, color:T.muted, whiteSpace:"nowrap", textAlign:"right", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis" }}>
                  {ini.slug}
                </div>
                <div
                  onMouseDown={e => onMouseDown(e, ini.id, "move")}
                  style={{ position:"absolute", left:`${left}%`, width:`${width}%`, top:4, height:28, background:color, borderRadius:6, cursor:"grab", display:"flex", alignItems:"center", justifyContent:"center", userSelect:"none", boxShadow:`0 2px 8px ${color}55`, minWidth:8 }}>
                  <div onMouseDown={e => { e.stopPropagation(); onMouseDown(e, ini.id, "left"); }}
                    style={{ position:"absolute", left:0, top:0, bottom:0, width:8, cursor:"ew-resize", background:"rgba(0,0,0,0.25)", borderRadius:"6px 0 0 6px" }}/>
                  <span style={{ fontSize:10, fontWeight:700, color:"#fff", padding:"0 12px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%", pointerEvents:"none" }}>
                    {width > 8 ? ini.title.substring(0,24) + (ini.title.length>24?"…":"") : ""}
                  </span>
                  <div onMouseDown={e => { e.stopPropagation(); onMouseDown(e, ini.id, "right"); }}
                    style={{ position:"absolute", right:0, top:0, bottom:0, width:8, cursor:"ew-resize", background:"rgba(0,0,0,0.25)", borderRadius:"0 6px 6px 0" }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop:16 }}>
        <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Initiative Details</div>
        {initiatives.map((ini, idx) => {
          const { start, end } = getDefaultDates(ini);
          const color = ini.bar_color || BAR_COLORS[idx % BAR_COLORS.length];
          return (
            <div key={ini.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"7px 0", borderBottom:`1px solid ${T.border}` }}>
              <input type="color" value={color}
                onChange={e => updateIni(ini.id, d => ({ ...d, bar_color: e.target.value }))}
                style={{ width:24, height:24, border:"none", borderRadius:4, cursor:"pointer", background:"none", padding:0 }} title="Change bar color"/>
              <div style={{ fontSize:12, color:T.loud, fontWeight:600, flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ini.title}</div>
              <Tag label={stageLabel(ini.stage)} color={stageColor(ini.stage)} />
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:10, color:T.muted }}>Start</span>
                <input type="date" value={toDateStr(start)}
                  onChange={e => updateIni(ini.id, d => ({ ...d, roadmap_start: e.target.value }))}
                  style={{ ...css.input, width:130, fontSize:11, padding:"4px 8px" }} />
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:10, color:T.muted }}>End</span>
                <input type="date" value={toDateStr(end)}
                  onChange={e => updateIni(ini.id, d => ({ ...d, roadmap_end: e.target.value }))}
                  style={{ ...css.input, width:130, fontSize:11, padding:"4px 8px" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PI Planning ──────────────────────────────────────────────
export function PIPlanning() {
  const { initiatives, foundation, updateIni } = useApp();
  const [loading, setLoading] = useState(false);
  const [piCards, setPiCards] = useState(null);
  const approved = initiatives.filter(i => i.approved);

  const genPI = async () => {
    setLoading(true);
    const text = await callAI("pi_planning", { foundation, initiatives }).catch(() => "");
    if (text) {
      const sections = [
        { key:"objectives",   title:"PI Objectives",            icon:"◎", color:T.gold   },
        { key:"risks",        title:"Risks",                    icon:"⚠", color:T.red    },
        { key:"roam",         title:"ROAM Status",              icon:"◈", color:T.amber  },
        { key:"dependencies", title:"Cross-team Dependencies",  icon:"⊕", color:T.steel  },
        { key:"capacity",     title:"Capacity & Load",          icon:"△", color:T.teal   },
        { key:"confidence",   title:"Confidence Vote",          icon:"✓", color:T.green  },
      ];
      const parts = text.split(/\n(?=\d+\)|\d+\.)/);
      const cards = sections.map((sec, i) => ({ ...sec, content: parts[i] || "" }));
      setPiCards(cards);
      approved.forEach(ini => updateIni(ini.id, d => ({ ...d, piPlanning: text })));
    }
    setLoading(false);
  };

  // Called by Chatty to update a specific card
  const updateCard = useCallback((cardKey, newContent) => {
    setPiCards(prev => prev
      ? prev.map(c => c.key === cardKey ? { ...c, content: newContent } : c)
      : prev
    );
  }, []);

  return (
    <div>
      <div style={css.h2}>PI Planning</div>
      <div style={css.sub}>Program Increment planning — interactive roadmap, objectives, risks, and dependencies.</div>

      <GanttTimeline initiatives={initiatives} updateIni={updateIni} />

      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
        <button style={css.btnGold} onClick={genPI} disabled={loading || !approved.length}>
          {loading ? "Generating…" : "◆ Generate PI Planning Package"}
        </button>
        {!approved.length && <span style={{ fontSize:12, color:T.muted }}>Approve at least one initiative first</span>}
      </div>

      {loading && <AIBox label="◆ SAFe RTE — Building PI Package" loading />}

      {piCards && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:T.gold, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:14 }}>PI Planning Package</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {piCards.map(card => (
              <div key={card.key} style={{ ...css.card, borderLeft:`3px solid ${card.color}`, margin:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:16, color:card.color }}>{card.icon}</span>
                  <div style={{ fontSize:12, fontWeight:700, color:card.color, textTransform:"uppercase", letterSpacing:"0.08em" }}>{card.title}</div>
                </div>
                <textarea rows={8} style={{ ...css.ta, fontSize:12, lineHeight:1.7 }}
                  value={card.content}
                  onChange={e => setPiCards(prev => prev.map(c => c.key===card.key ? {...c, content:e.target.value} : c))} />
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:8, marginTop:16 }}>
            <button style={css.btnGhost} onClick={() => {
              const full = piCards.map(c => `## ${c.title}\n\n${c.content}`).join("\n\n---\n\n");
              navigator.clipboard.writeText(full);
            }}>Copy All</button>
            <button style={css.btnGhost} onClick={genPI}>↻ Regenerate</button>
          </div>
        </div>
      )}

      {/* PI Planning Chatty hint — shown when cards are live */}
      {piCards && (
        <div style={{ ...css.card, marginTop:12, background:"rgba(212,168,67,0.06)", border:`1px solid ${T.goldB}`, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18, color:T.gold }}>◆</span>
          <div style={{ fontSize:12, color:T.muted }}>
            <strong style={{ color:T.gold }}>Chatty knows you're on PI Planning.</strong>
            {" "}Ask: <em>"Help me deepen the Risks card"</em> or <em>"Who are my cross-team dependencies?"</em> and Chatty will update the cards directly.
          </div>
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

// ─── Context-aware suggestion bubbles per page ────────────────
const PAGE_BUBBLES = {
  dashboard: [
    { label: "Summarize my pipeline", prompt: "Give me a quick summary of my full initiative pipeline — what's moving, what's stuck, and what needs attention this week." },
    { label: "What should I prioritize?", prompt: "Based on my PIVOT scores and WSJF rankings, what are the top 2-3 initiatives I should focus on right now?" },
    { label: "Any risks I should flag?", prompt: "Looking across all my initiatives, what risks or blockers should I be aware of?" },
  ],
  foundation: [
    { label: "Review my OKRs", prompt: "Review my current OKRs. Are they well-structured, measurable, and appropriately ambitious?" },
    { label: "Suggest a missing theme", prompt: "Looking at my strategic themes, are there any critical areas missing that I should consider adding?" },
    { label: "OKR health check", prompt: "Do my initiatives map well to my OKRs? Are there OKRs with no initiative coverage?" },
  ],
  ideas: [
    { label: "Help me frame a problem statement", prompt: "I want to write a strong problem statement for a new initiative. Ask me questions to help me frame it well." },
    { label: "What evidence do I need?", prompt: "What types of evidence should I gather before moving an initiative from Idea to Discovery?" },
    { label: "Score this with PIVOT", prompt: "Walk me through scoring my newest initiative with the PIVOT framework. Ask me each dimension one at a time." },
  ],
  discovery: [
    { label: "What questions should I ask users?", prompt: "I'm running discovery interviews. What are the 5 best questions to validate the problem for my initiative?" },
    { label: "Help me write a hypothesis", prompt: "Help me write a testable product hypothesis for my discovery initiative." },
    { label: "Am I ready for Executive Review?", prompt: "What criteria should my initiative meet before moving from Discovery to Executive Review?" },
  ],
  execreview: [
    { label: "Build my exec pitch", prompt: "Help me structure a compelling 3-minute executive pitch for my initiative. Ask me what you need." },
    { label: "What objections will I face?", prompt: "What are the most likely objections leadership will raise about my initiative, and how should I prepare to address them?" },
    { label: "Sharpen my ROI story", prompt: "Help me strengthen the ROI case for my initiative. What financial and strategic angles should I highlight?" },
  ],
  delivery: [
    { label: "Help me with PI Risks", prompt: "Let's work on the Risks card for my PI Planning package. Ask me targeted questions to identify and document risks for this program increment." },
    { label: "Who are my dependencies?", prompt: "Help me identify and document cross-team dependencies for my current PI. What teams and integrations should I be thinking about?" },
    { label: "Draft PI Objectives", prompt: "Help me write strong PI Objectives for my approved initiatives. Ask me what you need about each one." },
    { label: "Run a confidence vote", prompt: "Walk me through a PI confidence vote. What factors should my team consider, and what score would you recommend based on current data?" },
    { label: "Check capacity", prompt: "Help me think through capacity planning for this PI. What squads and sprint capacity do I need to account for?" },
  ],
  portfolio: [
    { label: "Rank my initiatives", prompt: "Based on WSJF and PIVOT scores, which initiatives should be in the next PI and which should be deferred?" },
    { label: "Find my biggest risk", prompt: "Which initiative in my portfolio carries the highest execution risk right now?" },
    { label: "What's missing from my portfolio?", prompt: "Looking at my strategic themes and OKRs, what capability or initiative type is missing from my portfolio?" },
  ],
  definition: [
    { label: "Write epics and stories", prompt: "Help me break down my initiative into epics and user stories. Ask me what you need about the initiative first." },
    { label: "Review my acceptance criteria", prompt: "Help me write strong, testable acceptance criteria for my next user story." },
    { label: "Identify edge cases", prompt: "What edge cases and failure modes should I consider for my initiative before moving to delivery?" },
  ],
  handoff: [
    { label: "What's missing from my handoff?", prompt: "Review the completeness of my engineering handoff package. What's missing and how critical is each gap?" },
    { label: "Help me write a risk register", prompt: "Help me build a risk register for my engineering handoff. Ask me about the initiative and I'll provide details." },
    { label: "Clarify my acceptance criteria", prompt: "Help me sharpen the acceptance criteria in my handoff package to be unambiguous for engineering." },
  ],
};

// ─── Chatty ───────────────────────────────────────────────────
export function Chatty({ currentView }) {
  const { foundation, initiatives, userName } = useApp();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{
    role: "assistant",
    text: `Hi ${userName || ""}! I'm your product intelligence advisor. I know your full pipeline — ${initiatives.length} initiatives across all stages. What do you need?`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  // Derive the base page key for bubble selection
  const pageKey = currentView.startsWith("initiative_") ? "ideas"
    : currentView === "delivery" ? "delivery"
    : currentView;

  const bubbles = PAGE_BUBBLES[pageKey] || PAGE_BUBBLES.dashboard;

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  // Update greeting when initiatives load
  useEffect(() => {
    setMsgs(m => [{
      ...m[0],
      text: `Hi ${userName || ""}! I'm your product intelligence advisor. I know your full pipeline — ${initiatives.length} initiatives across all stages. What do you need?`,
    }, ...m.slice(1)]);
  }, [initiatives.length, userName]);

  // Update context hint when page changes
  useEffect(() => {
    if (!open) return;
    const pageLabels = {
      dashboard: "Dashboard", foundation: "Foundation", ideas: "Ideas", discovery: "Discovery",
      execreview: "Executive Review", definition: "Definition", delivery: "PI Planning",
      portfolio: "Portfolio", handoff: "Handoff",
    };
    const label = pageLabels[pageKey] || pageKey;
    // Only inject context message if user has sent at least one message
    if (msgs.length > 1) {
      setMsgs(m => [...m, {
        role: "assistant",
        text: `📍 You're now on the **${label}** page. I've updated my suggestions below — or just ask me anything.`,
      }]);
    }
  }, [currentView]);

  const send = async (userPrompt) => {
    const message = userPrompt || input;
    if (!message.trim()) return;
    setInput("");
    setLoading(true);
    const history = msgs.slice(-8).map(m => ({ role: m.role, content: m.text }));
    setMsgs(m => [...m, { role: "user", text: message }]);
    const text = await callAI("chatty", {
      foundation, initiatives, currentView, userName,
      question: message, messages: history,
    }).catch(() => "I encountered an error. Please try again.");
    setMsgs(m => [...m, { role: "assistant", text }]);
    setLoading(false);
  };

  return (
    <>
      {/* Floating toggle button */}
      <button onClick={() => setOpen(o => !o)}
        style={{ position: "fixed", bottom: 24, right: 24, width: 52, height: 52, borderRadius: "50%", background: T.gold, border: "none", color: T.ink, fontSize: 22, cursor: "pointer", boxShadow: "0 4px 20px rgba(212,168,67,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
        {open ? "✕" : "◆"}
      </button>

      {open && (
        <div style={{ position: "fixed", bottom: 88, right: 24, width: 400, height: 580, background: T.ink2, border: `1px solid ${T.border}`, borderRadius: 14, display: "flex", flexDirection: "column", zIndex: 1000, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>

          {/* Header */}
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, color: T.gold }}>◆</span>
            <span style={{ fontWeight: 700, color: T.loud }}>Chatty</span>
            <span style={{ fontSize: 11, color: T.muted, marginLeft: 4 }}>Your Product Intelligence Advisor</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ marginBottom: 12, display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "88%", padding: "9px 13px", borderRadius: 10, fontSize: 13, lineHeight: 1.55, background: m.role === "user" ? T.goldD : T.ink3, color: m.role === "user" ? T.gold : T.body, border: `1px solid ${m.role === "user" ? T.goldB : T.border}`, whiteSpace: "pre-wrap" }}>{m.text}</div>
              </div>
            ))}
            {loading && <div style={{ color: T.gold, fontStyle: "italic", fontSize: 12, padding: "4px 12px" }}>◆ Thinking…</div>}
            <div ref={endRef} />
          </div>

          {/* Context-aware suggestion bubbles */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Suggestions for this page
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {bubbles.map((b, i) => (
                <button key={i} onClick={() => send(b.prompt)} disabled={loading}
                  style={{ fontSize: 11, padding: "5px 10px", borderRadius: 20, border: `1px solid ${T.goldB}`, background: "transparent", color: T.gold, cursor: "pointer", lineHeight: 1.3, textAlign: "left", transition: "background 0.15s" }}
                  onMouseEnter={e => e.target.style.background = T.goldD}
                  onMouseLeave={e => e.target.style.background = "transparent"}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", display: "flex", gap: 8 }}>
            <input style={{ ...css.input, flex: 1, fontSize: 13 }} value={input} onChange={e => setInput(e.target.value)}
              placeholder="Ask anything about your portfolio…"
              onKeyDown={e => e.key === "Enter" && !loading && send()} />
            <button style={{ ...css.btnGold, padding: "8px 14px" }} onClick={() => send()} disabled={loading || !input.trim()}>→</button>
          </div>
        </div>
      )}
    </>
  );
}
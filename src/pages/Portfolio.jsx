import { useState, useRef, useEffect, useCallback } from "react";
import { T, css, calcPivot, pivotTier, calcWSJF, wsjfColor, stageLabel, stageColor } from "../lib/tokens";
import { AIBox, Tag } from "../components/ui";
import { useApp } from "../contexts/AppContext";
import { callAI } from "../lib/api";

// ─── Portfolio ────────────────────────────────────────────────
export function Portfolio({ setView }) {
  const { initiatives, foundation, updateIni, roadmapLastSaved, saveRoadmapTimestamp } = useApp();
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
      <div style={css.h2}>Innovation Pipeline · Stage 3</div>
      <div style={css.sub}>WSJF prioritization, approval, and PI selection across all initiatives.</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button style={css.btnOut} onClick={getSummary}>◆ AI Portfolio Analysis</button>
      </div>
      {loading && <AIBox label="◆ Portfolio Advisor — Analyzing" loading />}

      {/* Structured AI Portfolio Analysis */}
      {aiSummary && !loading && (
        <div style={{ marginBottom: 24 }}>
          {/* Parse markdown into sections */}
          {(() => {
            const sections = aiSummary
              .split(/\n(?=##\s)/)
              .filter(s => s.trim());

            return sections.map((section, si) => {
              const lines = section.split("\n").filter(l => l.trim());
              const heading = lines[0]?.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
              const body = lines.slice(1);

              // Parse initiatives within each section
              const initiatives_found = [];
              let current = null;
              body.forEach(line => {
                const clean = line.replace(/\*\*/g, "").replace(/^#+\s*/, "").replace(/^-{3,}$/, "").trim();
                if (!clean) return;
                if (line.match(/^###/)) {
                  if (current) initiatives_found.push(current);
                  current = { title: clean, details: [] };
                } else if (current) {
                  if (clean.startsWith("Stage:") || clean.startsWith("Rationale:") || clean.startsWith("Reason:") || clean.startsWith("Recommended")) {
                    current.details.push(clean);
                  } else if (clean.length > 10 && !clean.match(/^\|/)) {
                    current.details.push(clean);
                  }
                }
              });
              if (current) initiatives_found.push(current);

              const hasCards = initiatives_found.length > 0;
              const plainText = body
                .filter(l => !l.match(/^#+/) && !l.match(/^-{3,}$/) && l.trim())
                .map(l => l.replace(/\*\*/g, "").replace(/^>\s*/, "").trim())
                .filter(Boolean)
                .join(" ");

              return (
                <div key={si} style={{ marginBottom: 16 }}>
                  {/* Section header */}
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.gold, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${T.border}` }}>
                    ◆ {heading}
                  </div>

                  {hasCards ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {initiatives_found.map((item, ii) => {
                        const isDefer = item.title.toLowerCase().includes("defer");
                        const isConcern = item.title.toLowerCase().includes("concern") || item.title.toLowerCase().includes("dependency");
                        const color = isDefer ? T.amber : isConcern ? T.red : T.green;
                        return (
                          <div key={ii} style={{ background: T.ink3, border: `1px solid ${T.border}`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "12px 16px" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 6 }}>{item.title}</div>
                            {item.details.slice(0, 4).map((d, di) => (
                              <div key={di} style={{ fontSize: 12, color: T.body, lineHeight: 1.6, marginBottom: 4 }}>{d}</div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : plainText ? (
                    <div style={{ fontSize: 13, color: T.body, lineHeight: 1.7, background: T.ink3, borderRadius: 8, padding: "12px 16px", border: `1px solid ${T.border}` }}>
                      {plainText}
                    </div>
                  ) : null}
                </div>
              );
            });
          })()}
        </div>
      )}

      <div style={{ ...css.card, background: T.ink3, padding: "10px 16px", marginBottom: 0, borderRadius: "10px 10px 0 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px 80px 90px 70px", gap: 8, alignItems: "center" }}>
          {["Initiative", "Business Value", "Time Criticality", "Risk Reduction", "Effort (Job Size)", "WSJF", "PIVOT", "Approved $", "Approve"].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
          ))}
        </div>
      </div>

      {sorted.map((ini, idx) => {
        // Read WSJF scores from flat DB columns, fall back to legacy portfolioScore object
        const ps = {
          bizValue:        ini.wsjf_biz_value     || ini.portfolioScore?.bizValue       || 0,
          timeCriticality: ini.wsjf_time_crit      || ini.portfolioScore?.timeCriticality || 0,
          riskReduction:   ini.wsjf_risk_reduction || ini.portfolioScore?.riskReduction   || 0,
          effort:          ini.wsjf_effort         || ini.portfolioScore?.effort           || 0,
        };
        const wsjf = calcWSJF(ini);
        const pivot = calcPivot(ini.pivot);
        const tier = pivotTier(pivot);
        const wc = wsjfColor(wsjf);
        return (
          <div key={ini.id} style={{ ...css.card, marginBottom: 4, borderRadius: idx === sorted.length - 1 ? "0 0 10px 10px" : "0", borderTop: "none", padding: "14px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px 80px 90px 70px", gap: 8, alignItems: "center" }}>
              <div style={{ cursor: setView ? "pointer" : "default" }} onClick={() => setView && setView("initiative_" + ini.id)}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.loud }}>{ini.title} {setView && <span style={{ color: T.muted, fontSize: 11 }}>→</span>}</div>
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
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>APPROVED $</div>
                {ini.approved ? (
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.green }}>
                    ${Number(ini.investment?.approved || ini.investment_requested || 0).toLocaleString()}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: T.muted }}>—</div>
                )}
                {ini.roadmap_start && (
                  <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>
                    {new Date(ini.roadmap_start + "T00:00:00").toLocaleDateString("en-US",{month:"short",year:"numeric"})}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>APPROVE</div>
                <input type="checkbox" checked={!!ini.approved}
                  onChange={e => {
                    const checked = e.target.checked;
                    const newStage = checked ? "approved" : (ini.stage === "approved" ? "review" : ini.stage);
                    updateIni(ini.id, d => ({ ...d, approved: checked, stage: newStage,
                      approved_by: checked ? (d.approved_by || "Portfolio Review") : d.approved_by,
                      approved_date: checked ? (d.approved_date || new Date().toISOString().slice(0,10)) : d.approved_date,
                    }));
                  }}
                  style={{ width: 20, height: 20, cursor: "pointer", accentColor: T.green }} />
                {ini.approved && <div style={{ fontSize: 9, color: T.green, marginTop: 3 }}>✓ Approved</div>}
              </div>
            </div>
          </div>
        );
      })}

      {/* Quarterly approved $ totals */}
      {(() => {
        const approvedWithDates = sorted.filter(i => i.approved && i.roadmap_start);
        if (!approvedWithDates.length) return null;
        const qMap = {};
        approvedWithDates.forEach(ini => {
          const d = new Date(ini.roadmap_start + "T00:00:00");
          const q = `Q${Math.ceil((d.getMonth()+1)/3)} ${d.getFullYear()}`;
          if (!qMap[q]) qMap[q] = { total: 0, items: 0 };
          qMap[q].total += Number(ini.investment?.approved || ini.investment_requested || 0);
          qMap[q].items++;
        });
        const quarters = Object.entries(qMap).sort(([a],[b]) => a < b ? -1 : 1);
        return (
          <div style={{ ...css.card, marginTop: 12, background: T.ink3 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Approved Investment by Quarter</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {quarters.map(([q, data]) => (
                <div key={q} style={{ background: T.ink, border: `1px solid ${T.border}`, borderTop: `2px solid ${T.gold}`, borderRadius: 8, padding: "10px 16px", minWidth: 120 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 4 }}>{q}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: T.green }}>${(data.total/1000).toFixed(0)}K</div>
                  <div style={{ fontSize: 10, color: T.muted }}>{data.items} initiative{data.items > 1 ? "s" : ""}</div>
                </div>
              ))}
              <div style={{ background: T.ink, border: `1px solid ${T.border}`, borderTop: `2px solid ${T.green}`, borderRadius: 8, padding: "10px 16px", minWidth: 120 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 4 }}>Total Pipeline</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: T.green }}>${(sorted.filter(i=>i.approved).reduce((a,i)=>a+Number(i.investment?.approved||i.investment_requested||0),0)/1000).toFixed(0)}K</div>
                <div style={{ fontSize: 10, color: T.muted }}>{sorted.filter(i=>i.approved).length} approved</div>
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ ...css.card, marginTop: 16 }}>
        <div style={{ fontSize: 12, color: T.muted }}>
          <strong style={{ color: T.loud }}>WSJF</strong> = (Business Value + Time Criticality + Risk Reduction) ÷ Job Size · Higher WSJF = higher priority for next PI
        </div>
      </div>
    </div>
  );
}

// ─── Quarterly Planning — Interactive Gantt Timeline ─────────────────
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

function GanttTimeline({ initiatives, updateIni, roadmapLastSaved, saveRoadmapTimestamp }) {
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
    saveRoadmapTimestamp();
  };

  useEffect(() => () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }, []);

  return (
    <div style={css.card}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={css.secHead}>Program Roadmap — {year}</div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
          <div style={{ fontSize:11, color:T.muted }}>Drag bars to move · Drag edges to resize</div>
          {roadmapLastSaved && (
            <div style={{ fontSize:10, color:T.green }}>
              ✓ Last saved {roadmapLastSaved.toLocaleDateString([], { month:"short", day:"numeric" })} at {roadmapLastSaved.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
            </div>
          )}
        </div>
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
                onChange={e => { updateIni(ini.id, d => ({ ...d, bar_color: e.target.value })); saveRoadmapTimestamp(); }}
                style={{ width:24, height:24, border:"none", borderRadius:4, cursor:"pointer", background:"none", padding:0 }} title="Change bar color"/>
              <div style={{ fontSize:12, color:T.loud, fontWeight:600, flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ini.title}</div>
              <Tag label={stageLabel(ini.stage)} color={stageColor(ini.stage)} />
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:10, color:T.muted }}>Start</span>
                <input type="date" value={toDateStr(start)}
                  onChange={e => { updateIni(ini.id, d => ({ ...d, roadmap_start: e.target.value })); saveRoadmapTimestamp(); }}
                  style={{ ...css.input, width:130, fontSize:11, padding:"4px 8px" }} />
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:10, color:T.muted }}>End</span>
                <input type="date" value={toDateStr(end)}
                  onChange={e => { updateIni(ini.id, d => ({ ...d, roadmap_end: e.target.value })); saveRoadmapTimestamp(); }}
                  style={{ ...css.input, width:130, fontSize:11, padding:"4px 8px" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Roadmap Planning ──────────────────────────────────────────────
export function PIPlanning() {
  const { initiatives, foundation, updateIni, roadmapLastSaved, saveRoadmapTimestamp } = useApp();
  const [loading, setLoading] = useState(false);
  const approved = initiatives.filter(i => i.approved);

  const PI_SECTIONS = [
    { key:"objectives",   title:"PI Objectives",            icon:"◎", color:T.gold   },
    { key:"risks",        title:"Risks",                    icon:"⚠", color:T.red    },
    { key:"roam",         title:"ROAM Status",              icon:"◈", color:T.amber  },
    { key:"dependencies", title:"Cross-team Dependencies",  icon:"⊕", color:T.steel  },
    { key:"capacity",     title:"Capacity & Load",          icon:"△", color:T.teal   },
    { key:"confidence",   title:"Confidence Vote",          icon:"✓", color:T.green  },
  ];

  // Parse saved text back into cards
  const textToCards = (text) => {
    if (!text) return null;
    const parts = text.split(/\n(?=\d+\)|\d+\.)/);
    return PI_SECTIONS.map((sec, i) => ({ ...sec, content: parts[i] || "" }));
  };

  // Load from first approved initiative's saved pi_planning on mount
  const savedText = approved[0]?.piPlanning || approved[0]?.pi_planning || null;
  const [piCards, setPiCards] = useState(() => savedText ? textToCards(savedText) : null);

  // Re-sync if org switches or saved text appears
  useEffect(() => {
    if (!piCards && savedText) setPiCards(textToCards(savedText));
  }, [savedText]);

  const genPI = async () => {
    setLoading(true);
    const text = await callAI("pi_planning", { foundation, initiatives }).catch(() => "");
    if (text) {
      const cards = textToCards(text);
      setPiCards(cards);
      approved.forEach(ini => updateIni(ini.id, d => ({ ...d, piPlanning: text, pi_planning: text })));
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
      <div style={css.h2}>Roadmap Planning · Stage 4</div>
      <div style={css.sub}>Program Increment planning — interactive roadmap, objectives, risks, and dependencies.</div>

      <GanttTimeline initiatives={initiatives} updateIni={updateIni} roadmapLastSaved={roadmapLastSaved} saveRoadmapTimestamp={saveRoadmapTimestamp} />

      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
        <button style={css.btnGold} onClick={genPI} disabled={loading || !approved.length}>
          {loading ? "Generating…" : "◆ Generate Quarterly Planning Package"}
        </button>
        {!approved.length && <span style={{ fontSize:12, color:T.muted }}>Approve at least one initiative first</span>}
      </div>

      {loading && <AIBox label="◆ Quarterly Planning Advisor — Building Package" loading />}

      {piCards && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:T.gold, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:14 }}>Quarterly Planning Package</div>
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

      {/* Roadmap Planning Chatty hint — shown when cards are live */}
      {piCards && (
        <div style={{ ...css.card, marginTop:12, background:"rgba(212,168,67,0.06)", border:`1px solid ${T.goldB}`, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18, color:T.gold }}>◆</span>
          <div style={{ fontSize:12, color:T.muted }}>
            <strong style={{ color:T.gold }}>Chatty knows you're on Roadmap Planning.</strong>
            {" "}Ask: <em>"Help me deepen the Risks card"</em> or <em>"Who are my cross-team dependencies?"</em> and Chatty will update the cards directly.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Handoff ─────────────────────────────────────────────────
const HANDOFF_SECTIONS = [
  { key: "overview",   label: "Initiative Overview",      icon: "⊞", aiKey: null },
  { key: "prd",        label: "PRD",                      icon: "◧", aiKey: "prd" },
  { key: "personas",   label: "Customer Personas",        icon: "◉", aiKey: "personas" },
  { key: "journey",    label: "Customer Journey Map",     icon: "→", aiKey: "journeys" },
  { key: "jtbd",       label: "Jobs To Be Done",          icon: "◈", aiKey: "jtbd" },
  { key: "usecases",   label: "Use Cases",                icon: "◇", aiKey: "usecases" },
  { key: "epics",      label: "Epics & Stories",          icon: "⊕", aiKey: "epics" },
  { key: "risks",      label: "Risk Register (ROAM)",     icon: "△", aiKey: "risks" },
  { key: "telemetry",  label: "Telemetry Readiness",      icon: "◑", aiKey: "telemetry" },
  { key: "testcases",  label: "Test Cases",               icon: "◻", aiKey: "testcases" },
  { key: "pi",         label: "Quarterly Planning & Estimates",  icon: "◎", aiKey: null },
  { key: "gonogo",     label: "Go/No-Go Checklist",       icon: "✓", aiKey: null },
];

function PersonaCards({ text }) {
  if (!text) return <div style={{ color: "#6B7A99", fontSize: 13, fontStyle: "italic" }}>No personas generated yet.</div>;
  // Parse persona blocks separated by "---" or "##"
  const blocks = text.split(/\n-{3,}\n|\n(?=#{1,3}\s)/).filter(b => b.trim().length > 40);
  if (blocks.length < 2) {
    // Single block — show as formatted card
    return (
      <div style={{ background: "#1C2640", borderRadius: 8, padding: 14, border: "1px solid #2A3A5C" }}>
        <pre style={{ color: "#C8D4F0", fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{text}</pre>
      </div>
    );
  }
  const colors = [T.steel, T.purple, T.teal, T.gold, T.ice];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
      {blocks.slice(0, 4).map((block, i) => {
        const lines = block.trim().split("\n");
        const title = lines[0].replace(/^#+\s*/, "").trim();
        const body  = lines.slice(1).join("\n").trim();
        return (
          <div key={i} style={{ background: "#111827", border: `2px solid ${colors[i % colors.length]}33`, borderTop: `3px solid ${colors[i % colors.length]}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: colors[i % colors.length], marginBottom: 8 }}>{title || `Persona ${i+1}`}</div>
            <pre style={{ color: "#C8D4F0", fontSize: 11, lineHeight: 1.65, whiteSpace: "pre-wrap", margin: 0 }}>{body}</pre>
          </div>
        );
      })}
    </div>
  );
}

function JourneyMap({ current, future }) {
  const renderSteps = (text, color) => {
    if (!text) return <div style={{ color: "#6B7A99", fontSize: 12, fontStyle: "italic" }}>Not generated yet.</div>;
    const steps = text.split("\n").filter(l => l.trim().match(/^[-•*]|^\d+\./) || l.trim().length > 20).slice(0, 8);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: color + "22", border: `1.5px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
            <div style={{ fontSize: 12, color: "#C8D4F0", lineHeight: 1.55 }}>{s.replace(/^[-•*]\s*|^\d+\.\s*/, "").trim()}</div>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.red, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Current State — Pain Points</div>
        {renderSteps(current, T.red)}
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Future State — Target Experience</div>
        {renderSteps(future, T.green)}
      </div>
    </div>
  );
}



// ─── Editable Epics with Version History ─────────────────────
function EditableEpics({ ini, updateIni }) {
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(ini.epics || "");
  const [showHistory, setShowHistory] = useState(false);
  const [historyView, setHistoryView] = useState(null); // { text, ts }

  // epics_history: [{text, ts}] newest first
  const history = (() => {
    try { return JSON.parse(ini.epics_history || "[]"); } catch { return []; }
  })();

  const saveEdit = () => {
    if (draft === ini.epics) { setEditMode(false); return; }
    // Save current version to history before overwriting
    const prev = ini.epics;
    if (prev && prev.trim()) {
      const newHistory = [
        { text: prev, ts: new Date().toISOString() },
        ...history,
      ].slice(0, 20); // keep last 20 versions
      updateIni(ini.id, d => ({
        ...d,
        epics: draft,
        epics_history: JSON.stringify(newHistory),
      }));
    } else {
      updateIni(ini.id, d => ({ ...d, epics: draft }));
    }
    setEditMode(false);
  };

  const cancelEdit = () => {
    setDraft(ini.epics || "");
    setEditMode(false);
  };

  const restoreVersion = (entry) => {
    if (!window.confirm("Restore this version? Current text will be saved to history.")) return;
    const current = ini.epics;
    const newHistory = [
      { text: current, ts: new Date().toISOString() },
      ...history.filter(h => h.ts !== entry.ts),
    ].slice(0, 20);
    updateIni(ini.id, d => ({
      ...d,
      epics: entry.text,
      epics_history: JSON.stringify(newHistory),
    }));
    setDraft(entry.text);
    setHistoryView(null);
    setShowHistory(false);
  };

  const fmtTs = (ts) => {
    try {
      return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    } catch { return ts; }
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        {!editMode ? (
          <button style={css.btnOut} onClick={() => { setDraft(ini.epics || ""); setEditMode(true); setShowHistory(false); }}>
            ✏ Edit Epics & Stories
          </button>
        ) : (
          <>
            <button style={css.btnGold} onClick={saveEdit}>✓ Save</button>
            <button style={css.btnGhost} onClick={cancelEdit}>✕ Cancel</button>
          </>
        )}
        {history.length > 0 && !editMode && (
          <button style={{ ...css.btnGhost, fontSize: 11 }} onClick={() => { setShowHistory(p => !p); setHistoryView(null); }}>
            🕐 {history.length} version{history.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Version history panel */}
      {showHistory && !editMode && (
        <div style={{ background: T.ink3, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Version History</div>
          {historyView ? (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: T.muted }}>Saved {fmtTs(historyView.ts)}</span>
                <button style={{ ...css.btnGold, fontSize: 11, padding: "3px 10px" }} onClick={() => restoreVersion(historyView)}>↺ Restore this version</button>
                <button style={{ ...css.btnGhost, fontSize: 11 }} onClick={() => setHistoryView(null)}>← Back to list</button>
              </div>
              <pre style={{ color: T.body, fontSize: 11, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto", background: T.ink, borderRadius: 6, padding: 12, margin: 0 }}>
                {historyView.text}
              </pre>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {history.map((entry, i) => (
                <div key={entry.ts} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 8px", background: T.ink, borderRadius: 6 }}>
                  <span style={{ fontSize: 11, color: T.muted, flex: 1 }}>v{history.length - i} · {fmtTs(entry.ts)}</span>
                  <span style={{ fontSize: 10, color: T.muted }}>{entry.text.split("\n").length} lines</span>
                  <button style={{ ...css.btnGhost, fontSize: 10, padding: "2px 8px" }} onClick={() => setHistoryView(entry)}>View</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit textarea */}
      {editMode && (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          style={{ ...css.ta, width: "100%", boxSizing: "border-box", minHeight: 500, fontSize: 12, fontFamily: "monospace", lineHeight: 1.7, resize: "vertical" }}
          placeholder={"E-01: Epic Title\n  Story ID: US-01\n  As a user I want...\n\nE-02: Second Epic..."}
        />
      )}

      {/* Normal view — Jira tracker */}
      {!editMode && <EpicsJiraTracker ini={ini} updateIni={updateIni} />}
    </div>
  );
}

// ─── Epics & Stories Jira Tracker ────────────────────────────
function parseEpicsStructured(text) {
  if (!text) return [];
  const epics = [];
  let currentEpic = null;
  const lines = text.split("\n");

  lines.forEach(line => {
    const clean = line.replace(/\*\*/g, "").trim();
    if (!clean) return;

    // Epic line detection
    const epicMatch = clean.match(/^(E-\d+)[:\s–-]+(.+)/i)
      || clean.match(/^Epic\s*(\d+)[:\s–-]+(.+)/i)
      || clean.match(/^#{1,3}\s*(E-\d+)[:\s–-]+(.+)/i);
    if (epicMatch) {
      const id = epicMatch[1].toUpperCase().startsWith("E-")
        ? epicMatch[1].toUpperCase()
        : `E-${epicMatch[1].padStart(2,"0")}`;
      currentEpic = { id, title: epicMatch[2].trim().slice(0,80), stories: [], raw: line };
      epics.push(currentEpic);
      return;
    }

    // Story line detection — same logic as parseStories
    const storyMatch = clean.match(/^(US-\d+|S-\d+)[:\s–-]+(.{3,})/i)
      || clean.match(/^Story\s*(?:ID)?[:\s]+(US-\d+)[:\s–-]*(.{3,})?/i);
    if (storyMatch) {
      const id = storyMatch[1].toUpperCase();
      const label = (storyMatch[2] || "").trim().slice(0,80);
      if (currentEpic && label) {
        currentEpic.stories.push({ id, label, raw: line });
      } else if (label) {
        // Story outside an epic — create orphan epic
        if (!currentEpic) {
          currentEpic = { id: "E-00", title: "General", stories: [], raw: "" };
          epics.push(currentEpic);
        }
        currentEpic.stories.push({ id, label, raw: line });
      }
      return;
    }

    // "As a..." attached to pending context
    if (/^As a /i.test(clean) && currentEpic && currentEpic.stories.length > 0) {
      // Enrich last story label if it's still generic
      const last = currentEpic.stories[currentEpic.stories.length - 1];
      if (!last.label || last.label.length < 10) {
        last.label = clean.slice(0, 80);
      }
    }
  });

  return epics.filter(e => e.stories.length > 0 || e.id !== "E-00");
}

function EpicsJiraTracker({ ini, updateIni }) {
  const epics = parseEpicsStructured(ini.epics);

  // jira_tickets: { "E-01": { done: true, ticket: "PROJ-123" }, "US-01": { done: false, ticket: "" }, ... }
  const [tickets, setTickets] = useState(() => {
    try { return JSON.parse(ini.jira_tickets || "{}"); } catch { return {}; }
  });

  // Re-sync if ini changes (org switch etc.)
  useEffect(() => {
    try { setTickets(JSON.parse(ini.jira_tickets || "{}")); } catch { setTickets({}); }
  }, [ini.id]);

  const save = (next) => {
    setTickets(next);
    updateIni(ini.id, d => ({ ...d, jira_tickets: JSON.stringify(next) }));
  };

  const toggle = (id) => {
    const next = { ...tickets, [id]: { ...(tickets[id] || {}), done: !(tickets[id]?.done) } };
    save(next);
  };

  const setTicket = (id, val) => {
    const next = { ...tickets, [id]: { ...(tickets[id] || {}), ticket: val } };
    save(next);
  };

  const doneCount  = Object.values(tickets).filter(t => t.done).length;
  const totalItems = epics.reduce((a, e) => a + 1 + e.stories.length, 0);

  if (!ini.epics) return (
    <div style={{ color: "#6B7A99", fontSize: 13, fontStyle: "italic" }}>
      Epics & Stories not generated yet. Use the AI generate button above.
    </div>
  );

  if (epics.length === 0) return (
    <div>
      <div style={{ color: "#6B7A99", fontSize: 12, fontStyle: "italic", marginBottom: 12 }}>
        Could not parse epics into structured format. Raw text shown below.
      </div>
      <TextSection text={ini.epics} />
    </div>
  );

  return (
    <div>
      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "10px 14px", background: T.ink3, borderRadius: 8, border: `1px solid ${T.border}` }}>
        <div style={{ flex: 1, height: 6, background: T.ink, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${totalItems ? (doneCount/totalItems)*100 : 0}%`, background: T.green, borderRadius: 3, transition: "width 0.3s" }} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: doneCount === totalItems && totalItems > 0 ? T.green : T.muted, whiteSpace: "nowrap" }}>
          {doneCount}/{totalItems} in Jira
        </div>
        {doneCount === totalItems && totalItems > 0 && (
          <span style={{ fontSize: 11, color: T.green }}>✓ All synced!</span>
        )}
      </div>

      {/* Epic + Story rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {epics.map(epic => {
          const epicDone = tickets[epic.id]?.done;
          const epicTicket = tickets[epic.id]?.ticket || "";
          return (
            <div key={epic.id} style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
              {/* Epic row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: T.ink3, borderLeft: `3px solid ${epicDone ? T.green : T.gold}` }}>
                <input
                  type="checkbox"
                  checked={!!epicDone}
                  onChange={() => toggle(epic.id)}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: T.green, flexShrink: 0 }}
                />
                <span style={{ fontSize: 11, fontWeight: 800, color: T.gold, minWidth: 40 }}>{epic.id}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: epicDone ? T.muted : T.loud, flex: 1, textDecoration: epicDone ? "line-through" : "none" }}>
                  {epic.title}
                </span>
                <input
                  value={epicTicket}
                  onChange={e => setTicket(epic.id, e.target.value)}
                  placeholder="JIRA-###"
                  style={{ ...css.input, width: 110, fontSize: 11, padding: "4px 8px", fontFamily: "monospace", color: epicTicket ? T.steel : T.muted }}
                />
                {epicTicket && (
                  <a
                    href={`https://jira.atlassian.com/browse/${epicTicket}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 10, color: T.steel, textDecoration: "none", whiteSpace: "nowrap" }}
                  >↗ Open</a>
                )}
              </div>

              {/* Story rows */}
              {epic.stories.map(story => {
                const storyDone   = tickets[story.id]?.done;
                const storyTicket = tickets[story.id]?.ticket || "";
                return (
                  <div key={story.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px 8px 30px", background: T.ink2, borderTop: `1px solid ${T.border}` }}>
                    <input
                      type="checkbox"
                      checked={!!storyDone}
                      onChange={() => toggle(story.id)}
                      style={{ width: 14, height: 14, cursor: "pointer", accentColor: T.green, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.steel, minWidth: 44 }}>{story.id}</span>
                    <span style={{ fontSize: 12, color: storyDone ? T.muted : T.body, flex: 1, lineHeight: 1.5, textDecoration: storyDone ? "line-through" : "none" }}>
                      {story.label}
                    </span>
                    <input
                      value={storyTicket}
                      onChange={e => setTicket(story.id, e.target.value)}
                      placeholder="JIRA-###"
                      style={{ ...css.input, width: 110, fontSize: 11, padding: "4px 8px", fontFamily: "monospace", color: storyTicket ? T.steel : T.muted }}
                    />
                    {storyTicket && (
                      <a
                        href={`https://jira.atlassian.com/browse/${storyTicket}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 10, color: T.steel, textDecoration: "none", whiteSpace: "nowrap" }}
                      >↗ Open</a>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TextSection({ text, placeholder }) {
  if (!text) return <div style={{ color: "#6B7A99", fontSize: 13, fontStyle: "italic" }}>{placeholder || "Not generated yet."}</div>;
  const blocks = text.split("\n").filter(l => l.trim());
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {blocks.map((line, i) => {
        const isHeader = line.match(/^#{1,3}\s/) || line.match(/^[A-Z][A-Z\s]{4,}:/);
        const isBullet = line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/);
        return (
          <div key={i} style={{
            fontSize: isHeader ? 11 : 12,
            fontWeight: isHeader ? 700 : 400,
            color: isHeader ? T.gold : "#C8D4F0",
            lineHeight: 1.6,
            paddingLeft: isBullet ? 12 : 0,
            letterSpacing: isHeader ? "0.06em" : 0,
            textTransform: isHeader ? "uppercase" : "none",
            marginTop: isHeader ? 8 : 0,
          }}>
            {isBullet ? "▪ " : ""}{line.replace(/^#{1,3}\s*/, "").replace(/^[-•*]\s*|^\d+\.\s*/, "").trim()}
          </div>
        );
      })}
    </div>
  );
}

function RiskCards({ text }) {
  if (!text) return <div style={{ color: "#6B7A99", fontSize: 13, fontStyle: "italic" }}>No risk register generated yet.</div>;
  const blocks = text.split(/\n-{3,}\n|(?:\n|^)#{1,3}\s/).filter(b => b.trim().length > 20);
  const roamColors = { R: T.red, O: T.amber, A: T.steel, M: T.green };
  const roamLabels = { R: "Resolved", O: "Owned", A: "Accepted", M: "Mitigated" };
  if (blocks.length < 2) {
    return <TextSection text={text} />;
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
      {blocks.slice(0, 8).map((block, i) => {
        const lines = block.trim().split("\n");
        const title = lines[0].replace(/^#+\s*|^\*+/, "").trim();
        const roamMatch = block.match(/\b(Resolved|Owned|Accepted|Mitigated|ROAM[:\s]*[ROAM])/i);
        const roamKey = roamMatch ? roamMatch[0][0].toUpperCase() : "O";
        const color = roamColors[roamKey] || T.muted;
        return (
          <div key={i} style={{ background: "#111827", border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#F0F4FF" }}>{title || `Risk ${i+1}`}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color, background: color + "22", padding: "2px 6px", borderRadius: 4 }}>{roamLabels[roamKey] || "Owned"}</div>
            </div>
            <pre style={{ color: "#6B7A99", fontSize: 10, lineHeight: 1.5, whiteSpace: "pre-wrap", margin: 0 }}>{lines.slice(1).join("\n").trim()}</pre>
          </div>
        );
      })}
    </div>
  );
}

// ─── Reusable editable wrapper for any text field ─────────────
function EditableSection({ ini, updateIni, field, label, placeholder, renderView }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const value = ini[field] || "";

  const startEdit = () => { setDraft(value); setEditing(true); };
  const save = () => { updateIni(ini.id, d => ({ ...d, [field]: draft })); setEditing(false); };
  const cancel = () => setEditing(false);

  return (
    <div>
      {!editing && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button style={css.btnOut} onClick={startEdit}>✏ Edit {label}</button>
        </div>
      )}
      {editing && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button style={{ ...css.btnOut, borderColor: T.green, color: T.green }} onClick={save}>✓ Save</button>
          <button style={css.btnOut} onClick={cancel}>✕ Cancel</button>
        </div>
      )}
      {editing ? (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          style={{ width: "100%", minHeight: 320, background: "#101828", border: `1px solid ${T.gold}`, borderRadius: 8, color: "#F0F4FF", fontSize: 13, fontFamily: "monospace", padding: 16, resize: "vertical", boxSizing: "border-box" }}
        />
      ) : value ? renderView(value) : (
        <div style={{ background: T.ink2, borderRadius: 8, padding: 16, color: T.muted, fontSize: 13, fontStyle: "italic" }}>
          {placeholder}
        </div>
      )}
    </div>
  );
}

// ─── Editable Journey (two fields: current + future) ──────────
function EditableJourney({ ini, updateIni }) {
  const [editing, setEditing] = useState(false);
  const [curDraft, setCurDraft] = useState("");
  const [futDraft, setFutDraft] = useState("");

  const startEdit = () => { setCurDraft(ini.currentJourney || ""); setFutDraft(ini.futureJourney || ""); setEditing(true); };
  const save = () => { updateIni(ini.id, d => ({ ...d, currentJourney: curDraft, futureJourney: futDraft })); setEditing(false); };
  const cancel = () => setEditing(false);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {!editing ? (
          <button style={css.btnOut} onClick={startEdit}>✏ Edit Journey Map</button>
        ) : (
          <>
            <button style={{ ...css.btnOut, borderColor: T.green, color: T.green }} onClick={save}>✓ Save</button>
            <button style={css.btnOut} onClick={cancel}>✕ Cancel</button>
          </>
        )}
      </div>
      {editing ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Current Journey</div>
            <textarea value={curDraft} onChange={e => setCurDraft(e.target.value)}
              style={{ width: "100%", minHeight: 200, background: "#101828", border: `1px solid ${T.gold}`, borderRadius: 8, color: "#F0F4FF", fontSize: 13, fontFamily: "monospace", padding: 16, resize: "vertical", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Future Journey</div>
            <textarea value={futDraft} onChange={e => setFutDraft(e.target.value)}
              style={{ width: "100%", minHeight: 200, background: "#101828", border: `1px solid ${T.green}`, borderRadius: 8, color: "#F0F4FF", fontSize: 13, fontFamily: "monospace", padding: 16, resize: "vertical", boxSizing: "border-box" }} />
          </div>
        </div>
      ) : (
        <JourneyMap current={ini.currentJourney} future={ini.futureJourney} />
      )}
    </div>
  );
}

function GoNoGo({ ini }) {
  const checks = [
    { label: "Problem Statement defined", done: !!ini.problem, required: true },
    { label: "PIVOT Score calculated", done: calcPivot(ini.pivot) > 0, required: true },
    { label: "Executive Brief generated", done: !!ini.execBrief, required: true },
    { label: "Investment approved", done: !!ini.approved, required: true },
    { label: "PRD (Product Requirements Document) complete", done: !!ini.prd, required: true },
    { label: "Customer Personas generated", done: !!ini.personas, required: true },
    { label: "Current Journey mapped", done: !!ini.currentJourney, required: true },
    { label: "Future Journey mapped", done: !!ini.futureJourney, required: true },
    { label: "Jobs To Be Done defined", done: !!ini.jtbd, required: true },
    { label: "Use Cases documented", done: !!ini.usecases, required: true },
    { label: "Epics & Stories generated", done: !!ini.epics, required: true },
    { label: "Risk Register (ROAM) complete", done: !!ini.riskReg, required: true },
    { label: "Telemetry Readiness plan complete", done: !!ini.telemetry, required: true },
    { label: "Test Cases documented", done: !!ini.testcases, required: true },
    { label: "Engineering estimate entered", done: !!(ini.engSpend?.estimate || ini.engSpend?.sprints), required: false },
    { label: "Quarterly planning objectives set", done: !!(ini.piPlanning || ini.pi_planning), required: false },
  ];
  const required = checks.filter(c => c.required);
  const optional = checks.filter(c => !c.required);
  const reqDone = required.filter(c => c.done).length;
  const allGo = reqDone === required.length;
  const pct = Math.round((reqDone / required.length) * 100);

  return (
    <div>
      {/* Status banner */}
      <div style={{ background: allGo ? "rgba(34,197,94,0.1)" : "rgba(212,168,67,0.1)", border: `1px solid ${allGo ? T.green : T.gold}`, borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 28 }}>{allGo ? "✅" : "⚠️"}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: allGo ? T.green : T.gold }}>{allGo ? "GO — Package Complete" : `NOT READY — ${required.length - reqDone} required items missing`}</div>
          <div style={{ fontSize: 12, color: "#6B7A99", marginTop: 2 }}>{reqDone}/{required.length} required items complete · {pct}% ready</div>
        </div>
        {/* Progress bar */}
        <div style={{ flex: 1, background: "#1C2640", borderRadius: 4, height: 6, marginLeft: 12 }}>
          <div style={{ width: `${pct}%`, background: allGo ? T.green : T.gold, height: 6, borderRadius: 4, transition: "width 0.4s" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7A99", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Required — Must be complete before sprint kickoff</div>
          {required.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #1C2640" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: c.done ? "rgba(34,197,94,0.15)" : "transparent", border: `1.5px solid ${c.done ? T.green : "#3A4A6A"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: T.green, flexShrink: 0 }}>
                {c.done ? "✓" : ""}
              </div>
              <div style={{ fontSize: 12, color: c.done ? "#C8D4F0" : "#6B7A99" }}>{c.label}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7A99", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Recommended — Strengthen the package</div>
          {optional.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #1C2640" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: c.done ? "rgba(34,197,94,0.15)" : "transparent", border: `1.5px solid ${c.done ? T.green : "#3A4A6A"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: T.green, flexShrink: 0 }}>
                {c.done ? "✓" : ""}
              </div>
              <div style={{ fontSize: 12, color: c.done ? "#C8D4F0" : "#6B7A99" }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Generic AI Section — editable, persisted, no duplicate title ──────
function SimpleAISection({ ini, updateIni, foundation, field, aiKey, label, placeholder }) {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const value = ini[field] || "";

  const gen = async () => {
    setLoading(true);
    setEditing(false);
    const text = await callAI(aiKey, { foundation, initiative: ini }).catch(() => "");
    if (text) updateIni(ini.id, d => ({ ...d, [field]: text }));
    setLoading(false);
  };

  const startEdit = () => { setDraft(value); setEditing(true); };
  const save = () => { updateIni(ini.id, d => ({ ...d, [field]: draft })); setEditing(false); };
  const cancel = () => setEditing(false);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button style={css.btnGold} onClick={gen} disabled={loading}>
          {loading ? `Generating…` : value ? `◆ Regenerate` : `◆ Generate ${label}`}
        </button>
        {value && !editing && (
          <button style={css.btnOut} onClick={startEdit}>✏ Edit</button>
        )}
        {editing && (
          <>
            <button style={{ ...css.btnOut, borderColor: T.green, color: T.green }} onClick={save}>✓ Save</button>
            <button style={css.btnOut} onClick={cancel}>✕ Cancel</button>
          </>
        )}
      </div>
      {loading && <AIBox label={`◆ ${label} — Generating`} loading />}
      {!loading && editing && (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          style={{ width: "100%", minHeight: 320, background: "#101828", border: `1px solid ${T.gold}`, borderRadius: 8, color: "#F0F4FF", fontSize: 13, fontFamily: "monospace", padding: 16, resize: "vertical", boxSizing: "border-box" }}
        />
      )}
      {!loading && !editing && value && (
        <div style={{ background: T.ink2, borderRadius: 8, padding: 20, border: `1px solid ${T.border}` }}>
          <TextSection text={value} placeholder="" />
        </div>
      )}
      {!loading && !editing && !value && (
        <div style={{ background: T.ink2, borderRadius: 8, padding: 16, color: T.muted, fontSize: 13, fontStyle: "italic" }}>
          {placeholder}
        </div>
      )}
    </div>
  );
}

// ─── PRD Section — editable, persisted, Word export ───────────
function PRDSection({ ini, updateIni, foundation }) {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [exporting, setExporting] = useState(false);

  const gen = async () => {
    setLoading(true);
    setEditing(false);
    const text = await callAI("prd", { foundation, initiative: ini }).catch(() => "");
    if (text) updateIni(ini.id, d => ({ ...d, prd: text }));
    setLoading(false);
  };

  const startEdit = () => { setDraft(ini.prd || ""); setEditing(true); };
  const save = () => { updateIni(ini.id, d => ({ ...d, prd: draft })); setEditing(false); };
  const cancel = () => setEditing(false);

  const exportWord = async () => {
    if (!ini.prd) return;
    setExporting(true);
    try {
      const res = await fetch("/api/ppt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "prd_docx", initiative: ini, foundation }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PRD_${ini.slug || ini.title?.replace(/\s+/g, "_") || "export"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Word export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button style={css.btnGold} onClick={gen} disabled={loading}>
          {loading ? "Generating PRD…" : ini.prd ? "◆ Regenerate PRD" : "◆ Generate PRD"}
        </button>
        {ini.prd && !editing && (
          <button style={css.btnOut} onClick={startEdit}>✏ Edit</button>
        )}
        {ini.prd && !editing && (
          <button style={{ ...css.btnOut, borderColor: T.steel, color: T.steel }} onClick={exportWord} disabled={exporting}>
            {exporting ? "Exporting…" : "↓ Word Doc"}
          </button>
        )}
        {editing && (
          <>
            <button style={{ ...css.btnOut, borderColor: T.green, color: T.green }} onClick={save}>✓ Save</button>
            <button style={css.btnOut} onClick={cancel}>✕ Cancel</button>
          </>
        )}
      </div>
      {loading && <AIBox label="◆ Product Requirements Document — Generating" loading />}
      {!loading && editing && (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          style={{ width: "100%", minHeight: 400, background: "#101828", border: `1px solid ${T.gold}`, borderRadius: 8, color: "#F0F4FF", fontSize: 13, fontFamily: "monospace", padding: 16, resize: "vertical", boxSizing: "border-box" }}
        />
      )}
      {!loading && !editing && ini.prd && (
        <div style={{ background: T.ink2, borderRadius: 8, padding: 20, border: `1px solid ${T.border}` }}>
          <TextSection text={ini.prd} placeholder="" />
        </div>
      )}
      {!loading && !editing && !ini.prd && (
        <div style={{ background: T.ink2, borderRadius: 8, padding: 16, color: T.muted, fontSize: 13, fontStyle: "italic" }}>
          No PRD generated yet. Click the button above to generate a full PRD including functional requirements, NFRs, acceptance criteria, and open questions.
        </div>
      )}
    </div>
  );
}

// ─── PI Tab — editable, persisted ─────────────────────────────
function PITab({ ini, updateIni }) {
  const { initiatives, foundation } = useApp();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const genPI = async () => {
    setLoading(true);
    setEditing(false);
    const text = await callAI("pi_planning", { foundation, initiatives }).catch(() => "");
    if (text) updateIni(ini.id, d => ({ ...d, piPlanning: text }));
    setLoading(false);
  };

  const startEdit = () => { setDraft(ini.piPlanning || ""); setEditing(true); };
  const save = () => { updateIni(ini.id, d => ({ ...d, piPlanning: draft })); setEditing(false); };
  const cancel = () => setEditing(false);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
        {[
          ["Teams", ini.engSpend?.teams || ini.eng_teams || "—", T.steel],
          ["Sprints", ini.engSpend?.sprints || ini.eng_sprints || "—", T.gold],
          ["Estimate", (ini.engSpend?.estimate || ini.investment_requested)
            ? `$${Number(ini.engSpend?.estimate || ini.investment_requested || 0).toLocaleString()}` : "—", T.green],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background: "#1C2640", borderRadius: 8, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#6B7A99", textTransform: "uppercase", letterSpacing: "0.07em" }}>{l}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: c, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button style={css.btnGold} onClick={genPI} disabled={loading}>
          {loading ? "Generating…" : "◆ Generate Quarterly Planning Package"}
        </button>
        {ini.piPlanning && !editing && (
          <button style={css.btnOut} onClick={startEdit}>✏ Edit</button>
        )}
        {editing && (
          <>
            <button style={{ ...css.btnOut, borderColor: T.green, color: T.green }} onClick={save}>✓ Save</button>
            <button style={css.btnOut} onClick={cancel}>✕ Cancel</button>
          </>
        )}
      </div>
      {loading && <AIBox label="◆ Quarterly Planning — Building Package" loading />}
      {!loading && editing && (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          style={{ width: "100%", minHeight: 320, background: "#101828", border: `1px solid ${T.gold}`, borderRadius: 8, color: "#F0F4FF", fontSize: 13, fontFamily: "monospace", padding: 16, resize: "vertical", boxSizing: "border-box" }}
        />
      )}
      {!loading && !editing && ini.piPlanning && (
        <div style={{ background: "#1C2640", borderRadius: 8, padding: 14 }}>
          <TextSection text={ini.piPlanning} placeholder="" />
        </div>
      )}
      {!loading && !editing && !ini.piPlanning && (
        <div style={{ background: "#1C2640", borderRadius: 8, padding: 16, color: "#6B7A99", fontSize: 13, fontStyle: "italic" }}>
          No Quarterly Planning package generated yet. Click the button above to generate objectives, risks, dependencies, capacity assessment, and confidence vote.
        </div>
      )}
    </div>
  );
}

export function Handoff({ setView }) {
  const { initiatives, foundation, updateIni } = useApp();
  const [selected, setSelected]     = useState("");
  const [activeSection, setSection] = useState("overview");
  const [regen, setRegen]           = useState({}); // { [aiKey]: loading }

  const ini  = initiatives.find(i => i.id === selected) || null;
  const score = ini ? calcPivot(ini.pivot) : 0;
  const tier  = ini ? pivotTier(score) : {};

  // Auto-select first approved ini
  useEffect(() => {
    if (!selected && initiatives.length) {
      const approved = initiatives.find(i => i.approved);
      setSelected(approved?.id || initiatives[0]?.id || "");
    }
  }, [initiatives]);

  const regenSection = async (aiKey) => {
    if (!ini || !aiKey) return;
    setRegen(r => ({ ...r, [aiKey]: true }));
    try {
      const text = await callAI(aiKey, { foundation, initiative: ini, score, tier: tier.label }).catch(() => "");
      if (text) {
        const fieldMap = { personas: "personas", journeys: "currentJourney", jtbd: "jtbd", usecases: "usecases", epics: "epics", risks: "riskReg" };
        const field = fieldMap[aiKey];
        if (field) updateIni(ini.id, d => ({ ...d, [field]: text }));
      }
    } finally {
      setRegen(r => ({ ...r, [aiKey]: false }));
    }
  };

  const regenAll = async () => {
    for (const sec of HANDOFF_SECTIONS.filter(s => s.aiKey)) {
      await regenSection(sec.aiKey);
    }
  };

  const sec = HANDOFF_SECTIONS.find(s => s.key === activeSection);

  const renderSection = () => {
    if (!ini) return null;
    switch (activeSection) {
      case "overview":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              ["Initiative", ini.title],
              ["ID", ini.slug],
              ["Stage", ini.stage],
              ["PIVOT Score™", `${score.toFixed(0)} — ${tier.label}`],
              ["Investment Requested", ini.investment?.requested ? `$${Number(ini.investment.requested).toLocaleString()}` : "Not set"],
              ["Investment Approved", ini.investment?.approved ? `$${Number(ini.investment.approved).toLocaleString()}` : "Not set"],
              ["Engineering Estimate", ini.engSpend?.estimate ? `$${Number(ini.engSpend.estimate).toLocaleString()}` : "Not set"],
              ["Teams", ini.engSpend?.teams || "Not set"],
              ["Sprints", ini.engSpend?.sprints || "Not set"],
              ["Approved By", ini.approved_by || "Not set"],
              ["Approval Date", ini.approved_date || "Not set"],
              ["Status", ini.approved ? "✓ Approved for PI" : "Pending Approval"],
            ].map(([label, value]) => (
              <div key={label} style={{ background: "#1C2640", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7A99", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: "#F0F4FF", fontWeight: 600 }}>{value}</div>
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1", background: "#1C2640", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7A99", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Problem Statement</div>
              <div style={{ fontSize: 13, color: "#C8D4F0", lineHeight: 1.65 }}>{ini.problem || "Not defined."}</div>
            </div>
            <div style={{ gridColumn: "1 / -1", background: "#1C2640", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7A99", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Opportunity</div>
              <div style={{ fontSize: 13, color: "#C8D4F0", lineHeight: 1.65 }}>{ini.opportunity || "Not defined."}</div>
            </div>
          </div>
        );
      case "personas":
        return <EditableSection ini={ini} updateIni={updateIni} field="personas" label="Customer Personas"
          placeholder="No personas generated yet. Use Regenerate above to generate AI personas." renderView={t => <PersonaCards text={t} />} />;
      case "journey":
        return <EditableJourney ini={ini} updateIni={updateIni} />;
      case "jtbd":
        return <EditableSection ini={ini} updateIni={updateIni} field="jtbd" label="Jobs To Be Done"
          placeholder="Jobs To Be Done not generated yet."
          renderView={t => <TextSection text={t} placeholder="" />} />;
      case "usecases":
        return <EditableSection ini={ini} updateIni={updateIni} field="usecases" label="Use Cases"
          placeholder="Use Cases not generated yet."
          renderView={t => <TextSection text={t} placeholder="" />} />;
      case "epics":
        return <EditableEpics ini={ini} updateIni={updateIni} />;
      case "risks":
        return <EditableSection ini={ini} updateIni={updateIni} field="riskReg" label="Risk Register (ROAM)"
          placeholder="Risk Register not generated yet."
          renderView={t => <RiskCards text={t} />} />;
      case "pi":
        return <PITab ini={ini} updateIni={updateIni} />;
      case "prd":
        return <PRDSection ini={ini} updateIni={updateIni} foundation={foundation} />;
      case "telemetry":
        return <SimpleAISection ini={ini} updateIni={updateIni} foundation={foundation} field="telemetry" aiKey="telemetry" label="Telemetry Readiness" placeholder="Define the events, metrics, and instrumentation required before this initiative ships. AI will generate a complete telemetry plan." />;
      case "testcases":
        return <SimpleAISection ini={ini} updateIni={updateIni} foundation={foundation} field="testcases" aiKey="testcases" label="Test Cases" placeholder="AI-generated test cases covering functional, edge, and regression scenarios based on epics and use cases." />;
      case "gonogo":
        return <GoNoGo ini={ini} />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div style={css.h2}>Delivery Handoff · Stage 5</div>
      <div style={css.sub}>PRD, telemetry plan, test cases, epics, risks, and PI planning. Export to PPT for the formal PI-ready document.</div>

      {/* Initiative selector */}
      <div style={{ ...css.card, marginBottom: 16, display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <label style={css.label}>Select Initiative</label>
          <select style={css.input} value={selected} onChange={e => { setSelected(e.target.value); setSection("overview"); }}>
            <option value="">— Select —</option>
            {initiatives.map(i => (
              <option key={i.id} value={i.id}>{i.slug} · {i.title} {i.approved ? "✓ Approved" : ""}</option>
            ))}
          </select>
        </div>
        {ini && (
          <div style={{ display: "flex", gap: 8 }}>
            <button style={css.btnOut} onClick={regenAll}>◆ Generate All Sections</button>
          </div>
        )}
      </div>

      {ini && (
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20 }}>
          {/* Section nav */}
          <div style={{ ...css.card, padding: "8px 0", alignSelf: "start", position: "sticky", top: 70 }}>
            {HANDOFF_SECTIONS.map(s => {
              const sectionData = {
                overview: true,
                prd: !!ini.prd,
                personas: !!ini.personas,
                journey: !!ini.currentJourney || !!ini.futureJourney,
                jtbd: !!ini.jtbd,
                usecases: !!ini.usecases,
                epics: !!ini.epics,
                risks: !!ini.riskReg,
                telemetry: !!ini.telemetry,
                testcases: !!ini.testcases,
                pi: !!ini.piPlanning || !!ini.engSpend?.sprints,
                gonogo: true,
              };
              const done = sectionData[s.key];
              return (
                <button key={s.key} onClick={() => setSection(s.key)}
                  style={{ width: "100%", textAlign: "left", padding: "8px 14px", background: activeSection === s.key ? "#1B3A6B" : "transparent", border: "none", borderLeft: `3px solid ${activeSection === s.key ? T.gold : done ? T.green : "#2A3A5C"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: activeSection === s.key ? T.gold : done ? T.green : "#6B7A99" }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: activeSection === s.key ? 700 : 400, color: activeSection === s.key ? T.gold : done ? "#C8D4F0" : "#6B7A99" }}>{s.label}</div>
                    <div style={{ fontSize: 9, color: done ? T.green : "#3A4A6A", marginTop: 1 }}>{done ? "✓ complete" : "not generated"}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Section content */}
          <div>
            <div style={{ ...css.card, marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#F0F4FF" }}>{sec?.icon} {sec?.label}</div>
                  <div style={{ fontSize: 11, color: "#6B7A99", marginTop: 2 }}>
                    {ini.slug} · {ini.title}
                  </div>
                </div>
                {sec?.aiKey && (
                  <button style={css.btnOut} onClick={() => regenSection(sec.aiKey)} disabled={regen[sec.aiKey]}>
                    {regen[sec.aiKey] ? "◆ Generating…" : "◆ Regenerate"}
                  </button>
                )}
              </div>
              {renderSection()}
            </div>
          </div>
        </div>
      )}

      {!ini && (
        <div style={{ ...css.card, textAlign: "center", padding: 48, color: "#6B7A99" }}>
          Select an initiative above to view its handoff package.
        </div>
      )}
    </div>
  );
}

// ─── Stage order for cumulative display ──────────────────────
const STAGE_ORDER = ["idea","discovery","review","approved","definition","delivery","handoff","closed"];

function stageIndex(stage) {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx === -1 ? 0 : idx;
}

// Stage descriptions for each page
const STAGE_META = {
  discovery:  { minStage: "discovery",  label: "Discovery",     sub: "All pipeline initiatives — current stage shown per initiative." },
  execreview: { minStage: "review",     label: "Exec Review",   sub: "All pipeline initiatives — current stage shown per initiative." },
  definition: { minStage: "definition", label: "Definition",    sub: "All pipeline initiatives — current stage shown per initiative." },
};

// ─── Stage List View ──────────────────────────────────────────
// ─── Sprint Goals · Stage 6 ────────────────────────────────────
// ─── Extract Given/When/Then AC from epics text per story ──────
function extractStoryAC(epicsText) {
  // Returns { [rawStoryId]: acText } — keyed by bare US-XX id (no slug prefix)
  if (!epicsText) return {};
  const result = {};
  const lines = epicsText.split("\n");
  let currentStoryId = null;
  let acLines = [];

  const flush = () => {
    if (currentStoryId && acLines.length) {
      result[currentStoryId] = acLines.join("\n").trim();
    }
    currentStoryId = null;
    acLines = [];
  };

  lines.forEach(line => {
    const clean = line.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^#+\s*/, "").trim();
    if (!clean) return;

    // Epic line — reset story context
    if (/^E-?\d+[:\s]/i.test(clean) || /^Epic\s*\d+[:\s]/i.test(clean)) {
      flush();
      return;
    }

    // Story line — start new story context
    const usMatch = clean.match(/^(US-\d+|S-\d+)[:\s–-]+/i)
      || clean.match(/^Story\s*(?:ID)?[:\s]+(US-\d+|S-\d+)/i);
    if (usMatch) {
      flush();
      const rawId = (usMatch[1] || usMatch[0]).toUpperCase().replace(/.*?(US-\d+|S-\d+).*/i, "$1").trim();
      currentStoryId = rawId;
      return;
    }

    // AC lines — Given/When/Then/Acceptance Criteria
    if (currentStoryId) {
      if (/^(Given|When|Then|And|But|Acceptance Criteria|AC:|- )/i.test(clean)) {
        acLines.push(clean);
      }
    }
  });
  flush();
  return result;
}

// ─── Parse user stories from epics text ───────────────────────
function parseStories(epicsText, iniTitle, iniSlug) {
  if (!epicsText) return [];
  const stories = [];
  const lines = epicsText.split("\n");
  let currentEpic = "";
  let pendingStoryId = null;
  let storyCounter = 0;

  lines.forEach((line) => {
    // Strip markdown bold/italic, heading markers
    const raw = line.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^#+\s*/, "");
    const clean = raw.replace(/^\s*[-\u2022>|]+\s*/, "").trim();
    if (!clean) return;

    // ── Epic detection ──────────────────────────────────────────
    if (/^E-?\d+[:\s]/i.test(clean) || /^Epic\s*\d+[:\s]/i.test(clean)) {
      const m = clean.match(/\d+/);
      if (m) currentEpic = "E-" + m[0].padStart(2, "0");
      return;
    }

    // ── "Story ID: US-XX" or "Story ID: XX" prefix line ────────
    const storyIdPfx = clean.match(/^Story\s*(?:ID)?[:\s]+([A-Za-z]*-?\d+)/i);
    if (storyIdPfx) {
      let rawId = storyIdPfx[1].toUpperCase();
      if (!rawId.startsWith("US-") && !rawId.startsWith("S-")) rawId = "US-" + rawId.replace(/\D/g, "");
      pendingStoryId = rawId;
      const afterId = clean.replace(/^Story\s*(?:ID)?[:\s]+[A-Za-z0-9-]+\s*[:\s\u2013-]?\s*/i, "").trim();
      if (afterId.length > 3 && !/^(As a|Given|When|Then|Acceptance|Priority|Story Points)/i.test(afterId)) {
        stories.push({ id: (iniSlug||"INI") + "-" + pendingStoryId, label: afterId.slice(0,80), epic: currentEpic, ini: iniTitle, points: extractPts(line) });
        pendingStoryId = null;
      }
      return;
    }

    // ── US-XX: label on same line ───────────────────────────────
    const usInline = clean.match(/^(US-\d+|S-\d+)[:\s\u2013-]+(.{3,})/i)
      || clean.match(/(US-\d+)[:\s\u2013-]+(.{3,})/i);
    if (usInline) {
      const id = usInline[1].toUpperCase();
      const label = usInline[2].trim().slice(0, 80);
      stories.push({ id: (iniSlug||"INI") + "-" + id, label, epic: currentEpic, ini: iniTitle, points: extractPts(line) });
      pendingStoryId = null;
      return;
    }

    // ── Standalone US-XX on its own ─────────────────────────────
    if (/^(US-\d+|S-\d+)$/i.test(clean)) {
      pendingStoryId = clean.toUpperCase();
      return;
    }

    // ── "As a X, I want Y" user story sentence ──────────────────
    if (/^As a /i.test(clean)) {
      if (pendingStoryId) {
        stories.push({ id: (iniSlug||"INI") + "-" + pendingStoryId, label: clean.slice(0,80), epic: currentEpic, ini: iniTitle, points: null });
        pendingStoryId = null;
      } else {
        storyCounter++;
        const genId = "US-" + String(storyCounter).padStart(2, "0");
        stories.push({ id: (iniSlug||"INI") + "-" + genId, label: clean.slice(0,80), epic: currentEpic, ini: iniTitle, points: null });
      }
      return;
    }

    // ── Attach story points to last story ───────────────────────
    if (/^Story\s*Points?[:\s]/i.test(clean) && stories.length) {
      const m = clean.match(/(\d+)/);
      if (m) stories[stories.length - 1].points = parseInt(m[1]);
    }
  });

  const seen = new Set();
  return stories.filter(s => {
    if (!s.label || s.label.length < 3) return false;
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

function extractPts(line) {
  const m = line.match(/(\d+)\s*(?:story\s*)?points?/i) || line.match(/Points?[:\s]+(\d+)/i);
  return m ? parseInt(m[1]) : null;
}


// ─── Sprints · Stage 6 ──────────────────────────────────────────
const DEFAULT_LABELS = [
  { id:"bug",     name:"Bug",        color:"#E74C3C" },
  { id:"feature", name:"Feature",    color:"#2E6DA4" },
  { id:"tech",    name:"Tech Debt",  color:"#9B59B6" },
  { id:"spike",   name:"Spike",      color:"#E8913A" },
  { id:"p0",      name:"P0",         color:"#E74C3C" },
  { id:"p1",      name:"P1",         color:"#E8913A" },
  { id:"p2",      name:"P2",         color:"#2ECC71" },
  { id:"blocked", name:"Blocked",    color:"#FF0000" },
];

function StoryCard({ story, sprintId, dragStory, setDragStory, moveStory, details, onUpdateDetail }) {
  const [expanded, setExpanded] = useState(false);
  const d = details[story.id] || {};
  const ac   = d.ac   || "";
  const note = d.note || "";
  const storyLabels = d.labels || [];
  const [newLabelName, setNewLabelName] = useState("");
  const [showLabelInput, setShowLabelInput] = useState(false);

  const allLabels = [
    ...DEFAULT_LABELS,
    ...(d.customLabels || []),
  ];

  const toggleLabel = (labelId) => {
    const next = storyLabels.includes(labelId)
      ? storyLabels.filter(l => l !== labelId)
      : [...storyLabels, labelId];
    onUpdateDetail(story.id, { ...d, labels: next });
  };

  const addCustomLabel = () => {
    if (!newLabelName.trim()) return;
    const id = "custom_" + Date.now();
    const custom = { id, name: newLabelName.trim(), color: T.ice };
    const customLabels = [...(d.customLabels || []), custom];
    const labels = [...storyLabels, id];
    onUpdateDetail(story.id, { ...d, customLabels, labels });
    setNewLabelName("");
    setShowLabelInput(false);
  };

  const appliedLabels = allLabels.filter(l => storyLabels.includes(l.id));

  return (
    <div
      style={{
        background: T.ink, border: `1px solid ${expanded ? T.gold : T.border}`,
        borderRadius: 6, marginBottom: 6,
        opacity: dragStory?.story.id === story.id ? 0.4 : 1,
      }}
    >
      {/* Card header — drag handle + expand */}
      <div
        draggable
        onDragStart={() => setDragStory({ story, fromSprint: sprintId })}
        onDragEnd={() => setDragStory(null)}
        onClick={() => setExpanded(p => !p)}
        style={{ padding: "8px 10px", cursor: "grab", display: "flex", alignItems: "flex-start", gap: 8 }}
      >
        <span style={{ color: T.muted, fontSize: 10, marginTop: 2, flexShrink: 0 }}>⠿</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: T.loud, fontSize: 12, lineHeight: 1.4 }}>{story.label}</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 3 }}>
            {story.epic && <span style={{ fontSize: 9, color: T.gold, fontWeight: 700 }}>{story.epic}</span>}
            <span style={{ fontSize: 9, color: T.muted }}>{story.ini}</span>
            {story.points && <span style={{ fontSize: 9, color: T.steel, fontWeight: 700 }}>{story.points}pts</span>}
            {appliedLabels.map(l => (
              <span key={l.id} style={{ fontSize: 9, fontWeight: 700, color: l.color, background: l.color + "22", borderRadius: 3, padding: "1px 5px" }}>{l.name}</span>
            ))}
          </div>
        </div>
        <span style={{ fontSize: 10, color: T.muted, flexShrink: 0, marginTop: 1 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "10px 10px 12px" }} onClick={e => e.stopPropagation()}>
          {/* Labels */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Labels</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
              {allLabels.map(l => (
                <button key={l.id}
                  onClick={() => toggleLabel(l.id)}
                  style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, cursor: "pointer",
                    border: `1px solid ${l.color}`,
                    background: storyLabels.includes(l.id) ? l.color : "transparent",
                    color: storyLabels.includes(l.id) ? T.ink : l.color,
                  }}
                >{l.name}</button>
              ))}
              {showLabelInput ? (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    autoFocus
                    value={newLabelName}
                    onChange={e => setNewLabelName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addCustomLabel(); if (e.key === "Escape") setShowLabelInput(false); }}
                    placeholder="Label name"
                    style={{ ...css.input, width: 100, fontSize: 10, padding: "2px 6px" }}
                  />
                  <button onClick={addCustomLabel} style={{ ...css.btnGold, fontSize: 9, padding: "2px 8px" }}>Add</button>
                  <button onClick={() => setShowLabelInput(false)} style={{ ...css.btnGhost, fontSize: 9, padding: "2px 6px" }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setShowLabelInput(true)} style={{ ...css.btnGhost, fontSize: 9, padding: "2px 8px" }}>+ Custom</button>
              )}
            </div>
          </div>

          {/* Acceptance Criteria */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Acceptance Criteria</div>
            <textarea
              value={ac}
              onChange={e => onUpdateDetail(story.id, { ...d, ac: e.target.value })}
              placeholder={"Given...\nWhen...\nThen..."}
              rows={4}
              style={{ ...css.ta, fontSize: 11, width: "100%", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Notes</div>
            <textarea
              value={note}
              onChange={e => onUpdateDetail(story.id, { ...d, note: e.target.value })}
              placeholder="Dev notes, blockers, links..."
              rows={2}
              style={{ ...css.ta, fontSize: 11, width: "100%", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>

          {/* Move to sprint */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 9, color: T.muted }}>Move to:</span>
            <select
              defaultValue={sprintId}
              onChange={e => moveStory(story, e.target.value)}
              style={{ ...css.input, fontSize: 10, padding: "3px 6px", width: "auto" }}
            >
              <option value="backlog">Backlog</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export function SprintGoals({ setView }) {
  const { initiatives, updateIni } = useApp();
  const [dragStory, setDragStory] = useState(null);
  const [sprints, setSprints] = useState(() => [
    { id: "backlog", label: "Backlog",  startDate: "", endDate: "", color: T.muted,  goal: "" },
    { id: "s1",      label: "Sprint 1", startDate: "", endDate: "", color: T.steel,  goal: "" },
    { id: "s2",      label: "Sprint 2", startDate: "", endDate: "", color: T.gold,   goal: "" },
    { id: "s3",      label: "Sprint 3", startDate: "", endDate: "", color: T.green,  goal: "" },
  ]);

  // Load sprint assignments across all initiatives
  const [assignments, setAssignments] = useState(() => {
    const all = {};
    initiatives.forEach(ini => {
      try { Object.assign(all, JSON.parse(ini.sprint_assignments || "{}")); } catch(e) {}
    });
    return all;
  });

  // story_details: { [storyId]: { ac, note, labels, customLabels } }
  const [details, setDetails] = useState(() => {
    const all = {};
    initiatives.forEach(ini => {
      try { Object.assign(all, JSON.parse(ini.story_details || "{}")); } catch(e) {}
    });
    // Pre-populate AC from epics text for any story that has no detail yet
    initiatives.forEach(ini => {
      const acMap = extractStoryAC(ini.epics || "");
      const stories = parseStories(ini.epics, ini.title, ini.slug);
      stories.forEach(story => {
        if (!all[story.id]) {
          // Extract bare US-XX from compound id (e.g. "SLUG-US-01" → "US-01")
          const bareId = story.id.replace(/^.*?-(US-\d+|S-\d+)$/i, "$1").toUpperCase();
          const ac = acMap[bareId] || "";
          if (ac) all[story.id] = { ac, note: "", labels: [], customLabels: [] };
        } else if (!all[story.id].ac) {
          // Story exists in details but AC is empty — fill from epics
          const bareId = story.id.replace(/^.*?-(US-\d+|S-\d+)$/i, "$1").toUpperCase();
          const ac = acMap[bareId] || "";
          if (ac) all[story.id] = { ...all[story.id], ac };
        }
      });
    });
    return all;
  });

  const allStories = initiatives.flatMap(ini =>
    parseStories(ini.epics, ini.title, ini.slug)
  );

  const getStoriesForSprint = (sprintId) =>
    allStories.filter(s => (assignments[s.id] || "backlog") === sprintId);

  const moveStory = (story, toSprintId) => {
    const newAssignments = { ...assignments, [story.id]: toSprintId };
    setAssignments(newAssignments);
    const ini = initiatives.find(i => story.ini === i.title);
    if (ini) {
      let existing = {};
      try { existing = JSON.parse(ini.sprint_assignments || "{}"); } catch(e) {}
      updateIni(ini.id, d => ({ ...d, sprint_assignments: JSON.stringify({ ...existing, [story.id]: toSprintId }) }));
    }
  };

  const onUpdateDetail = (storyId, newDetail) => {
    const next = { ...details, [storyId]: newDetail };
    setDetails(next);
    // Find which ini owns this story and persist
    const story = allStories.find(s => s.id === storyId);
    const ini   = initiatives.find(i => i.title === story?.ini);
    if (ini) {
      let existing = {};
      try { existing = JSON.parse(ini.story_details || "{}"); } catch(e) {}
      updateIni(ini.id, d => ({ ...d, story_details: JSON.stringify({ ...existing, [storyId]: newDetail }) }));
    }
  };

  const addSprint = () => {
    const n = sprints.filter(s => s.id !== "backlog").length + 1;
    const colors = [T.steel, T.gold, T.green, T.amber, T.red, "#9B59B6", "#1ABC9C"];
    setSprints(prev => [...prev, { id: `s${n}`, label: `Sprint ${n}`, startDate: "", endDate: "", color: colors[(n-1) % colors.length], goal: "" }]);
  };

  const updateSprint = (id, key, val) =>
    setSprints(prev => prev.map(s => s.id === id ? { ...s, [key]: val } : s));

  const sprintCol = (sprint) => {
    const stories = getStoriesForSprint(sprint.id);
    const totalPts = stories.reduce((s, st) => s + (st.points || 0), 0);
    // Build sprint options for move-to dropdown inside cards
    return (
      <div key={sprint.id}
        onDragOver={e => e.preventDefault()}
        onDrop={() => { if (dragStory) moveStory(dragStory.story, sprint.id); }}
        style={{ flex: "0 0 280px", background: T.ink2, border: `1px solid ${sprint.id === "backlog" ? T.border : sprint.color}40`, borderTop: `3px solid ${sprint.color}`, borderRadius: 8, padding: 12, minHeight: 300 }}
      >
        <div style={{ marginBottom: 10 }}>
          {sprint.id === "backlog" ? (
            <div style={{ fontWeight: 800, fontSize: 13, color: T.muted }}>BACKLOG</div>
          ) : (
            <input value={sprint.label} onChange={e => updateSprint(sprint.id, "label", e.target.value)}
              style={{ ...css.input, fontWeight: 800, fontSize: 13, color: sprint.color, background: "transparent", border: "none", padding: 0, width: "100%" }} />
          )}
          {sprint.id !== "backlog" && (
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input type="date" value={sprint.startDate} onChange={e => updateSprint(sprint.id, "startDate", e.target.value)}
                style={{ ...css.input, fontSize: 10, padding: "3px 6px", flex: 1 }} />
              <span style={{ color: T.muted, fontSize: 10, alignSelf: "center" }}>→</span>
              <input type="date" value={sprint.endDate} onChange={e => updateSprint(sprint.id, "endDate", e.target.value)}
                style={{ ...css.input, fontSize: 10, padding: "3px 6px", flex: 1 }} />
            </div>
          )}
          {sprint.id !== "backlog" && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: sprint.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Sprint Goal</div>
              <textarea value={sprint.goal} onChange={e => updateSprint(sprint.id, "goal", e.target.value)}
                placeholder="What does the team commit to delivering this sprint?"
                rows={2}
                style={{ ...css.ta, fontSize: 11, resize: "none", width: "100%", boxSizing: "border-box", borderColor: `${sprint.color}40`, lineHeight: 1.5 }} />
            </div>
          )}
          <div style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>
            {stories.length} stories{totalPts > 0 ? ` · ${totalPts} pts` : ""}
          </div>
        </div>
        {stories.map(s => (
          <StoryCard
            key={s.id}
            story={s}
            sprintId={sprint.id}
            dragStory={dragStory}
            setDragStory={setDragStory}
            moveStory={moveStory}
            details={details}
            onUpdateDetail={onUpdateDetail}
          />
        ))}
      </div>
    );
  };

  const hasStories = allStories.length > 0;

  return (
    <div>
      <div style={css.h2}>Sprints · Stage 6</div>
      <div style={css.sub}>Click a story to expand AC, labels, and notes. Drag to assign to sprints.</div>

      {!hasStories && (
        <div style={{ ...css.card, textAlign: "center", padding: 32, color: T.muted, marginBottom: 20 }}>
          <div style={{ marginBottom: 8 }}>No user stories found yet.</div>
          <div style={{ fontSize: 12, marginBottom: 12 }}>Generate Epics & Stories in the Delivery Handoff stage first.</div>
          <button style={css.btnOut} onClick={() => setView("handoff")}>→ Go to Delivery Handoff</button>
        </div>
      )}

      {hasStories && (
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
          {sprints.map(sprintCol)}
          <div style={{ flex: "0 0 48px", display: "flex", alignItems: "flex-start", paddingTop: 8 }}>
            <button onClick={addSprint} style={{ ...css.btnGhost, fontSize: 20, padding: "6px 12px", lineHeight: 1 }} title="Add sprint">+</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lessons Learned · Stage 11 ────────────────────────────────
// Seeded lessons so feature is showcased immediately
const SEEDED_LESSONS = [
  { id: "seed-1", type: "worked", text: "Early customer co-design sessions in Discovery cut rework by ~40% — PMs who ran 3+ interviews before Definition had significantly cleaner epics.", date: "2026-06-15", initiative: "AGL Scout Conversion" },
  { id: "seed-2", type: "worked", text: "PIVOT scoring created productive executive conversations — framing investment asks with evidence dimensions made approval meetings shorter and more decisive.", date: "2026-06-20", initiative: "Portfolio-wide" },
  { id: "seed-3", type: "didnt", text: "Telemetry was not defined before Delivery started on two initiatives — both launched without baseline metrics, making outcome measurement impossible for 60+ days.", date: "2026-07-01", initiative: "Growth Intelligence Platform" },
  { id: "seed-4", type: "didnt", text: "Epics were written without referencing confirmed JTBD — stories drifted from user needs during sprint planning, leading to scope creep in Sprint 3.", date: "2026-07-05", initiative: "Clinical Insights Engine" },
  { id: "seed-5", type: "learning", text: "Invest in OKR-to-initiative traceability early — initiatives without a clear OKR link had 3x more scope change requests during Delivery.", date: "2026-07-10", initiative: "Portfolio-wide" },
  { id: "seed-6", type: "learning", text: "GTM and Measure should be planned at Definition, not after handoff — retrofitting success metrics after launch is costly and slows time-to-insight.", date: "2026-07-12", initiative: "Portfolio-wide" },
];

export function LessonsLearned({ setView }) {
  const { initiatives, foundation } = useApp();
  const [lessons, setLessons] = useState(SEEDED_LESSONS);
  const [newLesson, setNewLesson] = useState({ type: "worked", text: "", initiative: "", date: new Date().toISOString().slice(0,10) });
  const [aiInsights, setAiInsights] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeTab, setActiveTab] = useState("retro"); // "retro" | "ai" | "next"

  const typeConfig = {
    worked: { label: "What Worked", color: T.green, icon: "✓" },
    didnt:  { label: "What Didn't", color: T.red,   icon: "✗" },
    learning: { label: "Key Learning", color: T.gold, icon: "◈" },
  };

  const addLesson = () => {
    if (!newLesson.text.trim()) return;
    setLessons(prev => [...prev, { ...newLesson, id: `ll-${Date.now()}` }]);
    setNewLesson({ type: "worked", text: "", initiative: "", date: new Date().toISOString().slice(0,10) });
  };

  const removeLesson = (id) => setLessons(prev => prev.filter(l => l.id !== id));

  const getAIInsights = async () => {
    setLoadingAI(true);
    setAiInsights("");
    const okrs = foundation?.okrs || [];
    const text = await callAI("lessons_learned", { foundation, initiatives, okrs }).catch(() => "");
    setAiInsights(text);
    setLoadingAI(false);
  };

  const grouped = { worked: [], didnt: [], learning: [] };
  lessons.forEach(l => { if (grouped[l.type]) grouped[l.type].push(l); });

  // Parse AI insights into sections
  const parseAISection = (text, sectionHeader) => {
    if (!text) return "";
    const rx = new RegExp(`##\s*${sectionHeader}([\s\S]*?)(?=##|$)`, "i");
    const m = text.match(rx);
    return m ? m[1].trim() : "";
  };

  const TABS = [
    { id: "retro", label: "📋 Retrospective" },
    { id: "ai",    label: "◆ AI Analysis" },
    { id: "next",  label: "🧠 Next Ideas" },
  ];

  return (
    <div>
      <div style={css.h2}>Lessons Learned · Stage 11</div>
      <div style={css.sub}>Retrospective capture, AI-powered OKR analysis, and recommended next initiatives.</div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === tab.id ? T.gold : "transparent"}`,
            color: activeTab === tab.id ? T.gold : T.muted, fontWeight: activeTab === tab.id ? 800 : 600,
            fontSize: 13, padding: "8px 16px", cursor: "pointer", marginBottom: -1,
          }}>{tab.label}</button>
        ))}
      </div>

      {/* RETROSPECTIVE TAB */}
      {activeTab === "retro" && (
        <div>
          {/* Add new lesson */}
          <div style={{ ...css.card, marginBottom: 20, borderLeft: `3px solid ${T.steel}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.loud, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>+ Add Lesson</div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 160px 120px", gap: 10, marginBottom: 10 }}>
              <select value={newLesson.type} onChange={e => setNewLesson(l => ({ ...l, type: e.target.value }))} style={{ ...css.input, cursor: "pointer", fontSize: 12 }}>
                <option value="worked">✓ Worked</option>
                <option value="didnt">✗ Didn't Work</option>
                <option value="learning">◈ Learning</option>
              </select>
              <textarea rows={2} value={newLesson.text} onChange={e => setNewLesson(l => ({ ...l, text: e.target.value }))}
                placeholder="Describe the lesson in 1-2 sentences..." style={{ ...css.ta, fontSize: 12, resize: "vertical" }} />
              <input value={newLesson.initiative} onChange={e => setNewLesson(l => ({ ...l, initiative: e.target.value }))}
                placeholder="Initiative or Portfolio-wide" style={{ ...css.input, fontSize: 12 }} />
              <input type="date" value={newLesson.date} onChange={e => setNewLesson(l => ({ ...l, date: e.target.value }))} style={{ ...css.input, fontSize: 12 }} />
            </div>
            <button style={css.btnGold} onClick={addLesson} disabled={!newLesson.text.trim()}>Add Lesson</button>
          </div>

          {/* Lessons by type */}
          {Object.entries(typeConfig).map(([type, cfg]) => (
            <div key={type} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{cfg.icon}</span> {cfg.label} ({grouped[type].length})
              </div>
              {grouped[type].length === 0 && (
                <div style={{ color: T.muted, fontSize: 12, fontStyle: "italic", paddingLeft: 16 }}>No entries yet — add above or generate AI analysis.</div>
              )}
              {grouped[type].map(l => (
                <div key={l.id} style={{ ...css.card, margin: "0 0 8px 0", borderLeft: `3px solid ${cfg.color}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.6 }}>{l.text}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                      {l.initiative && <span style={{ marginRight: 10 }}>📍 {l.initiative}</span>}
                      {l.date && <span>🗓 {l.date}</span>}
                    </div>
                  </div>
                  <button onClick={() => removeLesson(l.id)} style={{ ...css.btnGhost, color: T.red, borderColor: T.red, padding: "2px 8px", fontSize: 11, flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* AI ANALYSIS TAB */}
      {activeTab === "ai" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
            <button style={css.btnGold} onClick={getAIInsights} disabled={loadingAI}>
              {loadingAI ? "◆ Analyzing portfolio…" : aiInsights ? "◆ Refresh AI Analysis" : "◆ Generate AI Retrospective Analysis"}
            </button>
            <span style={{ fontSize: 12, color: T.muted }}>Analyzes OKR progress and initiative metrics across your portfolio</span>
          </div>
          {loadingAI && <AIBox label="◆ AI Portfolio Retrospective — Analyzing OKR performance and initiative outcomes" loading />}
          {aiInsights && !loadingAI && (() => {
            const sections = [
              { header: "What Worked", color: T.green, icon: "✓" },
              { header: "What Didn't Work", color: T.red, icon: "✗" },
              { header: "Key Learnings", color: T.gold, icon: "◈" },
              { header: "OKR Progress Assessment", color: T.steel, icon: "◎" },
            ];
            return sections.map(sec => {
              const body = parseAISection(aiInsights, sec.header);
              if (!body) return null;
              return (
                <div key={sec.header} style={{ ...css.card, marginBottom: 14, borderLeft: `3px solid ${sec.color}` }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: sec.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                    {sec.icon} {sec.header}
                  </div>
                  <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.7, whiteSpace: "pre-line" }}>{body}</div>
                </div>
              );
            });
          })()}
          {!aiInsights && !loadingAI && (
            <div style={{ ...css.card, color: T.muted, fontSize: 13, fontStyle: "italic", textAlign: "center", padding: 32 }}>
              Click the button above to generate an AI-powered retrospective based on your OKR progress and initiative metrics.
            </div>
          )}
        </div>
      )}

      {/* NEXT IDEAS TAB */}
      {activeTab === "next" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
            <button style={css.btnGold} onClick={getAIInsights} disabled={loadingAI}>
              {loadingAI ? "◆ Analyzing…" : aiInsights ? "◆ Refresh Recommendations" : "◆ Generate Next Initiative Recommendations"}
            </button>
            <span style={{ fontSize: 12, color: T.muted }}>AI recommends high-leverage ideas based on OKR gaps and outcomes</span>
          </div>
          {loadingAI && <AIBox label="◆ AI — Generating next initiative recommendations aligned to OKRs" loading />}
          {aiInsights && !loadingAI && (() => {
            const body = parseAISection(aiInsights, "AI Recommendations:? Next Ideas to Advance OKRs");
            if (!body) return (
              <div style={{ ...css.card, color: T.muted, fontSize: 13, fontStyle: "italic", textAlign: "center", padding: 32 }}>
                No recommendations found — try refreshing the AI Analysis tab first.
              </div>
            );
            // Parse individual recommendations
            const recs = body.split(/\n(?=[-•*]\s*\*\*Title|\d+\.\s*\*\*)/);
            return recs.filter(r => r.trim()).map((rec, i) => {
              const lines = rec.split("\n").filter(l => l.trim());
              const title = lines[0]?.replace(/^[-•*\d.]+\s*/, "").replace(/\*\*/g,"").replace(/^Title:?\s*/i,"").trim() || `Recommendation ${i+1}`;
              const details = lines.slice(1).map(l => l.replace(/\*\*/g,"").trim()).filter(Boolean);
              return (
                <div key={i} style={{ ...css.card, marginBottom: 14, borderLeft: `3px solid ${T.gold}`, background: "#0D1726" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.loud, marginBottom: 10 }}>
                    <span style={{ color: T.gold, marginRight: 8 }}>{["🥇","🥈","🥉"][i] || "◆"}</span>{title}
                  </div>
                  {details.map((d, di) => (
                    <div key={di} style={{ fontSize: 12, color: T.body, lineHeight: 1.6, marginBottom: 4, paddingLeft: 8 }}>
                      {d.startsWith("-") ? d : `• ${d}`}
                    </div>
                  ))}
                  <button style={{ ...css.btnOut, marginTop: 12, fontSize: 11 }}
                    onClick={() => setView && setView("ideas")}>
                    → Capture as New Idea
                  </button>
                </div>
              );
            });
          })()}
          {!aiInsights && !loadingAI && (
            <div style={{ ...css.card, color: T.muted, fontSize: 13, textAlign: "center", padding: 32 }}>
              <div style={{ marginBottom: 12 }}>◆ AI analyzes your OKR gaps, initiative outcomes, and company mission to recommend the highest-leverage ideas for your next cycle.</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                Recommendations include: which OKR they advance, the evidence basis, and risk to validate.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Thought Leadership ─────────────────────────────────────────
export function ThoughtLeadership() {
  return (
    <div>
      <div style={css.h2}>Thought Leadership</div>
      <div style={css.sub}>NCM Framework whitepapers, articles, and content library.</div>
      <div style={{ ...css.card, textAlign: "center", padding: 40, color: T.muted }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✍️</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.loud, marginBottom: 8 }}>Content Library — Coming Soon</div>
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          Whitepapers, case studies, and framework articles will live here.<br />
          Content strategy and authoring tools to follow.
        </div>
      </div>
    </div>
  );
}

export function StageList({ stageFilter, title, setView }) {
  const { initiatives } = useApp();

  // Show ALL initiatives on every stage page — each shows its current stage badge
  const meta = STAGE_META[stageFilter] || { minStage: stageFilter, sub: "All initiatives — showing current stage for each." };

  const stageInits = [...initiatives].sort((a, b) => stageIndex(b.stage) - stageIndex(a.stage)); // furthest along first

  return (
    <div>
      <div style={css.h2}>{title}</div>
      <div style={css.sub}>{meta.sub}</div>

      {stageInits.length === 0 && (
        <div style={{ ...css.card, textAlign: "center", padding: 40, color: T.muted }}>
          No initiatives in pipeline yet.{" "}
          <button style={{ ...css.btnOut, display: "inline" }} onClick={() => setView("ideas")}>Start in Ideas</button>
        </div>
      )}

      {stageInits.map(ini => {
        const score = calcPivot(ini.pivot);
        const tier = pivotTier(score);
        const filterStage = stageFilter === "execreview" ? "review" : stageFilter;
        const isCurrentStage = ini.stage === filterStage;
        return (
          <div key={ini.id}
            style={{ ...css.card, cursor: "pointer", borderLeft: `3px solid ${stageColor(ini.stage)}` }}
            onClick={() => setView("initiative_" + ini.id)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.loud }}>{ini.title}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{ini.slug} · {ini.source_detail}</div>
              </div>
              <Tag label={stageLabel(ini.stage)} color={stageColor(ini.stage)} />
              {isCurrentStage && (
                <Tag label="● at this stage" color={T.gold} />
              )}
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
    { label: "Help me with Quarterly Planning Risks", prompt: "Let's work on the Risks card for my Quarterly Planning package. Ask me targeted questions to identify and document risks for this program increment." },
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

// ─── Bubble button — safe hover via state, no DOM mutation ──────
function ChattyBubble({ label, prompt, onSend, disabled }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onSend(prompt)}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize: 11, padding: "5px 10px", borderRadius: 20,
        border: `1px solid ${T.goldB}`,
        background: hovered ? T.goldD : "transparent",
        color: T.gold, cursor: disabled ? "default" : "pointer",
        lineHeight: 1.3, textAlign: "left",
        transition: "background 0.15s",
        opacity: disabled ? 0.5 : 1,
      }}>
      {label}
    </button>
  );
}

// ─── Chatty ───────────────────────────────────────────────────
export function Chatty({ currentView }) {
  const { foundation, initiatives, userName } = useApp();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const pageKey = currentView.startsWith("initiative_") ? "ideas"
    : currentView === "delivery" ? "delivery"
    : currentView;
  const bubbles = PAGE_BUBBLES[pageKey] || PAGE_BUBBLES.dashboard;

  // Set greeting when Chatty opens for first time
  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{
        role: "assistant",
        text: `Hi! I'm your product intelligence advisor. I know your full pipeline — ${initiatives.length} initiatives across all stages. What do you need?`,
      }]);
    }
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send(question) {
    const q = question || input.trim();
    if (!q || loading) return;
    setInput("");
    setMsgs(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const history = msgs.slice(-8).map(m => ({ role: m.role, content: m.text }));
      const text = await callAI("chatty", {
        foundation, initiatives, currentView, userName,
        question: q, messages: history,
      });
      setMsgs(prev => [...prev, { role: "assistant", text }]);
    } catch (err) {
      setMsgs(prev => [...prev, { role: "assistant", text: "I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

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
                <ChattyBubble key={i} label={b.label} prompt={b.prompt} onSend={send} disabled={loading} />
              ))}
            </div>
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", display: "flex", gap: 8 }}>
            <input style={{ ...css.input, flex: 1, fontSize: 13 }} value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything about your portfolio…"
              onKeyDown={handleKey} />
            <button style={{ ...css.btnGold, padding: "8px 14px" }}
              onClick={() => send()}
              disabled={loading || !input.trim()}>→</button>
          </div>
        </div>
      )}
    </>
  );
}
import { useState, useEffect } from "react";
import { T, css } from "../lib/tokens";
import { AIBox, Tag } from "../components/ui";
import { useApp } from "../contexts/AppContext";
import { callAI, listCompetitorSnapshots, createCompetitorSnapshot, uploadFile } from "../lib/api";

const TABS = [
  ["mission", "Mission & Vision"],
  ["okrs", "OKRs"],
  ["strategy", "Strategy"],
  ["capabilities", "Capabilities"],
  ["products", "Products"],
  ["competitors", "Competitive Analysis"],
  ["architecture", "Architecture"],
];


// ─── Competitor Analysis Component ───────────────────────────

function CompetitorAnalysis({ competitors, foundation, addCompetitor, removeCompetitor }) {
  const { orgId } = useApp();
  const [collapsed, setCollapsed] = useState(() => {
    const s = {};
    competitors.forEach((c, i) => { s[c.id] = i > 0; });
    return s;
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [snapshots, setSnapshots] = useState([]); // persisted from Neon
  const [snapsLoading, setSnapsLoading] = useState(true);
  const [activeSnap, setActiveSnap] = useState(null); // null = live

  const toggleCollapse = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  // Load persisted snapshots on mount
  useEffect(() => {
    if (!orgId) return;
    listCompetitorSnapshots(orgId)
      .then(r => setSnapshots(r?.data || []))
      .catch(() => setSnapshots([]))
      .finally(() => setSnapsLoading(false));
  }, [orgId]);

  const runAiRefresh = async () => {
    setAiLoading(true);
    try {
      // Pull our own product scores from foundation if available
      const ourProduct = (foundation?.products || []).find(p => p.is_primary || p.type === "mobile_app") || (foundation?.products || [])[0];
      const ourScores = ourProduct ? {
        overall_score:   ourProduct.overall_score   || null,
        digital_score:   ourProduct.digital_score   || null,
        mobile_score:    ourProduct.mobile_score    || null,
        claims_score:    ourProduct.claims_score    || null,
        portal_score:    ourProduct.portal_score    || null,
        app_store_rating: ourProduct.app_store_rating || null,
      } : null;
      const text = await callAI("competitor_analysis", { foundation, competitors, ourScores });
      if (text) {
        // Build scan_data: capture current scores for delta comparison
        const scan_data = {};
        competitors.forEach(c => {
          scan_data[c.id] = {
            name: c.name,
            overall_score: c.overall_score,
            digital_score: c.digital_score,
            mobile_score: c.mobile_score,
            claims_score: c.claims_score,
            portal_score: c.portal_score,
            app_store_rating: c.app_store_rating,
            threat_level: c.threat_level,
          };
        });
        // Persist to Neon
        const saved = await createCompetitorSnapshot({ org_id: orgId, summary: text, scan_data });
        if (saved?.data) {
          setSnapshots(prev => [saved.data, ...prev]);
          setActiveSnap(0);
        }
      }
    } catch (err) {
      console.error("AI competitor refresh error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  // Build delta between two snapshots (or live vs last snap)
  const getDelta = (competitorId, field) => {
    if (snapshots.length < 2) return null;
    const curr = snapshots[0]?.scan_data?.[competitorId]?.[field];
    const prev = snapshots[1]?.scan_data?.[competitorId]?.[field];
    if (curr == null || prev == null) return null;
    const diff = Number(curr) - Number(prev);
    return diff === 0 ? null : diff;
  };

  const DeltaBadge = ({ delta }) => {
    if (delta === null) return null;
    const color = delta > 0 ? T.red : T.green; // higher score = worse for us
    return (
      <span style={{ fontSize: 9, fontWeight: 700, color, marginLeft: 4 }}>
        {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
      </span>
    );
  };

  const scoreColor = (s) => s >= 85 ? T.red : s >= 70 ? T.amber : T.green;

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={css.secHead}>Competitive Analysis</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            Internal scoring model — PM-assessed across digital experience, claims, and portal positioning.
            {" "}<span style={{ color: T.gold }}>Scores are not sourced from app stores.</span>
            {" "}App Store rating is the only external data point (from public iOS/Android listings).
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={css.btnOut} onClick={runAiRefresh} disabled={aiLoading}>
            {aiLoading ? "◆ Analyzing…" : "◆ AI Refresh"}
          </button>
          <button style={css.btnGhost} onClick={addCompetitor}>+ Add</button>
        </div>
      </div>

      {/* Snapshot history pills */}
      {!snapsLoading && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Scan History:</span>
          <button
            onClick={() => setActiveSnap(null)}
            style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, border: `1px solid ${activeSnap === null ? T.gold : T.border}`, background: activeSnap === null ? T.goldD : "transparent", color: activeSnap === null ? T.gold : T.muted, cursor: "pointer" }}>
            Live Data
          </button>
          {snapshots.map((s, i) => (
            <button key={s.id || i}
              onClick={() => setActiveSnap(i)}
              style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, border: `1px solid ${activeSnap === i ? T.steel : T.border}`, background: activeSnap === i ? T.iceD : "transparent", color: activeSnap === i ? T.ice : T.muted, cursor: "pointer" }}>
              {new Date(s.created_at).toLocaleDateString([], { month: "short", day: "numeric" })} · {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </button>
          ))}
          {snapshots.length === 0 && <span style={{ fontSize: 11, color: T.muted, fontStyle: "italic" }}>No scans yet — click AI Refresh to run first scan</span>}
        </div>
      )}

      {/* AI snapshot narrative */}
      {activeSnap !== null && snapshots[activeSnap] && (
        <div style={{ ...css.card, borderLeft: `3px solid ${T.steel}`, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ice, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              ◆ AI Intelligence Scan · {new Date(snapshots[activeSnap].created_at).toLocaleString()}
            </div>
            {activeSnap === 0 && snapshots.length >= 2 && (
              <div style={{ fontSize: 10, color: T.amber, fontStyle: "italic" }}>Latest scan — see delta badges on scores below ▲▼</div>
            )}
          </div>
          <div style={{ fontSize: 12, color: T.body, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{snapshots[activeSnap].summary}</div>
        </div>
      )}

      {/* What changed section — only when on latest snap and 2+ scans exist */}
      {activeSnap === 0 && snapshots.length >= 2 && (
        <div style={{ ...css.card, borderLeft: `3px solid ${T.amber}`, marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.amber, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            △ What Changed Since Previous Scan · {new Date(snapshots[1].created_at).toLocaleDateString()}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            {competitors.map(c => {
              const fields = ["overall_score","digital_score","mobile_score","claims_score","portal_score"];
              const labels = ["Overall","Digital","Mobile","Claims","Portal"];
              const changes = fields.map((f, i) => ({ label: labels[i], delta: getDelta(c.id, f) })).filter(x => x.delta !== null);
              if (!changes.length) return null;
              return (
                <div key={c.id} style={{ background: T.ink3, borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.loud, marginBottom: 5 }}>{c.name}</div>
                  {changes.map(({ label, delta }) => (
                    <div key={label} style={{ fontSize: 11, color: T.muted, display: "flex", justifyContent: "space-between" }}>
                      <span>{label}</span>
                      <span style={{ fontWeight: 700, color: delta > 0 ? T.red : T.green }}>
                        {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }).filter(Boolean)}
            {competitors.every(c => {
              const fields = ["overall_score","digital_score","mobile_score","claims_score","portal_score"];
              return fields.every(f => getDelta(c.id, f) === null);
            }) && (
              <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>No score changes detected between scans.</div>
            )}
          </div>
        </div>
      )}

      {/* Scorecard header */}
      {competitors.length > 0 && (
        <div style={{ ...css.card, background: T.ink3, marginBottom: 0, padding: "8px 16px", borderRadius: "10px 10px 0 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "32px 1.6fr 70px 70px 70px 70px 70px 90px 80px 24px", gap: 6, alignItems: "center" }}>
            {["#", "Competitor", "Overall", "Digital", "Mobile", "Claims", "Portal", "App Store ★", "Threat", ""].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
            ))}
          </div>
        </div>
      )}

      {/* Competitor rows */}
      {competitors.map((c, idx) => {
        const threatColor = c.threat_level === "high" ? T.red : c.threat_level === "medium" ? T.amber : T.green;
        const tierColor = c.tier === "disruptor" ? T.purple : c.tier === "primary" ? T.steel : T.muted;
        const isCollapsed = collapsed[c.id] !== false && idx > 0 ? true : !!collapsed[c.id];
        const isLast = idx === competitors.length - 1;

        return (
          <div key={c.id} style={{ ...css.card, marginBottom: isLast ? 0 : 4, borderRadius: isLast && isCollapsed ? "0 0 10px 10px" : "0", borderTop: "none", padding: "10px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "32px 1.6fr 70px 70px 70px 70px 70px 90px 80px 24px", gap: 6, alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: T.gold }}>#{idx + 1}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.loud }}>{c.name}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                  <Tag label={c.tier} color={tierColor} />
                  {c.market_share_pct > 0 && <span style={{ fontSize: 10, color: T.muted }}>{c.market_share_pct}% share</span>}
                  {c.jd_power_rank > 0 && <span style={{ fontSize: 10, color: T.muted }}>JD Power #{c.jd_power_rank}</span>}
                </div>
              </div>
              {/* Scores with delta badges from most recent vs previous scan */}
              {[
                [c.overall_score, "overall_score"],
                [c.digital_score, "digital_score"],
                [c.mobile_score, "mobile_score"],
                [c.claims_score, "claims_score"],
                [c.portal_score, "portal_score"],
              ].map(([s, field], i) => {
                const delta = activeSnap === 0 ? getDelta(c.id, field) : null;
                return (
                  <div key={i} style={{ textAlign: "center" }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: s > 0 ? scoreColor(s) : T.muted }}>{s || "—"}</span>
                    {delta !== null && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: delta > 0 ? T.red : T.green, display: "block" }}>
                        {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                      </span>
                    )}
                  </div>
                );
              })}
              <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: c.app_store_rating > 0 ? T.gold : T.muted }}>
                {c.app_store_rating > 0 ? `★ ${Number(c.app_store_rating).toFixed(1)}` : "—"}
              </div>
              <div style={{ textAlign: "center" }}>
                <Tag label={c.threat_level || "—"} color={threatColor} />
              </div>
              <button onClick={() => toggleCollapse(c.id)}
                style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 14, padding: 0, textAlign: "center" }}>
                {isCollapsed ? "▸" : "▾"}
              </button>
            </div>

            {!isCollapsed && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", marginBottom: 6 }}>Key Differentiator</div>
                    <div style={{ fontSize: 12, color: T.body, lineHeight: 1.6, background: T.ink3, padding: "8px 10px", borderRadius: 6 }}>{c.key_differentiator || "—"}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.green, textTransform: "uppercase", marginBottom: 4 }}>Our Advantage</div>
                      <div style={{ fontSize: 11, color: T.body, lineHeight: 1.55, background: "rgba(46,204,113,0.06)", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(46,204,113,0.15)" }}>{c.our_advantage || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.red, textTransform: "uppercase", marginBottom: 4 }}>Our Gap</div>
                      <div style={{ fontSize: 11, color: T.body, lineHeight: 1.55, background: "rgba(231,76,60,0.06)", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(231,76,60,0.15)" }}>{c.our_gap || "—"}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", marginBottom: 6 }}>Strengths</div>
                    {(c.strengths || []).map((s, i) => (
                      <div key={i} style={{ fontSize: 11, color: T.body, padding: "3px 0", borderBottom: `1px solid ${T.border}`, lineHeight: 1.5 }}>▪ {s}</div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", marginBottom: 6 }}>Weaknesses</div>
                    {(c.weaknesses || []).map((w, i) => (
                      <div key={i} style={{ fontSize: 11, color: T.body, padding: "3px 0", borderBottom: `1px solid ${T.border}`, lineHeight: 1.5 }}>▪ {w}</div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button style={{ ...css.btnGhost, fontSize: 11, color: T.red }} onClick={() => removeCompetitor(c.id)}>Remove</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {competitors.length === 0 && (
        <div style={{ ...css.card, textAlign: "center", padding: 40, color: T.muted }}>
          No competitors yet. Run the Mercury competitor seed SQL or click + Add.
        </div>
      )}

      {/* Legend + data source note */}
      <div style={{ ...css.card, marginTop: 8, borderRadius: "0 0 10px 10px", borderTop: "none" }}>
        <div style={{ fontSize: 11, color: T.muted, display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 6 }}>
          <span>Scores · <strong style={{ color: T.red }}>85+</strong> threat · <strong style={{ color: T.amber }}>70–84</strong> moderate · <strong style={{ color: T.green }}>&lt;70</strong> gap opportunity</span>
          <span><strong style={{ color: T.steel }}>primary</strong> direct · <strong style={{ color: T.purple }}>disruptor</strong> digital-native · <strong style={{ color: T.muted }}>secondary</strong> adjacent</span>
        </div>
        <div style={{ fontSize: 10, color: T.muted, fontStyle: "italic" }}>
          ★ App Store rating is sourced from public iOS/Android listings. All other scores (Overall, Digital, Mobile, Claims, Portal) are PM-assessed using the PGI Competitive Scoring Model — see References → Score Methodology for exact formulas.
        </div>
      </div>

      {aiLoading && (
        <div style={{ ...css.card, marginTop: 8 }}>
          <div style={{ color: T.gold, fontStyle: "italic" }}>◆ AI is analyzing your competitive landscape… scanning digital presence, claims experience, and mobile capabilities…</div>
        </div>
      )}
    </div>
  );
}

export function Foundation() {
  const {
    orgId, foundation, setFoundation,
    addOKR, removeOKR, updateOKRLocal,
    addTheme, removeTheme, updateThemesLocal,
    addCapability, removeCap, updateCapsLocal,
    addProduct, updateProductLocal, removeProduct,
    competitors, addCompetitor, updateComp, removeCompetitor,
  } = useApp();

  const [tab, setTab] = useState("mission");
  const [aiSuggest, setAiSuggest] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!foundation) return null;
  const f = foundation;

  const suggest = async (what) => {
    setLoadingAI(true);
    setAiSuggest("");
    const text = await callAI("suggest", { foundation: f, what }).catch(() => "");
    setAiSuggest(text);
    setLoadingAI(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setUploading(true);
    try {
      const res = await uploadFile(file, orgId);
      if (res.data) {
        setFoundation(f => ({ ...f, architecture: [...(f.architecture || []), res.data] }));
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div style={css.h2}>Enterprise Foundation</div>
      <div style={css.sub}>Your organization's strategic context. AI references this in every recommendation.</div>

      <div style={{ display: "flex", gap: 0, background: T.ink3, borderRadius: 8, padding: 3, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(([id, lbl]) => (
          <button key={id} onClick={() => { setTab(id); setAiSuggest(""); }}
            style={{ ...css.btnGhost, borderRadius: 6, border: "none", background: tab === id ? T.ink2 : "transparent", color: tab === id ? T.gold : T.muted, fontWeight: tab === id ? 700 : 400, margin: 2, fontSize: 12 }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── MISSION ── */}
      {tab === "mission" && (
        <div>
          <div style={css.card}>
            <label style={css.label}>Mission Statement</label>
            <textarea rows={3} style={css.ta} value={f.mission}
              onChange={e => setFoundation(d => ({ ...d, mission: e.target.value }))} />
          </div>
          <div style={css.card}>
            <label style={css.label}>Vision</label>
            <textarea rows={3} style={css.ta} value={f.vision}
              onChange={e => setFoundation(d => ({ ...d, vision: e.target.value }))} />
          </div>
          <div style={css.card}>
            <label style={css.label}>Core Values</label>
            {f.values.map((v, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <input style={{ ...css.input, flex: 1 }} value={v}
                  onChange={e => {
                    const nv = [...f.values]; nv[i] = e.target.value;
                    setFoundation(d => ({ ...d, values: nv }));
                  }} />
                <button style={css.btnGhost} onClick={() => setFoundation(d => ({ ...d, values: d.values.filter((_, j) => j !== i) }))}>✕</button>
              </div>
            ))}
            <button style={css.btnGhost} onClick={() => setFoundation(d => ({ ...d, values: [...d.values, ""] }))}>+ Add Value</button>
          </div>
        </div>
      )}

      {/* ── OKRs ── */}
      {tab === "okrs" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Company OKRs</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={css.btnOut} onClick={() => suggest("3 additional OKRs")}>◆ AI Suggest OKRs</button>
              <button style={css.btnGhost} onClick={addOKR}>+ Add OKR</button>
            </div>
          </div>
          {(f.okrs || []).map((okr, i) => (
            <div key={okr.id} style={{ ...css.card, borderLeft: `3px solid ${T.gold}` }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input style={{ ...css.input, flex: 1 }} placeholder="Objective statement" value={okr.objective}
                  onChange={e => {
                    const no = [...f.okrs]; no[i] = { ...no[i], objective: e.target.value };
                    updateOKRLocal(no);
                  }} />
                <input style={{ ...css.input, width: 120 }} placeholder="Owner" value={okr.owner}
                  onChange={e => {
                    const no = [...f.okrs]; no[i] = { ...no[i], owner: e.target.value };
                    updateOKRLocal(no);
                  }} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
                  <span style={{ fontSize: 10, color: T.muted, marginBottom: 2 }}>Progress</span>
                  <input type="number" min="0" max="100" style={{ ...css.input, width: 60, textAlign: "center", fontSize: 13, fontWeight: 700, color: T.gold, padding: "4px 6px" }}
                    value={okr.progress}
                    onChange={e => {
                      const no = [...f.okrs]; no[i] = { ...no[i], progress: parseInt(e.target.value) || 0 };
                      updateOKRLocal(no);
                    }} />
                </div>
                <button style={{ ...css.btnGhost, color: T.red, borderColor: T.red }} onClick={() => removeOKR(okr.id)}>✕</button>
              </div>
              <label style={css.label}>Key Results</label>
              {(okr.key_results || okr.krs || []).map((kr, j) => (
                <div key={j} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                  <span style={{ color: T.muted, fontSize: 12, paddingTop: 9 }}>▸</span>
                  <input style={{ ...css.input, flex: 1 }} value={kr}
                    onChange={e => {
                      const no = [...f.okrs];
                      const krs = [...(no[i].key_results || no[i].krs || [])];
                      krs[j] = e.target.value;
                      no[i] = { ...no[i], key_results: krs, krs };
                      updateOKRLocal(no);
                    }} />
                </div>
              ))}
              <button style={{ ...css.btnGhost, fontSize: 11, marginTop: 4 }}
                onClick={() => {
                  const no = [...f.okrs];
                  const krs = [...(no[i].key_results || no[i].krs || []), ""];
                  no[i] = { ...no[i], key_results: krs, krs };
                  updateOKRLocal(no);
                }}>+ Key Result</button>
            </div>
          ))}
          {(aiSuggest || loadingAI) && <AIBox label="◆ Strategy Advisor" loading={loadingAI}>{aiSuggest}</AIBox>}
        </div>
      )}

      {/* ── STRATEGY ── */}
      {tab === "strategy" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Strategic Themes</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={css.btnOut} onClick={() => suggest("strategic themes aligned with the mission and current OKRs")}>◆ AI Suggest</button>
              <button style={css.btnGhost} onClick={addTheme}>+ Add Theme</button>
            </div>
          </div>
          {(f.strategies || []).map((s, i) => (
            <div key={s.id} style={{ ...css.card, position: "relative" }}>
              <button style={{ position: "absolute", top: 12, right: 12, ...css.btnGhost, color: T.red, borderColor: T.red, padding: "3px 8px", fontSize: 11 }}
                onClick={() => removeTheme(s.id)}>✕</button>
              <div style={{ display: "flex", gap: 8, marginBottom: 6, paddingRight: 36 }}>
                <input style={{ ...css.input, flex: 1, fontWeight: 600 }} value={s.name}
                  onChange={e => { const ns = [...f.strategies]; ns[i] = { ...ns[i], name: e.target.value }; updateThemesLocal(ns); }} />
                <input style={{ ...css.input, width: 180 }} placeholder="Theme" value={s.theme}
                  onChange={e => { const ns = [...f.strategies]; ns[i] = { ...ns[i], theme: e.target.value }; updateThemesLocal(ns); }} />
              </div>
              <textarea rows={2} style={css.ta} value={s.description}
                onChange={e => { const ns = [...f.strategies]; ns[i] = { ...ns[i], description: e.target.value }; updateThemesLocal(ns); }} />
            </div>
          ))}
          {(aiSuggest || loadingAI) && <AIBox label="◆ Strategy Advisor" loading={loadingAI}>{aiSuggest}</AIBox>}
        </div>
      )}

      {/* ── CAPABILITIES ── */}
      {tab === "capabilities" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Business Capabilities</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={css.btnOut} onClick={() => suggest("business capabilities a wealth management platform should have")}>◆ AI Suggest</button>
              <button style={css.btnGhost} onClick={addCapability}>+ Add</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(f.capabilities || []).map((c, i) => (
              <div key={c.id} style={{ ...css.card, position: "relative" }}>
                <button style={{ position: "absolute", top: 8, right: 8, ...css.btnGhost, color: T.red, borderColor: T.red, padding: "2px 6px", fontSize: 10 }}
                  onClick={() => removeCap(c.id)}>✕</button>
                <input style={{ ...css.input, fontWeight: 600, marginBottom: 6, paddingRight: 32 }} value={c.name}
                  onChange={e => { const nc = [...f.capabilities]; nc[i] = { ...nc[i], name: e.target.value }; updateCapsLocal(nc); }} />
                <textarea rows={2} style={css.ta} value={c.description}
                  onChange={e => { const nc = [...f.capabilities]; nc[i] = { ...nc[i], description: e.target.value }; updateCapsLocal(nc); }} />
              </div>
            ))}
          </div>
          {(aiSuggest || loadingAI) && <AIBox label="◆ Strategy Advisor" loading={loadingAI}>{aiSuggest}</AIBox>}
        </div>
      )}

      {/* ── PRODUCTS ── */}
      {tab === "products" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Product Portfolio</div>
            <button style={css.btnGhost} onClick={addProduct}>+ Add Product</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            {(f.products || []).map((p) => (
              <div key={p.id} style={{ ...css.card, borderLeft: `3px solid ${T.steel}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <input style={{ ...css.input, fontWeight: 700, border: "none", background: "transparent", padding: "0", fontSize: 14 }}
                    value={p.name}
                    onChange={e => updateProductLocal(p.id, { name: e.target.value })} />
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Tag label={p.stage} color={p.stage === "GA" ? T.green : T.amber} />
                    <button style={{ ...css.btnGhost, color: T.red, borderColor: T.red, padding: "2px 6px", fontSize: 10 }}
                      onClick={() => removeProduct(p.id)}>✕</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...css.input, flex: 1, fontSize: 11 }} value={p.type}
                    onChange={e => updateProductLocal(p.id, { type: e.target.value })} placeholder="Product type" />
                  <select style={{ ...css.input, width: 90, fontSize: 11, cursor: "pointer" }} value={p.stage}
                    onChange={e => updateProductLocal(p.id, { stage: e.target.value })}>
                    {["Alpha", "Beta", "GA", "Deprecated"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ── COMPETITIVE ANALYSIS ── */}
      {tab === "competitors" && (
        <CompetitorAnalysis
          competitors={competitors}
          foundation={f}
          addCompetitor={addCompetitor}
          removeCompetitor={removeCompetitor}
        />
      )}

      {/* ── ARCHITECTURE ── */}
      {tab === "architecture" && (
        <div>
          <div style={css.secHead}>Architecture Knowledge Base</div>
          <div style={{ ...css.card, textAlign: "center", padding: "40px 24px", borderStyle: "dashed" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⊞</div>
            <div style={{ fontSize: 15, color: T.loud, marginBottom: 6 }}>Upload Architecture Diagrams</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>PNG, JPG — AI extracts systems, APIs, and integrations</div>
            <label style={{ ...css.btnGold, display: "inline-block", cursor: "pointer" }}>
              {uploading ? "Uploading…" : "Upload Diagram"}
              <input type="file" accept=".png,.jpg,.jpeg,.pdf,.pptx" style={{ display: "none" }} onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
          {(f.architecture || []).map(asset => (
            <div key={asset.id} style={{ ...css.card, borderLeft: `3px solid ${T.ice}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.loud }}>{asset.filename}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{asset.file_type} · {Math.round((asset.file_size || 0) / 1024)}KB</div>
                </div>
                <Tag label="Analyzed" color={T.ice} />
              </div>
              {asset.ai_analysis && (
                <div style={{ fontSize: 12, color: T.body, lineHeight: 1.65, whiteSpace: "pre-wrap", background: T.ink3, padding: 12, borderRadius: 6 }}>
                  {asset.ai_analysis}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
// ─── Design Tokens ───────────────────────────────────────────
export const T = {
  ink:    "#0A1628", ink2: "#0F1E35", ink3: "#152542", ink4: "#1B2F4E",
  border: "#1E3A55", b2:   "#254A6E", b3:   "#2E5C85",
  muted:  "#4A7090", body: "#8EB8D6", loud: "#D2E8F5", white: "#EEF6FC",
  gold:   "#D4A843", goldD: "rgba(212,168,67,0.13)", goldB: "rgba(212,168,67,0.28)",
  steel:  "#2E6DA4", ice:  "#7FB3D3", iceD: "rgba(127,179,211,0.12)",
  green:  "#2ECC71", grnD: "rgba(46,204,113,0.11)",
  amber:  "#E8913A", ambD: "rgba(232,145,58,0.11)",
  red:    "#E74C3C", redD: "rgba(231,76,60,0.11)",
  purple: "#9B59B6", purD: "rgba(155,89,182,0.11)",
  teal:   "#1ABC9C", teaD: "rgba(26,188,156,0.11)",
};

// ─── Shared CSS helpers ───────────────────────────────────────
export const css = {
  card:    { background: T.ink2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "20px 22px", marginBottom: 14 },
  label:   { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 5, display: "block" },
  input:   { width: "100%", background: T.ink3, border: `1px solid ${T.b2}`, borderRadius: 6, padding: "8px 12px", color: T.loud, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  ta:      { width: "100%", background: T.ink3, border: `1px solid ${T.b2}`, borderRadius: 6, padding: "9px 12px", color: T.loud, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.65 },
  btnGold: { background: T.gold, color: T.ink, border: "none", borderRadius: 6, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnOut:  { background: "transparent", color: T.gold, border: `1px solid ${T.goldB}`, borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  btnGhost:{ background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 13px", fontSize: 12, cursor: "pointer" },
  h2:      { fontSize: 22, fontWeight: 800, color: T.white, letterSpacing: "-0.02em", marginBottom: 4 },
  sub:     { fontSize: 13, color: T.muted, marginBottom: 22, lineHeight: 1.5 },
  secHead: { fontSize: 11, fontWeight: 700, color: T.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 },
  tag:     (c, b) => ({ display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, border: `1px solid ${c}`, background: b || "transparent", color: c }),
};

// ─── Stage helpers ────────────────────────────────────────────
export function stageLabel(s) {
  return { idea: "Idea", discovery: "Discovery", review: "Exec Review", portfolio: "Portfolio", approved: "Approved", definition: "Definition", delivery: "Delivery", handoff: "Handoff", closed: "Closed" }[s] || s;
}

export function stageColor(s) {
  return { idea: T.muted, discovery: T.ice, review: T.gold, portfolio: T.amber, approved: T.green, definition: T.purple, delivery: T.teal, handoff: T.steel, closed: T.muted }[s] || T.muted;
}

// ─── PIVOT scoring ────────────────────────────────────────────
export function calcPivot(pivot) {
  if (!pivot) return 0;
  return Math.min(100, (pivot.p * 0.25 + pivot.i * 0.20 + pivot.v * 0.15 + pivot.o * 0.20 + pivot.t * 0.20) * 10);
}

export function pivotTier(score) {
  if (score >= 70) return { label: "COMMIT",  color: T.green,  bg: T.grnD };
  if (score >= 55) return { label: "CONSIDER", color: T.gold,   bg: T.goldD };
  if (score >= 40) return { label: "DEFER",    color: T.amber,  bg: T.ambD };
  return                  { label: "KILL",     color: T.red,    bg: T.redD };
}

// ─── WSJF helpers ─────────────────────────────────────────────
export function calcWSJF(ini) {
  if (!ini.wsjf_effort || ini.wsjf_effort === 0) return 0;
  return Math.round(((ini.wsjf_biz_value + ini.wsjf_time_crit + ini.wsjf_risk_reduction) / ini.wsjf_effort) * 10);
}

export function wsjfColor(score) {
  if (score >= 75) return T.green;
  if (score >= 55) return T.gold;
  return T.amber;
}

// ─── Initiative shape normalizer ─────────────────────────────
// Converts DB snake_case row to the shape the UI expects
export function normalizeInitiative(row) {
  if (!row) return null;
  return {
    ...row,
    // Pivot as nested object for backward compat
    pivot: {
      p: parseFloat(row.pivot_p) || 5,
      i: parseFloat(row.pivot_i) || 5,
      v: parseFloat(row.pivot_v) || 5,
      o: parseFloat(row.pivot_o) || 5,
      t: parseFloat(row.pivot_t) || 5,
    },
    evidence: {
      interviews: row.evidence_interviews || "0",
      painConfirmed: row.evidence_pain_confirmed || "—",
      revenueOpp: row.evidence_revenue_opp || "TBD",
      costSavings: row.evidence_cost_savings || "TBD",
      competitive: row.evidence_competitive || "Not assessed",
      nps: row.evidence_nps || "Not assessed",
    },
    investment: {
      requested: row.investment_requested || 0,
      approved: row.investment_approved || 0,
      currency: row.investment_currency || "USD",
    },
    engSpend: {
      teams: row.eng_teams || 0,
      sprints: row.eng_sprints || 0,
      estimate: row.eng_estimate || 0,
    },
    portfolioScore: {
      wsjf: calcWSJF(row),
      bizValue: row.wsjf_biz_value || 0,
      timeCriticality: row.wsjf_time_crit || 0,
      riskReduction: row.wsjf_risk_reduction || 0,
      effort: row.wsjf_effort || 0,
    },
    stakeholderNotes: row.stakeholder_notes || [],
    // AI artifact fields (already flat in DB)
    pivotCoach: row.pivot_coach || "",
    engEstimate: row.eng_estimate_ai || "",
    execBrief: row.exec_brief || "",
    onePager: row.one_pager || "",
    personas: row.personas || "",
    currentJourney: row.current_journey || "",
    futureJourney: row.future_journey || "",
    jtbd: row.jtbd || "",
    usecases: row.use_cases || "",
    epics: row.epics || "",
    riskReg: row.risk_register || "",
    piPlanning: row.pi_planning || "",
    prd:        row.prd          || "",
    telemetry:  row.telemetry    || "",
    testcases:         row.testcases         || "",
    sprint_assignments: row.sprint_assignments || null,
    handoffPackage: row.handoff_package || "",
    // Roadmap / timeline fields
    roadmap_start: row.roadmap_start || null,
    roadmap_end:   row.roadmap_end   || null,
    bar_color:     row.bar_color     || null,
    // Linkage names (from JOIN)
    okrName: row.okr_name || "",
    themeName: row.theme_name || "",
    capabilityName: row.capability_name || "",
  };
}

// ─── Denormalize initiative back to DB shape ──────────────────
export function denormalizeInitiative(ini) {
  // ONLY send flat scalar columns that exist in the DB schema.
  // Never send nested objects (pivot{}, evidence{}, investment{}, etc.)
  // Never send approved/approved_by/approved_date — those have their own
  // direct write in InitiativeDetail and must not be overwritten by debounce.
  return {
    id: ini.id,
    title: ini.title,
    stage: ini.stage,
    source: ini.source,
    source_detail: ini.source_detail,
    problem: ini.problem,
    opportunity: ini.opportunity,
    okr_id: ini.okr_id ?? null,
    theme_id: ini.theme_id ?? null,
    capability_id: ini.capability_id ?? null,
    // PIVOT (flattened)
    pivot_p: ini.pivot?.p ?? 5,
    pivot_i: ini.pivot?.i ?? 5,
    pivot_v: ini.pivot?.v ?? 5,
    pivot_o: ini.pivot?.o ?? 5,
    pivot_t: ini.pivot?.t ?? 5,
    // Evidence (flattened)
    evidence_interviews: ini.evidence?.interviews ?? "0",
    evidence_pain_confirmed: ini.evidence?.painConfirmed ?? "—",
    evidence_revenue_opp: ini.evidence?.revenueOpp ?? "TBD",
    evidence_cost_savings: ini.evidence?.costSavings ?? "TBD",
    evidence_competitive: ini.evidence?.competitive ?? "Not assessed",
    evidence_nps: ini.evidence?.nps ?? "Not assessed",
    // Investment (flattened)
    investment_requested: ini.investment?.requested ?? 0,
    investment_approved: ini.investment?.approved ?? 0,
    // Engineering (flattened)
    eng_teams: ini.engSpend?.teams ?? 0,
    eng_sprints: ini.engSpend?.sprints ?? 0,
    eng_estimate: ini.engSpend?.estimate ?? 0,
    // WSJF (read flat DB columns first, fall back to legacy nested object)
    wsjf_biz_value: ini.wsjf_biz_value ?? ini.portfolioScore?.bizValue ?? 0,
    wsjf_time_crit: ini.wsjf_time_crit ?? ini.portfolioScore?.timeCriticality ?? 0,
    wsjf_risk_reduction: ini.wsjf_risk_reduction ?? ini.portfolioScore?.riskReduction ?? 0,
    wsjf_effort: ini.wsjf_effort ?? ini.portfolioScore?.effort ?? 0,
    // AI artifacts
    pivot_coach: ini.pivotCoach ?? null,
    eng_estimate_ai: ini.engEstimate ?? null,
    exec_brief: ini.execBrief ?? null,
    one_pager: ini.onePager ?? null,
    personas: ini.personas ?? null,
    current_journey: ini.currentJourney ?? null,
    future_journey: ini.futureJourney ?? null,
    jtbd: ini.jtbd ?? null,
    use_cases: ini.usecases ?? null,
    epics: ini.epics ?? null,
    risk_register: ini.riskReg ?? null,
    pi_planning: ini.piPlanning ?? null,
    prd:         ini.prd         ?? null,
    telemetry:   ini.telemetry   ?? null,
    testcases:         ini.testcases         ?? null,
    sprint_assignments: ini.sprint_assignments ?? null,
    handoff_package: ini.handoffPackage ?? null,
    // NOTE: approved/approved_by/approved_date intentionally excluded —
    // managed exclusively by the direct write in InitiativeDetail.jsx
  };
}
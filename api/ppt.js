/**
 * /api/ppt — PGOS PowerPoint export
 * Body: { page, org_id }
 * Returns: .pptx binary stream
 *
 * Pages: dashboard | foundation | ideas | discovery | execreview |
 *        portfolio | definition | delivery | handoff | competitors | leadership
 */

import { neon } from "@neondatabase/serverless";
import PptxGenJS from "pptxgenjs";

// ─── Brand tokens ─────────────────────────────────────────────
const B = {
  navy:    "1B3A6B",
  navyDk:  "0F2347",
  gold:    "D4A843",
  goldLt:  "F0C96A",
  steel:   "2E6DA4",
  white:   "FFFFFF",
  offWhite:"E8EEF6",
  muted:   "8899AA",
  green:   "2ECC71",
  red:     "E74C3C",
  amber:   "E8913A",
  purple:  "9B59B6",
};

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  return neon(url);
}

// ─── Slide helpers ────────────────────────────────────────────
function makePres(title) {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
  pres.title = title;
  pres.author = "PGOS — Product Growth OS";
  return pres;
}

// Cover slide
function addCover(pres, title, subtitle, date) {
  const slide = pres.addSlide();
  // Navy background
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.3, h: 7.5, fill: { color: B.navyDk } });
  // Gold accent bar left
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: B.gold } });
  // PGOS logo text
  slide.addText([
    { text: "P", options: { color: B.gold, bold: true } },
    { text: "GOS", options: { color: B.white, bold: true } },
  ], { x: 0.5, y: 0.5, w: 3, h: 0.6, fontSize: 28, charSpacing: 2 });
  slide.addText("Product Growth OS", { x: 0.5, y: 1.05, w: 5, h: 0.3, fontSize: 10, color: B.muted, charSpacing: 3 });
  // Main title
  slide.addText(title, { x: 0.5, y: 2.2, w: 12, h: 2, fontSize: 42, bold: true, color: B.white, wrap: true });
  // Subtitle
  if (subtitle) {
    slide.addText(subtitle, { x: 0.5, y: 4.4, w: 10, h: 0.5, fontSize: 18, color: B.goldLt });
  }
  // Date
  slide.addText(date || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    { x: 0.5, y: 6.9, w: 6, h: 0.35, fontSize: 11, color: B.muted });
  return slide;
}

// Section divider
function addDivider(pres, sectionTitle) {
  const slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.3, h: 7.5, fill: { color: B.navy } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: B.gold } });
  slide.addText(sectionTitle, { x: 0.5, y: 2.8, w: 12, h: 1.5, fontSize: 36, bold: true, color: B.white });
  return slide;
}

function addSection(pres, sectionTitle, subtitle) {
  const slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.3, h: 7.5, fill: { color: B.navy } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: B.gold } });
  slide.addText(sectionTitle, { x: 0.5, y: 2.5, w: 12, h: 1.2, fontSize: 36, bold: true, color: B.white });
  if (subtitle) slide.addText(subtitle, { x: 0.5, y: 3.8, w: 12, h: 0.5, fontSize: 16, color: B.gold, italic: true });
  return slide;
}

// Standard content slide
function contentSlide(pres, heading, items, opts = {}) {
  const slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.3, h: 7.5, fill: { color: B.navyDk } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.3, h: 0.8, fill: { color: B.navy } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: B.gold } });
  slide.addText(heading, { x: 0.4, y: 0.15, w: 12.5, h: 0.55, fontSize: 18, bold: true, color: B.gold });
  if (opts.subtitle) {
    slide.addText(opts.subtitle, { x: 0.4, y: 0.85, w: 12.5, h: 0.35, fontSize: 12, color: B.muted });
  }
  const startY = opts.subtitle ? 1.3 : 1.0;
  items.forEach((item, i) => {
    if (typeof item === "string") {
      slide.addText(item, { x: 0.4, y: startY + i * 0.55, w: 12.5, h: 0.5, fontSize: 13, color: B.offWhite, wrap: true });
    } else if (item.label) {
      // Key-value row
      slide.addText(item.label, { x: 0.4, y: startY + i * 0.55, w: 3.5, h: 0.45, fontSize: 12, bold: true, color: B.gold });
      slide.addText(item.value || "", { x: 3.9, y: startY + i * 0.55, w: 9, h: 0.45, fontSize: 12, color: B.offWhite, wrap: true });
    }
  });
  return slide;
}

// Two-column slide
function twoColSlide(pres, heading, leftItems, rightItems, opts = {}) {
  const slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.3, h: 7.5, fill: { color: B.navyDk } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.3, h: 0.8, fill: { color: B.navy } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: B.gold } });
  slide.addText(heading, { x: 0.4, y: 0.15, w: 12.5, h: 0.55, fontSize: 18, bold: true, color: B.gold });
  // Left col header
  if (opts.leftHead) slide.addText(opts.leftHead, { x: 0.4, y: 0.9, w: 5.9, h: 0.35, fontSize: 11, bold: true, color: B.steel, charSpacing: 1 });
  // Right col header
  if (opts.rightHead) slide.addText(opts.rightHead, { x: 7.1, y: 0.9, w: 5.9, h: 0.35, fontSize: 11, bold: true, color: B.steel, charSpacing: 1 });
  leftItems.forEach((item, i) => {
    slide.addText(item, { x: 0.4, y: 1.35 + i * 0.52, w: 5.9, h: 0.48, fontSize: 12, color: B.offWhite, wrap: true });
  });
  rightItems.forEach((item, i) => {
    slide.addText(item, { x: 7.1, y: 1.35 + i * 0.52, w: 5.9, h: 0.48, fontSize: 12, color: B.offWhite, wrap: true });
  });
  return slide;
}

// Initiative card slide
function initiativeSlide(pres, ini, rank) {
  const slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.3, h: 7.5, fill: { color: B.navyDk } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.3, h: 0.8, fill: { color: B.navy } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: B.gold } });
  // Rank badge
  if (rank) slide.addText(`#${rank}`, { x: 0.3, y: 0.12, w: 0.7, h: 0.55, fontSize: 22, bold: true, color: B.gold });
  // Title
  slide.addText(ini.title || "", { x: rank ? 0.9 : 0.4, y: 0.15, w: 11.5, h: 0.55, fontSize: 17, bold: true, color: B.gold });
  // Stage + slug badges
  const stageColors = { idea: B.muted, discovery: B.steel, review: B.gold, approved: B.green, definition: B.purple, delivery: "1ABC9C", handoff: B.steel };
  const stageC = stageColors[ini.stage] || B.muted;
  slide.addShape(pres.ShapeType.roundRect, { x: 0.4, y: 0.85, w: 1.4, h: 0.3, fill: { color: stageC }, rectRadius: 0.04 });
  slide.addText((ini.stage || "").toUpperCase(), { x: 0.4, y: 0.85, w: 1.4, h: 0.3, fontSize: 9, bold: true, color: B.white, align: "center" });
  slide.addText(ini.slug || "", { x: 1.9, y: 0.87, w: 2, h: 0.28, fontSize: 10, color: B.muted });

  // Problem
  slide.addText("PROBLEM", { x: 0.4, y: 1.28, w: 12.5, h: 0.28, fontSize: 9, bold: true, color: B.muted, charSpacing: 2 });
  slide.addText(ini.problem || "—", { x: 0.4, y: 1.55, w: 12.5, h: 1.1, fontSize: 12, color: B.offWhite, wrap: true });

  // Opportunity
  slide.addText("OPPORTUNITY", { x: 0.4, y: 2.72, w: 12.5, h: 0.28, fontSize: 9, bold: true, color: B.muted, charSpacing: 2 });
  slide.addText(ini.opportunity || "—", { x: 0.4, y: 2.98, w: 12.5, h: 0.9, fontSize: 12, color: B.offWhite, wrap: true });

  // Score row
  const scores = [
    { label: "PIVOT", val: ini.pivotScore != null ? ini.pivotScore.toFixed(0) : "—" },
    { label: "BIZ VALUE", val: ini.wsjf_biz_value || "—" },
    { label: "TIME CRIT", val: ini.wsjf_time_crit || "—" },
    { label: "RISK RED", val: ini.wsjf_risk_reduction || "—" },
    { label: "EFFORT", val: ini.wsjf_effort || "—" },
    { label: "APPROVED", val: ini.approved ? "✓ YES" : "Pending" },
  ];
  scores.forEach((s, i) => {
    const x = 0.4 + i * 2.08;
    slide.addShape(pres.ShapeType.rect, { x, y: 4.05, w: 1.95, h: 0.9, fill: { color: B.navy } });
    slide.addText(s.label, { x, y: 4.1, w: 1.95, h: 0.3, fontSize: 8, bold: true, color: B.muted, align: "center", charSpacing: 1 });
    slide.addText(String(s.val), { x, y: 4.42, w: 1.95, h: 0.45, fontSize: 18, bold: true, color: B.gold, align: "center" });
  });

  // Investment
  if (ini.investment_requested) {
    slide.addText(`Investment Requested: $${Number(ini.investment_requested).toLocaleString()}`, { x: 0.4, y: 5.15, w: 6, h: 0.35, fontSize: 11, color: B.offWhite });
  }
  if (ini.investment_approved) {
    slide.addText(`Approved: $${Number(ini.investment_approved).toLocaleString()}`, { x: 6.5, y: 5.15, w: 6, h: 0.35, fontSize: 11, color: ini.approved ? B.green : B.muted });
  }

  // Evidence highlights
  const evLines = [ini.evidence_revenue_opp, ini.evidence_cost_savings, ini.evidence_competitive].filter(Boolean);
  if (evLines.length) {
    slide.addText("KEY EVIDENCE", { x: 0.4, y: 5.6, w: 12.5, h: 0.28, fontSize: 9, bold: true, color: B.muted, charSpacing: 2 });
    evLines.slice(0, 3).forEach((ev, i) => {
      slide.addText(`▪ ${ev}`, { x: 0.4, y: 5.88 + i * 0.38, w: 12.5, h: 0.35, fontSize: 11, color: B.offWhite, wrap: true });
    });
  }
}

// Competitor slide
function competitorSlide(pres, c, rank) {
  const slide = pres.addSlide();
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.3, h: 7.5, fill: { color: B.navyDk } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.3, h: 0.8, fill: { color: B.navy } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: B.gold } });
  slide.addText(`#${rank} ${c.name}`, { x: 0.4, y: 0.12, w: 9, h: 0.58, fontSize: 20, bold: true, color: B.gold });
  const threatC = c.threat_level === "high" ? B.red : c.threat_level === "medium" ? B.amber : B.green;
  slide.addShape(pres.ShapeType.roundRect, { x: 9.5, y: 0.18, w: 1.8, h: 0.4, fill: { color: threatC }, rectRadius: 0.04 });
  slide.addText((c.threat_level || "").toUpperCase(), { x: 9.5, y: 0.18, w: 1.8, h: 0.4, fontSize: 10, bold: true, color: B.white, align: "center" });

  // Score boxes
  const scores = [
    { label: "Overall", val: c.overall_score },
    { label: "Digital", val: c.digital_score },
    { label: "Mobile", val: c.mobile_score },
    { label: "Claims", val: c.claims_score },
    { label: "Portal", val: c.portal_score },
    { label: "App Store", val: c.app_store_rating ? `★${Number(c.app_store_rating).toFixed(1)}` : "—" },
  ];
  scores.forEach((s, i) => {
    const x = 0.4 + i * 2.08;
    const scoreNum = typeof s.val === "number" ? s.val : 0;
    const scoreC = scoreNum >= 85 ? B.red : scoreNum >= 70 ? B.amber : B.green;
    slide.addShape(pres.ShapeType.rect, { x, y: 0.92, w: 1.95, h: 0.85, fill: { color: B.navy } });
    slide.addText(s.label, { x, y: 0.96, w: 1.95, h: 0.28, fontSize: 8, bold: true, color: B.muted, align: "center", charSpacing: 1 });
    slide.addText(String(s.val || "—"), { x, y: 1.24, w: 1.95, h: 0.45, fontSize: 19, bold: true, color: typeof s.val === "string" ? B.gold : scoreC, align: "center" });
  });

  // Key differentiator
  slide.addText("KEY DIFFERENTIATOR", { x: 0.4, y: 1.9, w: 12.5, h: 0.28, fontSize: 9, bold: true, color: B.muted, charSpacing: 2 });
  slide.addText(c.key_differentiator || "—", { x: 0.4, y: 2.16, w: 12.5, h: 0.85, fontSize: 11, color: B.offWhite, wrap: true });

  // Two columns: advantage / gap
  slide.addShape(pres.ShapeType.rect, { x: 0.4, y: 3.1, w: 5.9, h: 1.7, fill: { color: "1A3D2B" } });
  slide.addText("OUR ADVANTAGE", { x: 0.5, y: 3.14, w: 5.7, h: 0.28, fontSize: 9, bold: true, color: B.green, charSpacing: 1 });
  slide.addText(c.our_advantage || "—", { x: 0.5, y: 3.42, w: 5.7, h: 1.3, fontSize: 11, color: B.offWhite, wrap: true });

  slide.addShape(pres.ShapeType.rect, { x: 7.0, y: 3.1, w: 5.9, h: 1.7, fill: { color: "3D1A1A" } });
  slide.addText("OUR GAP", { x: 7.1, y: 3.14, w: 5.7, h: 0.28, fontSize: 9, bold: true, color: B.red, charSpacing: 1 });
  slide.addText(c.our_gap || "—", { x: 7.1, y: 3.42, w: 5.7, h: 1.3, fontSize: 11, color: B.offWhite, wrap: true });

  // Strengths / weaknesses
  slide.addText("STRENGTHS", { x: 0.4, y: 4.9, w: 5.9, h: 0.28, fontSize: 9, bold: true, color: B.muted, charSpacing: 2 });
  (c.strengths || []).slice(0, 4).forEach((s, i) => {
    slide.addText(`▪ ${s}`, { x: 0.4, y: 5.18 + i * 0.38, w: 5.9, h: 0.35, fontSize: 10, color: B.offWhite, wrap: true });
  });
  slide.addText("WEAKNESSES", { x: 7.0, y: 4.9, w: 5.9, h: 0.28, fontSize: 9, bold: true, color: B.muted, charSpacing: 2 });
  (c.weaknesses || []).slice(0, 4).forEach((w, i) => {
    slide.addText(`▪ ${w}`, { x: 7.0, y: 5.18 + i * 0.38, w: 5.9, h: 0.35, fontSize: 10, color: B.offWhite, wrap: true });
  });
}

// ─── Page builders ────────────────────────────────────────────
async function buildDashboard(sql, org) {
  const pres = makePres("PGOS Executive Dashboard");
  const [inis, okrs] = await Promise.all([
    sql`SELECT * FROM initiatives WHERE org_id=${org.id} ORDER BY sort_order`,
    sql`SELECT * FROM okrs WHERE org_id=${org.id} ORDER BY sort_order`,
  ]);

  addCover(pres, "Executive Dashboard", org.name, null);

  // Pipeline summary slide
  const stageOrder = ["idea","discovery","review","approved","definition","delivery","handoff"];
  const byStage = stageOrder.map(s => ({ stage: s, count: inis.filter(i => i.stage === s).length }));
  contentSlide(pres, "Pipeline Summary", [
    { label: "Total Initiatives", value: String(inis.length) },
    { label: "Approved", value: String(inis.filter(i => i.approved).length) },
    ...byStage.filter(s => s.count > 0).map(s => ({ label: s.stage.charAt(0).toUpperCase() + s.stage.slice(1), value: `${s.count} initiative${s.count > 1 ? "s" : ""}` })),
  ], { subtitle: `${org.name} — Initiative Pipeline` });

  // OKR progress
  if (okrs.length) {
    contentSlide(pres, "OKR Progress", okrs.map(o => ({
      label: `${o.progress || 0}%`, value: o.objective,
    })), { subtitle: "Company Objectives & Key Results" });
  }

  // Mission
  contentSlide(pres, "Mission & Vision", [
    { label: "Mission", value: org.mission || "" },
    { label: "Vision", value: org.vision || "" },
  ]);

  return pres;
}

async function buildFoundation(sql, org) {
  const pres = makePres("Foundation");
  const [okrs, themes, caps, prods] = await Promise.all([
    sql`SELECT * FROM okrs WHERE org_id=${org.id} ORDER BY sort_order`,
    sql`SELECT * FROM strategic_themes WHERE org_id=${org.id} ORDER BY sort_order`,
    sql`SELECT * FROM capabilities WHERE org_id=${org.id} ORDER BY sort_order`,
    sql`SELECT * FROM products WHERE org_id=${org.id} ORDER BY sort_order`,
  ]);

  addCover(pres, "Enterprise Foundation", org.name);
  contentSlide(pres, "Mission & Vision", [
    { label: "Mission", value: org.mission || "" },
    { label: "Vision", value: org.vision || "" },
    ...(org.values || []).map((v, i) => ({ label: i === 0 ? "Values" : "", value: v })),
  ]);
  if (okrs.length) contentSlide(pres, "OKRs", okrs.map(o => ({ label: `${o.progress || 0}%`, value: o.objective })), { subtitle: "Company Objectives & Key Results" });
  if (themes.length) contentSlide(pres, "Strategic Themes", themes.map(t => ({ label: t.name, value: t.description || t.theme })));
  if (caps.length) contentSlide(pres, "Capabilities", caps.map(c => ({ label: c.name, value: c.description })));
  if (prods.length) contentSlide(pres, "Products", prods.map(p => ({ label: p.name, value: `${p.type} · ${p.stage}` })));
  return pres;
}

async function buildInitiatives(sql, org, stageFilter, pageTitle) {
  const STAGE_ORDER = ["idea","discovery","review","approved","definition","delivery","handoff"];
  const minIdx = stageFilter ? STAGE_ORDER.indexOf(stageFilter) : 0;
  const inis = await sql`SELECT * FROM initiatives WHERE org_id=${org.id} ORDER BY sort_order`;
  const filtered = inis
    .filter(i => STAGE_ORDER.indexOf(i.stage) >= minIdx)
    .sort((a, b) => STAGE_ORDER.indexOf(b.stage) - STAGE_ORDER.indexOf(a.stage));

  // Compute pivot scores
  filtered.forEach(ini => {
    const p = ini.pivot_p || 0, i2 = ini.pivot_i || 0, v = ini.pivot_v || 0, o = ini.pivot_o || 0, t = ini.pivot_t || 0;
    ini.pivotScore = (p * 0.25 + i2 * 0.20 + v * 0.15 + o * 0.20 + t * 0.20) * 10;
  });

  const pres = makePres(pageTitle);
  addCover(pres, pageTitle, org.name);
  contentSlide(pres, `${pageTitle} — Overview`, [
    { label: "Total", value: String(filtered.length) },
    { label: "Approved", value: String(filtered.filter(i => i.approved).length) },
    ...filtered.map(i => ({ label: i.slug, value: i.title })),
  ]);
  filtered.forEach((ini, idx) => initiativeSlide(pres, ini, idx + 1));
  return pres;
}

async function buildPortfolio(sql, org) {
  const inis = await sql`SELECT * FROM initiatives WHERE org_id=${org.id} ORDER BY sort_order`;
  inis.forEach(ini => {
    const p = ini.pivot_p || 0, i2 = ini.pivot_i || 0, v = ini.pivot_v || 0, o = ini.pivot_o || 0, t = ini.pivot_t || 0;
    ini.pivotScore = (p * 0.25 + i2 * 0.20 + v * 0.15 + o * 0.20 + t * 0.20) * 10;
    ini.wsjf = ini.wsjf_effort > 0 ? Math.round(((ini.wsjf_biz_value + ini.wsjf_time_crit + ini.wsjf_risk_reduction) / ini.wsjf_effort) * 10) : 0;
  });
  const sorted = [...inis].sort((a, b) => b.wsjf - a.wsjf);

  const pres = makePres("Portfolio Review");
  addCover(pres, "SAFe Portfolio Review", org.name);
  contentSlide(pres, "WSJF Priority Ranking", sorted.map((ini, i) => ({
    label: `#${i + 1} · WSJF ${ini.wsjf || "—"}`, value: `${ini.title} — PIVOT: ${ini.pivotScore.toFixed(0)}`,
  })), { subtitle: "Weighted Shortest Job First · Higher = prioritize for next PI" });
  sorted.forEach((ini, idx) => initiativeSlide(pres, ini, idx + 1));
  return pres;
}

async function buildCompetitors(sql, org) {
  const comps = await sql`SELECT * FROM competitors WHERE org_id=${org.id} ORDER BY sort_order`;
  const pres = makePres("Competitive Analysis");
  addCover(pres, "Competitive Analysis", org.name);

  // Summary scorecard slide
  contentSlide(pres, "Competitive Scorecard", comps.map(c => ({
    label: `#${c.sort_order + 1} ${c.name}`, value: `Overall: ${c.overall_score} · Digital: ${c.digital_score} · Mobile: ${c.mobile_score} · Threat: ${c.threat_level}`,
  })), { subtitle: "Digital experience, claims, and portal positioning" });

  comps.forEach((c, i) => competitorSlide(pres, c, i + 1));
  return pres;
}

async function buildDeliveryReadiness(sql, org) {
  const inis = await sql`
    SELECT * FROM initiatives
    WHERE org_id=${org.id}
    AND contract_primary_metric != ''
    ORDER BY sort_order
  `;

  const pres = makePres("Delivery Readiness");
  addCover(pres, "Delivery Readiness — Investment Contracts", org.name,
    new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }));

  if (!inis.length) {
    contentSlide(pres, "No Contracts Defined Yet", [
      { label: "Next Step", value: "Complete the Investment Contract for each approved initiative before delivery begins." }
    ]);
    return pres;
  }

  // Summary slide
  const confirmed = inis.filter(i => i.contract_status === "confirmed");
  contentSlide(pres, "Investment Contract Summary", [
    { label: "Total Contracts", value: String(inis.length) },
    { label: "Confirmed", value: String(confirmed.length) },
    { label: "Draft", value: String(inis.length - confirmed.length) },
    { label: "Total Investment", value: `$${(inis.reduce((s, i) => s + (i.investment_approved || 0), 0) / 1000000).toFixed(1)}M approved` },
  ], { subtitle: "Measurement agreements defined before delivery begins" });

  // One slide per initiative with a contract
  inis.forEach(ini => {
    let secondary = [];
    try { secondary = JSON.parse(ini.contract_secondary_metrics || "[]"); } catch {}

    const items = [
      { label: "Primary Metric", value: ini.contract_primary_metric || "—" },
      { label: "Baseline → Target", value: `${ini.contract_baseline || "—"} → ${ini.contract_target || "—"}` },
      { label: "Investment Approved", value: `$${((ini.investment_approved || 0) / 1000000).toFixed(2)}M` },
      { label: "Review Window", value: `${ini.contract_review_window || 90} days post-launch` },
      { label: "Telemetry Source", value: ini.contract_telemetry_source || "—" },
      { label: "Economic Outcome", value: ini.contract_economic_outcome || "—" },
      { label: "Status", value: ini.contract_status === "confirmed" ? "✓ Confirmed" : "Draft" },
    ];

    if (secondary.length) {
      secondary.forEach((sm, i) => {
        items.push({ label: `Secondary ${i + 1}`, value: `${sm.metric}: ${sm.baseline || "—"} → ${sm.target || "—"}` });
      });
    }

    contentSlide(pres, `${ini.slug} · ${ini.title}`, items, {
      subtitle: ini.contract_ai_narrative || ini.problem || "",
    });
  });

  return pres;
}

async function buildDelivery(sql, org) {
  const [inis, prefs] = await Promise.all([
    sql`SELECT * FROM initiatives WHERE org_id=${org.id} AND approved=true ORDER BY sort_order`,
    sql`SELECT * FROM user_preferences WHERE org_id=${org.id} LIMIT 1`,
  ]);

  const pres = makePres("Quarterly Planning");
  addCover(pres, "Quarterly Planning Package", org.name);

  // Roadmap overview
  contentSlide(pres, "Program Roadmap — Approved Initiatives", inis.map(i => ({
    label: i.slug,
    value: `${i.title}${i.roadmap_start ? ` · ${i.roadmap_start} → ${i.roadmap_end || "TBD"}` : ""}`,
  })), { subtitle: "Quarterly delivery schedule" });

  inis.forEach(ini => {
    if (ini.pi_planning || ini.roadmap_start) {
      contentSlide(pres, `Quarterly Plan — ${ini.title}`, ini.pi_planning.split("\n").filter(l => l.trim()).slice(0, 10).map(l => l.trim()));
    }
  });
  return pres;
}

async function buildLeadership(sql, org) {
  const [inis, okrs, themes, comps] = await Promise.all([
    sql`SELECT * FROM initiatives WHERE org_id=${org.id} ORDER BY sort_order`,
    sql`SELECT * FROM okrs WHERE org_id=${org.id} ORDER BY sort_order`,
    sql`SELECT * FROM strategic_themes WHERE org_id=${org.id} ORDER BY sort_order`,
    sql`SELECT * FROM competitors WHERE org_id=${org.id} ORDER BY sort_order`,
  ]);

  inis.forEach(ini => {
    const p = ini.pivot_p || 0, i2 = ini.pivot_i || 0, v = ini.pivot_v || 0, o = ini.pivot_o || 0, t = ini.pivot_t || 0;
    ini.pivotScore = (p * 0.25 + i2 * 0.20 + v * 0.15 + o * 0.20 + t * 0.20) * 10;
    ini.wsjf = ini.wsjf_effort > 0 ? Math.round(((ini.wsjf_biz_value + ini.wsjf_time_crit + ini.wsjf_risk_reduction) / ini.wsjf_effort) * 10) : 0;
  });

  const pres = makePres("Leadership Overview");
  addCover(pres, "Product Leadership Review", org.name, new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }));

  // Mission
  contentSlide(pres, "Mission & Vision", [
    { label: "Mission", value: org.mission || "" },
    { label: "Vision", value: org.vision || "" },
  ]);

  // OKRs
  if (okrs.length) {
    contentSlide(pres, "OKR Progress", okrs.map(o => ({ label: `${o.progress || 0}%`, value: o.objective })));
  }

  // Strategy
  if (themes.length) {
    contentSlide(pres, "Strategic Themes", themes.map(t => ({ label: t.name, value: t.description || t.theme })));
  }

  // Pipeline
  addDivider(pres, "Initiative Pipeline");
  contentSlide(pres, "Pipeline Summary", [
    { label: "Total", value: String(inis.length) },
    { label: "Approved", value: String(inis.filter(i => i.approved).length) },
    ...inis.map(i => ({ label: `${i.slug} · ${i.stage}`, value: i.title })),
  ]);

  // Top initiatives
  const topInis = [...inis].sort((a, b) => b.wsjf - a.wsjf).slice(0, 3);
  topInis.forEach((ini, idx) => initiativeSlide(pres, ini, idx + 1));

  // Competitive
  if (comps.length) {
    addDivider(pres, "Competitive Landscape");
    contentSlide(pres, "Competitive Scorecard", comps.map(c => ({
      label: `#${c.sort_order + 1} ${c.name}`, value: `Overall: ${c.overall_score} · Threat: ${c.threat_level}`,
    })));
    comps.slice(0, 3).forEach((c, i) => competitorSlide(pres, c, i + 1));
  }

  return pres;
}

// ─── STAGE 8: MEASURE ────────────────────────────────────────
async function buildMeasure(sql, org) {
  const initiatives = await sql`SELECT * FROM initiatives ORDER BY created_at ASC`;
  const metricsAll  = await sql`SELECT * FROM initiative_metrics ORDER BY initiative_id, metric_date ASC`;
  const pres = makePres(`${org.name} — Stage 8: Measure`);
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  addCover(pres, "Stage 8: Measure", "Post-launch adoption, customer feedback & business outcomes", today);
  addSection(pres, "Measure — Stage 8", "Post-Launch Performance Dashboard");

  for (const ini of initiatives) {
    if (!ini.launch_date && !ini.monthly_active_users) continue;
    const iniMetrics = metricsAll.filter(m => m.initiative_id === ini.id);
    const slide = pres.addSlide();

    slide.addShape(pres.ShapeType.rect, { x:0, y:0, w:13.3, h:7.5, fill:{color:B.navyDk} });
    slide.addShape(pres.ShapeType.rect, { x:0, y:0, w:0.12, h:7.5, fill:{color:B.gold} });
    slide.addShape(pres.ShapeType.rect, { x:0, y:0, w:13.3, h:1.1, fill:{color:"1B3A6B"} });

    slide.addText(ini.slug, { x:0.25, y:0.15, w:2, h:0.35, fontSize:9, color:B.gold, bold:true, charSpacing:2 });
    slide.addText(ini.title, { x:0.25, y:0.45, w:9, h:0.5, fontSize:18, bold:true, color:B.white });
    const launchStr = ini.launch_date ? `Launched ${new Date(ini.launch_date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}` : "Pre-launch";
    slide.addText(launchStr, { x:0.25, y:0.85, w:4, h:0.22, fontSize:9, color:B.muted });
    if (ini.target_met) {
      slide.addShape(pres.ShapeType.rect, { x:10, y:0.25, w:2.8, h:0.55, fill:{color:"1A4731"}, line:{color:"2ECC71",width:1}, rounding:0.08 });
      slide.addText("✓ TARGET MET", { x:10, y:0.25, w:2.8, h:0.55, fontSize:10, bold:true, color:"2ECC71", align:"center", valign:"middle" });
    }

    const kpis = [
      { label:"Adoption Rate", value:`${ini.adoption_rate||0}%`, note:"Target: 40%", color:Number(ini.adoption_rate||0)>=40?B.green:Number(ini.adoption_rate||0)>=20?B.amber:B.red },
      { label:"Monthly Active", value:Number(ini.monthly_active_users||0).toLocaleString(), note:"MAU", color:B.offWhite },
      { label:"Daily Active",   value:Number(ini.daily_active_users||0).toLocaleString(),   note:"DAU", color:B.offWhite },
      { label:"Feature Util.",  value:`${ini.feature_utilization||0}%`, note:"of MAU using core", color:B.offWhite },
    ];
    kpis.forEach((k,i) => {
      const x = 0.25 + i*3.2;
      slide.addShape(pres.ShapeType.rect, { x, y:1.25, w:3, h:1.4, fill:{color:"1C2640"}, rounding:0.1 });
      slide.addText(k.label.toUpperCase(), { x, y:1.3, w:3, h:0.25, fontSize:8, color:B.muted, align:"center", charSpacing:1 });
      slide.addText(k.value, { x, y:1.6, w:3, h:0.7, fontSize:26, bold:true, color:k.color, align:"center", valign:"middle" });
      slide.addText(k.note, { x, y:2.35, w:3, h:0.22, fontSize:9, color:B.muted, align:"center" });
    });

    const fb = [
      { label:"NPS Score", value:ini.nps_score||0, note:"Insurance avg: 22", color:Number(ini.nps_score||0)>=40?B.green:Number(ini.nps_score||0)>=20?B.amber:B.red },
      { label:"CSAT Score", value:`${ini.csat_score||0}/5`, note:`${ini.survey_responses||0} responses`, color:Number(ini.csat_score||0)>=4?B.green:Number(ini.csat_score||0)>=3?B.amber:B.red },
      { label:"Call Deflection", value:`${ini.call_deflection_pct||0}%`, note:"vs pre-launch baseline", color:B.offWhite },
    ];
    fb.forEach((k,i) => {
      const x = 0.25 + i*4.3;
      slide.addShape(pres.ShapeType.rect, { x, y:2.85, w:4, h:1.2, fill:{color:"1C2640"}, rounding:0.1 });
      slide.addText(k.label.toUpperCase(), { x, y:2.9, w:4, h:0.25, fontSize:8, color:B.muted, align:"center", charSpacing:1 });
      slide.addText(String(k.value), { x, y:3.15, w:4, h:0.55, fontSize:22, bold:true, color:k.color, align:"center", valign:"middle" });
      slide.addText(k.note, { x, y:3.72, w:4, h:0.2, fontSize:9, color:B.muted, align:"center" });
    });

    slide.addText("BUSINESS OUTCOMES", { x:0.25, y:4.2, w:6, h:0.25, fontSize:9, color:B.gold, bold:true, charSpacing:2 });
    slide.addText(`Revenue Realized: $${Number(ini.revenue_realized||0).toLocaleString()}   |   Cost Savings: $${Number(ini.cost_savings_realized||0).toLocaleString()}`, { x:0.25, y:4.5, w:9, h:0.3, fontSize:12, color:B.white });

    if (ini.key_verbatims && ini.key_verbatims.length) {
      slide.addText("KEY CUSTOMER VERBATIMS", { x:0.25, y:4.9, w:12, h:0.25, fontSize:9, color:B.gold, bold:true, charSpacing:2 });
      ini.key_verbatims.slice(0,3).forEach((v,i) => {
        slide.addShape(pres.ShapeType.rect, { x:0.25, y:5.2+i*0.55, w:0.04, h:0.35, fill:{color:B.gold} });
        slide.addText(`"${v.length>90?v.slice(0,90)+"…":v}"`, { x:0.45, y:5.2+i*0.55, w:12.4, h:0.45, fontSize:10, color:B.offWhite, italic:true });
      });
    }
    if (ini.measure_notes) {
      slide.addText(`PM NOTES: ${ini.measure_notes.slice(0,150)}${ini.measure_notes.length>150?"…":""}`, { x:0.25, y:7.0, w:12.8, h:0.35, fontSize:9, color:B.muted, italic:true });
    }
  }
  return pres;
}

// ─── STAGE 9: OUTCOME SUMMARY ──────────────────────────────────
async function buildOutcome(sql, org) {
  const initiatives = await sql`SELECT * FROM initiatives ORDER BY created_at ASC`;
  const okrs        = await sql`SELECT * FROM okrs WHERE org_id=${org.id} ORDER BY created_at ASC`;
  const pres = makePres(`${org.name} — Stage 9: Outcome Summary`);
  const today = new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });

  addCover(pres, "Stage 9: Outcome Summary", "The full story — from idea to outcome", today);
  addSection(pres, "Outcome Summary — Stage 9", "Post-Launch Retrospective & Executive Narrative");

  for (const ini of initiatives) {
    const okr = okrs.find(o => o.id === ini.okr_id);
    const pivotTotal = ini.pivot ? Object.values(ini.pivot).reduce((a,b)=>a+Number(b||0),0)*4 : null;
    const adoptionScore = Math.min(5,(ini.adoption_rate||0)/8);
    const npsScore = Math.min(5,((ini.nps_score||0)+100)/40);
    const bizScore = ini.target_met ? 5 : 2.5;
    const actualTotal = ((adoptionScore+npsScore+bizScore)/3)*20;
    const delta = pivotTotal !== null ? actualTotal - pivotTotal : null;
    const deltaColor = delta===null?B.muted:delta>=0?B.green:B.red;
    const nextColors = { iterate:B.amber, expand:B.green, sunset:B.red, archive:B.muted };
    const nextColor = nextColors[ini.next_action] || B.muted;

    const slide = pres.addSlide();
    slide.addShape(pres.ShapeType.rect, { x:0, y:0, w:13.3, h:7.5, fill:{color:B.navyDk} });
    slide.addShape(pres.ShapeType.rect, { x:0, y:0, w:0.12, h:7.5, fill:{color:B.gold} });
    slide.addShape(pres.ShapeType.rect, { x:0, y:0, w:13.3, h:1.1, fill:{color:"1B3A6B"} });
    slide.addText(ini.slug, { x:0.25, y:0.15, w:2, h:0.35, fontSize:9, color:B.gold, bold:true, charSpacing:2 });
    slide.addText(ini.title, { x:0.25, y:0.45, w:9, h:0.5, fontSize:18, bold:true, color:B.white });
    slide.addShape(pres.ShapeType.rect, { x:9.8, y:0.2, w:3, h:0.65, fill:{color:nextColor+"33"}, line:{color:nextColor,width:1}, rounding:0.08 });
    slide.addText(`→ ${(ini.next_action||"ITERATE").toUpperCase()}`, { x:9.8, y:0.2, w:3, h:0.65, fontSize:12, bold:true, color:nextColor, align:"center", valign:"middle" });

    [
      { label:"PIVOT™ Predicted", value:pivotTotal!==null?pivotTotal.toFixed(0):"N/A", note:"Pre-investment score", color:B.gold },
      { label:"Actual Outcome",   value:actualTotal.toFixed(0), note:"Post-launch composite", color:B.offWhite },
      { label:"Prediction Accuracy", value:delta!==null?`${delta>=0?"+":""}${delta.toFixed(0)}`:"N/A", note:"vs PIVOT prediction", color:deltaColor },
    ].forEach((k,i) => {
      const x = 0.25 + i*4.3;
      slide.addShape(pres.ShapeType.rect, { x, y:1.25, w:4, h:1.3, fill:{color:"1C2640"}, rounding:0.1 });
      slide.addText(k.label.toUpperCase(), { x, y:1.3, w:4, h:0.25, fontSize:8, color:B.muted, align:"center", charSpacing:1 });
      slide.addText(k.value, { x, y:1.6, w:4, h:0.65, fontSize:30, bold:true, color:k.color, align:"center", valign:"middle" });
      slide.addText(k.note, { x, y:2.3, w:4, h:0.2, fontSize:9, color:B.muted, align:"center" });
    });

    if (okr) {
      const strength = ini.target_met?"Achieved":(ini.adoption_rate||0)>=20?"Partial":"Below Target";
      const sc = ini.target_met?B.green:(ini.adoption_rate||0)>=20?B.amber:B.red;
      slide.addText("LINKED OKR", { x:0.25, y:2.75, w:3, h:0.25, fontSize:9, color:B.gold, bold:true, charSpacing:2 });
      slide.addShape(pres.ShapeType.rect, { x:0.25, y:3.0, w:12.8, h:0.7, fill:{color:"1C2640"}, rounding:0.08 });
      slide.addText(okr.objective||okr.title||"", { x:0.4, y:3.05, w:10, h:0.6, fontSize:12, color:B.white, valign:"middle" });
      slide.addShape(pres.ShapeType.rect, { x:11, y:3.12, w:1.9, h:0.45, fill:{color:sc+"33"}, line:{color:sc,width:1}, rounding:0.07 });
      slide.addText(strength, { x:11, y:3.12, w:1.9, h:0.45, fontSize:9, bold:true, color:sc, align:"center", valign:"middle" });
    }

    const outcomes = [
      ["Adoption Rate", `${ini.adoption_rate||0}%`], ["MAU", Number(ini.monthly_active_users||0).toLocaleString()],
      ["NPS", String(ini.nps_score||0)], ["CSAT", `${ini.csat_score||0}/5`],
      ["Revenue", `$${Number(ini.revenue_realized||0).toLocaleString()}`], ["Cost Savings", `$${Number(ini.cost_savings_realized||0).toLocaleString()}`],
    ];
    slide.addText("FINAL OUTCOMES", { x:0.25, y:3.85, w:5, h:0.25, fontSize:9, color:B.gold, bold:true, charSpacing:2 });
    outcomes.forEach(([label,value],i) => {
      const x = 0.25 + (i%3)*4.3, y = 4.1 + Math.floor(i/3)*0.6;
      slide.addText(`${label}: `, { x, y, w:2, h:0.4, fontSize:11, color:B.muted });
      slide.addText(value, { x:x+1.5, y, w:2.5, h:0.4, fontSize:11, bold:true, color:B.white });
    });

    if (ini.lessons_learned) {
      slide.addText("LESSONS LEARNED", { x:0.25, y:5.4, w:5, h:0.25, fontSize:9, color:B.gold, bold:true, charSpacing:2 });
      slide.addText(ini.lessons_learned.slice(0,260)+(ini.lessons_learned.length>260?"…":""), { x:0.25, y:5.65, w:12.8, h:1.5, fontSize:10, color:B.offWhite, lineSpacingMultiple:1.4, valign:"top" });
    }

    if (ini.outcome_summary) {
      const slide2 = pres.addSlide();
      slide2.addShape(pres.ShapeType.rect, { x:0, y:0, w:13.3, h:7.5, fill:{color:B.navyDk} });
      slide2.addShape(pres.ShapeType.rect, { x:0, y:0, w:0.12, h:7.5, fill:{color:B.gold} });
      slide2.addShape(pres.ShapeType.rect, { x:0, y:0, w:13.3, h:1.0, fill:{color:"1B3A6B"} });
      slide2.addText(`${ini.slug} · ${ini.title}`, { x:0.25, y:0.15, w:10, h:0.35, fontSize:12, color:B.white, bold:true });
      slide2.addText("EXECUTIVE OUTCOME NARRATIVE", { x:0.25, y:0.6, w:7, h:0.28, fontSize:9, color:B.gold, bold:true, charSpacing:2 });
      slide2.addText(ini.outcome_summary.slice(0,900)+(ini.outcome_summary.length>900?"…":""), { x:0.25, y:1.15, w:12.8, h:6.0, fontSize:11, color:B.offWhite, lineSpacingMultiple:1.5, valign:"top", wrap:true });
    }
  }
  return pres;
}

// ─── STAGE 8: CAMPAIGN LAUNCH ──────────────────────────────────
async function buildCampaignLaunch(sql, org) {
  const initiatives = await sql`SELECT * FROM initiatives WHERE org_id=${org.id} AND stage IN ('gtm','measure','closed') ORDER BY sort_order`;
  const pres = makePres(`${org.name} — Campaign Launch`);
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  addCover(pres, "Stage 8: Campaign Launch", "Go-to-market execution, launch calendar & content strategy", today);
  addSection(pres, "Campaign Launch — Stage 8", "GTM Execution & Launch Readiness");

  for (const ini of initiatives) {
    contentSlide(pres, ini.title, [
      { label: "Positioning", value: (ini.gtm_positioning || "").slice(0, 120) },
      { label: "Target Segment", value: (ini.gtm_segment || "").slice(0, 80) },
      { label: "Channel Strategy", value: (ini.gtm_channel_strategy || "").slice(0, 120) },
      { label: "Campaign Intel", value: (ini.gtm_campaign_intel || "").slice(0, 120) },
      { label: "Launch Criteria", value: (ini.launch_criteria || "").slice(0, 120) },
    ].filter(r => r.value));

    // Launch calendar slide
    let cal = [];
    try { cal = JSON.parse(ini.launch_calendar || ini.gtm_calendar || "[]"); } catch(e) {}
    if (cal.length) {
      contentSlide(pres, `Launch Calendar — ${ini.title}`, cal.slice(0, 10).map(t => ({
        label: t.date ? new Date(t.date).toLocaleDateString("en-US", {month:"short", day:"numeric"}) : "TBD",
        value: `[${(t.type||"task").toUpperCase()}] ${t.title}${t.owner ? ` · ${t.owner}` : ""}`,
      })));
    }

    // Content calendar slide
    if (ini.gtm_content_calendar) {
      const slide = pres.addSlide();
      slide.addShape(pres.ShapeType.rect, { x:0, y:0, w:13.3, h:7.5, fill:{color:B.navyDk} });
      slide.addShape(pres.ShapeType.rect, { x:0, y:0, w:0.12, h:7.5, fill:{color:B.gold} });
      slide.addShape(pres.ShapeType.rect, { x:0, y:0, w:13.3, h:1.0, fill:{color:"1B3A6B"} });
      slide.addText(ini.slug, { x:0.25, y:0.15, w:3, h:0.3, fontSize:9, color:B.gold, bold:true, charSpacing:2 });
      slide.addText("30-DAY CONTENT CALENDAR", { x:0.25, y:0.5, w:10, h:0.4, fontSize:16, bold:true, color:B.white });
      slide.addText(ini.gtm_content_calendar.slice(0, 800) + (ini.gtm_content_calendar.length > 800 ? "…" : ""),
        { x:0.25, y:1.15, w:12.8, h:6.0, fontSize:10, color:B.offWhite, lineSpacingMultiple:1.4, valign:"top", wrap:true });
    }
  }
  return pres;
}

// ─── STAGE 6: SPRINT GOALS ─────────────────────────────────────
async function buildSprintGoals(sql, org) {
  const initiatives = await sql`SELECT * FROM initiatives WHERE org_id=${org.id} AND approved=true ORDER BY sort_order`;
  const pres = makePres(`${org.name} — Sprint Goals`);
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  addCover(pres, "Stage 6: Sprint Goals", "User story assignments, sprint goals & capacity planning", today);
  addSection(pres, "Sprint Goals — Stage 6", "Delivery Sequencing & Sprint Execution Plan");

  for (const ini of initiatives) {
    const epicsText = ini.epics || "";
    const storyLines = epicsText.split("\n")
      .filter(l => /US-|Story ID|As a /i.test(l))
      .slice(0, 12)
      .map(l => l.replace(/^\s*[-*#]+\s*/, "").replace(/\*\*/g, "").trim())
      .filter(Boolean);

    let assignments = {};
    try { assignments = JSON.parse(ini.sprint_assignments || "{}"); } catch(e) {}

    contentSlide(pres, ini.title, [
      { label: "Epics", value: `${(epicsText.match(/E-\d+/g) || []).length} epics defined` },
      { label: "Stories", value: storyLines.length ? `${storyLines.length} user stories` : "Generate epics to populate" },
      { label: "Sprint Assignments", value: Object.keys(assignments).length ? `${Object.keys(assignments).length} stories assigned` : "Drag stories to assign" },
    ]);

    if (storyLines.length) {
      contentSlide(pres, `User Stories — ${ini.title}`, storyLines);
    }
  }
  return pres;
}



// ─── Page router ──────────────────────────────────────────────
const PAGE_MAP = {
  dashboard:  { builder: buildDashboard,    filename: "PGOS_Dashboard.pptx" },
  foundation: { builder: buildFoundation,   filename: "PGOS_Foundation.pptx" },
  ideas:      { builder: (s,o) => buildInitiatives(s,o,"idea","Ideas — Stage 1"),         filename: "PGOS_Ideas.pptx" },
  discovery:  { builder: (s,o) => buildInitiatives(s,o,"discovery","Discovery — Stage 2"), filename: "PGOS_Discovery.pptx" },
  execreview: { builder: (s,o) => buildInitiatives(s,o,"review","Executive Review — Stage 3"), filename: "PGOS_ExecReview.pptx" },
  definition: { builder: (s,o) => buildInitiatives(s,o,"definition","Product Definition — Stage 5"), filename: "PGOS_Definition.pptx" },
  portfolio:  { builder: buildPortfolio,    filename: "PGOS_Portfolio.pptx" },
  roadmap:    { builder: buildDelivery,          filename: "PGI_QuarterlyPlanning.pptx" },
  delivery:   { builder: buildDelivery,          filename: "PGI_QuarterlyPlanning.pptx" },
  sprint_goals: { builder: buildSprintGoals,     filename: "PGOS_SprintGoals.pptx" },
  investment_contract: { builder: buildDeliveryReadiness, filename: "PGI_DeliveryReadiness.pptx" },
  competitors:{ builder: buildCompetitors,  filename: "PGOS_CompetitiveAnalysis.pptx" },
  leadership: { builder: buildLeadership,   filename: "PGOS_Leadership_Overview.pptx" },
  gtm:        { builder: buildCampaignLaunch, filename: "PGOS_GTM_Strategy.pptx" },
  campaign_launch: { builder: buildCampaignLaunch, filename: "PGOS_CampaignLaunch.pptx" },
  handoff:    { builder: (s,o) => buildInitiatives(s,o,"handoff","Engineering Handoff — Stage 7"), filename: "PGOS_Handoff.pptx" },
  measure:    { builder: buildMeasure,       filename: "PGOS_Measure.pptx" },
  measure_data: { builder: buildMeasure,     filename: "PGOS_Measure.pptx" },
  outcome:    { builder: buildOutcome,       filename: "PGOS_Outcome_Stage11.pptx" },
  lessons:    { builder: buildOutcome,       filename: "PGOS_LessonsLearned.pptx" },
};

// ─── Handler ──────────────────────────────────────────────────
// ─── PRD Word Doc builder ──────────────────────────────────────
async function buildPRDDocx(initiative, foundation) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    BorderStyle, ShadingType, Table, TableRow, TableCell, WidthType,
    Header, Footer, PageNumber, NumberFormat, convertInchesToTwip } = await import("docx");

  const ini = initiative;
  const prdText = ini.prd || "";

  // Split PRD text into sections by markdown headings
  const lines = prdText.split("\n");
  const paras = [];

  // Cover header bar
  paras.push(
    new Paragraph({
      children: [new TextRun({ text: "PRODUCT REQUIREMENTS DOCUMENT", bold: true, size: 28, color: "FFFFFF" })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.CLEAR, fill: "1B3A6B" },
      spacing: { before: 0, after: 120 },
    })
  );

  // Initiative meta block
  const metaItems = [
    ["Initiative", ini.title || "Untitled"],
    ["ID", ini.slug || "—"],
    ["Stage", ini.stage || "—"],
    ["Investment Requested", ini.investment?.requested ? `$${Number(ini.investment.requested).toLocaleString()}` : "—"],
    ["Prepared by", foundation?.company || "Agentics Growth Lab"],
    ["Date", new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
  ];

  paras.push(new Paragraph({ text: "", spacing: { before: 200, after: 0 } }));

  for (const [label, value] of metaItems) {
    paras.push(new Paragraph({
      children: [
        new TextRun({ text: `${label}:  `, bold: true, size: 22, color: "1B3A6B" }),
        new TextRun({ text: value, size: 22 }),
      ],
      spacing: { before: 60, after: 60 },
    }));
  }

  // Divider
  paras.push(new Paragraph({
    text: "",
    border: { bottom: { color: "1B3A6B", space: 1, style: BorderStyle.SINGLE, size: 12 } },
    spacing: { before: 200, after: 200 },
  }));

  // Parse PRD body lines
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { paras.push(new Paragraph({ text: "", spacing: { before: 60, after: 0 } })); continue; }

    if (trimmed.startsWith("### ")) {
      paras.push(new Paragraph({
        text: trimmed.slice(4),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 80 },
      }));
    } else if (trimmed.startsWith("## ")) {
      paras.push(new Paragraph({
        text: trimmed.slice(3),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 120 },
      }));
    } else if (trimmed.startsWith("# ")) {
      paras.push(new Paragraph({
        text: trimmed.slice(2),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 480, after: 160 },
      }));
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      paras.push(new Paragraph({
        text: trimmed.slice(2),
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
      }));
    } else if (/^\d+\. /.test(trimmed)) {
      paras.push(new Paragraph({
        text: trimmed.replace(/^\d+\. /, ""),
        numbering: { reference: "prd-numbering", level: 0 },
        spacing: { before: 40, after: 40 },
      }));
    } else {
      // Parse inline bold (**text**)
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
      const runs = parts.map(p => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return new TextRun({ text: p.slice(2, -2), bold: true, size: 22 });
        }
        return new TextRun({ text: p, size: 22 });
      });
      paras.push(new Paragraph({ children: runs, spacing: { before: 60, after: 60 } }));
    }
  }

  const doc = new Document({
    numbering: {
      config: [{
        reference: "prd-numbering",
        levels: [{ level: 0, format: NumberFormat.DECIMAL, text: "%1.", alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } } }],
      }],
    },
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22, color: "1A1A2E" } },
      },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", run: { bold: true, size: 32, color: "1B3A6B" } },
        { id: "Heading2", name: "Heading 2", run: { bold: true, size: 26, color: "2E6DA4" } },
        { id: "Heading3", name: "Heading 3", run: { bold: true, size: 24, color: "1B3A6B" } },
      ],
    },
    sections: [{
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1260, right: 1260 } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: `${ini.slug || ""} — PRD  `, size: 16, color: "6B7A99" }),
              new TextRun({ text: "CONFIDENTIAL", size: 16, color: "D4A843", bold: true }),
            ],
            border: { bottom: { color: "1B3A6B", style: BorderStyle.SINGLE, size: 6, space: 1 } },
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: `${ini.title || "Initiative"} · Product Requirements Document · `, size: 16, color: "6B7A99" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "6B7A99" }),
              new TextRun({ text: " of ", size: 16, color: "6B7A99" }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "6B7A99" }),
            ],
            alignment: AlignmentType.RIGHT,
          })],
        }),
      },
      children: paras,
    }],
  });

  return Packer.toBuffer(doc);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── PRD Word Doc export (separate from PPT flow) ──────────────
  const { type } = req.body;
  if (type === "prd_docx") {
    try {
      const { initiative, foundation } = req.body;
      if (!initiative?.prd) return res.status(400).json({ error: "No PRD content to export" });
      const buf = await buildPRDDocx(initiative, foundation);
      const filename = `PRD_${(initiative.slug || initiative.title || "export").replace(/\s+/g, "_")}.docx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buf.length);
      return res.status(200).send(buf);
    } catch (err) {
      console.error("[prd_docx]", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Standard PPT flow ─────────────────────────────────────────
  const { page = "dashboard" } = req.body;
  const entry = PAGE_MAP[page];
  if (!entry) return res.status(400).json({ error: `Unknown page: ${page}` });

  try {
    const sql = getDb();
    const orgs = await sql`SELECT * FROM organization LIMIT 1`;
    if (!orgs.length) return res.status(404).json({ error: "No organization found" });
    const org = orgs[0];

    const pres = await entry.builder(sql, org);

    // Write to buffer
    const buf = await pres.write({ outputType: "nodebuffer" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename="${entry.filename}"`);
    res.setHeader("Content-Length", buf.length);
    res.status(200).send(buf);
  } catch (err) {
    console.error("[ppt handler]", err);
    res.status(500).json({ error: err.message });
  }
}
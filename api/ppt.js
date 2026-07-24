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

async function buildDelivery(sql, org) {
  const [inis, prefs] = await Promise.all([
    sql`SELECT * FROM initiatives WHERE org_id=${org.id} AND approved=true ORDER BY sort_order`,
    sql`SELECT * FROM user_preferences WHERE org_id=${org.id} LIMIT 1`,
  ]);

  const pres = makePres("PI Planning");
  addCover(pres, "PI Planning Package", org.name);

  // Roadmap overview
  contentSlide(pres, "Program Roadmap — Approved Initiatives", inis.map(i => ({
    label: i.slug,
    value: `${i.title}${i.roadmap_start ? ` · ${i.roadmap_start} → ${i.roadmap_end || "TBD"}` : ""}`,
  })), { subtitle: "Program Increment delivery schedule" });

  inis.forEach(ini => {
    if (ini.pi_planning) {
      contentSlide(pres, `PI Plan — ${ini.title}`, ini.pi_planning.split("\n").filter(l => l.trim()).slice(0, 10).map(l => l.trim()));
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

// ─── Page router ──────────────────────────────────────────────
const PAGE_MAP = {
  dashboard:  { builder: buildDashboard,    filename: "PGOS_Dashboard.pptx" },
  foundation: { builder: buildFoundation,   filename: "PGOS_Foundation.pptx" },
  ideas:      { builder: (s,o) => buildInitiatives(s,o,"idea","Ideas — Stage 1"),         filename: "PGOS_Ideas.pptx" },
  discovery:  { builder: (s,o) => buildInitiatives(s,o,"discovery","Discovery — Stage 2"), filename: "PGOS_Discovery.pptx" },
  execreview: { builder: (s,o) => buildInitiatives(s,o,"review","Executive Review — Stage 3"), filename: "PGOS_ExecReview.pptx" },
  definition: { builder: (s,o) => buildInitiatives(s,o,"definition","Product Definition — Stage 5"), filename: "PGOS_Definition.pptx" },
  portfolio:  { builder: buildPortfolio,    filename: "PGOS_Portfolio.pptx" },
  delivery:   { builder: buildDelivery,     filename: "PGOS_PIPlanning.pptx" },
  competitors:{ builder: buildCompetitors,  filename: "PGOS_CompetitiveAnalysis.pptx" },
  leadership: { builder: buildLeadership,   filename: "PGOS_Leadership_Overview.pptx" },
};

// ─── Handler ──────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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

/**
 * /api/ai  — Single AI endpoint for all PGOS AI operations---
 *
 * Body: { action, payload }
 *
 * Actions:
 *   suggest        — generic foundation AI suggestions
 *   clarify        — idea clarifying questions
 *   pivot_coach    — PIVOT score coaching
 *   eng_estimate   — engineering estimate
 *   exec_brief     — executive investment brief
 *   one_pager      — executive one-pager
 *   personas       — customer personas
 *   current_journey
 *   future_journey
 *   jtbd
 *   use_cases
 *   epics
 *   risk_register
 *   pi_planning
 *   handoff
 *   portfolio_analysis
 *   chatty         — Chatty advisor (supports conversation history)
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL         = "claude-sonnet-4-6";

// ─── Prompt registry ──────────────────────────────────────────
function buildMessages(action, payload) {
  const { foundation, initiative: ini, initiatives, messages, question } = payload;

  const orgCtx = foundation
    ? `Company Mission: ${foundation.mission}\nVision: ${foundation.vision}`
    : "";

  const iniCtx = ini
    ? `Initiative: ${ini.title}\nProblem: ${ini.problem}\nOpportunity: ${ini.opportunity}\nStrategic Theme: ${ini.themeName || "Not set"}\nOKR: ${ini.okrName || "Not set"}\nEvidence: ${JSON.stringify(ini.evidence || {})}`
    : "";

  const systemMap = {
    suggest:
      "You are an enterprise product strategy consultant. Based on the company mission, vision, and existing context, provide specific, actionable recommendations. Be concise and executive-quality.",
    clarify:
      "You are a senior product manager. Ask 3–5 targeted clarifying questions to help sharpen a product idea. Focus on: Who is the primary user? What specific pain are we solving? What evidence exists? How does this connect to company strategy? Format as a numbered list.",
    pivot_coach:
      "You are a SAFe Portfolio Management advisor. Analyze this PIVOT score and give ONE specific coaching recommendation to improve the weakest dimension. Be direct and brief (2–3 sentences).",
    eng_estimate:
      "You are a senior engineering manager. Estimate implementation cost and effort for this initiative. Provide: Team size recommendation, Sprint estimate, Rough cost range, Key technical risks. Format as 4 bullet points.",
    exec_brief:
      "You are a Chief of Staff preparing an executive-quality investment brief for a SAFe Portfolio review. Structure: 1) Executive Summary, 2) Business Problem, 3) Opportunity, 4) Strategic Alignment (OKR, theme, capability), 5) Market & Customer Evidence, 6) Business Case (revenue, cost savings, ROI), 7) PIVOT Score Analysis, 8) Risks & Mitigations, 9) Investment Recommendation, 10) Questions Executives Will Ask (with recommended responses). Write in clear, board-ready language.",
    one_pager:
      "Write a crisp executive one-pager for this initiative. Format: Initiative name as header, then 5 sections each max 2 sentences: The Problem, Our Opportunity, Strategic Alignment, Business Case (include $ figures), Investment Ask & Expected Return. End with a bold Recommendation statement.",
    personas:
      "You are a senior UX researcher creating detailed customer personas for a wealth management platform. Create 2 personas. For each: Name, Role & Title, Demographics, Primary Goals (3), Core Pain Points (3), Day in the Life (2 sentences), Key Quote, Tech Comfort Level, What Success Looks Like. Use realistic names and be specific to wealth management.",
    current_journey:
      "Create a Current State Customer Journey Map for the primary persona. Use 5–6 stages. For each stage: Stage Name, What the advisor DOES, What they THINK/FEEL, Pain Points (specific), Workarounds they use today. Format with clear stage headers and dashes for sub-items.",
    future_journey:
      "Create a Future State Customer Journey Map showing how this initiative transforms the experience. Use the same 5–6 stages as the current state. For each: What the advisor DOES (new), How they FEEL (improved), Key Gains from the new capability, Moments of Delight. Be specific about what the technology does.",
    jtbd:
      "You are a product strategist applying the Jobs-to-be-Done framework. Identify 4–5 core JTBD for this initiative. For each: Job Statement (When I [situation], I want to [motivation], so I can [expected outcome]), Job Type (Functional/Emotional/Social), Importance (1–10), Current Satisfaction (1–10), Opportunity Score (Importance + (Importance - Satisfaction)), Key Insight. Also identify 2 Under-served Jobs that competitors are missing.",
    use_cases:
      "You are a senior product manager writing formal use cases. Create 4 use cases. For each: UC-ID (UC-01 etc), Title, Primary Actor, Preconditions (2), Main Success Flow (5–7 numbered steps), Alternative Flows (2), Exception Flows (1), Postconditions, Business Value Statement, JTBD Connection. Be specific to a wealth management advisor platform.",
    epics:
      "You are a SAFe Product Manager. Create one Epic per use case (4 epics total). For each epic: Epic ID (E-01), Epic Title, Hypothesis Statement (As a [user] I want [capability] so that [business outcome]), Business Value (1–10), Acceptance Criteria (4 items), Dependencies, T-Shirt Size (S/M/L/XL). Then under each epic, write 3–4 User Stories formatted as: Story ID, As a [persona] I want [action] so that [benefit], Acceptance Criteria (3 Given/When/Then items), Story Points (1/2/3/5/8), Priority (Must/Should/Could).",
    risk_register:
      "You are a SAFe Release Train Engineer doing risk assessment. Identify 5–6 risks for this initiative. For each: Risk ID (R-01), Risk Description, Category (Technical/Business/Compliance/Resource/Schedule), Likelihood (H/M/L), Impact (H/M/L), Risk Score, Mitigation Strategy, Recommended Owner role. End with a ROAM status suggestion (Resolved/Owned/Accepted/Mitigated) for each.",
    pi_planning:
      "You are a SAFe Release Train Engineer generating PI Planning outputs. Create a comprehensive PI Planning summary for all approved initiatives. Include: 1) PI Objectives (SMART, numbered), 2) PI Risks (ROAM format), 3) Cross-team Dependencies table, 4) Capacity & Load Assessment, 5) Confidence Vote recommendation (1–5 fist of five). Format clearly with section headers.",
    handoff:
      "You are a senior product manager assembling a complete engineering handoff package. Create a comprehensive, PI-ready handoff document. Include all sections: Initiative Overview, Business Context, Problem & Opportunity, Strategic Alignment, Customer Research Summary, Personas Summary, Current vs Future Journey Key Points, Jobs To Be Done, Use Cases, Epics & Stories, Risk Register (ROAM), Engineering Estimates & Team Structure, Definition of Done, Success Metrics, Dependencies, Open Questions for Engineering, Go/No-Go Checklist.",
    portfolio_analysis:
      "You are a SAFe Portfolio Manager. Analyze this portfolio and provide: 1) Top 3 recommended for next PI, with rationale, 2) One initiative that should be deferred (with reason), 3) Portfolio balance assessment (strategic coverage, risk profile), 4) One dependency concern across initiatives. Be specific and executive-ready.",
    suggest_initiatives:
      "You are a Chief Product Officer. Return ONLY valid JSON — no markdown, no explanation, no preamble. Your output will be parsed directly by JSON.parse().",
    populate_initiative:
      "You are a Senior Product Manager. Return ONLY valid JSON — no markdown, no explanation, no preamble. Your output will be parsed directly by JSON.parse().",
    investment_contract:
      "You are a senior product investment advisor. Based on the initiative context provided, generate a precise Investment Contract that will serve as the measurement agreement before delivery begins. Be specific, quantified, and realistic. Every metric must be traceable to something the team can actually measure. Format your response as a JSON object with these exact keys: primary_metric, baseline, target, secondary_metrics (array of {metric, baseline, target}), telemetry_source, review_window_days, economic_outcome, narrative. The narrative should be 2-3 sentences summarizing the investment thesis and what success looks like.",
    chatty:
      `You are the Product Growth Intelligence Advisor — an expert SAFe product management AI embedded in PGI (Product Growth Intelligence). You are currently advising on the ACTIVE workspace only — you only know about the company, initiatives, OKRs, and data provided in the context below. You have NO knowledge of other workspaces or companies in the platform. You know the full company context, all initiatives, their stages, PIVOT scores, evidence, measurement data, and outcomes. You are proactive, insightful, and executive-quality. You surface dependencies, roadmap sequencing issues, evidence gaps, portfolio balance problems, adoption risks, and outcome patterns. You are direct, decisive, and always give your best recommendation. Never say "I cannot" — give the most useful answer possible based on available context.`,
  };

  const system = systemMap[action] || systemMap.chatty;

  // Build the user message based on action
  let userContent = "";

  switch (action) {
    case "suggest":
      userContent = `${orgCtx}\nRequest: Suggest ${payload.what || "improvements"} that align with this mission and vision. Format as a numbered list, maximum 4 items, each 1–2 sentences.`;
      break;

    case "clarify":
      userContent = `Initiative title: ${ini?.title || payload.title}\nProblem: ${ini?.problem || payload.problem}\n${orgCtx}\nAsk clarifying questions to sharpen this idea.`;
      break;

    case "suggest_initiatives": {
      const existing = (payload.initiatives || []).map(i => i.title).join(", ");
      const themes = (payload.foundation?.themes || []).map(t => t?.name || t).filter(Boolean).join(", ");
      const capabilities = (payload.foundation?.capabilities || []).map(c => c?.name || c).filter(Boolean).join(", ");
      const competitors = (payload.foundation?.competitors || []).map(c => c?.name || c).filter(Boolean).join(", ");
      userContent = `Return ONLY valid JSON, no markdown fences, no explanation.

${orgCtx}
Strategic Themes: ${themes || "Not set"}
Capabilities: ${capabilities || "Not set"}
Competitors: ${competitors || "Not set"}
Existing Initiatives: ${existing || "None yet"}

Identify the 3 highest-leverage initiatives this company should consider that are NOT already in the pipeline.
Use gaps in the strategy, competitive threats, unmet customer needs, and capability opportunities.

Return a JSON array of exactly 3 objects:
[
  {
    "title": "Initiative title (concise, action-oriented)",
    "source": "Strategic Gap|Customer Need|Competitive Threat|Capability Opportunity",
    "problem": "The specific problem this solves (2-3 sentences, specific and evidence-grounded)",
    "opportunity": "What solving this unlocks — revenue, retention, market position, or risk reduction (2-3 sentences with estimates)",
    "rationale": "Why NOW — what makes this urgent or high-leverage at this moment (1-2 sentences)"
  }
]`;
      break;
    }

    case "populate_initiative": {
      const idea = payload.idea || {};
      const pThemes = (payload.foundation?.themes || []).map(t => t?.name || t).filter(Boolean).join(", ");
      const pCaps = (payload.foundation?.capabilities || []).map(c => c?.name || c).filter(Boolean).join(", ");
      const pComps = (payload.foundation?.competitors || []).map(c => c?.name || c).filter(Boolean).join(", ");
      userContent = `Return ONLY valid JSON, no markdown fences, no explanation.

${orgCtx}
Strategic Themes: ${pThemes || "Not set"}
Capabilities: ${pCaps || "Not set"}
Competitors: ${pComps || "Not set"}

PROPOSED INITIATIVE:
Title: ${idea.title || ""}
Initial Idea: ${idea.idea || ""}
Problem (if provided): ${idea.problem || ""}

Using all available context, generate a complete initiative package. Return exactly this JSON:
{
  "title": "Refined, action-oriented initiative title",
  "problem": "Sharp problem statement (3-4 sentences). Who experiences it, how often, what it costs them. Specific and measurable.",
  "opportunity": "Business opportunity (3-4 sentences). Revenue potential, retention impact, competitive positioning, or cost reduction. Include estimates.",
  "evidence_interviews": "Estimated customer interviews needed or proxy evidence",
  "evidence_pain_confirmed": "How pain can be confirmed — research approach",
  "evidence_revenue_opp": "Revenue opportunity estimate with reasoning",
  "evidence_cost_savings": "Cost savings estimate if applicable",
  "evidence_competitive": "Competitive context — who else is solving this and how",
  "evidence_nps": "Expected NPS or satisfaction impact",
  "pivot_p": 7,
  "pivot_i": 6,
  "pivot_v": 8,
  "pivot_o": 7,
  "pivot_t": 5,
  "exec_brief": "Executive investment brief (150-200 words). Problem, opportunity, strategic fit, recommended investment. Board-ready.",
  "personas": "2-3 customer personas most affected. Each: name, role, company size, daily pain, what success looks like for them.",
  "investment_requested": 500000,
  "eng_teams": 3,
  "eng_sprints": 6
}

For PIVOT scores (1-10): P=Problem severity, I=Investment readiness, V=Value potential, O=Organizational fit, T=Time criticality.
For investment_requested: estimate in USD as a number.`;
      break;
    }

    // Aliases for Handoff section keys
    case "journeys":
      userContent = `${orgCtx}
${iniCtx}
Personas: ${(ini?.personas || "").substring(0, 300)}

Generate TWO sections:

## CURRENT STATE JOURNEY
Create a Current State Customer Journey Map for the primary persona. Use 5–6 stages. For each stage: Stage Name, What the user DOES, What they THINK/FEEL, Pain Points (specific), Workarounds today. Format with clear stage headers.

## FUTURE STATE JOURNEY
Create a Future State Journey showing how this initiative transforms the experience. Same 5–6 stages. For each: What the user DOES (new), How they FEEL (improved), Key Gains, Moments of Delight. Be specific about what the technology enables.`;
      break;

    case "usecases":
      userContent = `${orgCtx}
${iniCtx}
JTBD: ${(ini?.jtbd || "").substring(0, 400)}

Create 4 formal use cases relevant to this initiative and company. For each: UC-ID (UC-01 etc), Title, Primary Actor, Preconditions (2), Main Success Flow (5–7 numbered steps), Alternative Flows (2), Exception Flows (1), Postconditions, Business Value Statement, JTBD Connection.`;
      break;

    case "risks":
      userContent = `${orgCtx}
${iniCtx}
Epics: ${(ini?.epics || "").substring(0, 400)}

Identify 5–6 risks for this initiative. For each: Risk ID (R-01), Risk Description, Category (Technical/Business/Compliance/Resource/Schedule), Likelihood (H/M/L), Impact (H/M/L), Risk Score, Mitigation Strategy, Recommended Owner role. End with a ROAM status suggestion (Resolved/Owned/Accepted/Mitigated) for each.`;
      break;

    case "lessons_learned": {
      const metricsCtx = (payload.initiatives || []).map(i =>
        `${i.title} (${i.stage}): NPS=${i.nps_score||"?"}, Adoption=${i.adoption_rate||"?"}%, MAU=${i.monthly_active_users||"?"}, Revenue=$${Number(i.revenue_realized||0).toLocaleString()}, Target Met=${i.target_met?"Yes":"No"}`
      ).join("\n");
      const okrCtx = (payload.okrs || []).map(o =>
        `OKR: ${o.objective} (Progress: ${o.progress||0}%) — KRs: ${(o.key_results||[]).join("; ")}`
      ).join("\n");
      userContent = `${orgCtx}\n\nOKR Performance:\n${okrCtx}\n\nInitiative Metrics:\n${metricsCtx}\n\nYou are a Chief Product Officer conducting a portfolio retrospective. Based on OKR progress and initiative performance metrics above, generate:\n\n## AI Retrospective Analysis\n\n### What Worked\nIdentify 3-4 patterns of success across initiatives. Be specific — reference actual metrics where available.\n\n### What Didn't Work\nIdentify 3-4 patterns of underperformance or missed targets. Be direct and constructive.\n\n### Key Learnings\nSynthesize 4-5 actionable learnings the team should carry into the next cycle. Reference evidence.\n\n### OKR Progress Assessment\nFor each OKR with data, assess: on track / at risk / behind. Explain what drove progress or what blocked it.\n\n---\n\n## AI Recommendations: Next Ideas to Advance OKRs\n\nBased on gaps in OKR progress, initiative outcomes, and company mission, recommend 3 high-leverage initiatives the team should consider next. For each:\n- **Title**: Action-oriented initiative name\n- **OKR it advances**: Which specific OKR and KR this pushes forward\n- **Rationale**: Why this is high-leverage given what you learned\n- **Evidence basis**: What metric gap or insight drives this recommendation\n- **Risk**: One key risk to validate before committing`;
      break;
    }

    case "telemetry":
      userContent = `${orgCtx}
${iniCtx}
Epics: ${(ini?.epics || "").substring(0, 400)}

Generate a Telemetry Readiness Plan for this initiative. Include:

## 1. Key Events to Track
List 10-15 specific user/system events to instrument (event name, trigger, payload fields).

## 2. Business Metrics
5-7 business KPIs this telemetry will feed, with measurement approach.

## 3. Technical Instrumentation Checklist
Specific items engineering must implement before launch (logging, tracking IDs, dashboards, alerts).

## 4. Baseline & Benchmarks
What baseline data needs to be captured before launch to enable before/after comparison.

## 5. Data Governance
Retention policy, PII handling, access controls, and compliance considerations.

## 6. Definition of Telemetry Done
5-7 acceptance criteria confirming telemetry is production-ready.`;
      break;

    case "testcases":
      userContent = `${orgCtx}
${iniCtx}
Epics: ${(ini?.epics || "").substring(0, 400)}
Use Cases: ${(ini?.usecases || "").substring(0, 400)}

Generate a Test Case Suite for this initiative. Include:

## 1. Happy Path Test Cases
8-10 test cases for the primary success flows (TC-01 format). Each: Title, Preconditions, Steps, Expected Result, Priority.

## 2. Edge Case Tests
5-6 test cases for boundary conditions and unusual inputs.

## 3. Error & Failure Tests
4-5 test cases for error handling, timeouts, and system failures.

## 4. Regression Tests
4-5 tests to ensure existing functionality is not broken.

## 5. Performance Tests
3-4 performance/load test scenarios with acceptance thresholds.

## 6. Accessibility Tests
3-4 accessibility test cases (WCAG 2.1 AA compliance).`;
      break;

    case "prd":
      userContent = `${orgCtx}
${iniCtx}
Personas: ${(ini?.personas || "").substring(0, 300)}
JTBD: ${(ini?.jtbd || "").substring(0, 300)}

Write a complete Product Requirements Document (PRD) for this initiative. Include:

## 1. Executive Summary
2-3 sentences: problem, solution, business impact.

## 2. Problem Statement
Detailed problem definition: who, what, frequency, cost of status quo.

## 3. Goals & Success Metrics
Primary goal + 3-4 measurable success metrics with targets.

## 4. User Personas & Use Cases
Summarize the 2-3 primary personas and their core use cases.

## 5. Functional Requirements
Numbered list of 8-12 specific functional requirements (FR-01 through FR-12). Each: requirement statement + priority (P0/P1/P2).

## 6. Non-Functional Requirements
4-6 NFRs: performance, security, scalability, accessibility.

## 7. Out of Scope
4-5 explicit items that are NOT in scope for this release.

## 8. Dependencies & Risks
3-4 key dependencies and 3-4 risks with mitigations.

## 9. Open Questions
3-5 questions that need resolution before development begins.

## 10. Acceptance Criteria
5-7 Given/When/Then acceptance criteria for the MVP.`;
      break;

    case "pivot_coach":
      userContent = `${iniCtx}\nPIVOT Scores: P=${ini.pivot?.p} I=${ini.pivot?.i} V=${ini.pivot?.v} O=${ini.pivot?.o} T=${ini.pivot?.t}\nWeighted Score: ${payload.score?.toFixed(1)}\nCoach me on improving the weakest dimension.`;
      break;

    case "eng_estimate":
      userContent = `${orgCtx}\n${iniCtx}`;
      break;

    case "exec_brief":
    case "one_pager":
      userContent = `${orgCtx}\n${iniCtx}\nPIVOT Score: ${payload.score?.toFixed(1)} — ${payload.tier}\nInvestment Requested: $${((ini.investment_requested || 0) / 1000000).toFixed(1)}M\nApproved: $${((ini.investment_approved || 0) / 1000000).toFixed(1)}M\nEng Estimate: ${ini.eng_teams} teams, ${ini.eng_sprints} sprints, $${((ini.eng_estimate || 0) / 1000).toFixed(0)}K`;
      break;

    case "personas":
      userContent = `${orgCtx}\n${iniCtx}`;
      break;

    case "current_journey":
      userContent = `${orgCtx}\n${iniCtx}\nPersonas: ${(ini.personas || "").substring(0, 300)}`;
      break;

    case "future_journey":
      userContent = `${orgCtx}\n${iniCtx}\nCurrent State Journey: ${(ini.current_journey || "").substring(0, 400)}`;
      break;

    case "jtbd":
      userContent = `${orgCtx}\n${iniCtx}\nPersonas: ${(ini.personas || "").substring(0, 300)}\nCurrent Journey: ${(ini.current_journey || "").substring(0, 300)}`;
      break;

    case "use_cases":
      userContent = `${orgCtx}\n${iniCtx}\nJTBD: ${(ini.jtbd || "").substring(0, 400)}`;
      break;

    case "epics":
      userContent = `${orgCtx}\n${iniCtx}\nUse Cases: ${(ini.use_cases || "").substring(0, 500)}\nJTBD: ${(ini.jtbd || "").substring(0, 300)}`;
      break;

    case "risk_register":
      userContent = `${orgCtx}\n${iniCtx}\nEpics: ${(ini.epics || "").substring(0, 400)}`;
      break;

    case "pi_planning": {
      const approved = (initiatives || []).filter(i => i.approved);
      userContent = `${orgCtx}\nApproved Initiatives:\n${approved.map(i =>
        `\n--- ${i.title} ---\nEpics: ${(i.epics || "Not yet defined").substring(0, 300)}\nRisks: ${(i.risk_register || "Not assessed").substring(0, 200)}`
      ).join("\n")}`;
      break;
    }

    case "handoff":
      userContent = `${orgCtx}\n${iniCtx}\nApproved by: ${ini.approved_by} on ${ini.approved_date}\nPersonas: ${(ini.personas || "Not generated").substring(0, 300)}\nJTBD: ${(ini.jtbd || "Not generated").substring(0, 300)}\nCurrent Journey: ${(ini.current_journey || "").substring(0, 250)}\nFuture Journey: ${(ini.future_journey || "").substring(0, 250)}\nUse Cases: ${(ini.use_cases || "Not generated").substring(0, 400)}\nEpics & Stories: ${(ini.epics || "Not generated").substring(0, 500)}\nRisk Register: ${(ini.risk_register || "Not generated").substring(0, 300)}\nEng Estimate: ${ini.eng_estimate ? `$${(ini.eng_estimate / 1000).toFixed(0)}K, ${ini.eng_teams} teams, ${ini.eng_sprints} sprints` : "Not estimated"}`;
      break;

    case "investment_contract": {
      const investment = ini.investment_approved || ini.investment_requested || 0;
      userContent = `${orgCtx}

Initiative: ${ini.title}
Problem: ${ini.problem}
Opportunity: ${ini.opportunity}
Stage: ${ini.stage}
Investment Approved: $${(investment / 1000000).toFixed(2)}M
Evidence — Interviews: ${ini.evidence_interviews}, Pain Confirmed: ${ini.evidence_pain_confirmed}, Revenue Opportunity: ${ini.evidence_revenue_opp}, Cost Savings: ${ini.evidence_cost_savings}
PIVOT Score: P=${ini.pivot?.p} I=${ini.pivot?.i} V=${ini.pivot?.v} O=${ini.pivot?.o} T=${ini.pivot?.t}
Eng Estimate: ${ini.eng_teams} teams, ${ini.eng_sprints} sprints
Personas: ${(ini.personas || "").substring(0, 200)}
JTBD: ${(ini.jtbd || "").substring(0, 200)}
Epics: ${(ini.epics || "").substring(0, 300)}

Generate an Investment Contract JSON. Be specific and quantified. The primary_metric should be the single most important outcome metric. secondary_metrics should be 2-3 supporting metrics. telemetry_source should name the actual tool or method (e.g. "GA4 funnel events", "Mixpanel user flow", "CSV export from Salesforce"). review_window_days should be realistic (30-180). economic_outcome should state the expected financial or business impact in concrete terms.

Return ONLY valid JSON, no markdown, no explanation.`;
      break;
    }

    case "portfolio_analysis": {
      const ranked = (initiatives || [])
        .map(i => ({ title: i.title, stage: i.stage }))
        .sort((a, b) => (b.wsjf || 0) - (a.wsjf || 0));
      userContent = `${orgCtx}\nInitiatives:\n${ranked.map(i => `- ${i.title} (Stage: ${i.stage})`).join("\n")}`;
      break;
    }

    case "chatty": {
      const iniList = (initiatives || [])
        .map(i => `${i.title} (${i.stage})`)
        .join("; ");
      const orgName = foundation?.name || "this company";
      const ctxMsg = `Active Workspace: ${orgName}\nCompany Mission: ${foundation?.mission || ""}\nOKRs: ${(foundation?.okrs || []).map(o => o.objective).join("; ")}\nInitiatives (${initiatives?.length || 0}): ${iniList}\nCurrent screen: ${payload.currentView || "dashboard"}\nUser is: ${payload.userName || "Nicole"}\n\nIMPORTANT: You are advising ONLY on ${orgName}. Do not reference or mix in data from any other company.`;
      userContent = `Context:\n${ctxMsg}\n\nUser question: ${question}`;
      break;
    }

    case "competitor_analysis": {
      const orgName = foundation?.name || "this company";
      const compList = (payload.competitors || []).map((c, i) =>
        `#${i+1} ${c.name} (${c.tier}, threat:${c.threat_level}) — Overall:${c.overall_score} Digital:${c.digital_score} Mobile:${c.mobile_score} Claims:${c.claims_score} Portal:${c.portal_score} App Store★:${c.app_store_rating > 0 ? c.app_store_rating : "not in dataset"} | PM advantage: ${c.our_advantage || "not assessed"} | PM gap: ${c.our_gap || "not assessed"}`
      ).join("\n");

      // Our own scores — passed from UI when available
      const ourScores = payload.ourScores;
      const ourScoreBlock = ourScores
        ? `${orgName} self-assessment (PM-entered, treat as verified):
Overall: ${ourScores.overall_score || "not set"} | Digital: ${ourScores.digital_score || "not set"} | Mobile: ${ourScores.mobile_score || "not set"} | Claims: ${ourScores.claims_score || "not set"} | App Store★: ${ourScores.app_store_rating || "not set"}`
        : `${orgName} self-scores: not yet entered in the platform. Use only the PM-assessed advantage/gap fields per competitor to infer our relative position — do not invent numeric scores for ${orgName}.`;

      userContent = `You are a senior product strategy advisor analyzing the competitive landscape for ${orgName}.

EVIDENCE RULES — every number you cite must exist in this dataset:
- All competitor scores (Overall, Digital, Mobile, Claims, Portal) are PM-assessed on a 0–100 scale. Cite them directly.
- App Store★ ratings are public iOS/Android listings for competitors only. If marked "not in dataset", omit the number.
- If ${orgName}'s own scores appear in the self-assessment block below, you may compare against them. If not, reference only the PM-assessed advantage and gap fields — never invent a numeric score for ${orgName} from your training data.
- The PM advantage and gap fields are ground truth assessments. Quote them; do not paraphrase into invented numbers.

Company: ${orgName}
Mission: ${foundation?.mission || "not set"}
OKRs: ${(foundation?.okrs || []).map(o => o.objective).join("; ") || "not set"}

${ourScoreBlock}

Competitor data (scores 0–100 PM-assessed; App Store★ = public listing):
${compList}

Provide an executive-ready competitive analysis:
1. The #1 digital gap ${orgName} must close this year — cite specific competitor scores that are highest in that dimension
2. Where ${orgName} has defensible advantages — quote the PM advantage fields directly
3. The biggest customer retention threat — name the competitor, cite their score or capability from the data
4. Three prioritized product moves — each tied to a specific named gap from the data above
5. Most dangerous competitor and why — justify with threat level and dimension scores

McKinsey style: direct, numbered, evidence-cited. Every claim traceable to data above. No invented numbers.`;
      break;
    }

    case "competitor_refresh": {
      // Per-competitor structured refresh — returns JSON with updated fields
      const c = payload.competitor || {};
      const orgName = foundation?.name || "this company";
      const ourScores = payload.ourScores;
      const ourBlock = ourScores
        ? `${orgName} self-scores: Overall ${ourScores.overall_score||"?"}, Digital ${ourScores.digital_score||"?"}, Mobile ${ourScores.mobile_score||"?"}, Claims ${ourScores.claims_score||"?"}, App Store★ ${ourScores.app_store_rating||"?"}`
        : `${orgName} self-scores: not entered — use only the advantage/gap context provided.`;

      userContent = `You are a senior competitive intelligence analyst. Refresh the intelligence for ONE competitor and return ONLY valid JSON — no preamble, no markdown, no explanation outside the JSON object.

Company being analyzed: ${orgName}
${ourBlock}

Competitor to refresh:
Name: ${c.name}
Tier: ${c.tier} | Threat: ${c.threat_level}
Current scores (PM-assessed 0–100): Overall ${c.overall_score}, Digital ${c.digital_score}, Mobile ${c.mobile_score}, Claims ${c.claims_score}, Portal ${c.portal_score}
App Store★: ${c.app_store_rating > 0 ? c.app_store_rating : "not available"}
Current key differentiator: ${c.key_differentiator || "none"}
Current strengths: ${(c.strengths||[]).join("; ")}
Current weaknesses: ${(c.weaknesses||[]).join("; ")}
Current our_advantage: ${c.our_advantage || "none"}
Current our_gap: ${c.our_gap || "none"}

Return ONLY this JSON structure (no other text):
{
  "key_differentiator": "updated 1-sentence differentiator for ${c.name}",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "our_advantage": "what ${orgName} has that ${c.name} cannot easily replicate — specific, evidence-grounded",
  "our_gap": "where ${c.name} is ahead of ${orgName} right now — specific capability or metric, no invented numbers for ${orgName}",
  "intelligence_summary": "2-sentence executive update on ${c.name}'s current competitive trajectory and the single most important thing ${orgName} product team should know about them right now"
}

Rules: every claim must be grounded in publicly known product facts or the scores above. No invented metrics for ${orgName}. Return only the JSON object.`;
      break;
    }

    case "measure_insights": {
      const ini = payload.ini || {};
      const metrics = payload.metrics || [];
      const trend = metrics.length > 1
        ? metrics.map(m => `${(m.metric_date||"").slice(5,10)} MAU=${m.mau} NPS=${m.nps} CSAT=${m.csat}`).join(" | ")
        : "No trend data yet.";
      userContent = `You are a senior Product Analytics advisor. Analyze the post-launch performance of this initiative and surface critical insights.

Initiative: ${ini.title} (${ini.slug})
Launch Date: ${ini.launch_date || "Unknown"}

ADOPTION METRICS:
- Adoption Rate: ${ini.adoption_rate}% (target: 40%)
- Monthly Active Users: ${Number(ini.monthly_active_users||0).toLocaleString()}
- Daily Active Users: ${Number(ini.daily_active_users||0).toLocaleString()}
- Feature Utilization: ${ini.feature_utilization}%

CUSTOMER FEEDBACK:
- NPS: ${ini.nps_score} (insurance industry avg: 22)
- CSAT: ${ini.csat_score}/5.0
- Survey Responses: ${ini.survey_responses}
- Key Verbatims: ${(ini.key_verbatims || []).join(" | ")}

BUSINESS OUTCOMES:
- Call Deflection: ${ini.call_deflection_pct}%
- Revenue Realized: $${Number(ini.revenue_realized||0).toLocaleString()}
- Cost Savings: $${Number(ini.cost_savings_realized||0).toLocaleString()}
- Target Met: ${ini.target_met ? "YES" : "NOT YET"}

Weekly Trend: ${trend}

PM Notes: ${ini.measure_notes || "None"}

Provide:
1. **Performance Summary** — 2-sentence verdict on where this stands
2. **Top 3 Signals** — what the data is telling us (good and bad)
3. **Adoption Gap Analysis** — why are we at ${ini.adoption_rate}% vs 40% target?
4. **Customer Sentiment Themes** — what are users actually saying?
5. **Next 30-Day Recommendations** — 3 specific actions to improve metrics

Be direct, data-driven, and opinionated.`;
      break;
    }

    case "outcome_summary": {
      const ini = payload.ini || {};
      const okr = payload.okr || null;
      userContent = `You are a Chief Product Officer writing the final retrospective for a completed product initiative. This will be shared with the executive team.

Initiative: ${ini.title} (${ini.slug})
Original Problem: ${ini.problem || ""}
Opportunity: ${ini.opportunity || ""}
Linked OKR: ${okr ? `${okr.objective} — ${okr.description || ""}` : "No OKR linked"}

FINAL OUTCOMES:
- Adoption Rate: ${ini.adoption_rate}%
- Monthly Active Users: ${Number(ini.monthly_active_users||0).toLocaleString()}
- NPS: ${ini.nps_score}
- CSAT: ${ini.csat_score}/5.0
- Call Deflection: ${ini.call_deflection_pct}%
- Revenue Realized: $${Number(ini.revenue_realized||0).toLocaleString()}
- Cost Savings: $${Number(ini.cost_savings_realized||0).toLocaleString()}
- Target Met: ${ini.target_met ? "YES" : "NO"}

LESSONS LEARNED: ${ini.lessons_learned || "Not captured"}
NEXT ACTION: ${ini.next_action || "iterate"}

Write a compelling executive narrative with these sections:
1. **What We Set Out to Do** — the original vision in 2-3 sentences
2. **What We Built and Delivered** — key capabilities shipped
3. **Did We Win?** — honest verdict on business and customer outcomes vs targets
4. **What We Learned** — top 3 lessons for the next initiative
5. **The Road Ahead** — recommendation: ${ini.next_action || "iterate"} — and why

Tone: Executive-ready. Confident but honest. 400-500 words.`;
      break;
    }

    case "gtm_full": {
      const ini = payload.ini || {};
      userContent = `Senior GTM strategist. Generate a GTM package as a JSON object. Return ONLY valid JSON, no markdown fences, no preamble.

Initiative: ${ini.title}
Problem: ${(ini.problem || "").substring(0, 200)}
Opportunity: ${(ini.opportunity || "").substring(0, 200)}
Personas: ${(ini.personas || "").substring(0, 250)}
Metric: ${ini.contract_primary_metric || ""}, Target: ${ini.contract_target || ""}
Outcome Goal: ${(ini.contract_economic_outcome || "").substring(0, 150)}

Return exactly this JSON structure (keep each value under 200 words):
{
  "icp": "Job title, company size, industry, pain point, buying trigger",
  "positioning": "For [ICP] who [pain], [product] is the [category] that [benefit] unlike [alternative]",
  "value_prop": "3 bullet value propositions tied to the target metric",
  "channel_strategy": "Primary channel, secondary channel, rationale",
  "launch_plan": "Phase 1 soft launch, Phase 2 GA, Phase 3 scale — key actions per phase",
  "success_criteria": "3 measurable launch criteria with specific numbers",
  "campaign_intel": "Campaign 1: [name, channel, message, CTA]. Campaign 2: [same]. Campaign 3: [same]"
}`;
      break;
    }

    case "gtm_calendar": {
      const ini = payload.ini || {};
      const today = new Date().toISOString().slice(0, 10);
      userContent = `You are a GTM launch planner. Generate a realistic 120-day launch calendar. Return ONLY a valid JSON array, no markdown fences.

Initiative: ${ini.title}
Channel Strategy: ${(ini.gtm_channel_strategy || "").substring(0, 300)}
Launch Plan: ${(ini.gtm_launch_plan || "").substring(0, 300)}
Today: ${today}

Return a JSON array of 14-18 task objects. Assume launch = 60 days from today.
Each object: { "id": "unique_string", "date": "YYYY-MM-DD", "title": "task name", "owner": "role", "type": "task|campaign|milestone|event" }
Include: pre-launch prep, internal enablement, soft launch, campaign activations, PR/comms, GA milestone, post-launch 30-day review.`;
      break;
    }

    case "gtm_social": {
      const ini = payload.ini || {};
      const channel = payload.channel || "LinkedIn";
      const channelPrompts = {
        "LinkedIn": `Write a 30-day LinkedIn content plan for this product launch. Return ONLY a plain text string, no JSON, no markdown fences.

Initiative: ${ini.title}
ICP: ${ini.gtm_icp || ""}
Positioning: ${ini.gtm_positioning || ""}
Value Props: ${(ini.gtm_value_prop || "").substring(0, 200)}

Write exactly 30 LinkedIn posts, one per line, formatted as:
Day 1: [post content 60-80 words]
Day 2: [post content 60-80 words]
...Day 30: [post content]

Mix: problem awareness (days 1-5), product intro (6-10), feature spotlights (11-15), social proof (16-20), tips/education (21-25), CTA/urgency (26-30). Vary tone and hooks.`,

        "Twitter/X": `Write a 30-day Twitter/X content plan for this product launch. Return ONLY plain text, no JSON, no fences.

Initiative: ${ini.title}
ICP: ${ini.gtm_icp || ""}
Positioning: ${ini.gtm_positioning || ""}

Write exactly 30 tweets, one per line, formatted as:
Day 1: [tweet under 280 chars]
Day 2: [tweet under 280 chars]
...Day 30: [tweet]

Mix: announcements, tips, questions, stats, threads, engagement hooks, CTAs.`,

        "Email": `Write a 4-week email nurture sequence for this product launch. Return ONLY plain text, no JSON, no fences.

Initiative: ${ini.title}
ICP: ${ini.gtm_icp || ""}
Positioning: ${ini.gtm_positioning || ""}
Value Props: ${(ini.gtm_value_prop || "").substring(0, 200)}

Write 4 emails formatted as:
WEEK 1 — Subject: [subject line]
[150-word email body]

WEEK 2 — Subject: [subject line]
[150-word email body]

WEEK 3 — Subject: [subject line]
[150-word email body]

WEEK 4 — Subject: [subject line]
[150-word email body]

Week 1=announcement, Week 2=value deep dive, Week 3=social proof/case study, Week 4=urgency/CTA.`,

        "Blog": `Write 4 blog post outlines for a 30-day product launch campaign. Return ONLY plain text, no JSON, no fences.

Initiative: ${ini.title}
ICP: ${ini.gtm_icp || ""}
Positioning: ${ini.gtm_positioning || ""}

Write 4 outlines formatted as:
WEEK 1 — Title: [SEO-optimized title]
Section 1: [header — one sentence summary]
Section 2: [header — one sentence summary]
Section 3: [header — one sentence summary]
Section 4: [header — one sentence summary]
Section 5: [header — one sentence summary]

Repeat for WEEK 2, WEEK 3, WEEK 4. Topics: problem awareness, product deep dive, customer success, future vision.`,

        "Press Release": `Write a product launch press release. Return ONLY plain text, no JSON, no fences.

Initiative: ${ini.title}
ICP: ${ini.gtm_icp || ""}
Positioning: ${ini.gtm_positioning || ""}

Format:
FOR IMMEDIATE RELEASE
[Headline]

[City, Date] — [Lede paragraph: who, what, when, where, why — 50 words]

[Body paragraph: product details, key features, business value — 75 words]

"[Quote from PM or CEO — 30 words]"

[Call to action paragraph — 30 words]

About [Company]: [Boilerplate — 40 words]

###`
      };

      userContent = channelPrompts[channel] || channelPrompts["LinkedIn"];
      break;
    }

    default:
      userContent = question || payload.prompt || "";
  }

  // For Chatty, include conversation history
  if (action === "chatty" && Array.isArray(messages) && messages.length > 0) {
    const history = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));
    return { system, messages: [...history, { role: "user", content: userContent }] };
  }

  return { system, messages: [{ role: "user", content: userContent }] };
}

// ─── Token budget per action ──────────────────────────────────
const TOKEN_MAP = {
  suggest: 600, clarify: 500, pivot_coach: 300, eng_estimate: 400,
  exec_brief: 1200, one_pager: 600, personas: 1100, current_journey: 1800,
  future_journey: 1800, jtbd: 1600, use_cases: 2000, epics: 2500,
  risk_register: 1800, pi_planning: 2000, handoff: 4000,
  portfolio_analysis: 700, chatty: 700,
  journeys: 2500, usecases: 2000, risks: 1800, prd: 3500, telemetry: 2500, testcases: 2500,
  lessons_learned: 3000,
  suggest_initiatives: 1500, populate_initiative: 3000,
  gtm_full: 4000, gtm_calendar: 2000, gtm_social: 3000,
  investment_contract: 1200,
  bootstrap_company: 8000,
};

// ─── Bootstrap company prompt ─────────────────────────────────
function buildBootstrapPrompt(companyName, website, siteContent) {
  const siteRef = website ? ` at ${website}` : "";

  let siteInstruction;
  if (siteContent) {
    siteInstruction = `Here is the content fetched directly from ${website}. Use this as your PRIMARY source for mission, products, and positioning:\n\n---\n${siteContent}\n---\n\nAlso use your existing knowledge about ${companyName} to fill in competitors and market context.`;
  } else if (website) {
    siteInstruction = `The company website is ${website}. Use your knowledge about this company and website to populate the data accurately.`;
  } else {
    siteInstruction = `Use your knowledge to construct realistic and accurate data for this company.`;
  }

  return {
    system: `You are a senior product intelligence analyst. Your job is to research a company and return structured JSON data that will be loaded into a product management platform. You must return ONLY valid JSON — no markdown, no explanation, no preamble. The JSON must exactly match the schema provided.

SCHEMA RULES (critical — violations break the database):
- products[].stage: MUST be exactly one of: "Alpha", "Beta", "GA", "Deprecated"
- competitors[].tier: MUST be exactly one of: "primary", "secondary"  
- competitors[].threat_level: MUST be exactly one of: "high", "medium", "low"
- competitors[].strengths: MUST be an array of strings
- competitors[].weaknesses: MUST be an array of strings
- initiatives[].stage: MUST be exactly one of: "idea", "discovery", "review", "approved", "definition", "delivery", "handoff"
- All numeric scores: decimals between 1.0 and 5.0
- No apostrophes in text fields — use plain English alternatives
- No em-dashes — use a hyphen instead`,

    userContent: `Research ${companyName}${siteRef} and return a JSON object with this exact structure. ${siteInstruction}

{
  "org": {
    "mission": "company mission statement (1-2 sentences)",
    "vision": "company vision statement (1-2 sentences)",
    "values": ["value 1", "value 2", "value 3", "value 4", "value 5"]
  },
  "okrs": [
    {
      "objective": "OKR objective statement",
      "key_results": ["KR1", "KR2", "KR3", "KR4"],
      "owner": "Name, Title",
      "progress": 25
    }
  ],
  "themes": [
    {
      "name": "Theme short name",
      "theme": "Theme tagline",
      "description": "2-3 sentence strategic description"
    }
  ],
  "capabilities": [
    {
      "name": "Capability name",
      "description": "2-3 sentence description of the capability"
    }
  ],
  "products": [
    {
      "name": "Product name",
      "type": "Platform or AI Product or Service or Feature",
      "stage": "GA",
      "advisors": "Target customer segment"
    }
  ],
  "competitors": [
    {
      "name": "Competitor name",
      "tier": "primary",
      "threat_level": "high",
      "overall_score": 3.8,
      "digital_score": 3.5,
      "mobile_score": 3.0,
      "claims_score": 3.2,
      "portal_score": 3.8,
      "app_store_rating": null,
      "market_share_pct": 15.0,
      "key_differentiator": "One sentence describing their main differentiator",
      "strengths": ["Strength 1", "Strength 2", "Strength 3"],
      "weaknesses": ["Weakness 1", "Weakness 2"],
      "our_advantage": "One sentence on what makes ${companyName} better",
      "our_gap": "One sentence on where the competitor has an edge"
    }
  ],
  "initiatives": [
    {
      "slug": "INI-001",
      "title": "Initiative title",
      "stage": "discovery",
      "source": "Market Opportunity",
      "problem": "Problem statement 1-2 sentences",
      "opportunity": "Opportunity statement 1-2 sentences"
    }
  ]
}

Requirements:
- 3 OKRs reflecting real company priorities
- 3 strategic themes
- 4-5 capabilities (core competencies)
- 3-5 products (real product lines)
- 5-6 competitors (mix of primary and secondary, scored realistically)
- 3 initiatives (realistic PM opportunities at this company)
- Use real data about ${companyName} — real products, real competitors, real strategic direction
- Return ONLY the JSON object, nothing else`,
  };
}

// ─── Handler ──────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const { action, payload = {} } = req.body;
  if (!action) {
    return res.status(400).json({ error: "action is required" });
  }

  try {
    // ── Bootstrap company: special JSON-returning action ────────
    if (action === "bootstrap_company") {
      const { companyName, website } = payload;
      if (!companyName) return res.status(400).json({ error: "companyName required" });

      // If website provided, fetch it directly — no web search needed
      let siteContent = "";
      if (website) {
        try {
          const siteUrl = website.startsWith("http") ? website : `https://${website}`;
          console.log("Fetching website directly:", siteUrl);
          const siteRes = await fetch(siteUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; PGI-Bootstrap/1.0)" },
            signal: AbortSignal.timeout(15000),
          });
          if (siteRes.ok) {
            const html = await siteRes.text();
            // Strip HTML tags, collapse whitespace, limit to 8000 chars
            siteContent = html
              .replace(/<script[\s\S]*?<\/script>/gi, "")
              .replace(/<style[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 8000);
            console.log("Site fetched, content length:", siteContent.length);
          }
        } catch (e) {
          console.warn("Site fetch failed, falling back to AI knowledge:", e.message);
        }
      }

      const { system, userContent } = buildBootstrapPrompt(companyName, website, siteContent);

      // Only use web search if we have no website or fetch failed
      const useWebSearch = !siteContent;
      const requestBody = {
        model: MODEL,
        max_tokens: TOKEN_MAP.bootstrap_company,
        system,
        messages: [{ role: "user", content: userContent }],
      };
      if (useWebSearch) {
        requestBody.tools = [{ type: "web_search_20250305", name: "web_search" }];
      }

      const response = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          ...(useWebSearch ? { "anthropic-beta": "web-search-2025-03-05" } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Bootstrap AI error:", err);
        return res.status(502).json({ error: "AI service error", detail: err });
      }

      const data = await response.json();
      // Extract text from content blocks (may include tool_use blocks)
      const textBlock = data.content?.find(b => b.type === "text");
      const raw = textBlock?.text || "";
      console.log("Bootstrap raw response (first 1000):", raw.slice(0, 1000));

      // Smart JSON extraction — find the outermost { } even if AI adds preamble
      const clean = raw.replace(/```json|```/g, "").trim();
      const jsonStart = clean.indexOf("{");
      const jsonEnd = clean.lastIndexOf("}");
      let parsed;
      try {
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON object found");
        const jsonStr = clean.slice(jsonStart, jsonEnd + 1);
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Bootstrap JSON parse error:", e.message, "\nRaw:", raw.slice(0, 500));
        return res.status(502).json({ error: "AI returned invalid JSON", raw: raw.slice(0, 500) });
      }

      return res.status(200).json({ data: parsed });
    }

    // ── All other actions ───────────────────────────────────────
    const { system, messages } = buildMessages(action, payload);
    const max_tokens = TOKEN_MAP[action] || 700;

    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens, system, messages }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return res.status(502).json({ error: "AI service error", detail: err });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    return res.status(200).json({ text });
  } catch (err) {
    console.error("AI handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
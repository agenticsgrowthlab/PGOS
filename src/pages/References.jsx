import { useState } from "react";
import { T, css } from "../lib/tokens";
import { AIBox } from "../components/ui";

// ─── PGI Framework Deck ───────────────────────────────────────
const SLIDES = [
  { num:"01", title:"The Problem", color:"#EF4444",
    content:"Product leaders operate across fragmented disciplines with no unified operating system. Strategy lives in decks. Discovery in Jira. Portfolio in spreadsheets. Delivery in GitHub. Outcomes in a post-launch void. The result: misaligned investment, late pivots, and value that never reaches customers — and never gets measured.",
    stat:"73% of product initiatives never reach intended business outcomes" },
  { num:"02", title:"Introducing PGI", color:"#D4A843",
    content:"The Product Growth Intelligence platform is an 11-stage framework that connects every product decision — from strategy through measured customer outcomes — in a single, traceable lineage. Built for senior product leaders who need to defend investment, align stakeholders, accelerate delivery, and prove business value.",
    stat:"Mission → Strategy → Initiative → Delivery → Launch → Measure → Outcome" },
  { num:"03", title:"The 11-Stage Lifecycle", color:"#2E6DA4",
    content:"Every initiative follows the same pipeline: Ideas (Stage 1) → Discovery (Stage 2) → Exec Review (Stage 3) → Portfolio (Stage 4) → Definition (Stage 5) → Delivery / Sprints (Stage 6) → Handoff (Stage 7) → Campaign Launch (Stage 8) → Measure (Stage 9) → Lessons Learned (Stage 10) → Outcome Summary (Stage 11). Each stage has AI-assisted artifact generation and a clear go/no-go gate.",
    stat:"11 stages · One traceable lineage from idea to proven outcome" },
  { num:"04", title:"PIVOT Score™", color:"#D4A843",
    content:"The structured scoring model at Stage 2–3. Five weighted dimensions: Potential (25%), Innovation (20%), Value (15%), Opportunity (20%), Timing (20%). Each scored 0–5 by the PM, scaled to 0–20, and summed to a 0–100 composite. Scores map to four investment tiers: COMMIT (80+), CONSIDER (60–79), DEFER (40–59), KILL (0–39). Click any PIVOT score in the app to see the full math breakdown.",
    stat:"Score 0–100 · Evidence-based investment decisions · Replaces gut feel" },
  { num:"05", title:"Foundation Layer", color:"#22C55E",
    content:"Every initiative traces back to the Foundation: Mission, Vision, Values, OKRs, Strategic Themes, Business Capabilities, and Products. Competitive Analysis lives here too — with AI-powered per-competitor refresh across Overall, Digital, Mobile, Claims, and Portal dimensions. This lineage ensures every initiative can be defended to the board with a clear thread from strategic intent to delivery outcome.",
    stat:"Architecture: Mission → Theme → OKR → Capability → Initiative → Story → Outcome" },
  { num:"06", title:"Delivery Handoff · Stage 7", color:"#2E6DA4",
    content:"Stage 7 assembles every artifact from the lifecycle into one engineering handoff package. Includes: editable PRD (with Word export), Customer Personas, Journey Maps (Current + Future), Jobs To Be Done, Use Cases, Epics & Stories with Jira ticket tracking, Risk Register (ROAM), Telemetry Readiness plan, Test Cases, and Quarterly Planning. Go/No-Go checklist confirms all required artifacts are complete before sprint work begins.",
    stat:"12 required artifacts · Go/No-Go checklist · Word export for PRD" },
  { num:"07", title:"Sprints · Stage 6", color:"#9333EA",
    content:"Stage 6 translates Definition artifacts into sprint-ready stories. Stories parse directly from Epics text — Given/When/Then acceptance criteria pre-populate automatically from the Epics & Stories section. Each story card expands to show AC, Dev Notes, and Labels (Bug, Feature, Tech Debt, Spike, P0–P2, Blocked, + custom). Stories are drag-assigned to sprints or backlog. Jira ticket tracking available on the Epics tab.",
    stat:"Drag-to-assign · AC from epics · Labels · Jira tracker" },
  { num:"08", title:"Campaign Launch · Stage 8", color:"#F59E0B",
    content:"Stage 8 is the GTM execution layer. Launch Calendar tracks milestones, campaigns, and tasks by date, type, and owner. The 30-Day Content Calendar generates channel-specific content across LinkedIn, Twitter/X, Email, Blog, and Press Release — each in its own editable tab. Target Metric and Target are editable in the context bar. Syncs dates from the Roadmap automatically.",
    stat:"Launch calendar · 5-channel content generation · Roadmap date sync" },
  { num:"09", title:"Measure · Stage 9", color:"#F59E0B",
    content:"Stage 9 captures what actually happened post-launch. Track Adoption Rate, MAU, DAU, Feature Utilization, NPS, CSAT, Call Deflection, Revenue Realized, and Cost Savings — with editable weekly time-series trends. AI Measure Insights analyzes the full dataset and surfaces adoption gap analysis, customer sentiment themes, and 30-day improvement recommendations.",
    stat:"KPIs: Adoption · MAU · NPS · CSAT · Call Deflection · Revenue · Cost Savings" },
  { num:"10", title:"Outcome Summary · Stage 11", color:"#2E6DA4",
    content:"Stage 11 closes the loop. Enter actuals (all 8 outcome metrics are editable). Compare PIVOT predicted score against the actual outcome composite. Assess OKR achievement (Achieved / Partial / Below Target — reads from Foundation OKRs). Document Lessons Learned. Choose Next Action: Iterate, Expand, Sunset, or Archive. AI generates a 400-500 word executive narrative automatically saved to the initiative record.",
    stat:"PIVOT predicted vs actual · OKR achievement · Executive narrative export" },
  { num:"11", title:"AI-Augmented at Every Stage", color:"#6366F1",
    content:"PGI embeds AI coaching throughout the lifecycle — not as a chatbot, but as a stage-aware advisor. AI generates executive briefs, one-pagers, personas, journey maps, JTBD, use cases, epics, stories, risk registers, PRDs, telemetry plans, test cases, PI planning packages, campaign content, outcome narratives, and the cross-portfolio retrospective. The ◆ Advisor button in the bottom right has full pipeline context.",
    stat:"◆ Your Product Growth Intelligence Advisor — always-on with full pipeline context" },
  { num:"12", title:"Start Here", color:"#D4A843",
    content:"Begin in Foundation — establish your Mission, OKRs, and Strategic Themes. Capture your first Idea and advance it through the 11-stage pipeline. Every stage has an AI coach ready to generate artifacts, challenge assumptions, and surface what you are missing. When you ship, go to Campaign Launch (Stage 8), then Measure (Stage 9). Close out in Outcome Summary (Stage 11).",
    stat:"Foundation → Ideas → Discovery → Exec Review → Portfolio → Define → Deliver → Handoff → Launch → Measure → Outcome" },
];

export function RefFramework({ setView }) {
  const [active, setActive] = useState(0);
  const slide = SLIDES[active];

  return (
    <div>
      <div style={css.h2}>PGI Framework Deck</div>
      <div style={css.sub}>Core concepts, pillars, and operating model — 12 slides · Built for executive alignment</div>

      <div style={{ background: T.ink2, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ background: `linear-gradient(135deg, ${T.ink3}, ${T.ink4})`, padding: "40px 48px 32px", borderBottom: `1px solid ${T.border}`, position: "relative" }}>
          <div style={{ position: "absolute", top: 20, right: 28, fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: "0.12em" }}>
            {String(active + 1).padStart(2, "0")} / {SLIDES.length}
          </div>
          <div style={{ display: "inline-block", background: slide.color, color: T.ink, fontSize: 10, fontWeight: 900, padding: "3px 10px", borderRadius: 4, letterSpacing: "0.12em", marginBottom: 14 }}>
            SLIDE {slide.num}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: T.white, letterSpacing: "-0.03em", marginBottom: 8 }}>{slide.title}</div>
          <div style={{ fontSize: 14, color: T.body, lineHeight: 1.75, maxWidth: 680 }}>{slide.content}</div>
        </div>
        <div style={{ padding: "14px 48px", background: "rgba(212,168,67,0.07)", borderBottom: "1px solid rgba(212,168,67,0.15)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: T.gold, fontSize: 15, fontWeight: 900 }}>◆</span>
          <span style={{ fontSize: 12, color: T.gold, fontWeight: 700, fontStyle: "italic" }}>{slide.stat}</span>
        </div>
        <div style={{ padding: "14px 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button style={{ ...css.btnGhost, opacity: active === 0 ? 0.3 : 1 }} onClick={() => setActive(a => Math.max(0, a - 1))} disabled={active === 0}>← Previous</button>
          <div style={{ display: "flex", gap: 6 }}>
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setActive(i)}
                style={{ width: 8, height: 8, borderRadius: "50%", border: "none", cursor: "pointer", background: i === active ? T.gold : T.border, padding: 0, transition: "background 0.2s" }} />
            ))}
          </div>
          <button style={{ ...css.btnGold, opacity: active === SLIDES.length - 1 ? 0.4 : 1 }} onClick={() => setActive(a => Math.min(SLIDES.length - 1, a + 1))} disabled={active === SLIDES.length - 1}>Next →</button>
        </div>
      </div>

      <div style={css.card}>
        <div style={css.secHead}>All Slides</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {SLIDES.map((s, i) => (
            <button key={i} onClick={() => setActive(i)}
              style={{ textAlign: "left", background: i === active ? T.goldD : T.ink3, border: `1px solid ${i === active ? T.gold : T.border}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: s.color, minWidth: 22 }}>{s.num}</span>
              <span style={{ fontSize: 12, color: i === active ? T.gold : T.loud, fontWeight: i === active ? 700 : 400 }}>{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 8 }}>
        <button style={css.btnOut} onClick={() => setView("ref_guide")}>Next: How To Use PGI →</button>
      </div>
    </div>
  );
}

// ─── How To Use PGI ──────────────────────────────────────────
const GUIDE_SECTIONS = [
  { icon:"⊞", title:"Start with Foundation", step:"Always First", color:"#22C55E",
    what:"Before anything else, anchor the platform in your organization's strategic context. Foundation is the bedrock that every initiative traces back to — Mission, OKRs, Themes, Capabilities, Products, and Competitive Intelligence.",
    tasks:["Enter your Mission and Vision statements","Add your OKRs — use AI to suggest Key Results if you are starting fresh","Define your Strategic Themes (the big bets this cycle)","Map your Business Capabilities (what your platform can do today)","Add your Products with their current stage","Navigate to Competitive Analysis — run AI Refresh per competitor to get scored intelligence across Digital, Mobile, Claims, and Portal dimensions","Link every initiative to an OKR, Theme, and Capability — this is what makes the lineage traceable"],
    tip:"Foundation is not a one-time task. Return here each planning cycle to update OKRs and Themes. The quality of your Foundation determines the quality of every investment rationale that flows from it." },
  { icon:"◇", title:"Capture Ideas · Stage 1", step:"Stage 1 · Ideas", color:"#6B7A99",
    what:"Every product initiative starts as an idea. PGI captures ideas from 8 sources and immediately links them to your Foundation — ensuring every idea has a strategic home before it consumes any team capacity.",
    tasks:["Click '+ New Idea' in the Ideas view","Select the source type (Executive Idea, Customer Request, Regulatory, Market Opportunity, etc.)","Describe the problem you are trying to solve — be specific about pain, not solution","AI will ask clarifying questions to sharpen the problem statement","Link to an OKR, Strategic Theme, and Business Capability","Save — the idea enters Stage 1 and appears in your pipeline"],
    tip:"The problem statement is everything at Stage 1. Do not describe the solution — describe the pain. A precise problem statement saves weeks of rework at Definition." },
  { icon:"◈", title:"Run Discovery · Stage 2", step:"Stage 2 · Discovery", color:"#6366F1",
    what:"Discovery validates the idea with evidence before investing leadership attention. PIVOT Score™ is calculated here based on five weighted dimensions of investment worthiness.",
    tasks:["Open an Idea and advance it to Discovery","Enter evidence: customer interviews, revenue opportunity, cost savings, competitive context, NPS data","Adjust the PIVOT sliders — P(25%) I(20%) V(15%) O(20%) T(20%) — each scored 0–5","Enter investment request and engineering estimate","Click any PIVOT score to see the full math breakdown in the ⓘ modal","Use the AI Discovery Coach to surface evidence gaps","When evidence is solid, advance to Exec Review"],
    tip:"PIVOT Score™ is never a committee vote — it is your evidence synthesis. If the score is low but you still want to proceed, own that decision explicitly. Do not paper over weak evidence with optimism." },
  { icon:"▦", title:"Exec Review · Stage 3", step:"Stage 3 · Exec Review", color:"#D4A843",
    what:"Stage 3 prepares the initiative for leadership investment decision. AI generates a full executive brief and one-pager from all evidence captured in Discovery.",
    tasks:["Open the initiative in Exec Review stage","Click 'Generate Executive Brief' — AI drafts the full brief from all evidence","Click 'Generate One-Pager' — AI creates the shareable summary","Add stakeholder notes (CFO concern, CTO risk flag, CPO endorsement)","Check 'Approved for Investment' once the decision is made — this unlocks Portfolio sequencing"],
    tip:"Never send the raw AI brief to leadership. Read it, refine it, add the organizational context AI cannot know. The AI brief is a 90% first draft — you provide the final 10% that makes it defensible in the room." },
  { icon:"△", title:"Portfolio Sequencing · Stage 4", step:"Stage 4 · Portfolio", color:"#F59E0B",
    what:"Portfolio is where approved initiatives are sequenced against team capacity using WSJF (Weighted Shortest Job First). The Approved $ column is editable inline — enter the approved investment amount and it auto-calculates Approved Investment by Quarter.",
    tasks:["Navigate to Portfolio view to see all approved initiatives","Review WSJF scores: Business Value + Time Criticality + Risk Reduction ÷ Effort","Click the Approved $ field to enter the approved investment amount — it persists immediately","Review the Approved Investment by Quarter tiles below the table","Use AI portfolio analysis to identify conflicts, dependencies, and capacity gaps","Adjust effort estimates as engineering sharpens scope"],
    tip:"WSJF is a forcing function, not a final answer. High-WSJF items with dependency blockers should still be flagged. AI will surface those conflicts. The Approved $ field drives your quarterly budget accountability." },
  { icon:"◉", title:"Product Definition · Stage 5", step:"Stage 5 · Definition", color:"#9333EA",
    what:"Definition is where the initiative becomes a product. AI generates personas, journey maps, JTBD, use cases, and acceptance criteria — all editable and persisted.",
    tasks:["Navigate to the Delivery Handoff view and select your initiative","Generate Personas — AI creates 2–3 user personas from interview evidence","Click ✏ Edit to refine any generated artifact — saves automatically","Generate Current and Future Journey Maps (editable separately)","Generate Jobs To Be Done statements","Generate Use Cases from the opportunity statement","All artifacts show green in the sidebar nav when complete — track completion with Go/No-Go checklist"],
    tip:"Definition artifacts are the contract between Product and Engineering. Sloppy personas lead to scope creep. Vague acceptance criteria lead to rework. Take the time here — it is the cheapest place in the lifecycle to change your mind." },
  { icon:"⊕", title:"Delivery & Sprints · Stage 6", step:"Stage 6 · Delivery + Sprints", color:"#0891B2",
    what:"Stage 6 has two views: Delivery Handoff (artifact assembly) and Sprints (sprint execution). Epics and Stories feed directly into Sprint tickets — Given/When/Then AC pre-populates automatically from the epics text.",
    tasks:["In Delivery Handoff: Generate Epics & Stories — AI creates epics from use cases, stories from epics","Each story automatically gets Given/When/Then AC from the epics text — expand any Sprint card to see it","On the Epics tab: track Jira ticket numbers per epic and story — checkbox when in Jira","Generate Risk Register using ROAM framework","In Sprints view: stories appear in Backlog — drag to Sprint 1, 2, 3, etc.","Expand any story card to edit AC, add Dev Notes, and apply Labels (Bug, Feature, Tech Debt, P0, etc.)","Add custom labels per story — persist across sessions"],
    tip:"The AC in Sprint cards comes directly from the Epics text. If Given/When/Then is missing, go back to the Epics & Stories section and add it to the raw text — it will pre-populate on next load." },
  { icon:"◎", title:"Delivery Handoff · Stage 7", step:"Stage 7 · Handoff", color:"#2E6DA4",
    what:"Handoff assembles every artifact from the lifecycle into a single engineering-ready package. The Go/No-Go checklist confirms all 14 required artifacts are complete before sprint work begins.",
    tasks:["Navigate to Delivery Handoff from the sidebar","Select an initiative — review the section nav (green = complete, grey = missing)","Generate and edit PRD — click ↓ Word Doc to export a formatted .docx with cover, meta block, and navy branding","Generate Telemetry Readiness plan and Test Cases — both required for Go/No-Go","Review the Go/No-Go checklist at the bottom — all 14 required items must be green","Generate Quarterly Planning package (Sprints + PI objectives)","Check 'Approved' once leadership sign-off is received"],
    tip:"A complete handoff package is a rare thing. PGI Stage 7 makes gaps visible before they become sprint blockers. Every red item in Go/No-Go is a conversation to have before engineering starts." },
  { icon:"◆", title:"Campaign Launch · Stage 8", step:"Stage 8 · Campaign Launch", color:"#F59E0B",
    what:"Stage 8 is the GTM execution layer. Plan your launch calendar, generate 30-day channel content, and track campaign milestones — all linked to the initiative record.",
    tasks:["Navigate to Campaign Launch from the sidebar (Stage 8)","Enter Target Metric and Target in the context bar — these save immediately to the initiative","Add launch milestones to the Launch Calendar (date, type, owner)","Click ↺ Sync Dates from Roadmap on the GTM page to auto-populate milestone dates","Select a channel tab (LinkedIn, Twitter/X, Email, Blog, Press Release)","Click ◆ Generate [Channel] to create 30-day content — editable after generation","Use ◆ Generate All Channels to produce all five in sequence"],
    tip:"Generate channel content after the GTM positioning and ICP are set on the GTM Strategy page (Stage 7). Content generated without positioning context will be generic — positioning context makes it sharp." },
  { icon:"◎", title:"Measure · Stage 9", step:"Stage 9 · Measure", color:"#F59E0B",
    what:"Stage 9 captures what actually happened post-launch. Track all KPIs with editable weekly trends and AI-powered insight analysis.",
    tasks:["Navigate to Stage 9 · Measure","Select the initiative — PGI auto-selects the one with launch data","Set the Launch Date and Target Met toggle","Edit KPI cards: Adoption Rate, MAU, DAU, Feature Utilization, NPS, CSAT, Call Deflection, Revenue, Cost Savings","Add customer verbatims — direct quotes from users, positive and negative","Add weekly data rows to build trend sparklines over time","Click ◆ AI Measure Insights for adoption gap analysis and 30-day recommendations","Capture PM Notes — context AI cannot know (pilot scope, known bugs, rollout delays)"],
    tip:"Adoption Rate is the north star at Stage 9. Below 20% means stop pushing features and understand why users are not activating. AI Insights will surface the gap analysis — but verbatims give it signal." },
  { icon:"📋", title:"Lessons Learned · Stage 10", step:"Stage 10 · Lessons Learned", color:"#D4A843",
    what:"Stage 10 is the team retrospective layer. AI generates cross-portfolio lessons from all initiative outcomes, OKR achievement, and PM notes — surfacing patterns invisible at the individual initiative level.",
    tasks:["Navigate to Lessons Learned from the sidebar","Review the AI-generated retrospective — cross-portfolio OKR analysis and initiative outcomes","Read the Pattern Recognition section — recurring themes across initiatives","Review the AI Next Initiative Recommendations — high-leverage ideas based on OKR gaps","Save individual initiative lessons in the Outcome Summary (Stage 11) Lessons Learned field","Share the retrospective with your leadership team before the next planning cycle"],
    tip:"The Lessons Learned section is the most undervalued field in product management. Three honest lessons from one initiative are worth more than a hundred post-launch decks. Write them while the memory is fresh." },
  { icon:"◆", title:"Outcome Summary · Stage 11", step:"Stage 11 · Outcome Summary", color:"#D4A843",
    what:"Stage 11 closes the loop on the entire initiative lifecycle. Enter actuals, assess OKR achievement, and generate the executive narrative.",
    tasks:["Navigate to Stage 11 · Outcome Summary","Select the initiative","Enter actuals in the Final Outcome Metrics section — all 8 fields are editable (Adoption %, MAU, NPS, CSAT, Call Deflection, Revenue, Cost Savings, Launch Date)","Set Target Met: YES or NOT YET","Review PIVOT™ Predicted vs Actual — did we call it right at investment approval?","Check OKR Achievement (reads from Foundation OKRs — must be linked on the initiative)","Write Lessons Learned — what would you tell the next team?","Choose Next Action: Iterate, Expand, Sunset, or Archive","Click ◆ Generate Executive Outcome Narrative — AI writes the board-ready 400-word summary"],
    tip:"The OKR Achievement section requires the initiative to be linked to an OKR on the Initiative Detail page. If it shows 'No OKR linked', go to the initiative and select the OKR from the dropdown." },
  { icon:"◆", title:"Working with Your Advisor", step:"Always Available", color:"#D4A843",
    what:"Your Product Growth Intelligence Advisor is your always-on partner with full context of your pipeline — foundation, all initiatives, all stages, scores, evidence, epics, and measurement data.",
    tasks:["Click the gold ◆ button in the bottom-right corner to open your Advisor","Ask about your portfolio: 'What is my weakest initiative by PIVOT score?'","Ask about gaps: 'Which initiatives are missing telemetry plans?'","Ask about sequencing: 'What should go into the next quarter?'","Ask about outcomes: 'How did our approved initiatives perform vs their PIVOT predictions?'","Ask about risk: 'Where are we most exposed this quarter?'","Use the quick prompts at the bottom of the Advisor panel for common PM tasks"],
    tip:"The best questions are the ones you have not asked yet. Start with: 'What am I missing?' — your Advisor will surface the blindspots in your pipeline that you are too close to see." },
];

export function RefGuide({ setView }) {
  const [activeSection, setActiveSection] = useState(0);
  const s = GUIDE_SECTIONS[activeSection];

  return (
    <div>
      <div style={css.h2}>How To Use PGI</div>
      <div style={css.sub}>A stage-by-stage walkthrough for product leaders — 11 sections · Foundation through Outcome Summary</div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        <div style={{ ...css.card, padding: "12px 0", alignSelf: "start", position: "sticky", top: 70 }}>
          {GUIDE_SECTIONS.map((sec, i) => (
            <button key={i} onClick={() => setActiveSection(i)}
              style={{ width: "100%", textAlign: "left", padding: "9px 16px", background: i === activeSection ? T.goldD : "transparent", border: "none", borderLeft: `3px solid ${i === activeSection ? T.gold : "transparent"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: i === activeSection ? T.gold : T.muted }}>{sec.icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: i === activeSection ? 700 : 400, color: i === activeSection ? T.gold : T.loud }}>{sec.title}</div>
                <div style={{ fontSize: 9, color: T.muted, marginTop: 1 }}>{sec.step}</div>
              </div>
            </button>
          ))}
        </div>

        <div>
          <div style={{ ...css.card, borderLeft: `4px solid ${s.color}`, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(212,168,67,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: s.color, textTransform: "uppercase", marginBottom: 3 }}>{s.step}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.white, letterSpacing: "-0.02em" }}>{s.title}</div>
              </div>
            </div>
            <div style={{ fontSize: 14, color: T.body, lineHeight: 1.75 }}>{s.what}</div>
          </div>

          <div style={css.card}>
            <div style={css.secHead}>Step-by-Step</div>
            {s.tasks.map((task, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "9px 0", borderBottom: i < s.tasks.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.ink3, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: T.gold, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: T.loud, lineHeight: 1.6 }}>{task}</div>
              </div>
            ))}
          </div>

          <AIBox label="◆ PGI Advisor Tip">{s.tip}</AIBox>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <button style={{ ...css.btnGhost, opacity: activeSection === 0 ? 0.3 : 1 }} onClick={() => setActiveSection(a => Math.max(0, a - 1))} disabled={activeSection === 0}>← Previous</button>
            {activeSection < GUIDE_SECTIONS.length - 1
              ? <button style={css.btnGold} onClick={() => setActiveSection(a => a + 1)}>Next: {GUIDE_SECTIONS[activeSection + 1].title} →</button>
              : <button style={css.btnGold} onClick={() => setView("foundation")}>Get Started in Foundation →</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Score Methodology ────────────────────────────────────────
const SCORE_SECTIONS = [
  {
    title: "PIVOT Score™",
    color: T.gold,
    formula: "PIVOT = (P × 0.25) + (I × 0.20) + (V × 0.15) + (O × 0.20) + (T × 0.20)",
    description: "The pre-investment scoring model used at Stage 3 (Exec Review). Each dimension is scored 0–5 by the PM, multiplied by 4 to convert to a 0–20 point range, then weighted and summed to a 0–100 composite.",
    dimensions: [
      { key: "P", name: "Potential", weight: "25%", points: "0–20", description: "Strategic alignment, market size, and long-term upside. A score of 5 = directly tied to a primary OKR with a large addressable market. A score of 1 = tangential to strategy, niche impact." },
      { key: "I", name: "Innovation", weight: "20%", points: "0–20", description: "Competitive differentiation and novelty of the solution. A score of 5 = unique capability no competitor has. A score of 1 = table stakes feature, competitors already have it." },
      { key: "V", name: "Value", weight: "15%", points: "0–20", description: "Strength of evidence that customers actually want this. A score of 5 = confirmed by 10+ interviews, supported by CSAT data, explicit ask in roadmap surveys. A score of 1 = internal hypothesis only." },
      { key: "O", name: "Opportunity", weight: "20%", points: "0–20", description: "Revenue potential, cost savings, and competitive displacement opportunity. A score of 5 = quantified $1M+ revenue impact or major churn risk reduction. A score of 1 = qualitative benefit only." },
      { key: "T", name: "Timing", weight: "20%", points: "0–20", description: "Urgency: regulatory deadline, market window, competitive response, or customer contractual commitment. A score of 5 = must ship this quarter or we lose. A score of 1 = no time pressure." },
    ],
    tiers: [
      { range: "80–100", label: "COMMIT", color: T.green, desc: "Strong investment case. Prioritize now." },
      { range: "60–79", label: "CONSIDER", color: T.amber, desc: "Good but not urgent. Queue for next cycle." },
      { range: "40–59", label: "DEFER", color: T.muted, desc: "Weak case. Revisit with more evidence." },
      { range: "0–39", label: "KILL", color: T.red, desc: "Insufficient justification. Do not invest." },
    ],
  },
  {
    title: "WSJF — Portfolio Sequencing",
    color: T.amber,
    formula: "WSJF = (Business Value + Time Criticality + Risk Reduction) ÷ Job Size (Effort)",
    description: "Used at Stage 4 (Portfolio) to sequence approved initiatives. Higher WSJF = do sooner. Dividing by effort means a smaller initiative with equal value always ranks ahead of a larger one. Each input is scored 1–8 on the Fibonacci scale (1, 2, 3, 5, 8) relative to other initiatives in the portfolio.",
    dimensions: [
      { key: "BV", name: "Business Value", weight: "~33%", points: "1–8", description: "Economic benefit: revenue generated, cost reduced, churn prevented, compliance satisfied. Score relative to other initiatives — if this is the highest-value item in the portfolio, it gets an 8." },
      { key: "TC", name: "Time Criticality", weight: "~33%", points: "1–8", description: "How much value decays over time if delayed. Regulatory deadlines and competitive windows score highest. A feature with no time pressure scores 1." },
      { key: "RR", name: "Risk Reduction", weight: "~33%", points: "1–8", description: "How much this reduces technical debt, compliance risk, or business continuity exposure. High-risk platform debt that blocks other initiatives scores highest." },
      { key: "JS", name: "Job Size (Effort)", weight: "Divisor", points: "1–8", description: "Engineering effort in story points or sprint weeks, normalized to the Fibonacci scale. Larger = lower WSJF. A 3-sprint initiative scores lower effort (smaller number) than a 12-sprint program." },
    ],
    tiers: null,
  },
  {
    title: "Competitive Scoring Model",
    color: T.steel,
    formula: "Threat Score = PM-assessed 0–100 across 5 dimensions. App Store ★ is the only externally sourced data point.",
    description: "Used on the Competitive Analysis tab. All scores except App Store rating are PM-assessed — not sourced from third parties. Scores reflect the PM's professional judgment of a competitor's capability maturity relative to industry best practice, using publicly available product information, user reviews, and market research.",
    dimensions: [
      { key: "OV", name: "Overall Score", weight: "Summary", points: "0–100", description: "Composite PM judgment of the competitor's overall digital product maturity. Consider: breadth of self-service features, digital NPS signals from public reviews, app quality, and speed of product iteration." },
      { key: "DG", name: "Digital Score", weight: "Dimension", points: "0–100", description: "Quality of web experience — account management, quoting, policy management, and digital servicing. Based on: public product reviews, competitor website audit, and industry digital benchmarking reports." },
      { key: "MB", name: "Mobile Score", weight: "Dimension", points: "0–100", description: "Quality and completeness of the mobile app experience. Based on: App Store / Play Store feature lists, user reviews (NOT the star rating), and PM product analysis. The App Store ★ field separately captures the public star rating from iOS/Android listings." },
      { key: "CL", name: "Claims Score", weight: "Dimension", points: "0–100", description: "Digital maturity of the claims experience: FNOL, status tracking, repair shop, and settlement. Based on: public claims process documentation, JD Power claims satisfaction data, and app review analysis of claims-specific feedback." },
      { key: "PT", name: "Portal Score", weight: "Dimension", points: "0–100", description: "Self-service portal capability for policy changes, payments, documents, and agent contact. Based on: competitor portal demos, product review sites, and customer review analysis for portal-specific complaints." },
    ],
    tiers: [
      { range: "85–100", label: "High Threat", color: T.red, desc: "Competitor is ahead of you. Closing gap is urgent." },
      { range: "70–84", label: "Moderate", color: T.amber, desc: "Competitive. Monitor and match key capabilities." },
      { range: "0–69", label: "Gap Opportunity", color: T.green, desc: "You can differentiate here. Exploit the gap." },
    ],
  },
  {
    title: "Outcome Composite Score (Stage 9)",
    color: T.teal,
    formula: "Actual Outcome = ((Adoption Score + NPS Score + Biz Score) ÷ 3) × 20",
    description: "A post-launch composite used in Stage 9 to compare against the PIVOT predicted score. This measures whether the initiative delivered at the level the PM predicted before investment was approved.",
    dimensions: [
      { key: "AD", name: "Adoption Score", weight: "33%", points: "0–5", description: "Derived from Adoption Rate: min(5, adoption_rate ÷ 8). A 40% adoption rate = score of 5 (maximum). A 20% adoption rate = score of 2.5. Reflects whether the feature is actually being used by the target audience." },
      { key: "NP", name: "NPS Score", weight: "33%", points: "0–5", description: "Derived from NPS: min(5, (nps_score + 100) ÷ 40). An NPS of 60 = score of 4. An NPS of 0 (neutral) = score of 2.5. Reflects customer sentiment about the delivered experience." },
      { key: "BZ", name: "Business Score", weight: "33%", points: "0–5", description: "Binary: 5 if Target Met = Yes, 2.5 if Target Met = No. Reflects whether the initiative achieved its committed business outcome (revenue, cost savings, NPS target, deflection target)." },
    ],
    tiers: [
      { range: "Delta ≥ 0", label: "Outperformed", color: T.green, desc: "Initiative exceeded its pre-investment prediction." },
      { range: "Delta < 0", label: "Underperformed", color: T.red, desc: "Initiative fell short of pre-investment prediction. Key input for Lessons Learned." },
    ],
  },
];

export function ScoreMath({ setView }) {
  const [activeSection, setActiveSection] = useState(0);
  const s = SCORE_SECTIONS[activeSection];

  return (
    <div>
      <div style={css.h2}>Score Methodology</div>
      <div style={css.sub}>The exact math behind every score in PGI — PIVOT™, WSJF, Competitive Model, and Outcome Composite</div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        {/* Nav */}
        <div style={{ ...css.card, padding: "12px 0", alignSelf: "start", position: "sticky", top: 70 }}>
          {SCORE_SECTIONS.map((sec, i) => (
            <button key={i} onClick={() => setActiveSection(i)}
              style={{ width: "100%", textAlign: "left", padding: "9px 16px", background: i === activeSection ? T.goldD : "transparent", border: "none", borderLeft: `3px solid ${i === activeSection ? sec.color : "transparent"}`, cursor: "pointer" }}>
              <div style={{ fontSize: 11, fontWeight: i === activeSection ? 700 : 400, color: i === activeSection ? T.gold : T.loud }}>{sec.title}</div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {/* Formula card */}
          <div style={{ ...css.card, borderLeft: `4px solid ${s.color}`, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Formula</div>
            <div style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: T.loud, background: T.ink3, padding: "10px 14px", borderRadius: 6, marginBottom: 12 }}>{s.formula}</div>
            <div style={{ fontSize: 13, color: T.body, lineHeight: 1.7 }}>{s.description}</div>
          </div>

          {/* Dimensions */}
          <div style={css.card}>
            <div style={css.secHead}>Dimensions</div>
            {s.dimensions.map((d, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "44px 140px 60px 1fr", gap: 12, padding: "10px 0", borderBottom: i < s.dimensions.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: s.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: s.color }}>{d.key}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.loud }}>{d.name}</div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>Weight: {d.weight}</div>
                </div>
                <div style={{ fontSize: 11, color: T.gold, fontWeight: 700 }}>{d.points}</div>
                <div style={{ fontSize: 12, color: T.body, lineHeight: 1.6 }}>{d.description}</div>
              </div>
            ))}
          </div>

          {/* Tiers */}
          {s.tiers && (
            <div style={{ ...css.card, marginTop: 16 }}>
              <div style={css.secHead}>Investment Tiers / Thresholds</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {s.tiers.map((tier, i) => (
                  <div key={i} style={{ background: tier.color + "18", border: `1px solid ${tier.color}40`, borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: tier.color, marginBottom: 4 }}>{tier.label}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>{tier.range}</div>
                    <div style={{ fontSize: 11, color: T.body }}>{tier.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
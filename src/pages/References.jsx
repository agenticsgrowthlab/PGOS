import { useState } from "react";
import { T, css } from "../lib/tokens";
import { AIBox } from "../components/ui";

// ─── Framework Deck ───────────────────────────────────────────
const SLIDES = [
  { num:"01", title:"The Problem", color:T.red,
    content:"Product leaders operate across six fragmented disciplines with no unified operating system. Strategy lives in decks. Discovery in Jira. Portfolio in spreadsheets. The result: misaligned investment, late pivots, and value that never reaches customers.",
    stat:"73% of product initiatives never reach intended business outcomes" },
  { num:"02", title:"Introducing PGOS", color:T.gold,
    content:"The Product Growth Operating System is a six-pillar framework that connects every product decision — from strategy through customer outcomes — in a single, traceable lineage. Built for senior product leaders who need to defend investment, align stakeholders, and accelerate growth.",
    stat:"Mission → Strategy → Initiative → Story → Outcome" },
  { num:"03", title:"Six Pillars", color:T.steel,
    content:"Strategic Growth defines what you are trying to achieve. Market Intelligence identifies what the market demands. Investment Intelligence governs what to build and why. Value Delivery ensures execution with discipline. Growth Intelligence measures what actually moved. Growth Leadership builds the culture that sustains it.",
    stat:"6 pillars · 7 workspaces · 1 unified lineage" },
  { num:"04", title:"Investment Intelligence", color:T.purple,
    content:"The seven-step lifecycle that governs every product investment from raw idea to business outcome. Ideas are captured, scored, reviewed, sequenced in portfolio, defined, delivered, and handed off — with AI assisting at every stage.",
    stat:"7-Step Lifecycle: Capture → PIVOT → Review → Portfolio → Define → Deliver → Handoff" },
  { num:"05", title:"PIVOT Score™", color:T.gold,
    content:"The structured scoring model at Stage 3 of the Investment Intelligence lifecycle. Five dimensions: Potential (25%), Innovation (20%), Value (15%), Opportunity (20%), Timing (20%). Scores map to four investment tiers: Commit · Consider · Defer · Kill.",
    stat:"Score 0–100 · Replaces gut feel with evidence-based investment decisions" },
  { num:"06", title:"Seven Workspaces", color:T.teal,
    content:"Each workspace answers a single product leadership question. Strategy: What are we trying to achieve? Intelligence: What does the market demand? Discovery: What should we invest in? Portfolio: How is capital performing? Definition: What are we building? Delivery: Is value reaching customers? Outcomes: Did it grow the business?",
    stat:"One question per workspace · Zero cognitive overload" },
  { num:"07", title:"AI-Augmented at Every Stage", color:T.ice,
    content:"PGOS embeds AI coaching throughout the lifecycle — not as a chatbot, but as a stage-aware advisor. AI generates executive briefs, surfaces evidence gaps, writes personas and journey maps, creates epics and stories, builds the risk register, and assembles the full engineering handoff package.",
    stat:"◆ Chatty — your always-on PGOS advisor with full pipeline context" },
  { num:"08", title:"Foundation Layer", color:T.green,
    content:"Every investment traces back to the Foundation: Mission, Vision, Values, OKRs, Strategic Themes, Business Capabilities, and Products. This lineage ensures every initiative can be defended to the board with a clear thread from strategic intent to delivery outcome.",
    stat:"Architecture: Mission → Theme → OKR → Capability → Initiative → Story → Outcome" },
  { num:"09", title:"Who It's For", color:T.amber,
    content:"PGOS is built for CPOs, VPs of Product, and Principal PMs who own investment decisions across portfolios. It replaces the patchwork of spreadsheets, decks, and disconnected tools with a single operating surface that creates alignment and accountability from idea to outcome.",
    stat:"For product leaders who need to defend every dollar of product investment" },
  { num:"10", title:"Start Here", color:T.gold,
    content:"Begin in Foundation — establish your Mission, OKRs, and Strategic Themes. Capture your first Idea and advance it through the 7-stage pipeline. Every stage has an AI coach ready to generate artifacts, challenge assumptions, and surface what you are missing.",
    stat:"Foundation → Ideas → Discovery → Exec Review → Portfolio → Definition → Delivery → Handoff" },
];

export function RefFramework({ setView }) {
  const [active, setActive] = useState(0);
  const slide = SLIDES[active];

  return (
    <div>
      <div style={css.h2}>PGOS Framework Deck</div>
      <div style={css.sub}>Core concepts, pillars, and operating model — 10 slides · Built for executive alignment</div>

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
        <button style={css.btnOut} onClick={() => setView("ref_guide")}>Next: How To Use PGOS →</button>
      </div>
    </div>
  );
}

// ─── How To Use PGOS ─────────────────────────────────────────
const GUIDE_SECTIONS = [
  { icon:"⊞", title:"Start with Foundation", step:"Step 1 of 7", color:T.green,
    what:"Before anything else, anchor the platform in your organization's strategic context. Foundation is the bedrock that every initiative traces back to.",
    tasks:["Enter your Mission and Vision statements","Add your OKRs — use AI to suggest Key Results if you are starting fresh","Define your Strategic Themes (the big bets this cycle)","Map your Business Capabilities (what your platform can do today)","Add your Products with their current stage","Optionally upload architecture diagrams — AI extracts system components"],
    tip:"Foundation is not a one-time task. Return here each planning cycle to update OKRs and Themes. Every initiative will be linked back to these — so the quality of your Foundation determines the quality of your investment rationale." },
  { icon:"◇", title:"Capture Ideas (Stage 1)", step:"Stage 1 · Ideas", color:T.muted,
    what:"Every product initiative starts as an idea. PGOS captures ideas from 8 sources and immediately links them to your Foundation.",
    tasks:["Click '+ New Idea' in the Ideas view","Select the source type (Executive Idea, Customer Request, Regulatory, etc.)","Describe the problem you are trying to solve — be specific","AI will ask 3–5 clarifying questions to sharpen the problem statement","Link to an OKR, Strategic Theme, and Business Capability","Save — the idea enters Stage 1 and appears in your pipeline"],
    tip:"The problem statement is everything at this stage. Do not describe the solution — describe the pain. A precise problem statement at Stage 1 saves weeks of rework at Stage 5." },
  { icon:"◈", title:"Run Discovery (Stage 2)", step:"Stage 2 · Discovery", color:T.ice,
    what:"Discovery is where you validate the idea with evidence before investing leadership attention.",
    tasks:["Open an Idea and advance it to Discovery","Enter evidence: customer interviews, revenue opportunity, cost savings, competitive context","Adjust the PIVOT sliders — P(25%) I(20%) V(15%) O(20%) T(20%)","Enter investment request and engineering estimate","Use the AI Discovery Coach to surface evidence gaps","When evidence is solid, advance to Exec Review"],
    tip:"PIVOT Score™ is never a committee vote — it is your evidence synthesis. If the score is low but you still want to proceed, that is a decision to own explicitly — not to paper over." },
  { icon:"▦", title:"Exec Review (Stage 3)", step:"Stage 3 · Exec Review", color:T.gold,
    what:"Stage 3 prepares the initiative for leadership investment decision. AI generates a full executive brief and one-pager.",
    tasks:["Open the initiative in Exec Review stage","Click 'Generate Executive Brief' — AI drafts the full brief from all evidence","Click 'Generate One-Pager' — AI creates the shareable summary","Add stakeholder notes (CFO concern, CTO risk flag, CPO endorsement)","Track version history as the brief evolves","Check 'Approved for Investment' once the decision is made"],
    tip:"Never send the raw AI brief to leadership. Read it, refine it, add the organizational context AI cannot know. The AI brief is a 90% first draft — you provide the final 10% that makes it defensible in the room." },
  { icon:"△", title:"Portfolio Sequencing (Stage 4)", step:"Stage 4 · Portfolio", color:T.amber,
    what:"Portfolio is where approved initiatives are sequenced against team capacity using WSJF (Weighted Shortest Job First).",
    tasks:["Navigate to Portfolio view to see all approved initiatives","Review WSJF scores: Business Value + Time Criticality + Risk Reduction ÷ Effort","Use AI portfolio analysis to identify conflicts, dependencies, and capacity gaps","Read the PI Recommendations","Adjust effort estimates as engineering sharpens scope"],
    tip:"WSJF is a forcing function, not a final answer. High-WSJF items that have dependency blockers should still be flagged. AI will surface those conflicts for you." },
  { icon:"◉", title:"Product Definition (Stage 5)", step:"Stage 5 · Definition", color:T.purple,
    what:"Definition is where the initiative becomes a product. AI generates personas, journey maps, JTBD, use cases, and acceptance criteria.",
    tasks:["Navigate to the Definition tab on an approved initiative","Generate Personas — AI creates 2–3 user personas from interview evidence","Generate Current and Future Journey Maps","Generate Jobs To Be Done statements","Generate Use Cases from the opportunity statement","Edit everything — AI is your first draft, not your final word"],
    tip:"Definition artifacts are the contract between Product and Engineering. Sloppy personas lead to scope creep. Vague acceptance criteria lead to rework. Take the time here — it is the cheapest place in the lifecycle to change your mind." },
  { icon:"⊕", title:"Delivery Planning (Stage 6)", step:"Stage 6 · Delivery", color:T.teal,
    what:"Delivery translates Definition artifacts into an engineering-ready package. AI generates epics, stories, risk register, and PI planning package.",
    tasks:["Navigate to the Epics & Stories tab","Generate Epics — one per use case from Definition","Generate User Stories for each epic","Navigate to the Risks tab — Generate Risk Register using ROAM framework","Advance to PI Planning to generate the full increment package","Review the Roadmap Timeline"],
    tip:"The user stories AI generates are starting points. Engineers will split, spike, and resize them. What matters is that every story traces to an epic, every epic to a use case, every use case to a persona and JTBD." },
  { icon:"⊞", title:"Engineering Handoff (Stage 7)", step:"Stage 7 · Handoff", color:T.steel,
    what:"Handoff is the final stage. AI assembles every artifact from the lifecycle into a single engineering handoff package.",
    tasks:["Navigate to Handoff from the sidebar","Select an initiative to review its completeness score","Review any flagged gaps","Click 'Generate Handoff Package' — AI compiles everything","Share the package with Engineering leads before sprint kickoff"],
    tip:"A complete handoff package is a rare thing. PGOS Stage 7 makes gaps visible before they become sprint blockers. Treat every red flag in the completeness checker as a conversation to have before work begins." },
  { icon:"◆", title:"Working with Chatty", step:"Always Available", color:T.gold,
    what:"Chatty is your always-on PGOS advisor with full context of your pipeline — foundation, all initiatives, their stages, scores, and evidence.",
    tasks:["Click the gold ◆ button in the bottom-right corner to open Chatty","Ask about dependencies: 'Which initiatives have overlapping capabilities?'","Ask about sequencing: 'What should go into the next PI?'","Ask about evidence gaps: 'What is INI-002 missing before Exec Review?'","Ask about risk: 'Where are we most exposed this quarter?'","Ask anything — Chatty has your full PGOS context"],
    tip:"The best Chatty questions are the ones you have not asked yet. Start with: 'What am I missing?' — Chatty will surface the blindspots in your pipeline that you are too close to see." },
];

export function RefGuide({ setView }) {
  const [activeSection, setActiveSection] = useState(0);
  const s = GUIDE_SECTIONS[activeSection];

  return (
    <div>
      <div style={css.h2}>How To Use PGOS</div>
      <div style={css.sub}>A stage-by-stage walkthrough for product leaders — 9 sections · From Foundation to Handoff</div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        {/* Section nav */}
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

        {/* Content */}
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

          <AIBox label="◆ PGOS Advisor Tip">{s.tip}</AIBox>

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

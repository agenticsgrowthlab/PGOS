import { useState, useRef } from "react";
import { AppProvider, useApp } from "./contexts/AppContext";
import { Sidebar } from "./components/layout/Sidebar";
import InvestmentContract from "./pages/InvestmentContract";
import { LoadingScreen, ErrorScreen } from "./components/ui";
import { Dashboard } from "./pages/Dashboard";
import { Foundation } from "./pages/Foundation";
import { Ideas, InitiativeDetail } from "./pages/InitiativeDetail";
import { Portfolio, PIPlanning, Handoff, StageList, Chatty, SprintGoals, LessonsLearned, ThoughtLeadership } from "./pages/Portfolio";
import Measure from "./pages/Measure";
import OutcomeSummary from "./pages/OutcomeSummary";
import GTM from "./pages/GTM";
import CampaignLaunch from "./pages/CampaignLaunch";
import { RefFramework, RefGuide, ScoreMath } from "./pages/References";
import { T, css, stageLabel, stageColor } from "./lib/tokens";

// ─── PPT Download Button ─────────────────────────────────────
function DownloadPPTBtn({ page, label, gold }) {
  const [loading, setLoading] = useState(false);

  // Map view names to ppt page keys
  const PAGE_KEY_MAP = {
    dashboard: "dashboard", foundation: "foundation",
    ideas: "ideas", discovery: "discovery", execreview: "execreview",
    portfolio: "portfolio", definition: "definition",
    investment_contract: "investment_contract",
    roadmap: "roadmap", delivery: "delivery", handoff: "handoff",
    sprint_goals: "sprint_goals",
    gtm: "gtm", campaign_launch: "campaign_launch",
    measure: "measure", measure_data: "measure_data",
    outcome: "outcome", lessons: null,
    ref_framework: null, ref_guide: null, chatty_note: null,
    thought_leadership: null, ncm_framework: null,
    leadership: "leadership",
  };

  async function download() {
    const pageKey = PAGE_KEY_MAP[page] ?? (page.startsWith("initiative_") ? null : page);
    if (!pageKey) return; // no PPT for this view
    setLoading(true);
    try {
      const res = await fetch("/api/ppt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: pageKey }),
      });
      if (!res.ok) { console.error("PPT error", await res.text()); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PGI_${pageKey}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PPT download error", err);
    } finally {
      setLoading(false);
    }
  }

  const noExport = ["ref_framework", "ref_guide", "chatty_note"].includes(page) || page.startsWith("initiative_");
  if (noExport && !gold) return null;

  return (
    <button
      onClick={download}
      disabled={loading}
      style={{
        fontSize: 11, padding: "5px 12px", borderRadius: 6,
        background: gold ? T.gold : "transparent",
        border: `1px solid ${gold ? T.gold : T.border}`,
        color: gold ? T.ink : T.muted,
        cursor: loading ? "default" : "pointer",
        fontWeight: gold ? 700 : 400,
        opacity: loading ? 0.6 : 1,
        whiteSpace: "nowrap",
      }}>
      {loading ? "Generating…" : label}
    </button>
  );
}

// ─── Floating Guide Panel ────────────────────────────────────
const GUIDE_STEPS = [
  { title: "Welcome to PGI", icon: "◆", body: "Product Growth Intelligence is an 11-stage platform that takes your product from raw idea to measured outcome. Use the sidebar to navigate stages, or follow this guide to explore the key flows." },
  { title: "Stage 1 — New Ideas", icon: "💡", body: "Start here. Enter a text idea, describe it in one sentence and let AI build the full initiative package, ask AI to suggest what to build next from your portfolio, or upload an HTML wireframe and let AI read the UI and infer the initiative." },
  { title: "Stage 2 — Discovery", icon: "🔍", body: "Validate your idea. Generate AI-powered personas, journey maps, JTBD statements, use cases, and risk registers. Every section is editable and persisted. Evidence scores track how well-validated each initiative is." },
  { title: "Stage 3 — Portfolio Review", icon: "📊", body: "See all initiatives scored by PIVOT — a 5-dimension framework measuring Product-Market Fit, Impact, Viability, Organizational Readiness, and Time-to-Value. Click the PIVOT score on any initiative to see the full scoring breakdown." },
  { title: "Stage 4 — Roadmap & Investment", icon: "🗺", body: "Plan quarters, assign investment, and generate a Delivery Readiness contract. Approved $ amounts are editable directly in the portfolio table and feed quarterly totals automatically." },
  { title: "Stage 6 — Sprints", icon: "⚡", body: "Your AI-generated epics and user stories appear as cards in the backlog. Drag stories into Sprint 1, 2, or 3. Expand any card to see full acceptance criteria. Use ✕ to remove orphan or duplicate stories." },
  { title: "Stage 7 — Delivery Handoff", icon: "📋", body: "Generate a full PRD, telemetry plan, test cases, and quarterly PI planning doc. Every section is editable. Click '↓ Word Doc' to export the PRD as a formatted .docx with your branding." },
  { title: "Stage 8 — Campaign Launch", icon: "🚀", body: "Generate GTM content including social posts, email copy, and press releases. Set your target metric and goal directly in the page — they persist to the initiative." },
  { title: "Stage 9–11 — Measure & Learn", icon: "📈", body: "Track adoption %, MAU, NPS, CSAT, and revenue outcomes. Link back to your OKR. Get a PIVOT Predicted vs Actual composite score. Choose to Iterate, Expand, Sunset, or Archive the initiative." },
  { title: "Always Available", icon: "🤖", body: "Chatty C is your AI assistant — click the ◆ button in the bottom right at any time to ask questions about your portfolio, generate content, or get strategic recommendations based on your live data." },
];

function GuidePanel({ onClose }) {
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState({ x: window.innerWidth - 380, y: 80 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const current = GUIDE_STEPS[step];

  const onMouseDown = (e) => {
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };
  const onMouseUp = () => setDragging(false);

  return (
    <div
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ position: "fixed", inset: 0, zIndex: 8888, pointerEvents: dragging ? "all" : "none" }}
    >
      <div
        style={{
          position: "fixed", left: pos.x, top: pos.y, width: 340,
          background: "#0D1726", border: `1px solid ${T.gold}`,
          borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          pointerEvents: "all", userSelect: "none",
        }}
      >
        {/* Drag handle / header */}
        <div
          onMouseDown={onMouseDown}
          style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, cursor: "grab", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: T.gold, fontSize: 14 }}>◆</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em" }}>PGI Guide</span>
            <span style={{ fontSize: 11, color: T.muted }}>Step {step + 1} of {GUIDE_STEPS.length}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>

        {/* Step content */}
        <div style={{ padding: "20px 16px" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>{current.icon}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.loud, marginBottom: 10 }}>{current.title}</div>
          <div style={{ fontSize: 13, color: T.body, lineHeight: 1.7 }}>{current.body}</div>
        </div>

        {/* Progress dots */}
        <div style={{ padding: "0 16px 8px", display: "flex", gap: 4, justifyContent: "center" }}>
          {GUIDE_STEPS.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{ width: 6, height: 6, borderRadius: "50%", background: i === step ? T.gold : T.border, cursor: "pointer", transition: "background 0.2s" }} />
          ))}
        </div>

        {/* Nav buttons */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between" }}>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{ ...css.btnGhost, fontSize: 12, opacity: step === 0 ? 0.3 : 1 }}
          >← Prev</button>
          {step < GUIDE_STEPS.length - 1
            ? <button onClick={() => setStep(s => s + 1)} style={{ ...css.btnGold, fontSize: 12 }}>Next →</button>
            : <button onClick={onClose} style={{ ...css.btnGold, fontSize: 12 }}>Done ✓</button>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Inner App (has context access) ─────────────────────────
function Inner() {
  const { loading, error, initiatives } = useApp();
  const [view, setView] = useState("dashboard");
  const [guideOpen, setGuideOpen] = useState(false);
  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} />;

  const activeIni = view.startsWith("initiative_")
    ? initiatives.find(i => i.id === view.replace("initiative_", ""))
    : null;

  // Stage list mappings
  const STAGE_VIEWS = {};

  const getContent = () => {
    if (view === "dashboard")         return <Dashboard setView={setView} />;
    if (view === "ncm_framework")     return <RefFramework setView={setView} />;
    if (view === "foundation")        return <Foundation />;
    if (view === "ideas")             return <Ideas setView={setView} />;
    if (view === "discovery")         return <StageList stageFilter="discovery" title="Product Discovery · Stage 2" setView={setView} />;
    if (view === "portfolio")         return <Portfolio setView={setView} />;
    if (view === "roadmap")           return <PIPlanning />;
    if (view === "investment_contract") return <InvestmentContract />;
    if (view === "handoff")           return <Handoff />;
    if (view === "sprint_goals")      return <SprintGoals setView={setView} />;
    if (view === "gtm")               return <GTM />;
    if (view === "campaign_launch")   return <CampaignLaunch />;
    if (view === "measure")           return <Measure />;
    if (view === "measure_data")      return <Measure />;
    if (view === "outcome")           return <OutcomeSummary />;
    if (view === "lessons")           return <LessonsLearned setView={setView} />;
    if (view === "thought_leadership") return <ThoughtLeadership />;
    if (view === "ref_framework")     return <RefFramework setView={setView} />;
    if (view === "ref_framework") return <RefFramework setView={setView} />;
    if (view === "ref_guide")    return <RefGuide setView={setView} />;
    if (view === "ref_scores")   return <ScoreMath setView={setView} />;
    if (activeIni)               return <InitiativeDetail ini={activeIni} setView={setView} />;

    if (STAGE_VIEWS[view]) {
      const { filter, title } = STAGE_VIEWS[view];
      return <StageList stageFilter={filter} title={title} setView={setView} />;
    }

    return <Dashboard setView={setView} />;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.ink, fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif", color: T.body, fontSize: 14 }}>

      {/* Sidebar */}
      <Sidebar view={view} setView={setView} />

      {/* Main content */}
      <div style={{ marginLeft: 220, flex: 1, display: "flex", flexDirection: "column", marginTop: 0 }}>
        {/* Top bar */}
        <div style={{ background: T.ink2, borderBottom: `1px solid ${T.border}`, padding: "12px 32px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 40 }}>
          {activeIni && (
            <button style={css.btnGhost} onClick={() => {
              const stageToView = { discovery: "discovery", review: "portfolio", approved: "portfolio", definition: "portfolio", delivery: "delivery", handoff: "handoff" };
              setView(stageToView[activeIni.stage] || "ideas");
            }}>← Back</button>
          )}
          <span style={{ fontSize: 15, fontWeight: 700, color: T.loud }}>
            {activeIni ? activeIni.title : ({
              dashboard: "Dashboard", foundation: "Enterprise Foundation",
              ncm_framework: "NCM Framework",
              ideas: "New Ideas · Stage 1", discovery: "Product Discovery · Stage 2",
              portfolio: "Portfolio Review · Stage 3", roadmap: "Roadmap Planning · Stage 4",
              handoff: "Delivery Handoff · Stage 5", sprint_goals: "Sprints · Stage 6",
              gtm: "GTM Strategy · Stage 7", campaign_launch: "Campaign Launch · Stage 8",
              measure_data: "Measure · Stage 9", measure: "Measure & Learn · Stage 9",
              outcome: "Outcome Summary · Stage 11", lessons: "Lessons Learned · Stage 10",
              investment_contract: "Delivery Readiness",
              thought_leadership: "Thought Leadership",
              ref_guide: "How To Use PGI", ref_scores: "Score Methodology",
            }[view] || view)}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {activeIni && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {["idea", "discovery", "review", "approved", "definition", "delivery", "handoff"].map((s, i) => {
                  const done = ["idea", "discovery", "review", "approved", "definition", "delivery", "handoff"].indexOf(activeIni.stage) >= i;
                  return <div key={s} style={{ width: 8, height: 8, borderRadius: "50%", background: done ? stageColor(s) : T.border }} />;
                })}
              </div>
            )}
            {/* Per-page PPT download */}
            <DownloadPPTBtn page={view} label="↓ PPT" />
            {/* Leadership deck always in header */}
            <DownloadPPTBtn page="leadership" label="↓ Leadership Deck" gold />
          </div>
        </div>

        {/* Guide banner — full width, always visible */}
        <div
          onClick={() => setGuideOpen(o => !o)}
          style={{
            background: guideOpen ? T.goldD : "#0D1726",
            borderBottom: `1px solid ${T.gold}40`,
            padding: "8px 32px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: T.gold, fontSize: 13 }}>◆</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: T.gold, textTransform: "uppercase", letterSpacing: "0.1em" }}>Product Growth Intelligence — Platform Guide</span>
            <span style={{ fontSize: 11, color: T.muted }}>Step-by-step walkthrough of the full 11-stage lifecycle</span>
          </div>
          <span style={{ fontSize: 11, color: T.gold, fontWeight: 700 }}>{guideOpen ? "▲ Close Guide" : "▼ Open Guide"}</span>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: 32, maxWidth: ["sprint_goals","roadmap","campaign_launch"].includes(view) ? 1500 : 960, width: "100%", margin: "0 auto" }}>
          {getContent()}
        </div>
      </div>

      {/* Guide panel */}
      {guideOpen && <GuidePanel onClose={() => setGuideOpen(false)} />}

      {/* Chatty — always available */}
      <Chatty currentView={view} />
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <Inner />
    </AppProvider>
  );
}
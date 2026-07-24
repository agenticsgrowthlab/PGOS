import { useState } from "react";
import { AppProvider, useApp } from "./contexts/AppContext";
import { Sidebar } from "./components/layout/Sidebar";
import { LoadingScreen, ErrorScreen } from "./components/ui";
import { Dashboard } from "./pages/Dashboard";
import { Foundation } from "./pages/Foundation";
import { Ideas, InitiativeDetail } from "./pages/InitiativeDetail";
import { Portfolio, PIPlanning, Handoff, StageList, Chatty } from "./pages/Portfolio";
import Measure from "./pages/Measure";
import OutcomeSummary from "./pages/OutcomeSummary";
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
    delivery: "delivery", handoff: "handoff",
    ref_framework: null, ref_guide: null, chatty_note: null,
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

// ─── Inner App (has context access) ─────────────────────────
function Inner() {
  const { loading, error, initiatives } = useApp();
  const [view, setView] = useState("dashboard");

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} />;

  const activeIni = view.startsWith("initiative_")
    ? initiatives.find(i => i.id === view.replace("initiative_", ""))
    : null;

  // Stage list mappings
  const STAGE_VIEWS = {
    discovery: { filter: "discovery", title: "Discovery" },
    execreview: { filter: "review", title: "Executive Review" },
    definition: { filter: "definition", title: "Product Definition" },
    delivery: { filter: "delivery", title: "Delivery Planning" },
  };

  const getContent = () => {
    if (view === "dashboard")    return <Dashboard setView={setView} />;
    if (view === "foundation")   return <Foundation />;
    if (view === "ideas")        return <Ideas setView={setView} />;
    if (view === "portfolio")    return <Portfolio />;
    if (view === "delivery")     return <PIPlanning />;
    if (view === "handoff")      return <Handoff />;
    if (view === "measure")      return <Measure />;
    if (view === "outcome")      return <OutcomeSummary />;
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
      <div style={{ marginLeft: 220, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div style={{ background: T.ink2, borderBottom: `1px solid ${T.border}`, padding: "12px 32px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 40 }}>
          {activeIni && (
            <button style={css.btnGhost} onClick={() => {
              const stageToView = { discovery: "discovery", review: "execreview", approved: "execreview", definition: "definition", delivery: "delivery", handoff: "handoff" };
              setView(stageToView[activeIni.stage] || "ideas");
            }}>← Back</button>
          )}
          <span style={{ fontSize: 15, fontWeight: 700, color: T.loud }}>
            {activeIni ? activeIni.title : ({
              dashboard: "Dashboard", foundation: "Foundation",
              ideas: "Ideas · Stage 1", discovery: "Discovery · Stage 2",
              execreview: "Executive Review · Stage 3", portfolio: "Portfolio · Stage 4",
              definition: "Product Definition · Stage 5", delivery: "Delivery · Stage 6",
              handoff: "Handoff · Stage 7", measure: "Measure · Stage 8",
              outcome: "Outcome Summary · Stage 9", ref_framework: "NCM PM Framework",
              ref_guide: "How To Use PGI",
              ref_scores: "Score Methodology",
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

        {/* Page content */}
        <div style={{ flex: 1, padding: 32, maxWidth: 960, width: "100%", margin: "0 auto" }}>
          {getContent()}
        </div>
      </div>

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
import { useState } from "react";
import { AppProvider, useApp } from "./contexts/AppContext";
import { Sidebar } from "./components/layout/Sidebar";
import { LoadingScreen, ErrorScreen } from "./components/ui";
import { Dashboard } from "./pages/Dashboard";
import { Foundation } from "./pages/Foundation";
import { Ideas, InitiativeDetail } from "./pages/InitiativeDetail";
import { Portfolio, PIPlanning, Handoff, StageList, Chatty } from "./pages/Portfolio";
import { RefFramework, RefGuide } from "./pages/References";
import { T, css, stageLabel, stageColor } from "./lib/tokens";

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
    if (view === "ref_framework") return <RefFramework setView={setView} />;
    if (view === "ref_guide")    return <RefGuide setView={setView} />;
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
              // Go back to the appropriate stage list
              const stageToView = { discovery: "discovery", review: "execreview", approved: "execreview", definition: "definition", delivery: "delivery", handoff: "handoff" };
              setView(stageToView[activeIni.stage] || "ideas");
            }}>← Back</button>
          )}
          <span style={{ fontSize: 15, fontWeight: 700, color: T.loud }}>
            {activeIni ? activeIni.title : view.charAt(0).toUpperCase() + view.slice(1).replace("_", " ")}
          </span>
          {activeIni && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              {["idea", "discovery", "review", "approved", "definition", "delivery", "handoff"].map((s, i) => {
                const done = ["idea", "discovery", "review", "approved", "definition", "delivery", "handoff"].indexOf(activeIni.stage) >= i;
                return <div key={s} style={{ width: 8, height: 8, borderRadius: "50%", background: done ? stageColor(s) : T.border }} />;
              })}
            </div>
          )}
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

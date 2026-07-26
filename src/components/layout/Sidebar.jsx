import { useState } from "react";
import { T } from "../../lib/tokens";
import { useApp } from "../../contexts/AppContext";
import { bootstrapCompany } from "../../lib/api";

export function Sidebar({ view, setView }) {
  const { initiatives, orgs, orgId, switchOrg, addOrg, switchingOrg } = useApp();
  const approved = initiatives.filter(i => i.approved).length;
  const total = initiatives.length;

  // New org modal state
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgWebsite, setNewOrgWebsite] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [bootstrapStep, setBootstrapStep] = useState(""); // progress message

  async function handleCreateOrg() {
    const name = newOrgName.trim();
    if (!name) return;
    setCreatingOrg(true);
    setBootstrapStep("Creating workspace…");
    try {
      // Step 1: create blank org row
      const newOrg = await addOrg(name);

      // Step 2: call AI to research company
      setBootstrapStep(`Researching ${name}…`);
      const aiRes = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bootstrap_company",
          payload: { companyName: name, website: newOrgWebsite.trim() },
        }),
      });
      const aiData = await aiRes.json();

      if (!aiData.data) {
        throw new Error(aiData.error || "AI research failed");
      }

      // Step 3: write all data to Neon
      setBootstrapStep("Populating foundation data…");
      await bootstrapCompany(newOrg.id, aiData.data);

      // Step 4: reload the org data so UI reflects new content
      setBootstrapStep("Loading workspace…");
      await switchOrg(newOrg.id);

      setShowNewOrgModal(false);
      setNewOrgName("");
      setNewOrgWebsite("");
      setView("foundation");
    } catch (err) {
      console.error("Create org error:", err);
      setBootstrapStep(`Error: ${err.message}`);
    } finally {
      setCreatingOrg(false);
    }
  }

  const active = (id) => view === id;
  const navBtn = (id, label, indent = false) => (
    <button key={id} onClick={() => setView(id)}
      style={{
        width: "100%", textAlign: "left",
        padding: indent ? "6px 16px 6px 24px" : "8px 16px",
        background: active(id) ? T.goldD : "transparent",
        border: "none",
        borderLeft: `3px solid ${active(id) ? T.gold : "transparent"}`,
        cursor: "pointer",
        display: "flex", alignItems: "center",
      }}>
      <span style={{
        fontSize: 12,
        fontWeight: active(id) ? 800 : 700,
        color: active(id) ? T.gold : T.white,
        letterSpacing: "0.01em",
      }}>{label}</span>
    </button>
  );

  const sep = (key) => (
    <div key={key} style={{ height: 1, background: T.border, margin: "6px 12px" }} />
  );

  const sectionLabel = (label) => (
    <div style={{ padding: "8px 16px 2px", fontSize: 9, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
      {label}
    </div>
  );

  return (
    <>
    <div style={{
      width: 220, background: T.ink2, borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", flexShrink: 0,
      position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: T.white, letterSpacing: "-0.03em" }}>
          <span style={{ color: T.gold }}>P</span>GI
        </div>
        <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 1 }}>
          Product Growth Intelligence
        </div>
      </div>

      {/* Org switcher pills */}
      <div style={{ padding: "8px 10px 6px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          Workspace
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {orgs.map(org => {
            const isActive = org.id === orgId;
            return (
              <button
                key={org.id}
                onClick={() => switchOrg(org.id)}
                disabled={switchingOrg}
                title={org.name}
                style={{
                  padding: "3px 8px",
                  borderRadius: 20,
                  border: `1px solid ${isActive ? T.gold : T.border}`,
                  background: isActive ? T.goldD : "transparent",
                  color: isActive ? T.gold : T.muted,
                  fontSize: 10,
                  fontWeight: isActive ? 800 : 600,
                  cursor: switchingOrg ? "wait" : "pointer",
                  whiteSpace: "nowrap",
                  maxWidth: 120,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  transition: "all 0.15s",
                }}
              >
                {org.name.length > 12 ? org.name.slice(0, 11) + "…" : org.name}
              </button>
            );
          })}
          {/* + Add org button */}
          <button
            onClick={() => setShowNewOrgModal(true)}
            title="Add new company workspace"
            style={{
              padding: "3px 7px",
              borderRadius: 20,
              border: `1px dashed ${T.border}`,
              background: "transparent",
              color: T.muted,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >+</button>
        </div>
        {switchingOrg && (
          <div style={{ fontSize: 9, color: T.gold, marginTop: 4, fontStyle: "italic" }}>
            Switching workspace…
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ fontSize: 11, color: T.muted, padding: "8px 16px 4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {approved} approved · {total} total
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "4px 0", overflow: "auto" }}>

        {navBtn("dashboard", "Dashboard")}
        {navBtn("foundation", "Foundation")}

        {sep("s1")}

        {/* Stage pipeline — compact */}
        <div style={{ padding: "4px 16px 2px", fontSize: 9, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Pipeline Stages
        </div>

        {navBtn("ideas",      "Stage 1 · Ideas")}
        {navBtn("discovery",  "Stage 2 · Discovery")}
        {navBtn("execreview", "Stage 3 · Exec Review")}
        {navBtn("portfolio",  "Stage 4 · Portfolio")}
        {navBtn("definition",           "Stage 5 · Definition")}
        {navBtn("investment_contract",  "Stage 5.5 · Investment Contract")}
        {navBtn("delivery",             "Stage 6 · Delivery")}
        {navBtn("handoff",    "Stage 7 · Handoff")}
        {navBtn("gtm",        "Stage 8 · Go-To-Market")}
        {navBtn("measure",    "Stage 9 · Measure")}
        {navBtn("outcome",    "Stage 10 · Outcome Summary")}

        {sep("s2")}

        {/* Chatty hint */}
        <div style={{ padding: "5px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: T.gold }}>◆</span>
          <span style={{ fontSize: 11, color: T.muted, fontStyle: "italic" }}>Chatty — bottom right ↘</span>
        </div>

        {sep("s3")}

        {sectionLabel("References")}
        {navBtn("ref_framework", "NCM PM Framework")}
        {navBtn("ref_guide",     "How To Use PGI")}
        {navBtn("ref_scores",    "Score Methodology")}

      </nav>

      {/* Pipeline progress bar */}
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>Pipeline Progress</div>
        <div style={{ height: 3, background: T.ink3, borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${(approved / Math.max(total, 1)) * 100}%`,
            background: `linear-gradient(90deg,${T.steel},${T.gold})`,
            transition: "width 0.4s",
          }} />
        </div>
      </div>
    </div>

    {/* New Org Modal */}
    {showNewOrgModal && (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
      }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowNewOrgModal(false); }}
      >
        <div style={{
          background: T.ink2, border: `1px solid ${T.border}`,
          borderRadius: 12, padding: 28, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 6 }}>
            Add Company Workspace
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 18 }}>
            Type a company name and AI will research it and auto-populate your workspace with real data — mission, OKRs, competitors, products, and starter initiatives.
          </div>
          <input
            autoFocus
            value={newOrgName}
            onChange={e => setNewOrgName(e.target.value)}
            onKeyDown={e => e.key === "Tab" && e.preventDefault()}
            placeholder="Company name — e.g. Datavant"
            disabled={creatingOrg}
            style={{
              width: "100%", padding: "10px 12px",
              background: T.ink3, border: `1px solid ${T.border}`,
              borderRadius: 8, color: T.white, fontSize: 14,
              outline: "none", boxSizing: "border-box",
              opacity: creatingOrg ? 0.5 : 1,
            }}
          />

          <div style={{ fontSize: 10, color: T.muted, margin: "10px 0 4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Website <span style={{ color: T.steel, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— helps AI find the right company</span>
          </div>
          <input
            value={newOrgWebsite}
            onChange={e => setNewOrgWebsite(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateOrg()}
            placeholder="e.g. datavant.com"
            disabled={creatingOrg}
            style={{
              width: "100%", padding: "10px 12px",
              background: T.ink3, border: `1px solid ${T.border}`,
              borderRadius: 8, color: T.white, fontSize: 14,
              outline: "none", boxSizing: "border-box",
              opacity: creatingOrg ? 0.5 : 1,
            }}
          />

          {/* Bootstrap progress */}
          {creatingOrg && (
            <div style={{
              marginTop: 14, padding: "10px 14px",
              background: T.ink3, borderRadius: 8,
              border: `1px solid ${T.gold}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, color: T.gold, animation: "spin 1s linear infinite" }}>◆</span>
                <span style={{ fontSize: 12, color: T.gold, fontWeight: 700 }}>{bootstrapStep}</span>
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                AI is researching {newOrgName} and populating your workspace…
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
            <button
              onClick={() => { setShowNewOrgModal(false); setNewOrgName(""); setNewOrgWebsite(""); }}
              style={{
                padding: "8px 16px", borderRadius: 6,
                border: `1px solid ${T.border}`, background: "transparent",
                color: T.muted, fontSize: 12, cursor: "pointer",
              }}
            >Cancel</button>
            <button
              onClick={handleCreateOrg}
              disabled={!newOrgName.trim() || creatingOrg}
              style={{
                padding: "8px 20px", borderRadius: 6,
                border: "none", background: T.gold,
                color: T.ink, fontSize: 12, fontWeight: 800,
                cursor: !newOrgName.trim() || creatingOrg ? "not-allowed" : "pointer",
                opacity: !newOrgName.trim() || creatingOrg ? 0.5 : 1,
              }}
            >
            {creatingOrg ? bootstrapStep || "Working…" : "◆ Research & Create"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
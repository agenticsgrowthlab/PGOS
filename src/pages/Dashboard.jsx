import { T, css, stageLabel, stageColor, calcPivot, pivotTier } from "../lib/tokens";
import { Tag, ScoreRing } from "../components/ui";
import { useApp } from "../contexts/AppContext";

export function Dashboard({ setView }) {
  const { initiatives, foundation, userName } = useApp();

  const totalInv = initiatives.reduce((a, i) => a + (i.investment?.approved || 0), 0);
  const approved = initiatives.filter(i => i.approved);
  const awaiting  = initiatives.filter(i => i.stage === "review");
  const active    = initiatives;

  // ── KPI cards (clickable) ───────────────────────────────────
  const kpis = [
    { label: "Active Initiatives",   val: active.length,    color: T.gold,  icon: "◎", nav: "portfolio" },
    { label: "Approved & Funded",    val: approved.length,  color: T.green, icon: "✓", nav: "portfolio" },
    { label: "Awaiting Approval",    val: awaiting.length,  color: T.amber, icon: "◈", nav: "portfolio" },
    { label: "Total Approved $",     val: `$${(totalInv/1000000).toFixed(1)}M`, color: T.ice, icon: "$", nav: "portfolio" },
  ];

  // ── Pipeline stage groups (simplified) ──────────────────────---
  const STAGE_GROUPS = [
    {
      label: "Define",
      icon: "✏",
      color: T.steel,
      nav: "ideas",
      stages: ["idea","discovery","review","approved"],
      desc: "Ideas → Discovery → Review → Approved",
    },
    {
      label: "Deliver",
      icon: "⚙",
      color: T.gold,
      nav: "handoff",
      stages: ["definition","delivery","handoff"],
      desc: "Definition → Delivery Handoff → Sprint Goals",
    },
    {
      label: "GTM",
      icon: "◈",
      color: "#9B59B6",
      nav: "gtm",
      stages: ["gtm"],
      desc: "GTM Strategy → Campaign Launch",
    },
    {
      label: "Measure & Learn",
      icon: "◎",
      color: T.green,
      nav: "measure_data",
      stages: ["measure","closed"],
      desc: "Measure → Lessons → Outcome",
    },
  ];

  return (
    <div>
      <div style={css.h2}>Good morning, {userName}</div>
      <div style={css.sub}>Your product investment pipeline — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>

      {/* KPI row — all clickable */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {kpis.map(({ label, val, color, icon, nav }) => (
          <div key={label}
            onClick={() => setView(nav)}
            style={{ ...css.card, margin: 0, borderTop: `2px solid ${color}`, cursor: "pointer", transition: "transform 0.1s", userSelect: "none" }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{icon} {label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color, letterSpacing: "-0.03em" }}>{val}</div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>→ View in Portfolio</div>
          </div>
        ))}
      </div>

      {/* Pipeline stages — simplified 4-group view */}
      <div style={{ ...css.card, marginBottom: 20 }}>
        <div style={css.secHead}>Pipeline Stages</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {STAGE_GROUPS.map((grp, gi) => {
            const count = initiatives.filter(i => grp.stages.includes(i.stage)).length;
            return (
              <div key={grp.label}
                onClick={() => setView(grp.nav)}
                style={{
                  background: T.ink3, borderRadius: 10, padding: "16px 14px",
                  borderTop: `3px solid ${grp.color}`, cursor: "pointer",
                  transition: "transform 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, color: grp.color }}>{grp.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: grp.color }}>{grp.label}</span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: count > 0 ? grp.color : T.border, marginBottom: 4 }}>{count}</div>
                <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.5 }}>{grp.desc}</div>
                {/* Stage breakdown mini-pills */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                  {grp.stages.map(s => {
                    const c = initiatives.filter(i => i.stage === s).length;
                    return c > 0 ? (
                      <span key={s} style={{
                        background: stageColor(s) + "22", color: stageColor(s),
                        borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 700,
                      }}>{stageLabel(s)}: {c}</span>
                    ) : null;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Flowing funnel bar underneath */}
        <div style={{ display: "flex", gap: 2, marginTop: 14, height: 6, borderRadius: 3, overflow: "hidden" }}>
          {STAGE_GROUPS.map(grp => {
            const count = initiatives.filter(i => grp.stages.includes(i.stage)).length;
            const pct = initiatives.length ? (count / initiatives.length) * 100 : 25;
            return <div key={grp.label} style={{ flex: pct, background: grp.color, minWidth: 4, transition: "flex 0.5s" }} />;
          })}
        </div>
      </div>

      {/* OKR progress */}
      <div style={css.card}>
        <div style={css.secHead}>OKR Progress</div>
        {(foundation?.okrs || []).map(okr => (
          <div key={okr.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: T.loud, fontWeight: 500, flex: 1, marginRight: 16 }}>{okr.objective}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: okr.progress > 60 ? T.green : okr.progress > 30 ? T.gold : T.amber, minWidth: 40, textAlign: "right" }}>{okr.progress}%</span>
            </div>
            <div style={{ height: 4, background: T.ink3, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${okr.progress}%`, background: okr.progress > 60 ? T.green : okr.progress > 30 ? T.gold : T.amber, borderRadius: 2, transition: "width 0.4s" }} />
            </div>
          </div>
        ))}
        {(!foundation?.okrs || foundation.okrs.length === 0) && (
          <div style={{ color: T.muted, fontSize: 12, fontStyle: "italic" }}>
            No OKRs set yet. Add them in Enterprise Foundation.
          </div>
        )}
      </div>

      {/* Recent initiatives */}
      <div style={css.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={css.secHead}>Recent Initiatives</div>
          <button style={css.btnOut} onClick={() => setView("ideas")}>+ New Idea</button>
        </div>
        {initiatives.map(ini => {
          const score = calcPivot(ini.pivot);
          const tier = pivotTier(score);
          return (
            <div key={ini.id}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: T.ink3, borderRadius: 8, marginBottom: 8, cursor: "pointer" }}
              onClick={() => setView("initiative_" + ini.id)}
              onMouseEnter={e => e.currentTarget.style.background = T.ink}
              onMouseLeave={e => e.currentTarget.style.background = T.ink3}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.loud, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ini.title}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{ini.slug} · {ini.source_detail?.substring(0, 60)}</div>
              </div>
              <Tag label={stageLabel(ini.stage)} color={stageColor(ini.stage)} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ScoreRing score={score} color={tier.color} size={36} />
                <span style={{ fontSize: 14, fontWeight: 800, color: tier.color, minWidth: 36 }}>{score.toFixed(0)}</span>
              </div>
              <Tag label={tier.label} color={tier.color} bg={tier.bg} />
            </div>
          );
        })}
        {initiatives.length === 0 && (
          <div style={{ color: T.muted, fontSize: 12, textAlign: "center", padding: 20 }}>
            No initiatives yet. <button style={{ ...css.btnGhost, fontSize: 12 }} onClick={() => setView("ideas")}>Create your first idea →</button>
          </div>
        )}
      </div>
    </div>
  );
}
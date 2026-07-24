import { T, css, stageLabel, stageColor, calcPivot, pivotTier } from "../lib/tokens";
import { Tag, ScoreRing } from "../components/ui";
import { useApp } from "../contexts/AppContext";

export function Dashboard({ setView }) {
  const { initiatives, foundation, userName } = useApp();

  const stages = ["idea", "discovery", "review", "approved", "definition", "delivery", "handoff"];
  const counts = Object.fromEntries(stages.map(s => [s, initiatives.filter(i => i.stage === s).length]));
  const totalInv = initiatives.reduce((a, i) => a + (i.investment?.approved || 0), 0);

  return (
    <div>
      <div style={css.h2}>Good morning, {userName}</div>
      <div style={css.sub}>Your product investment pipeline — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          ["Active Initiatives", initiatives.length, T.gold, "◎"],
          ["Approved & Funded", initiatives.filter(i => i.approved).length, T.green, "✓"],
          ["Awaiting Review", counts.review || 0, T.amber, "◈"],
          ["Total Approved $", `$${(totalInv / 1000000).toFixed(1)}M`, T.ice, "$"],
        ].map(([lbl, val, color, icon]) => (
          <div key={lbl} style={{ ...css.card, margin: 0, borderTop: `2px solid ${color}` }}>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{icon} {lbl}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color, letterSpacing: "-0.03em" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Pipeline funnel */}
      <div style={{ ...css.card, marginBottom: 20 }}>
        <div style={css.secHead}>Pipeline Stages</div>
        <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
          {stages.map((s, i) => {
            const color = stageColor(s);
            const count = counts[s] || 0;
            return (
              <div key={s} style={{ flex: 1, textAlign: "center", cursor: "pointer" }} onClick={() => setView(s)}>
                <div style={{ padding: "12px 6px", background: T.ink3, borderRadius: i === 0 ? "6px 0 0 6px" : i === stages.length - 1 ? "0 6px 6px 0" : "0", borderRight: i < stages.length - 1 ? `1px solid ${T.border}` : "none" }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: count > 0 ? color : T.border }}>{count}</div>
                  <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2 }}>{stageLabel(s)}</div>
                </div>
              </div>
            );
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
            <div key={ini.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: T.ink3, borderRadius: 8, marginBottom: 8, cursor: "pointer" }}
              onClick={() => setView("initiative_" + ini.id)}>
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
      </div>
    </div>
  );
}

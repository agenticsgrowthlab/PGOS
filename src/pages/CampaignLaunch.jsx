// src/pages/CampaignLaunch.jsx — Stage 8: Campaign Launch

import { useState, useCallback, useEffect } from "react";
import { useApp } from "../contexts/AppContext";
import { updateInitiative, callAI } from "../lib/api";
import { css, T } from "../lib/tokens";

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{title}</div>
    {children}
  </div>
);

// ── Launch Calendar ──────────────────────────────────────────
function LaunchCalendar({ tasks, onUpdate }) {
  const [newTask, setNewTask] = useState({ date: "", title: "", owner: "", type: "task" });
  const [showAdd, setShowAdd] = useState(false);

  const TYPES = {
    task:      { label: "Task",      color: T.steel },
    campaign:  { label: "Campaign",  color: T.gold },
    milestone: { label: "Milestone", color: "#22c55e" },
    event:     { label: "Event",     color: "#a855f7" },
  };

  const sorted = [...(tasks || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

  function addTask() {
    if (!newTask.date || !newTask.title) return;
    onUpdate([...(tasks || []), { ...newTask, id: Date.now().toString() }]);
    setNewTask({ date: "", title: "", owner: "", type: "task" });
    setShowAdd(false);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {Object.entries(TYPES).map(([k, v]) => (
          <span key={k} style={{ background: v.color + "22", color: v.color, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{v.label}</span>
        ))}
        <button style={{ ...css.btnGhost, marginLeft: "auto", fontSize: 11 }} onClick={() => setShowAdd(p => !p)}>+ Add Item</button>
      </div>

      {showAdd && (
        <div style={{ background: T.ink2, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
          <input type="date" style={css.input} value={newTask.date} onChange={e => setNewTask(p => ({ ...p, date: e.target.value }))} />
          <input style={css.input} placeholder="Title / task description" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} />
          <input style={css.input} placeholder="Owner" value={newTask.owner} onChange={e => setNewTask(p => ({ ...p, owner: e.target.value }))} />
          <select style={css.input} value={newTask.type} onChange={e => setNewTask(p => ({ ...p, type: e.target.value }))}>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button style={css.btnGold} onClick={addTask}>Add</button>
        </div>
      )}

      {sorted.length === 0 && (
        <div style={{ color: T.muted, fontSize: 12, fontStyle: "italic", padding: "12px 0" }}>No calendar items yet. Add milestones, campaigns, and tasks above.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.map(task => {
          const t = TYPES[task.type] || TYPES.task;
          return (
            <div key={task.id} style={{ display: "flex", gap: 12, alignItems: "center", background: T.ink2, borderRadius: 6, padding: "8px 12px", borderLeft: `3px solid ${t.color}` }}>
              <div style={{ fontSize: 11, color: T.muted, minWidth: 80, fontWeight: 600 }}>
                {task.date ? new Date(task.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
              </div>
              <span style={{ background: t.color + "22", color: t.color, borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 700, minWidth: 60, textAlign: "center" }}>{t.label.toUpperCase()}</span>
              <div style={{ flex: 1, fontSize: 12, color: T.loud }}>{task.title}</div>
              {task.owner && <div style={{ fontSize: 11, color: T.muted }}>→ {task.owner}</div>}
              <button style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, padding: 4 }}
                onClick={() => onUpdate((tasks || []).filter(t => t.id !== task.id))}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Social Content Posts ─────────────────────────────────────
const CHANNELS = ["LinkedIn", "Twitter/X", "Email", "Blog", "Press Release"];

function SocialPosts({ posts, onUpdate, loading, onGenerate }) {
  const [activeChannel, setActiveChannel] = useState("LinkedIn");
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {CHANNELS.map(ch => (
          <button key={ch}
            onClick={() => setActiveChannel(ch)}
            style={{
              ...css.btnGhost, fontSize: 11,
              background: activeChannel === ch ? T.ink2 : "transparent",
              color: activeChannel === ch ? T.gold : T.muted,
              border: `1px solid ${activeChannel === ch ? T.gold : T.border}`,
            }}
          >{ch}</button>
        ))}
        <button
          style={{ ...css.btnOut, fontSize: 11, marginLeft: "auto" }}
          onClick={() => onGenerate(activeChannel)}
          disabled={loading[activeChannel]}
        >
          {loading[activeChannel] ? "◆ Generating…" : `◆ Generate ${activeChannel}`}
        </button>
        <button
          style={{ ...css.btnOut, fontSize: 11 }}
          onClick={() => onGenerate("all")}
          disabled={loading.all}
        >
          {loading.all ? "◆ Generating All…" : "◆ Generate All Channels"}
        </button>
      </div>

      {CHANNELS.map(ch => (
        <div key={ch} style={{ display: activeChannel === ch ? "block" : "none" }}>
          {loading[ch] && (
            <div style={{ color: T.muted, fontSize: 12, fontStyle: "italic", padding: "12px 0", marginBottom: 8 }}>
              ◆ Generating {ch} content…
            </div>
          )}
          <textarea
            style={{ ...css.input, width: "100%", minHeight: 320, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
            value={(posts || {})[ch] || ""}
            onChange={e => onUpdate({ ...(posts || {}), [ch]: e.target.value })}
            placeholder={`Click "Generate ${ch}" above to create 30-day ${ch} content…`}
          />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function CampaignLaunch() {
  const { initiatives, updateIni } = useApp();

  // Pick the most relevant initiative (GTM/handoff stage first, else first)
  const ini = initiatives?.find(i =>
    ["gtm", "handoff", "measure", "closed"].includes(i.stage)
  ) || initiatives?.[0];

  const [loading, setLoading]       = useState({});
  const [saved, setSaved]           = useState(false);
  const [calTasks, setCalTasks]     = useState([]);
  const [socialPosts, setSocialPosts] = useState({});

  // Inline editable target metric / target
  const [metric, setMetric]   = useState("");
  const [target, setTarget]   = useState("");

  useEffect(() => {
    if (!ini) return;
    try { setCalTasks(JSON.parse(ini.launch_calendar || ini.gtm_calendar || "[]")); } catch { setCalTasks([]); }
    try { setSocialPosts(JSON.parse(ini.gtm_social_posts || "{}")); } catch { setSocialPosts({}); }
    setMetric(ini.contract_primary_metric || "");
    setTarget(ini.contract_target || "");
  }, [ini?.id]);

  const save = useCallback(async (fields) => {
    if (!ini) return;
    updateIni(ini.id, fields);
    try {
      await updateInitiative({ id: ini.id, ...fields });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("CampaignLaunch save error:", err);
    }
  }, [ini, updateIni]);

  const saveCalendar = useCallback(async (tasks) => {
    setCalTasks(tasks);
    await save({ launch_calendar: JSON.stringify(tasks), gtm_calendar: JSON.stringify(tasks) });
  }, [save]);

  const saveSocial = useCallback(async (posts) => {
    setSocialPosts(posts);
    await save({ gtm_social_posts: JSON.stringify(posts) });
  }, [save]);

  // ✅ FIX: use correct action "gtm_social" with channel payload — was "gtm" which doesn't exist
  async function generateChannel(channel) {
    if (!ini) return;
    const key = channel === "all" ? "all" : channel;
    setLoading(p => ({ ...p, [key]: true }));
    const channels = channel === "all" ? CHANNELS : [channel];

    for (const ch of channels) {
      setLoading(p => ({ ...p, [ch]: true }));
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "gtm_social",        // ✅ correct action key
            payload: { ini, channel: ch },
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error(`AI error for ${ch}:`, res.status, errText);
          continue;
        }
        const data = await res.json();
        const text = data.text || data.data || "";
        if (text) {
          setSocialPosts(p => {
            const next = { ...p, [ch]: text };
            saveSocial(next);
            return next;
          });
        }
      } catch (e) {
        console.error("Generate channel error:", e);
      } finally {
        setLoading(p => ({ ...p, [ch]: false }));
      }
    }
    setLoading(p => ({ ...p, [key]: false }));
  }

  if (!ini) return (
    <div style={{ color: T.muted, padding: 40, textAlign: "center" }}>
      No initiative found. Add an initiative and move it to GTM or Handoff stage to begin campaign launch planning.
    </div>
  );

  return (
    <div>
      {/* Context bar — with inline editable Target Metric + Target */}
      <div style={{ background: T.ink2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Initiative</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.loud }}>{ini.title}</div>
        </div>

        {/* ✅ FIX: editable Target Metric */}
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Target Metric</div>
          <input
            style={{ ...css.input, width: 180, fontSize: 12, padding: "4px 8px" }}
            value={metric}
            placeholder="e.g. Adoption Rate"
            onChange={e => setMetric(e.target.value)}
            onBlur={() => save({ contract_primary_metric: metric })}
          />
        </div>

        {/* ✅ FIX: editable Target */}
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Target</div>
          <input
            style={{ ...css.input, width: 140, fontSize: 12, padding: "4px 8px" }}
            value={target}
            placeholder="e.g. 40% in 90 days"
            onChange={e => setTarget(e.target.value)}
            onBlur={() => save({ contract_target: target })}
          />
        </div>

        {saved && <div style={{ marginLeft: "auto", fontSize: 11, color: "#22c55e", fontWeight: 700 }}>✓ Saved</div>}
      </div>

      {/* Launch Calendar */}
      <Section title="Launch Calendar">
        <LaunchCalendar tasks={calTasks} onUpdate={saveCalendar} />
      </Section>

      {/* 30-Day Content Calendar */}
      <Section title="30-Day Launch Content Calendar">
        <SocialPosts posts={socialPosts} onUpdate={saveSocial} loading={loading} onGenerate={generateChannel} />
      </Section>

      {/* Campaign Notes */}
      <Section title="Campaign Notes">
        <textarea
          style={{ ...css.input, width: "100%", resize: "vertical", minHeight: 88 }}
          value={ini.gtm_notes || ""}
          onChange={e => save({ gtm_notes: e.target.value })}
          placeholder="Internal notes, open questions, stakeholder feedback…"
        />
      </Section>
    </div>
  );
}
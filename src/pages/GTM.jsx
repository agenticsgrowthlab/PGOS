import { useState, useCallback, useEffect } from "react";
import { useApp } from "../contexts/AppContext";
import { updateInitiative } from "../lib/api";
import { css, T } from "../lib/tokens";

const AIBox = ({ label, loading, children }) => (
  <div style={{ background: T.ink2, border: `1px solid ${T.gold}`, borderRadius: 8, padding: 20, marginBottom: 16 }}>
    <div style={{ color: T.gold, fontWeight: 700, fontSize: 12, marginBottom: loading ? 0 : 12 }}>{label}</div>
    {loading ? (
      <div style={{ color: T.muted, fontSize: 12, marginTop: 8 }}>◆ Generating...</div>
    ) : children}
  </div>
);

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{title}</div>
    {children}
  </div>
);

const TextArea = ({ value, onChange, placeholder, rows = 4 }) => (
  <textarea
    style={{ ...css.input, width: "100%", resize: "vertical", minHeight: rows * 22 }}
    value={value || ""}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
  />
);

// ── Calendar Component ────────────────────────────────────────
function LaunchCalendar({ tasks, onUpdate }) {
  const [newTask, setNewTask] = useState({ date: "", title: "", owner: "", type: "task" });
  const [showAdd, setShowAdd] = useState(false);

  const TYPES = {
    task: { label: "Task", color: T.blue },
    campaign: { label: "Campaign", color: T.gold },
    milestone: { label: "Milestone", color: "#22c55e" },
    event: { label: "Event", color: "#a855f7" },
  };

  const sorted = [...(tasks || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

  function addTask() {
    if (!newTask.date || !newTask.title) return;
    const updated = [...(tasks || []), { ...newTask, id: Date.now().toString() }];
    onUpdate(updated);
    setNewTask({ date: "", title: "", owner: "", type: "task" });
    setShowAdd(false);
  }

  function removeTask(id) {
    onUpdate((tasks || []).filter(t => t.id !== id));
  }

  // Group by month
  const byMonth = {};
  sorted.forEach(t => {
    const m = t.date.slice(0, 7);
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(t);
  });

  return (
    <div>
      {Object.entries(byMonth).map(([month, items]) => (
        <div key={month} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            {new Date(month + "-02").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>
          {items.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: T.ink2, borderRadius: 6, marginBottom: 6, borderLeft: `3px solid ${TYPES[t.type]?.color || T.blue}` }}>
              <div style={{ fontSize: 11, color: T.muted, minWidth: 60 }}>
                {new Date(t.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.loud }}>{t.title}</div>
                {t.owner && <div style={{ fontSize: 11, color: T.muted }}>{t.owner}</div>}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: TYPES[t.type]?.color || T.blue, background: T.ink, padding: "2px 6px", borderRadius: 4 }}>
                {TYPES[t.type]?.label || t.type}
              </div>
              <button onClick={() => removeTask(t.id)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
            </div>
          ))}
        </div>
      ))}

      {tasks?.length === 0 || !tasks ? (
        <div style={{ color: T.muted, fontSize: 12, fontStyle: "italic", padding: "12px 0" }}>
          No tasks yet — use AI to generate a launch calendar or add manually.
        </div>
      ) : null}

      {showAdd ? (
        <div style={{ background: T.ink2, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input type="date" style={css.input} value={newTask.date} onChange={e => setNewTask(p => ({ ...p, date: e.target.value }))} />
            <input style={css.input} placeholder="Task title" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} />
            <input style={css.input} placeholder="Owner" value={newTask.owner} onChange={e => setNewTask(p => ({ ...p, owner: e.target.value }))} />
            <select style={css.input} value={newTask.type} onChange={e => setNewTask(p => ({ ...p, type: e.target.value }))}>
              {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={css.btnPrimary} onClick={addTask}>Add</button>
            <button style={css.btnGhost} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button style={{ ...css.btnGhost, marginTop: 8 }} onClick={() => setShowAdd(true)}>+ Add Task</button>
      )}
    </div>
  );
}

// ── Social Posts Component ────────────────────────────────────
function SocialPosts({ posts, onUpdate }) {
  const CHANNELS = ["LinkedIn", "Twitter/X", "Email", "Blog", "Press Release"];

  function updatePost(channel, value) {
    const updated = { ...(posts || {}), [channel]: value };
    onUpdate(updated);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {CHANNELS.map(ch => (
        <div key={ch}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 4 }}>{ch}</div>
          <TextArea
            value={(posts || {})[ch] || ""}
            onChange={v => updatePost(ch, v)}
            placeholder={`${ch} post or content...`}
            rows={3}
          />
        </div>
      ))}
    </div>
  );
}

// ── Main GTM Page ─────────────────────────────────────────────
export default function GTM() {
  const { initiatives, updateIni } = useApp();
  const ini = initiatives?.find(i =>
    ["handoff", "gtm", "measure", "closed"].includes(i.stage)
  ) || initiatives?.[0];

  const [loading, setLoading] = useState({});
  const [saved, setSaved] = useState(false);
  const [calTasks, setCalTasks] = useState([]);
  const [socialPosts, setSocialPosts] = useState({});

  // Parse stored calendar and social posts from ini
  useEffect(() => {
    if (!ini) return;
    try { setCalTasks(JSON.parse(ini.gtm_calendar || "[]")); } catch { setCalTasks([]); }
    try { setSocialPosts(JSON.parse(ini.gtm_social_posts || "{}")); } catch { setSocialPosts({}); }
  }, [ini?.id]);

  const save = useCallback(async (fields) => {
    if (!ini) return;
    updateIni(ini.id, fields);
    try { await updateInitiative({ id: ini.id, ...fields }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch (err) { console.error("GTM save error:", err); }
  }, [ini, updateIni]);

  const saveCalendar = useCallback(async (tasks) => {
    setCalTasks(tasks);
    await save({ gtm_calendar: JSON.stringify(tasks) });
  }, [save]);

  const saveSocial = useCallback(async (posts) => {
    setSocialPosts(posts);
    await save({ gtm_social_posts: JSON.stringify(posts) });
  }, [save]);

  // ── AI Generation ─────────────────────────────────────────
  async function generate(section) {
    if (!ini) return;
    setLoading(p => ({ ...p, [section]: true }));

    const context = `
Initiative: ${ini.title}
Stage: ${ini.stage}
Problem: ${ini.problem || ""}
Opportunity: ${ini.opportunity || ""}
Personas: ${ini.personas || ""}
Exec Brief: ${ini.execBrief || ini.exec_brief || ""}
PIVOT Score: P=${ini.pivot_p} I=${ini.pivot_i} V=${ini.pivot_v} O=${ini.pivot_o} T=${ini.pivot_t}
Investment: $${(ini.investment_approved || ini.investment_requested || 0).toLocaleString()}
Current Journey: ${ini.currentJourney || ini.current_journey || ""}
Use Cases: ${ini.use_cases || ""}
Epics: ${ini.epics || ""}
Contract Metric: ${ini.contract_primary_metric || ""}, Target: ${ini.contract_target || ""}
Economic Outcome: ${ini.contract_economic_outcome || ""}
ICP: ${ini.gtm_icp || ""}
Positioning: ${ini.gtm_positioning || ""}
Value Prop: ${ini.gtm_value_prop || ""}
Channel Strategy: ${ini.gtm_channel_strategy || ""}
`.trim();

    const actionMap = { full: "gtm_full", calendar: "gtm_calendar", social: "gtm_social" };

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionMap[section],
          payload: { ini, foundation: {} },
        }),
      });
      const data = await res.json();
      // ai.js returns { text } for standard actions
      const text = data.text || "";
      if (!text) throw new Error(data.error || "Empty response from AI");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (section === "full") {
        await save({
          gtm_icp: parsed.icp,
          gtm_positioning: parsed.positioning,
          gtm_value_prop: parsed.value_prop,
          gtm_channel_strategy: parsed.channel_strategy,
          gtm_launch_plan: parsed.launch_plan,
          gtm_success_criteria: parsed.success_criteria,
          gtm_campaign_intel: parsed.campaign_intel,
        });
      } else if (section === "calendar") {
        await saveCalendar(parsed);
      } else if (section === "social") {
        await saveSocial(parsed);
      }
    } catch (err) {
      console.error("GTM AI error:", err);
    }
    setLoading(p => ({ ...p, [section]: false }));
  }

  if (!ini) return <div style={{ color: T.muted, padding: 40, textAlign: "center" }}>No initiative in GTM stage. Move an initiative to Handoff or GTM stage to begin.</div>;

  return (
    <div>
      <div style={css.h2}>Go-To-Market · Stage 8</div>
      <div style={css.sub}>Positioning, launch planning, and campaign intelligence — powered by everything PGOS knows about this initiative.</div>

      {/* Initiative context bar */}
      <div style={{ background: T.ink2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Initiative</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.loud }}>{ini.title}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Target Metric</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>{ini.contract_primary_metric || "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Target</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>{ini.contract_target || "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Investment</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.loud }}>${((ini.investment_approved || ini.investment_requested || 0)).toLocaleString()}</div>
        </div>
        {saved && <div style={{ marginLeft: "auto", fontSize: 11, color: "#22c55e", fontWeight: 700 }}>✓ Saved</div>}
      </div>

      {/* AI Generate All */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <button style={css.btnOut} onClick={() => generate("full")} disabled={loading.full}>
          {loading.full ? "◆ Generating GTM Package..." : "◆ Generate Full GTM Package"}
        </button>
        <button style={css.btnOut} onClick={() => generate("calendar")} disabled={loading.calendar}>
          {loading.calendar ? "◆ Building Calendar..." : "◆ Generate Launch Calendar"}
        </button>
        <button style={css.btnOut} onClick={() => generate("social")} disabled={loading.social}>
          {loading.social ? "◆ Writing Content..." : "◆ Generate Launch Content"}
        </button>
      </div>

      {/* ICP + Positioning */}
      <Section title="Target Audience & Positioning">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Ideal Customer Profile (ICP)</div>
            <TextArea
              value={ini.gtm_icp}
              onChange={v => save({ gtm_icp: v })}
              placeholder="Job title, company size, industry, pain point, buying trigger..."
              rows={5}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Positioning Statement</div>
            <TextArea
              value={ini.gtm_positioning}
              onChange={v => save({ gtm_positioning: v })}
              placeholder="For [ICP] who [pain], [product] is the [category] that [key benefit] unlike [alternatives]..."
              rows={5}
            />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Value Propositions</div>
          <TextArea
            value={ini.gtm_value_prop}
            onChange={v => save({ gtm_value_prop: v })}
            placeholder="3-5 value propositions tied to the target business metric..."
            rows={4}
          />
        </div>
      </Section>

      {/* Channel + Campaign */}
      <Section title="Channel Strategy & Campaign Intelligence">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Channel Strategy</div>
            <TextArea
              value={ini.gtm_channel_strategy}
              onChange={v => save({ gtm_channel_strategy: v })}
              placeholder="Primary and secondary channels with rationale..."
              rows={5}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Campaign Intelligence</div>
            <TextArea
              value={ini.gtm_campaign_intel}
              onChange={v => save({ gtm_campaign_intel: v })}
              placeholder="Top campaigns most likely to move the target business metric..."
              rows={5}
            />
          </div>
        </div>
      </Section>

      {/* Launch Plan + Success Criteria */}
      <Section title="Launch Plan & Success Criteria">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Launch Plan</div>
            <TextArea
              value={ini.gtm_launch_plan}
              onChange={v => save({ gtm_launch_plan: v })}
              placeholder="Soft launch → GA → Scale phases with sequencing logic..."
              rows={6}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Launch Success Criteria</div>
            <TextArea
              value={ini.gtm_success_criteria}
              onChange={v => save({ gtm_success_criteria: v })}
              placeholder="3-5 measurable criteria with specific numbers tied to the contract metric..."
              rows={6}
            />
          </div>
        </div>
      </Section>

      {/* Launch Calendar */}
      <Section title="Launch Calendar">
        <LaunchCalendar tasks={calTasks} onUpdate={saveCalendar} />
      </Section>

      {/* Social / Launch Content */}
      <Section title="Launch Content">
        <SocialPosts posts={socialPosts} onUpdate={saveSocial} />
      </Section>

      {/* Notes */}
      <Section title="GTM Notes">
        <TextArea
          value={ini.gtm_notes}
          onChange={v => save({ gtm_notes: v })}
          placeholder="Internal notes, open questions, stakeholder feedback..."
          rows={4}
        />
      </Section>
    </div>
  );
}
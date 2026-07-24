import { useState } from "react";
import { T, css } from "../lib/tokens";
import { AIBox, Tag } from "../components/ui";
import { useApp } from "../contexts/AppContext";
import { callAI } from "../lib/api";
import { uploadFile } from "../lib/api";

const TABS = [
  ["mission", "Mission & Vision"],
  ["okrs", "OKRs"],
  ["strategy", "Strategy"],
  ["capabilities", "Capabilities"],
  ["products", "Products"],
  ["architecture", "Architecture"],
];

export function Foundation() {
  const {
    orgId, foundation, setFoundation,
    addOKR, removeOKR, updateOKRLocal,
    addTheme, removeTheme, updateThemesLocal,
    addCapability, removeCap, updateCapsLocal,
    addProduct, updateProductLocal, removeProduct,
  } = useApp();

  const [tab, setTab] = useState("mission");
  const [aiSuggest, setAiSuggest] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!foundation) return null;
  const f = foundation;

  const suggest = async (what) => {
    setLoadingAI(true);
    setAiSuggest("");
    const text = await callAI("suggest", { foundation: f, what }).catch(() => "");
    setAiSuggest(text);
    setLoadingAI(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setUploading(true);
    try {
      const res = await uploadFile(file, orgId);
      if (res.data) {
        setFoundation(f => ({ ...f, architecture: [...(f.architecture || []), res.data] }));
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div style={css.h2}>Enterprise Foundation</div>
      <div style={css.sub}>Your organization's strategic context. AI references this in every recommendation.</div>

      <div style={{ display: "flex", gap: 0, background: T.ink3, borderRadius: 8, padding: 3, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(([id, lbl]) => (
          <button key={id} onClick={() => { setTab(id); setAiSuggest(""); }}
            style={{ ...css.btnGhost, borderRadius: 6, border: "none", background: tab === id ? T.ink2 : "transparent", color: tab === id ? T.gold : T.muted, fontWeight: tab === id ? 700 : 400, margin: 2, fontSize: 12 }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── MISSION ── */}
      {tab === "mission" && (
        <div>
          <div style={css.card}>
            <label style={css.label}>Mission Statement</label>
            <textarea rows={3} style={css.ta} value={f.mission}
              onChange={e => setFoundation(d => ({ ...d, mission: e.target.value }))} />
          </div>
          <div style={css.card}>
            <label style={css.label}>Vision</label>
            <textarea rows={3} style={css.ta} value={f.vision}
              onChange={e => setFoundation(d => ({ ...d, vision: e.target.value }))} />
          </div>
          <div style={css.card}>
            <label style={css.label}>Core Values</label>
            {f.values.map((v, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <input style={{ ...css.input, flex: 1 }} value={v}
                  onChange={e => {
                    const nv = [...f.values]; nv[i] = e.target.value;
                    setFoundation(d => ({ ...d, values: nv }));
                  }} />
                <button style={css.btnGhost} onClick={() => setFoundation(d => ({ ...d, values: d.values.filter((_, j) => j !== i) }))}>✕</button>
              </div>
            ))}
            <button style={css.btnGhost} onClick={() => setFoundation(d => ({ ...d, values: [...d.values, ""] }))}>+ Add Value</button>
          </div>
        </div>
      )}

      {/* ── OKRs ── */}
      {tab === "okrs" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Company OKRs</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={css.btnOut} onClick={() => suggest("3 additional OKRs")}>◆ AI Suggest OKRs</button>
              <button style={css.btnGhost} onClick={addOKR}>+ Add OKR</button>
            </div>
          </div>
          {(f.okrs || []).map((okr, i) => (
            <div key={okr.id} style={{ ...css.card, borderLeft: `3px solid ${T.gold}` }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input style={{ ...css.input, flex: 1 }} placeholder="Objective statement" value={okr.objective}
                  onChange={e => {
                    const no = [...f.okrs]; no[i] = { ...no[i], objective: e.target.value };
                    updateOKRLocal(no);
                  }} />
                <input style={{ ...css.input, width: 120 }} placeholder="Owner" value={okr.owner}
                  onChange={e => {
                    const no = [...f.okrs]; no[i] = { ...no[i], owner: e.target.value };
                    updateOKRLocal(no);
                  }} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
                  <span style={{ fontSize: 10, color: T.muted, marginBottom: 2 }}>Progress</span>
                  <input type="number" min="0" max="100" style={{ ...css.input, width: 60, textAlign: "center", fontSize: 13, fontWeight: 700, color: T.gold, padding: "4px 6px" }}
                    value={okr.progress}
                    onChange={e => {
                      const no = [...f.okrs]; no[i] = { ...no[i], progress: parseInt(e.target.value) || 0 };
                      updateOKRLocal(no);
                    }} />
                </div>
                <button style={{ ...css.btnGhost, color: T.red, borderColor: T.red }} onClick={() => removeOKR(okr.id)}>✕</button>
              </div>
              <label style={css.label}>Key Results</label>
              {(okr.key_results || okr.krs || []).map((kr, j) => (
                <div key={j} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                  <span style={{ color: T.muted, fontSize: 12, paddingTop: 9 }}>▸</span>
                  <input style={{ ...css.input, flex: 1 }} value={kr}
                    onChange={e => {
                      const no = [...f.okrs];
                      const krs = [...(no[i].key_results || no[i].krs || [])];
                      krs[j] = e.target.value;
                      no[i] = { ...no[i], key_results: krs, krs };
                      updateOKRLocal(no);
                    }} />
                </div>
              ))}
              <button style={{ ...css.btnGhost, fontSize: 11, marginTop: 4 }}
                onClick={() => {
                  const no = [...f.okrs];
                  const krs = [...(no[i].key_results || no[i].krs || []), ""];
                  no[i] = { ...no[i], key_results: krs, krs };
                  updateOKRLocal(no);
                }}>+ Key Result</button>
            </div>
          ))}
          {(aiSuggest || loadingAI) && <AIBox label="◆ Strategy Advisor" loading={loadingAI}>{aiSuggest}</AIBox>}
        </div>
      )}

      {/* ── STRATEGY ── */}
      {tab === "strategy" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Strategic Themes</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={css.btnOut} onClick={() => suggest("strategic themes aligned with the mission and current OKRs")}>◆ AI Suggest</button>
              <button style={css.btnGhost} onClick={addTheme}>+ Add Theme</button>
            </div>
          </div>
          {(f.strategies || []).map((s, i) => (
            <div key={s.id} style={{ ...css.card, position: "relative" }}>
              <button style={{ position: "absolute", top: 12, right: 12, ...css.btnGhost, color: T.red, borderColor: T.red, padding: "3px 8px", fontSize: 11 }}
                onClick={() => removeTheme(s.id)}>✕</button>
              <div style={{ display: "flex", gap: 8, marginBottom: 6, paddingRight: 36 }}>
                <input style={{ ...css.input, flex: 1, fontWeight: 600 }} value={s.name}
                  onChange={e => { const ns = [...f.strategies]; ns[i] = { ...ns[i], name: e.target.value }; updateThemesLocal(ns); }} />
                <input style={{ ...css.input, width: 180 }} placeholder="Theme" value={s.theme}
                  onChange={e => { const ns = [...f.strategies]; ns[i] = { ...ns[i], theme: e.target.value }; updateThemesLocal(ns); }} />
              </div>
              <textarea rows={2} style={css.ta} value={s.description}
                onChange={e => { const ns = [...f.strategies]; ns[i] = { ...ns[i], description: e.target.value }; updateThemesLocal(ns); }} />
            </div>
          ))}
          {(aiSuggest || loadingAI) && <AIBox label="◆ Strategy Advisor" loading={loadingAI}>{aiSuggest}</AIBox>}
        </div>
      )}

      {/* ── CAPABILITIES ── */}
      {tab === "capabilities" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Business Capabilities</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={css.btnOut} onClick={() => suggest("business capabilities a wealth management platform should have")}>◆ AI Suggest</button>
              <button style={css.btnGhost} onClick={addCapability}>+ Add</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(f.capabilities || []).map((c, i) => (
              <div key={c.id} style={{ ...css.card, position: "relative" }}>
                <button style={{ position: "absolute", top: 8, right: 8, ...css.btnGhost, color: T.red, borderColor: T.red, padding: "2px 6px", fontSize: 10 }}
                  onClick={() => removeCap(c.id)}>✕</button>
                <input style={{ ...css.input, fontWeight: 600, marginBottom: 6, paddingRight: 32 }} value={c.name}
                  onChange={e => { const nc = [...f.capabilities]; nc[i] = { ...nc[i], name: e.target.value }; updateCapsLocal(nc); }} />
                <textarea rows={2} style={css.ta} value={c.description}
                  onChange={e => { const nc = [...f.capabilities]; nc[i] = { ...nc[i], description: e.target.value }; updateCapsLocal(nc); }} />
              </div>
            ))}
          </div>
          {(aiSuggest || loadingAI) && <AIBox label="◆ Strategy Advisor" loading={loadingAI}>{aiSuggest}</AIBox>}
        </div>
      )}

      {/* ── PRODUCTS ── */}
      {tab === "products" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={css.secHead}>Product Portfolio</div>
            <button style={css.btnGhost} onClick={addProduct}>+ Add Product</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            {(f.products || []).map((p) => (
              <div key={p.id} style={{ ...css.card, borderLeft: `3px solid ${T.steel}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <input style={{ ...css.input, fontWeight: 700, border: "none", background: "transparent", padding: "0", fontSize: 14 }}
                    value={p.name}
                    onChange={e => updateProductLocal(p.id, { name: e.target.value })} />
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Tag label={p.stage} color={p.stage === "GA" ? T.green : T.amber} />
                    <button style={{ ...css.btnGhost, color: T.red, borderColor: T.red, padding: "2px 6px", fontSize: 10 }}
                      onClick={() => removeProduct(p.id)}>✕</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...css.input, flex: 1, fontSize: 11 }} value={p.type}
                    onChange={e => updateProductLocal(p.id, { type: e.target.value })} placeholder="Product type" />
                  <select style={{ ...css.input, width: 90, fontSize: 11, cursor: "pointer" }} value={p.stage}
                    onChange={e => updateProductLocal(p.id, { stage: e.target.value })}>
                    {["Alpha", "Beta", "GA", "Deprecated"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ARCHITECTURE ── */}
      {tab === "architecture" && (
        <div>
          <div style={css.secHead}>Architecture Knowledge Base</div>
          <div style={{ ...css.card, textAlign: "center", padding: "40px 24px", borderStyle: "dashed" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⊞</div>
            <div style={{ fontSize: 15, color: T.loud, marginBottom: 6 }}>Upload Architecture Diagrams</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>PNG, JPG — AI extracts systems, APIs, and integrations</div>
            <label style={{ ...css.btnGold, display: "inline-block", cursor: "pointer" }}>
              {uploading ? "Uploading…" : "Upload Diagram"}
              <input type="file" accept=".png,.jpg,.jpeg,.pdf,.pptx" style={{ display: "none" }} onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
          {(f.architecture || []).map(asset => (
            <div key={asset.id} style={{ ...css.card, borderLeft: `3px solid ${T.ice}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.loud }}>{asset.filename}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{asset.file_type} · {Math.round((asset.file_size || 0) / 1024)}KB</div>
                </div>
                <Tag label="Analyzed" color={T.ice} />
              </div>
              {asset.ai_analysis && (
                <div style={{ fontSize: 12, color: T.body, lineHeight: 1.65, whiteSpace: "pre-wrap", background: T.ink3, padding: 12, borderRadius: 6 }}>
                  {asset.ai_analysis}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

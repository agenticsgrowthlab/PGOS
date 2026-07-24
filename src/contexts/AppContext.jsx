import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  getFoundation, updateOrg, checkSeedStatus,
  listInitiatives, updateInitiative, createInitiative,
  bulkUpdateOKRs, bulkUpdateThemes, bulkUpdateCaps,
  createOKR, deleteOKR, createTheme, deleteTheme,
  createCapability, deleteCapability, createProduct,
  updateProduct, deleteProduct,
  updatePreferences,
} from "../lib/api";
import { normalizeInitiative, denormalizeInitiative } from "../lib/tokens";

// ─── Context ──────────────────────────────────────────────────
const AppContext = createContext(null);

// ─── Debounce helper ─────────────────────────────────────────
function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

// ─── Provider ─────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [foundation, setFoundationState] = useState(null);
  const [initiatives, setInitiativesState] = useState([]);
  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState("Nicole");
  const [roadmapLastSaved, setRoadmapLastSaved] = useState(null);

  // ── Bootstrap: load everything on mount ────────────────────
  useEffect(() => {
    async function bootstrap() {
      try {
        const seedRes = await checkSeedStatus();
        if (!seedRes.data?.seeded) {
          setError("Database not seeded. Please run pgos_schema.sql in Neon.");
          setLoading(false);
          return;
        }

        const [foundRes, inisRes] = await Promise.all([
          getFoundation(),
          listInitiatives(seedRes.data.org_id),
        ]);

        const org = foundRes.data;
        setOrgId(org.id);
        setUserName(org.preferences?.user_name || "Nicole");
        if (org.preferences?.preferences?.roadmap_last_saved) {
          setRoadmapLastSaved(new Date(org.preferences.preferences.roadmap_last_saved));
        }
        setFoundationState({
          id: org.id,
          name: org.name,
          mission: org.mission,
          vision: org.vision,
          values: org.values || [],
          okrs: org.okrs || [],
          strategies: org.strategies || [],
          capabilities: org.capabilities || [],
          products: org.products || [],
          architecture: org.architecture || [],
        });
        setInitiativesState((inisRes.data || []).map(normalizeInitiative));
      } catch (err) {
        console.error("Bootstrap error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  // ── FOUNDATION: debounced org-level updates ─────────────────
  const persistOrg = useDebounce(async (updated) => {
    if (!updated.id) return;
    try {
      await updateOrg({
        id: updated.id,
        name: updated.name || "Organization",
        mission: updated.mission,
        vision: updated.vision,
        values: updated.values,
      });
    } catch (err) {
      console.error("Org update error:", err);
    }
  }, 1200);

  const setFoundation = useCallback((updater) => {
    setFoundationState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persistOrg(next);
      return next;
    });
  }, [persistOrg]);

  // ── OKR persistence ─────────────────────────────────────────
  const persistOKRs = useDebounce(async (okrs) => {
    if (!orgId || !okrs?.length) return;
    // Only bulk-update OKRs that have real UUIDs (already in DB)
    const existing = okrs.filter(o => o.id && !String(o.id).startsWith("tmp_"));
    if (existing.length) {
      await bulkUpdateOKRs(existing).catch(console.error);
    }
  }, 1500);

  const addOKR = useCallback(async () => {
    if (!orgId) return;
    const res = await createOKR({
      org_id: orgId, objective: "", key_results: [""], owner: "", progress: 0,
      sort_order: foundation?.okrs?.length || 0,
    });
    if (res.data) {
      setFoundationState(f => ({ ...f, okrs: [...(f.okrs || []), res.data] }));
    }
  }, [orgId, foundation]);

  const removeOKR = useCallback(async (id) => {
    await deleteOKR(id).catch(console.error);
    setFoundationState(f => ({ ...f, okrs: f.okrs.filter(o => o.id !== id) }));
  }, []);

  const updateOKRLocal = useCallback((updatedOKRs) => {
    setFoundationState(f => ({ ...f, okrs: updatedOKRs }));
    persistOKRs(updatedOKRs);
  }, [persistOKRs]);

  // ── Theme persistence ────────────────────────────────────────
  const persistThemes = useDebounce(async (themes) => {
    if (!orgId || !themes?.length) return;
    const existing = themes.filter(t => t.id && !String(t.id).startsWith("tmp_"));
    if (existing.length) await bulkUpdateThemes(existing).catch(console.error);
  }, 1500);

  const addTheme = useCallback(async () => {
    if (!orgId) return;
    const res = await createTheme({
      org_id: orgId, name: "", theme: "", description: "",
      sort_order: foundation?.strategies?.length || 0,
    });
    if (res.data) setFoundationState(f => ({ ...f, strategies: [...(f.strategies || []), res.data] }));
  }, [orgId, foundation]);

  const removeTheme = useCallback(async (id) => {
    await deleteTheme(id).catch(console.error);
    setFoundationState(f => ({ ...f, strategies: f.strategies.filter(t => t.id !== id) }));
  }, []);

  const updateThemesLocal = useCallback((themes) => {
    setFoundationState(f => ({ ...f, strategies: themes }));
    persistThemes(themes);
  }, [persistThemes]);

  // ── Capability persistence ────────────────────────────────────
  const persistCaps = useDebounce(async (caps) => {
    if (!orgId || !caps?.length) return;
    const existing = caps.filter(c => c.id && !String(c.id).startsWith("tmp_"));
    if (existing.length) await bulkUpdateCaps(existing).catch(console.error);
  }, 1500);

  const addCapability = useCallback(async () => {
    if (!orgId) return;
    const res = await createCapability({
      org_id: orgId, name: "", description: "",
      sort_order: foundation?.capabilities?.length || 0,
    });
    if (res.data) setFoundationState(f => ({ ...f, capabilities: [...(f.capabilities || []), res.data] }));
  }, [orgId, foundation]);

  const removeCap = useCallback(async (id) => {
    await deleteCapability(id).catch(console.error);
    setFoundationState(f => ({ ...f, capabilities: f.capabilities.filter(c => c.id !== id) }));
  }, []);

  const updateCapsLocal = useCallback((caps) => {
    setFoundationState(f => ({ ...f, capabilities: caps }));
    persistCaps(caps);
  }, [persistCaps]);

  // ── Product persistence ──────────────────────────────────────
  const addProduct = useCallback(async () => {
    if (!orgId) return;
    const res = await createProduct({
      org_id: orgId, name: "New Product", type: "Internal Tool", stage: "Alpha", advisors: "",
      sort_order: foundation?.products?.length || 0,
    });
    if (res.data) setFoundationState(f => ({ ...f, products: [...(f.products || []), res.data] }));
  }, [orgId, foundation]);

  const updateProductLocal = useCallback((id, changes) => {
    setFoundationState(f => ({
      ...f, products: f.products.map(p => p.id === id ? { ...p, ...changes } : p),
    }));
    updateProduct({ id, ...changes }).catch(console.error);
  }, []);

  const removeProduct = useCallback(async (id) => {
    await deleteProduct(id).catch(console.error);
    setFoundationState(f => ({ ...f, products: f.products.filter(p => p.id !== id) }));
  }, []);

  // ── INITIATIVES ──────────────────────────────────────────────
  const persistIni = useDebounce(async (ini) => {
    if (!ini.id) return;
    try {
      await updateInitiative(denormalizeInitiative(ini));
    } catch (err) {
      console.error("Initiative persist error:", err);
    }
  }, 800);

  // Update one initiative in local state + persist to DB
  const updateIni = useCallback((id, updater) => {
    setInitiativesState(prev => {
      const next = prev.map(i => {
        if (i.id !== id) return i;
        const updated = typeof updater === "function" ? updater(i) : { ...i, ...updater };
        persistIni(updated);
        return updated;
      });
      return next;
    });
  }, [persistIni]);

  // Create a new initiative (persists immediately)
  const addInitiative = useCallback(async (formData) => {
    if (!orgId) return null;
    const res = await createInitiative({ org_id: orgId, ...formData });
    if (res.data) {
      const normalized = normalizeInitiative(res.data);
      setInitiativesState(prev => [...prev, normalized]);
      return normalized;
    }
    return null;
  }, [orgId]);

  // ── Roadmap last saved ──────────────────────────────────────
  const saveRoadmapTimestamp = useCallback(async () => {
    if (!orgId) return;
    const now = new Date();
    setRoadmapLastSaved(now);
    try {
      await updatePreferences({
        org_id: orgId,
        user_name: userName,
        preferences: { roadmap_last_saved: now.toISOString() },
      });
    } catch (err) {
      console.error("Save roadmap timestamp error:", err);
    }
  }, [orgId, userName]);

  // ── Context value ────────────────────────────────────────────
  const value = {
    orgId, loading, error, userName,

    // Foundation
    foundation, setFoundation,
    addOKR, removeOKR, updateOKRLocal,
    addTheme, removeTheme, updateThemesLocal,
    addCapability, removeCap, updateCapsLocal,
    addProduct, updateProductLocal, removeProduct,

    // Roadmap timestamp
    roadmapLastSaved, saveRoadmapTimestamp,

    // Initiatives
    initiatives, updateIni, addInitiative,
    setInitiatives: setInitiativesState,  // for bulk refresh
    refreshInitiatives: async () => {
      if (!orgId) return;
      const res = await listInitiatives(orgId);
      setInitiativesState((res.data || []).map(normalizeInitiative));
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
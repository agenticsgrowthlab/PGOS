/**
 * PGOS API client — all calls to /api/* go through here
 * No API keys in the browser. All AI is server-side.
 */

const BASE = "";  // same origin

// ─── Core fetch ───────────────────────────────────────────────
async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── AI ───────────────────────────────────────────────────────
export async function callAI(action, payload) {
  const result = await post("/api/ai", { action, payload });
  return result.text || "";
}

// ─── DATA ─────────────────────────────────────────────────────
export function data(resource, action, payload = {}) {
  return post("/api/data", { resource, action, payload });
}

// ─── Convenience wrappers ─────────────────────────────────────

// Organization / Foundation
export const getFoundation        = () => data("organization", "get");
export const updateOrg            = (payload) => data("organization", "update", payload);
export const checkSeedStatus      = () => data("seed_status", "get");

// OKRs
export const createOKR            = (payload) => data("okrs", "create", payload);
export const updateOKR            = (payload) => data("okrs", "update", payload);
export const deleteOKR            = (id)      => data("okrs", "delete", { id });
export const bulkUpdateOKRs       = (items)   => data("okrs", "bulk_update", { items });

// Strategic Themes
export const createTheme          = (payload) => data("themes", "create", payload);
export const updateTheme          = (payload) => data("themes", "update", payload);
export const deleteTheme          = (id)      => data("themes", "delete", { id });
export const bulkUpdateThemes     = (items)   => data("themes", "bulk_update", { items });

// Capabilities
export const createCapability     = (payload) => data("capabilities", "create", payload);
export const updateCapability     = (payload) => data("capabilities", "update", payload);
export const deleteCapability     = (id)      => data("capabilities", "delete", { id });
export const bulkUpdateCaps       = (items)   => data("capabilities", "bulk_update", { items });

// Products
export const createProduct        = (payload) => data("products", "create", payload);
export const updateProduct        = (payload) => data("products", "update", payload);
export const deleteProduct        = (id)      => data("products", "delete", { id });

// Initiatives
export const listInitiatives      = (org_id)  => data("initiatives", "list", { org_id });
export const getInitiative        = (id)      => data("initiatives", "get", { id });
export const createInitiative     = (payload) => data("initiatives", "create", payload);
export const updateInitiative     = (payload) => data("initiatives", "update", payload);
export const deleteInitiative     = (id)      => data("initiatives", "delete", { id });

// Stakeholder notes
export const createNote           = (payload) => data("notes", "create", payload);
export const deleteNote           = (id)      => data("notes", "delete", { id });

// Conversations
export const listConversations    = (org_id, initiative_id) => data("conversations", "list", { org_id, initiative_id });
export const saveMessage          = (payload) => data("conversations", "create", payload);
export const clearConversations   = (org_id)  => data("conversations", "clear", { org_id });

// Preferences
export const getPreferences       = (org_id)  => data("preferences", "get", { org_id });
export const updatePreferences    = (payload) => data("preferences", "update", payload);

// ─── File upload ──────────────────────────────────────────────
export async function uploadFile(file, org_id) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("org_id", org_id);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Upload failed: HTTP ${res.status}`);
  }
  return res.json();
}

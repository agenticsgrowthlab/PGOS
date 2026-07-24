/**
 * /api/data  — Single data endpoint for all PGOS CRUD operations
 *
 * Body: { resource, action, payload }
 *
 * resources: organization, okrs, themes, capabilities, products,
 *            initiatives, notes, conversations, preferences, seed_status
 *
 * actions: get, create, update, delete, list, bulk_update
 */

import { neon } from "@neondatabase/serverless";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  return neon(url);
}

// ─── ORGANIZATION ──────────────────────────────────────────────
async function handleOrganization(sql, action, payload) {
  switch (action) {
    case "get": {
      const rows = await sql`SELECT * FROM organization LIMIT 1`;
      if (!rows.length) return { data: null };
      const org = rows[0];
      // Attach nested data for a full foundation load in one call
      const [okrs, themes, caps, prods, assets, prefs] = await Promise.all([
        sql`SELECT * FROM okrs WHERE org_id=${org.id} ORDER BY sort_order`,
        sql`SELECT * FROM strategic_themes WHERE org_id=${org.id} ORDER BY sort_order`,
        sql`SELECT * FROM capabilities WHERE org_id=${org.id} ORDER BY sort_order`,
        sql`SELECT * FROM products WHERE org_id=${org.id} ORDER BY sort_order`,
        sql`SELECT * FROM architecture_assets WHERE org_id=${org.id} ORDER BY uploaded_at`,
        sql`SELECT * FROM user_preferences WHERE org_id=${org.id} LIMIT 1`,
      ]);
      return {
        data: {
          ...org,
          okrs,
          strategies: themes,
          capabilities: caps,
          products: prods,
          architecture: assets,
          preferences: prefs[0] || { user_name: "Nicole" },
        },
      };
    }

    case "update": {
      const { id, name, mission, vision, values } = payload;
      const rows = await sql`
        UPDATE organization SET
          name=${name}, mission=${mission}, vision=${vision}, values=${values}
        WHERE id=${id}
        RETURNING *
      `;
      return { data: rows[0] };
    }

    default:
      throw new Error(`Unknown action for organization: ${action}`);
  }
}

// ─── OKRs ──────────────────────────────────────────────────────
async function handleOkrs(sql, action, payload) {
  switch (action) {
    case "create": {
      const { org_id, objective, key_results, owner, progress, sort_order } = payload;
      const rows = await sql`
        INSERT INTO okrs (org_id, objective, key_results, owner, progress, sort_order)
        VALUES (${org_id}, ${objective}, ${key_results}, ${owner}, ${progress || 0}, ${sort_order || 0})
        RETURNING *
      `;
      return { data: rows[0] };
    }
    case "update": {
      const { id, objective, key_results, owner, progress } = payload;
      const rows = await sql`
        UPDATE okrs SET objective=${objective}, key_results=${key_results}, owner=${owner}, progress=${progress}
        WHERE id=${id} RETURNING *
      `;
      return { data: rows[0] };
    }
    case "delete": {
      await sql`DELETE FROM okrs WHERE id=${payload.id}`;
      return { data: { id: payload.id } };
    }
    case "bulk_update": {
      // payload.items = array of { id, objective, key_results, owner, progress }
      const results = await Promise.all(
        payload.items.map(item =>
          sql`UPDATE okrs SET objective=${item.objective}, key_results=${item.key_results},
              owner=${item.owner}, progress=${item.progress}
              WHERE id=${item.id} RETURNING *`
        )
      );
      return { data: results.map(r => r[0]) };
    }
    default:
      throw new Error(`Unknown action for okrs: ${action}`);
  }
}

// ─── THEMES ────────────────────────────────────────────────────
async function handleThemes(sql, action, payload) {
  switch (action) {
    case "create": {
      const rows = await sql`
        INSERT INTO strategic_themes (org_id, name, theme, description, sort_order)
        VALUES (${payload.org_id}, ${payload.name}, ${payload.theme}, ${payload.description}, ${payload.sort_order || 0})
        RETURNING *
      `;
      return { data: rows[0] };
    }
    case "update": {
      const rows = await sql`
        UPDATE strategic_themes SET name=${payload.name}, theme=${payload.theme}, description=${payload.description}
        WHERE id=${payload.id} RETURNING *
      `;
      return { data: rows[0] };
    }
    case "delete": {
      await sql`DELETE FROM strategic_themes WHERE id=${payload.id}`;
      return { data: { id: payload.id } };
    }
    case "bulk_update": {
      const results = await Promise.all(
        payload.items.map(item =>
          sql`UPDATE strategic_themes SET name=${item.name}, theme=${item.theme}, description=${item.description}
              WHERE id=${item.id} RETURNING *`
        )
      );
      return { data: results.map(r => r[0]) };
    }
    default:
      throw new Error(`Unknown action for themes: ${action}`);
  }
}

// ─── CAPABILITIES ──────────────────────────────────────────────
async function handleCapabilities(sql, action, payload) {
  switch (action) {
    case "create": {
      const rows = await sql`
        INSERT INTO capabilities (org_id, name, description, sort_order)
        VALUES (${payload.org_id}, ${payload.name}, ${payload.description}, ${payload.sort_order || 0})
        RETURNING *
      `;
      return { data: rows[0] };
    }
    case "update": {
      const rows = await sql`
        UPDATE capabilities SET name=${payload.name}, description=${payload.description}
        WHERE id=${payload.id} RETURNING *
      `;
      return { data: rows[0] };
    }
    case "delete": {
      await sql`DELETE FROM capabilities WHERE id=${payload.id}`;
      return { data: { id: payload.id } };
    }
    case "bulk_update": {
      const results = await Promise.all(
        payload.items.map(item =>
          sql`UPDATE capabilities SET name=${item.name}, description=${item.description}
              WHERE id=${item.id} RETURNING *`
        )
      );
      return { data: results.map(r => r[0]) };
    }
    default:
      throw new Error(`Unknown action for capabilities: ${action}`);
  }
}

// ─── PRODUCTS ──────────────────────────────────────────────────
async function handleProducts(sql, action, payload) {
  switch (action) {
    case "create": {
      const rows = await sql`
        INSERT INTO products (org_id, name, type, stage, advisors, sort_order)
        VALUES (${payload.org_id}, ${payload.name}, ${payload.type}, ${payload.stage}, ${payload.advisors}, ${payload.sort_order || 0})
        RETURNING *
      `;
      return { data: rows[0] };
    }
    case "update": {
      const rows = await sql`
        UPDATE products SET name=${payload.name}, type=${payload.type}, stage=${payload.stage}, advisors=${payload.advisors}
        WHERE id=${payload.id} RETURNING *
      `;
      return { data: rows[0] };
    }
    case "delete": {
      await sql`DELETE FROM products WHERE id=${payload.id}`;
      return { data: { id: payload.id } };
    }
    default:
      throw new Error(`Unknown action for products: ${action}`);
  }
}

// ─── INITIATIVES ───────────────────────────────────────────────
async function handleInitiatives(sql, action, payload) {
  switch (action) {
    case "list": {
      const rows = await sql`
        SELECT i.*,
          o.objective as okr_name,
          t.name as theme_name,
          c.name as capability_name,
          json_agg(DISTINCT sn.*) FILTER (WHERE sn.id IS NOT NULL) as stakeholder_notes
        FROM initiatives i
        LEFT JOIN okrs o ON i.okr_id = o.id
        LEFT JOIN strategic_themes t ON i.theme_id = t.id
        LEFT JOIN capabilities c ON i.capability_id = c.id
        LEFT JOIN stakeholder_notes sn ON sn.initiative_id = i.id
        WHERE i.org_id = ${payload.org_id}
        GROUP BY i.id, o.objective, t.name, c.name
        ORDER BY i.sort_order, i.created_at
      `;
      return { data: rows };
    }

    case "get": {
      const rows = await sql`
        SELECT i.*,
          o.objective as okr_name,
          t.name as theme_name,
          c.name as capability_name,
          json_agg(DISTINCT sn.*) FILTER (WHERE sn.id IS NOT NULL) as stakeholder_notes
        FROM initiatives i
        LEFT JOIN okrs o ON i.okr_id = o.id
        LEFT JOIN strategic_themes t ON i.theme_id = t.id
        LEFT JOIN capabilities c ON i.capability_id = c.id
        LEFT JOIN stakeholder_notes sn ON sn.initiative_id = i.id
        WHERE i.id = ${payload.id}
        GROUP BY i.id, o.objective, t.name, c.name
      `;
      return { data: rows[0] || null };
    }

    case "create": {
      const p = payload;
      // Auto-generate slug like INI-004
      const countRow = await sql`SELECT COUNT(*) as cnt FROM initiatives WHERE org_id=${p.org_id}`;
      const count = parseInt(countRow[0].cnt) + 1;
      const slug = `INI-${String(count).padStart(3, "0")}`;

      const rows = await sql`
        INSERT INTO initiatives (
          org_id, slug, title, stage, source, source_detail, problem, opportunity,
          okr_id, theme_id, capability_id
        ) VALUES (
          ${p.org_id}, ${slug}, ${p.title}, 'idea',
          ${p.source || 'Executive Idea'}, ${p.source_detail || ''},
          ${p.problem || ''}, ${p.opportunity || ''},
          ${p.okr_id || null}, ${p.theme_id || null}, ${p.capability_id || null}
        ) RETURNING *
      `;
      return { data: rows[0] };
    }

    case "update": {
      const p = payload;
      const rows = await sql`
        UPDATE initiatives SET
          title           = COALESCE(${p.title}, title),
          stage           = COALESCE(${p.stage}, stage),
          source          = COALESCE(${p.source}, source),
          source_detail   = COALESCE(${p.source_detail}, source_detail),
          problem         = COALESCE(${p.problem}, problem),
          opportunity     = COALESCE(${p.opportunity}, opportunity),
          okr_id          = ${p.okr_id !== undefined ? p.okr_id : null}::uuid,
          theme_id        = ${p.theme_id !== undefined ? p.theme_id : null}::uuid,
          capability_id   = ${p.capability_id !== undefined ? p.capability_id : null}::uuid,
          pivot_p         = COALESCE(${p.pivot_p}, pivot_p),
          pivot_i         = COALESCE(${p.pivot_i}, pivot_i),
          pivot_v         = COALESCE(${p.pivot_v}, pivot_v),
          pivot_o         = COALESCE(${p.pivot_o}, pivot_o),
          pivot_t         = COALESCE(${p.pivot_t}, pivot_t),
          evidence_interviews      = COALESCE(${p.evidence_interviews}, evidence_interviews),
          evidence_pain_confirmed  = COALESCE(${p.evidence_pain_confirmed}, evidence_pain_confirmed),
          evidence_revenue_opp     = COALESCE(${p.evidence_revenue_opp}, evidence_revenue_opp),
          evidence_cost_savings    = COALESCE(${p.evidence_cost_savings}, evidence_cost_savings),
          evidence_competitive     = COALESCE(${p.evidence_competitive}, evidence_competitive),
          evidence_nps             = COALESCE(${p.evidence_nps}, evidence_nps),
          investment_requested     = COALESCE(${p.investment_requested}, investment_requested),
          investment_approved      = COALESCE(${p.investment_approved}, investment_approved),
          eng_teams       = COALESCE(${p.eng_teams}, eng_teams),
          eng_sprints     = COALESCE(${p.eng_sprints}, eng_sprints),
          eng_estimate    = COALESCE(${p.eng_estimate}, eng_estimate),
          approved        = COALESCE(${p.approved}, approved),
          approved_by     = COALESCE(${p.approved_by}, approved_by),
          approved_date   = COALESCE(${p.approved_date}, approved_date),
          wsjf_biz_value       = COALESCE(${p.wsjf_biz_value}, wsjf_biz_value),
          wsjf_time_crit       = COALESCE(${p.wsjf_time_crit}, wsjf_time_crit),
          wsjf_risk_reduction  = COALESCE(${p.wsjf_risk_reduction}, wsjf_risk_reduction),
          wsjf_effort          = COALESCE(${p.wsjf_effort}, wsjf_effort),
          pivot_coach      = COALESCE(${p.pivot_coach}, pivot_coach),
          eng_estimate_ai  = COALESCE(${p.eng_estimate_ai}, eng_estimate_ai),
          exec_brief       = COALESCE(${p.exec_brief}, exec_brief),
          one_pager        = COALESCE(${p.one_pager}, one_pager),
          personas         = COALESCE(${p.personas}, personas),
          current_journey  = COALESCE(${p.current_journey}, current_journey),
          future_journey   = COALESCE(${p.future_journey}, future_journey),
          jtbd             = COALESCE(${p.jtbd}, jtbd),
          use_cases        = COALESCE(${p.use_cases}, use_cases),
          epics            = COALESCE(${p.epics}, epics),
          risk_register    = COALESCE(${p.risk_register}, risk_register),
          pi_planning      = COALESCE(${p.pi_planning}, pi_planning),
          handoff_package  = COALESCE(${p.handoff_package}, handoff_package)
        WHERE id = ${p.id}
        RETURNING *
      `;
      return { data: rows[0] };
    }

    case "delete": {
      await sql`DELETE FROM initiatives WHERE id=${payload.id}`;
      return { data: { id: payload.id } };
    }

    default:
      throw new Error(`Unknown action for initiatives: ${action}`);
  }
}

// ─── NOTES ─────────────────────────────────────────────────────
async function handleNotes(sql, action, payload) {
  switch (action) {
    case "create": {
      const rows = await sql`
        INSERT INTO stakeholder_notes (initiative_id, author, note)
        VALUES (${payload.initiative_id}, ${payload.author}, ${payload.note})
        RETURNING *
      `;
      return { data: rows[0] };
    }
    case "delete": {
      await sql`DELETE FROM stakeholder_notes WHERE id=${payload.id}`;
      return { data: { id: payload.id } };
    }
    default:
      throw new Error(`Unknown action for notes: ${action}`);
  }
}

// ─── CONVERSATIONS (Chatty history) ───────────────────────────
async function handleConversations(sql, action, payload) {
  switch (action) {
    case "list": {
      const rows = await sql`
        SELECT * FROM ai_conversations
        WHERE org_id=${payload.org_id}
          AND (${payload.initiative_id || null}::uuid IS NULL OR initiative_id=${payload.initiative_id})
        ORDER BY created_at ASC
        LIMIT 50
      `;
      return { data: rows };
    }
    case "create": {
      const rows = await sql`
        INSERT INTO ai_conversations (org_id, initiative_id, role, content, context_view)
        VALUES (${payload.org_id}, ${payload.initiative_id || null}, ${payload.role}, ${payload.content}, ${payload.context_view || null})
        RETURNING *
      `;
      return { data: rows[0] };
    }
    case "clear": {
      await sql`DELETE FROM ai_conversations WHERE org_id=${payload.org_id}`;
      return { data: { cleared: true } };
    }
    default:
      throw new Error(`Unknown action for conversations: ${action}`);
  }
}

// ─── PREFERENCES ───────────────────────────────────────────────
async function handlePreferences(sql, action, payload) {
  switch (action) {
    case "get": {
      const rows = await sql`SELECT * FROM user_preferences WHERE org_id=${payload.org_id} LIMIT 1`;
      return { data: rows[0] || { user_name: "Nicole" } };
    }
    case "update": {
      const rows = await sql`
        INSERT INTO user_preferences (org_id, user_name, preferences)
        VALUES (${payload.org_id}, ${payload.user_name}, ${JSON.stringify(payload.preferences || {})})
        ON CONFLICT (org_id) DO UPDATE SET
          user_name=${payload.user_name},
          preferences=${JSON.stringify(payload.preferences || {})}
        RETURNING *
      `;
      return { data: rows[0] };
    }
    default:
      throw new Error(`Unknown action for preferences: ${action}`);
  }
}

// ─── SEED STATUS ───────────────────────────────────────────────
async function handleSeedStatus(sql) {
  const rows = await sql`SELECT id FROM organization LIMIT 1`;
  return { data: { seeded: rows.length > 0, org_id: rows[0]?.id || null } };
}

// ─── ROUTER ───────────────────────────────────────────────────
const resourceMap = {
  organization: handleOrganization,
  okrs: handleOkrs,
  themes: handleThemes,
  capabilities: handleCapabilities,
  products: handleProducts,
  initiatives: handleInitiatives,
  notes: handleNotes,
  conversations: handleConversations,
  preferences: handlePreferences,
};

// ─── HANDLER ──────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { resource, action, payload = {} } = req.body;

  if (!resource || !action) {
    return res.status(400).json({ error: "resource and action are required" });
  }

  try {
    const sql = getDb();

    if (resource === "seed_status") {
      const result = await handleSeedStatus(sql);
      return res.status(200).json(result);
    }

    const handler_fn = resourceMap[resource];
    if (!handler_fn) {
      return res.status(400).json({ error: `Unknown resource: ${resource}` });
    }

    const result = await handler_fn(sql, action, payload);
    return res.status(200).json(result);
  } catch (err) {
    console.error(`Data handler error [${resource}/${action}]:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}

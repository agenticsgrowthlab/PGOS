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
  // Helper: load full foundation data for a given org row
  async function loadFullOrg(org) {
    const [okrs, themes, caps, prods, assets, prefs, comps] = await Promise.all([
      sql`SELECT * FROM okrs WHERE org_id=${org.id} ORDER BY sort_order`,
      sql`SELECT * FROM strategic_themes WHERE org_id=${org.id} ORDER BY sort_order`,
      sql`SELECT * FROM capabilities WHERE org_id=${org.id} ORDER BY sort_order`,
      sql`SELECT * FROM products WHERE org_id=${org.id} ORDER BY sort_order`,
      sql`SELECT * FROM architecture_assets WHERE org_id=${org.id} ORDER BY uploaded_at`,
      sql`SELECT * FROM user_preferences WHERE org_id=${org.id} LIMIT 1`,
      sql`SELECT * FROM competitors WHERE org_id=${org.id} ORDER BY sort_order`,
    ]);
    return {
      ...org,
      okrs,
      strategies: themes,
      capabilities: caps,
      products: prods,
      architecture: assets,
      preferences: prefs[0] || { user_name: "Nicole" },
      competitors: comps,
    };
  }

  switch (action) {
    // Legacy: get first org (kept for backward compat)
    case "get": {
      const rows = await sql`SELECT * FROM organization LIMIT 1`;
      if (!rows.length) return { data: null };
      return { data: await loadFullOrg(rows[0]) };
    }

    // Get by specific org id
    case "get_by_id": {
      const rows = await sql`SELECT * FROM organization WHERE id=${payload.org_id}`;
      if (!rows.length) return { data: null };
      return { data: await loadFullOrg(rows[0]) };
    }

    // List all orgs (lightweight — no nested data)
    case "list": {
      const rows = await sql`SELECT id, name, mission, created_at FROM organization ORDER BY created_at ASC`;
      return { data: rows };
    }

    // Create a new blank org
    case "create": {
      const { name } = payload;
      const rows = await sql`
        INSERT INTO organization (name, mission, vision, values)
        VALUES (${name || "New Organization"}, '', '', '{}')
        RETURNING *
      `;
      return { data: rows[0] };
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

    // Bootstrap: write all seed data for a new org in one safe sequence
    case "bootstrap_company": {
      const { org_id, bootstrap } = payload;
      if (!org_id || !bootstrap) throw new Error("org_id and bootstrap data required");

      const b = bootstrap;

      // 1. Update org mission/vision/values
      if (b.org) {
        await sql`
          UPDATE organization SET
            mission = ${b.org.mission || ""},
            vision  = ${b.org.vision  || ""},
            values  = ${b.org.values  || []}
          WHERE id = ${org_id}
        `;
      }

      // 2. OKRs
      if (b.okrs?.length) {
        for (let i = 0; i < b.okrs.length; i++) {
          const o = b.okrs[i];
          await sql`
            INSERT INTO okrs (org_id, objective, key_results, owner, progress, sort_order)
            VALUES (${org_id}, ${o.objective}, ${o.key_results}, ${o.owner || ""}, ${o.progress || 0}, ${i})
          `;
        }
      }

      // 3. Strategic themes
      if (b.themes?.length) {
        for (let i = 0; i < b.themes.length; i++) {
          const t = b.themes[i];
          await sql`
            INSERT INTO strategic_themes (org_id, name, theme, description, sort_order)
            VALUES (${org_id}, ${t.name}, ${t.theme || ""}, ${t.description || ""}, ${i})
          `;
        }
      }

      // 4. Capabilities
      if (b.capabilities?.length) {
        for (let i = 0; i < b.capabilities.length; i++) {
          const c = b.capabilities[i];
          await sql`
            INSERT INTO capabilities (org_id, name, description, sort_order)
            VALUES (${org_id}, ${c.name}, ${c.description || ""}, ${i})
          `;
        }
      }

      // 5. Products — enforce stage constraint
      const validStages = ["Alpha", "Beta", "GA", "Deprecated"];
      if (b.products?.length) {
        for (let i = 0; i < b.products.length; i++) {
          const p = b.products[i];
          const stage = validStages.includes(p.stage) ? p.stage : "Beta";
          await sql`
            INSERT INTO products (org_id, name, type, stage, advisors, sort_order)
            VALUES (${org_id}, ${p.name}, ${p.type || ""}, ${stage}, ${p.advisors || ""}, ${i})
          `;
        }
      }

      // 6. Competitors — enforce tier and threat_level constraints
      const validTiers   = ["primary", "secondary"];
      const validThreats = ["high", "medium", "low"];
      if (b.competitors?.length) {
        for (let i = 0; i < b.competitors.length; i++) {
          const c = b.competitors[i];
          const tier   = validTiers.includes(c.tier) ? c.tier : "secondary";
          const threat = validThreats.includes(c.threat_level) ? c.threat_level : "medium";
          // Cast all scores to float to avoid integer column type errors
          const toFloat = (v) => v != null ? parseFloat(v) : null;
          await sql`
            INSERT INTO competitors (
              org_id, name, tier, threat_level,
              overall_score, digital_score, mobile_score, claims_score, portal_score,
              app_store_rating, market_share_pct,
              key_differentiator, strengths, weaknesses, our_advantage, our_gap,
              sort_order
            ) VALUES (
              ${org_id}, ${c.name}, ${tier}, ${threat},
              ${toFloat(c.overall_score)}, ${toFloat(c.digital_score)},
              ${toFloat(c.mobile_score)}, ${toFloat(c.claims_score)}, ${toFloat(c.portal_score)},
              ${toFloat(c.app_store_rating)}, ${toFloat(c.market_share_pct)},
              ${c.key_differentiator || ""},
              ${c.strengths || []}, ${c.weaknesses || []},
              ${c.our_advantage || ""}, ${c.our_gap || ""},
              ${i}
            )
          `;
        }
      }

      // 7. Initiatives
      const validIniStages = ["idea", "discovery", "review", "approved", "definition", "delivery", "handoff"];
      if (b.initiatives?.length) {
        for (let i = 0; i < b.initiatives.length; i++) {
          const ini = b.initiatives[i];
          const stage = validIniStages.includes(ini.stage) ? ini.stage : "idea";
          const slug = ini.slug || `INI-${String(i + 1).padStart(3, "0")}`;
          await sql`
            INSERT INTO initiatives (org_id, slug, title, stage, source, problem, opportunity)
            VALUES (
              ${org_id}, ${slug}, ${ini.title || "Untitled"},
              ${stage}, ${ini.source || "Market Opportunity"},
              ${ini.problem || ""}, ${ini.opportunity || ""}
            )
          `;
        }
      }

      return { data: { success: true, org_id } };
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
      // Extract only known scalar columns with correct types.
      // Never trust the frontend bundle — sanitize everything server-side.
      const r = payload;
      const id = r.id;
      if (!id) throw new Error("initiatives update requires id");

      // Helper: safe string (returns null if not a non-empty string)
      const str  = (v) => (typeof v === "string") ? v : null;
      // Helper: safe number cast (returns null if not a finite number)
      const num  = (v) => (typeof v === "number" && isFinite(v)) ? v : null;
      // Helper: safe boolean — ONLY accept explicit true/false, never from debounce
      // approved is handled by its own direct write — never comes through here

      // Safe typed values — Postgres infers type from context when the column type
      // is known on the right side of COALESCE. TEXT columns are unambiguous.
      // For numerics we pass JS null (not undefined) which the driver sends as SQL NULL,
      // and Postgres resolves the type from the column on the right of COALESCE.
      const t = (v) => str(v);          // TEXT — pass string or null
      const n = (v) => num(v);          // NUMERIC/INT/BIGINT — pass number or null

      const rows = await sql`
        UPDATE initiatives SET
          title           = COALESCE(${t(r.title)}::text,           title),
          stage           = COALESCE(${t(r.stage)}::text,           stage),
          source          = COALESCE(${t(r.source)}::text,          source),
          source_detail   = COALESCE(${t(r.source_detail)}::text,   source_detail),
          problem         = COALESCE(${t(r.problem)}::text,         problem),
          opportunity     = COALESCE(${t(r.opportunity)}::text,     opportunity),
          pivot_p         = COALESCE(${n(r.pivot_p)}::numeric,      pivot_p),
          pivot_i         = COALESCE(${n(r.pivot_i)}::numeric,      pivot_i),
          pivot_v         = COALESCE(${n(r.pivot_v)}::numeric,      pivot_v),
          pivot_o         = COALESCE(${n(r.pivot_o)}::numeric,      pivot_o),
          pivot_t         = COALESCE(${n(r.pivot_t)}::numeric,      pivot_t),
          evidence_interviews     = COALESCE(${t(r.evidence_interviews)}::text,     evidence_interviews),
          evidence_pain_confirmed = COALESCE(${t(r.evidence_pain_confirmed)}::text, evidence_pain_confirmed),
          evidence_revenue_opp    = COALESCE(${t(r.evidence_revenue_opp)}::text,    evidence_revenue_opp),
          evidence_cost_savings   = COALESCE(${t(r.evidence_cost_savings)}::text,   evidence_cost_savings),
          evidence_competitive    = COALESCE(${t(r.evidence_competitive)}::text,    evidence_competitive),
          evidence_nps            = COALESCE(${t(r.evidence_nps)}::text,            evidence_nps),
          investment_requested    = COALESCE(${n(r.investment_requested)}::bigint,  investment_requested),
          investment_approved     = COALESCE(${n(r.investment_approved)}::bigint,   investment_approved),
          eng_teams               = COALESCE(${n(r.eng_teams)}::integer,            eng_teams),
          eng_sprints             = COALESCE(${n(r.eng_sprints)}::integer,          eng_sprints),
          eng_estimate            = COALESCE(${n(r.eng_estimate)}::bigint,          eng_estimate),
          wsjf_biz_value          = COALESCE(${n(r.wsjf_biz_value)}::integer,       wsjf_biz_value),
          wsjf_time_crit          = COALESCE(${n(r.wsjf_time_crit)}::integer,       wsjf_time_crit),
          wsjf_risk_reduction     = COALESCE(${n(r.wsjf_risk_reduction)}::integer,  wsjf_risk_reduction),
          wsjf_effort             = COALESCE(${n(r.wsjf_effort)}::integer,          wsjf_effort),
          pivot_coach             = COALESCE(${t(r.pivot_coach)}::text,             pivot_coach),
          eng_estimate_ai         = COALESCE(${t(r.eng_estimate_ai)}::text,         eng_estimate_ai),
          exec_brief              = COALESCE(${t(r.exec_brief)}::text,              exec_brief),
          one_pager               = COALESCE(${t(r.one_pager)}::text,               one_pager),
          personas                = COALESCE(${t(r.personas)}::text,                personas),
          current_journey         = COALESCE(${t(r.current_journey)}::text,         current_journey),
          future_journey          = COALESCE(${t(r.future_journey)}::text,          future_journey),
          jtbd                    = COALESCE(${t(r.jtbd)}::text,                    jtbd),
          use_cases               = COALESCE(${t(r.use_cases)}::text,               use_cases),
          epics                   = COALESCE(${t(r.epics)}::text,                   epics),
          risk_register           = COALESCE(${t(r.risk_register)}::text,           risk_register),
          pi_planning             = COALESCE(${t(r.pi_planning)}::text,             pi_planning),
          prd                     = COALESCE(${t(r.prd)}::text,                     prd),
          telemetry               = COALESCE(${t(r.telemetry)}::text,               telemetry),
          testcases               = COALESCE(${t(r.testcases)}::text,               testcases),
          sprint_assignments      = COALESCE(${t(r.sprint_assignments)}::text,      sprint_assignments),
          handoff_package         = COALESCE(${t(r.handoff_package)}::text,         handoff_package)
        WHERE id = ${id}
        RETURNING *
      `;

      // UUID fields — only update when explicitly provided, never coerce null through uuid cast
      if (r.okr_id !== undefined) {
        await sql`UPDATE initiatives SET okr_id = ${r.okr_id || null}::uuid WHERE id = ${id}`;
      }
      if (r.theme_id !== undefined) {
        await sql`UPDATE initiatives SET theme_id = ${r.theme_id || null}::uuid WHERE id = ${id}`;
      }
      if (r.capability_id !== undefined) {
        await sql`UPDATE initiatives SET capability_id = ${r.capability_id || null}::uuid WHERE id = ${id}`;
      }

      // approved has its own direct write path (InitiativeDetail.jsx)
      // Only update it here if explicitly passed as a boolean (direct write, not debounce)
      if (typeof r.approved === "boolean") {
        await sql`
          UPDATE initiatives SET
            approved      = ${r.approved}::BOOLEAN,
            approved_by   = ${str(r.approved_by) || ''}::TEXT,
            approved_date = ${str(r.approved_date) || ''}::TEXT
          WHERE id = ${id}
        `;
      }

      // Migration columns — wrapped in try/catch so missing columns never break core save
      try {
        await sql`
          UPDATE initiatives SET
            roadmap_start = COALESCE(${r.roadmap_start || null}::date, roadmap_start),
            roadmap_end   = COALESCE(${r.roadmap_end || null}::date,   roadmap_end),
            bar_color     = COALESCE(${str(r.bar_color)}::text,        bar_color),
            jira_tickets  = COALESCE(${str(r.jira_tickets)}::text,     jira_tickets)
          WHERE id = ${id}
        `;
      } catch (e) { console.error('[roadmap]', e.message); }

      // GTM fields
      try {
        await sql`
          UPDATE initiatives SET
            gtm_icp              = COALESCE(${str(r.gtm_icp)}::text,              gtm_icp),
            gtm_positioning      = COALESCE(${str(r.gtm_positioning)}::text,      gtm_positioning),
            gtm_value_prop       = COALESCE(${str(r.gtm_value_prop)}::text,       gtm_value_prop),
            gtm_channel_strategy = COALESCE(${str(r.gtm_channel_strategy)}::text, gtm_channel_strategy),
            gtm_launch_plan      = COALESCE(${str(r.gtm_launch_plan)}::text,      gtm_launch_plan),
            gtm_success_criteria = COALESCE(${str(r.gtm_success_criteria)}::text, gtm_success_criteria),
            gtm_campaign_intel   = COALESCE(${str(r.gtm_campaign_intel)}::text,   gtm_campaign_intel),
            gtm_social_posts     = COALESCE(${str(r.gtm_social_posts)}::text,     gtm_social_posts),
            gtm_calendar         = COALESCE(${str(r.gtm_calendar)}::text,         gtm_calendar),
            gtm_notes            = COALESCE(${str(r.gtm_notes)}::text,            gtm_notes)
          WHERE id = ${id}
        `;
      } catch (e) { console.error('[gtm]', e.message); }

      try {
        await sql`
          UPDATE initiatives SET
            launch_date           = COALESCE(${r.launch_date || null}::date,          launch_date),
            adoption_rate         = COALESCE(${num(r.adoption_rate)}::numeric,        adoption_rate),
            monthly_active_users  = COALESCE(${num(r.monthly_active_users)}::integer, monthly_active_users),
            daily_active_users    = COALESCE(${num(r.daily_active_users)}::integer,   daily_active_users),
            feature_utilization   = COALESCE(${num(r.feature_utilization)}::numeric,  feature_utilization),
            nps_score             = COALESCE(${num(r.nps_score)}::integer,            nps_score),
            csat_score            = COALESCE(${num(r.csat_score)}::numeric,           csat_score),
            survey_responses      = COALESCE(${num(r.survey_responses)}::integer,     survey_responses),
            key_verbatims         = COALESCE(${
              Array.isArray(r.key_verbatims) ? r.key_verbatims :
              (typeof r.key_verbatims === 'string' ? JSON.parse(r.key_verbatims) : null)
            }::text[],      key_verbatims),
            call_deflection_pct   = COALESCE(${num(r.call_deflection_pct)}::numeric,  call_deflection_pct),
            revenue_realized      = COALESCE(${num(r.revenue_realized)}::numeric,     revenue_realized),
            cost_savings_realized = COALESCE(${num(r.cost_savings_realized)}::numeric, cost_savings_realized),
            target_met            = COALESCE(${typeof r.target_met === "boolean" ? r.target_met : null}::boolean, target_met),
            measure_notes         = COALESCE(${str(r.measure_notes)}::text,           measure_notes),
            lessons_learned       = COALESCE(${str(r.lessons_learned)}::text,         lessons_learned),
            next_action           = COALESCE(${str(r.next_action)}::text,             next_action),
            outcome_summary       = COALESCE(${str(r.outcome_summary)}::text,         outcome_summary)
          WHERE id = ${id}
        `;
      } catch (e) { console.error('[measure]', e.message); }

      try {
        await sql`
          UPDATE initiatives SET
            contract_primary_metric    = COALESCE(${str(r.contract_primary_metric)}::text,    contract_primary_metric),
            contract_baseline          = COALESCE(${str(r.contract_baseline)}::text,          contract_baseline),
            contract_target            = COALESCE(${str(r.contract_target)}::text,            contract_target),
            contract_secondary_metrics = COALESCE(${str(r.contract_secondary_metrics)}::text, contract_secondary_metrics),
            contract_telemetry_source  = COALESCE(${str(r.contract_telemetry_source)}::text,  contract_telemetry_source),
            contract_review_window     = COALESCE(${num(r.contract_review_window)}::integer,  contract_review_window),
            contract_economic_outcome  = COALESCE(${str(r.contract_economic_outcome)}::text,  contract_economic_outcome),
            contract_ai_narrative      = COALESCE(${str(r.contract_ai_narrative)}::text,      contract_ai_narrative),
            contract_status            = COALESCE(${str(r.contract_status)}::text,            contract_status)
          WHERE id = ${id}
        `;
      } catch (e) { console.error('[contract]', e.message); }

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

// ─── COMPETITOR SNAPSHOTS ──────────────────────────────────────
async function handleCompetitorSnapshots(sql, action, payload) {
  switch (action) {
    case "list": {
      const rows = await sql`
        SELECT id, org_id, created_at, summary,
               scan_data
        FROM competitor_snapshots
        WHERE org_id=${payload.org_id}
        ORDER BY created_at DESC
        LIMIT 20
      `;
      return { data: rows };
    }
    case "create": {
      const { org_id, summary, scan_data } = payload;
      const rows = await sql`
        INSERT INTO competitor_snapshots (org_id, summary, scan_data)
        VALUES (${org_id}, ${summary}, ${JSON.stringify(scan_data || {})}::jsonb)
        RETURNING *
      `;
      return { data: rows[0] };
    }
    default:
      throw new Error(`Unknown action for competitor_snapshots: ${action}`);
  }
}

// ─── INITIATIVE METRICS ────────────────────────────────────────
async function handleMetrics(sql, action, payload) {
  switch (action) {
    case "list": {
      const rows = await sql`SELECT * FROM initiative_metrics WHERE initiative_id=${payload.initiative_id} ORDER BY metric_date ASC`;
      return { data: rows };
    }
    case "create": {
      const { initiative_id, metric_date, mau, dau, adoption_rate, nps, csat, calls_deflected } = payload;
      const rows = await sql`
        INSERT INTO initiative_metrics (initiative_id, metric_date, mau, dau, adoption_rate, nps, csat, calls_deflected)
        VALUES (${initiative_id}, ${metric_date}, ${mau||0}, ${dau||0}, ${adoption_rate||0}, ${nps||0}, ${csat||0}, ${calls_deflected||0})
        RETURNING *
      `;
      return { data: rows[0] };
    }
    case "delete": {
      await sql`DELETE FROM initiative_metrics WHERE id=${payload.id}`;
      return { data: { deleted: true } };
    }
    default:
      throw new Error(`Unknown action for metrics: ${action}`);
  }
}

// ─── COMPETITORS ──────────────────────────────────────────────
async function handleCompetitors(sql, action, payload) {
  switch (action) {
    case "list": {
      const rows = await sql`SELECT * FROM competitors WHERE org_id=${payload.org_id} ORDER BY sort_order`;
      return { data: rows };
    }
    case "create": {
      const { org_id, name, tier = "primary", threat_level = "medium", sort_order = 0 } = payload;
      const rows = await sql`
        INSERT INTO competitors (org_id, name, tier, threat_level, sort_order)
        VALUES (${org_id}, ${name}, ${tier}, ${threat_level}, ${sort_order})
        RETURNING *
      `;
      return { data: rows[0] };
    }
    case "update": {
      const {
        id, name, tier, threat_level,
        overall_score, digital_score, mobile_score, claims_score, portal_score,
        market_share_pct, app_store_rating, jd_power_rank,
        key_differentiator, strengths, weaknesses,
        our_advantage, our_gap, sort_order,
      } = payload;
      const rows = await sql`
        UPDATE competitors SET
          name             = COALESCE(${name}, name),
          tier             = COALESCE(${tier}, tier),
          threat_level     = COALESCE(${threat_level}, threat_level),
          overall_score    = COALESCE(${overall_score}, overall_score),
          digital_score    = COALESCE(${digital_score}, digital_score),
          mobile_score     = COALESCE(${mobile_score}, mobile_score),
          claims_score     = COALESCE(${claims_score}, claims_score),
          portal_score     = COALESCE(${portal_score}, portal_score),
          market_share_pct = COALESCE(${market_share_pct}, market_share_pct),
          app_store_rating = COALESCE(${app_store_rating}, app_store_rating),
          jd_power_rank    = COALESCE(${jd_power_rank}, jd_power_rank),
          key_differentiator = COALESCE(${key_differentiator}, key_differentiator),
          strengths        = COALESCE(${strengths}, strengths),
          weaknesses       = COALESCE(${weaknesses}, weaknesses),
          our_advantage    = COALESCE(${our_advantage}, our_advantage),
          our_gap          = COALESCE(${our_gap}, our_gap),
          sort_order       = COALESCE(${sort_order}, sort_order)
        WHERE id=${id}
        RETURNING *
      `;
      return { data: rows[0] };
    }
    case "delete": {
      await sql`DELETE FROM competitors WHERE id=${payload.id}`;
      return { data: { deleted: true } };
    }
    default:
      throw new Error(`Unknown action for competitors: ${action}`);
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
  competitors: handleCompetitors,
  metrics: handleMetrics,
  competitor_snapshots: handleCompetitorSnapshots,
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
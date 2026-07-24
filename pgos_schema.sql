-- ============================================================
-- PGOS — Product Growth Operating System
-- Production Database Schema for Neon PostgreSQL
-- Version: 1.0
-- Run this entire file in Neon SQL Editor to initialize the DB
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ORGANIZATION (one row per deployment)
-- ============================================================
CREATE TABLE IF NOT EXISTS organization (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL DEFAULT 'My Organization',
  mission       TEXT NOT NULL DEFAULT '',
  vision        TEXT NOT NULL DEFAULT '',
  values        TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- OKRs
-- ============================================================
CREATE TABLE IF NOT EXISTS okrs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  objective     TEXT NOT NULL DEFAULT '',
  key_results   TEXT[] NOT NULL DEFAULT '{}',
  owner         TEXT NOT NULL DEFAULT '',
  progress      INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_okrs_org ON okrs(org_id);

-- ============================================================
-- STRATEGIC THEMES
-- ============================================================
CREATE TABLE IF NOT EXISTS strategic_themes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  theme         TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_themes_org ON strategic_themes(org_id);

-- ============================================================
-- BUSINESS CAPABILITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS capabilities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_caps_org ON capabilities(org_id);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT '',
  stage         TEXT NOT NULL DEFAULT 'Alpha' CHECK (stage IN ('Alpha','Beta','GA','Deprecated')),
  advisors      TEXT NOT NULL DEFAULT '',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_org ON products(org_id);

-- ============================================================
-- ARCHITECTURE ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS architecture_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  file_size       INTEGER,
  storage_url     TEXT,
  ai_analysis     TEXT,
  components      JSONB NOT NULL DEFAULT '[]',
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_arch_org ON architecture_assets(org_id);

-- ============================================================
-- INITIATIVES
-- ============================================================
CREATE TABLE IF NOT EXISTS initiatives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,                          -- e.g. INI-001
  title           TEXT NOT NULL DEFAULT '',
  stage           TEXT NOT NULL DEFAULT 'idea'
                    CHECK (stage IN ('idea','discovery','review','approved','definition','delivery','handoff','closed')),
  source          TEXT NOT NULL DEFAULT 'Executive Idea',
  source_detail   TEXT NOT NULL DEFAULT '',
  problem         TEXT NOT NULL DEFAULT '',
  opportunity     TEXT NOT NULL DEFAULT '',

  -- Strategic linkage
  okr_id          UUID REFERENCES okrs(id) ON DELETE SET NULL,
  theme_id        UUID REFERENCES strategic_themes(id) ON DELETE SET NULL,
  capability_id   UUID REFERENCES capabilities(id) ON DELETE SET NULL,

  -- PIVOT Score dimensions (0.0 – 10.0 each)
  pivot_p         NUMERIC(4,2) NOT NULL DEFAULT 5.0 CHECK (pivot_p >= 0 AND pivot_p <= 10),
  pivot_i         NUMERIC(4,2) NOT NULL DEFAULT 5.0 CHECK (pivot_i >= 0 AND pivot_i <= 10),
  pivot_v         NUMERIC(4,2) NOT NULL DEFAULT 5.0 CHECK (pivot_v >= 0 AND pivot_v <= 10),
  pivot_o         NUMERIC(4,2) NOT NULL DEFAULT 5.0 CHECK (pivot_o >= 0 AND pivot_o <= 10),
  pivot_t         NUMERIC(4,2) NOT NULL DEFAULT 5.0 CHECK (pivot_t >= 0 AND pivot_t <= 10),

  -- Evidence
  evidence_interviews     TEXT NOT NULL DEFAULT '0',
  evidence_pain_confirmed TEXT NOT NULL DEFAULT '—',
  evidence_revenue_opp    TEXT NOT NULL DEFAULT 'TBD',
  evidence_cost_savings   TEXT NOT NULL DEFAULT 'TBD',
  evidence_competitive    TEXT NOT NULL DEFAULT 'Not assessed',
  evidence_nps            TEXT NOT NULL DEFAULT 'Not assessed',

  -- Investment
  investment_requested    BIGINT NOT NULL DEFAULT 0,
  investment_approved     BIGINT NOT NULL DEFAULT 0,
  investment_currency     TEXT NOT NULL DEFAULT 'USD',

  -- Engineering estimate
  eng_teams     INTEGER NOT NULL DEFAULT 0,
  eng_sprints   INTEGER NOT NULL DEFAULT 0,
  eng_estimate  BIGINT NOT NULL DEFAULT 0,

  -- Approval
  approved        BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by     TEXT NOT NULL DEFAULT '',
  approved_date   TEXT NOT NULL DEFAULT '',

  -- Portfolio / WSJF scoring
  wsjf_biz_value       INTEGER NOT NULL DEFAULT 0,
  wsjf_time_crit       INTEGER NOT NULL DEFAULT 0,
  wsjf_risk_reduction  INTEGER NOT NULL DEFAULT 0,
  wsjf_effort          INTEGER NOT NULL DEFAULT 0,

  -- AI-generated artifacts (stored as text, user-editable)
  pivot_coach       TEXT,
  eng_estimate_ai   TEXT,
  exec_brief        TEXT,
  one_pager         TEXT,
  personas          TEXT,
  current_journey   TEXT,
  future_journey    TEXT,
  jtbd              TEXT,
  use_cases         TEXT,
  epics             TEXT,
  risk_register     TEXT,
  pi_planning       TEXT,
  handoff_package   TEXT,

  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_initiatives_org     ON initiatives(org_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_stage   ON initiatives(stage);
CREATE INDEX IF NOT EXISTS idx_initiatives_slug    ON initiatives(org_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS uq_initiatives_slug ON initiatives(org_id, slug);

-- ============================================================
-- STAKEHOLDER NOTES  (child of initiative)
-- ============================================================
CREATE TABLE IF NOT EXISTS stakeholder_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id   UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  author          TEXT NOT NULL DEFAULT '',
  note            TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_initiative ON stakeholder_notes(initiative_id);

-- ============================================================
-- AI CONVERSATION HISTORY  (Chatty messages)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  initiative_id   UUID REFERENCES initiatives(id) ON DELETE SET NULL,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content         TEXT NOT NULL,
  context_view    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_convos_org  ON ai_conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_convos_init ON ai_conversations(initiative_id);

-- ============================================================
-- USER PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_name     TEXT NOT NULL DEFAULT 'Nicole',
  theme         TEXT NOT NULL DEFAULT 'dark',
  preferences   JSONB NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id)
);

-- ============================================================
-- REFERENCE DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reference_docs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  doc_order     INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, slug)
);

-- ============================================================
-- TRIGGER: auto-update updated_at on any row change
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['organization','okrs','strategic_themes','capabilities','products','initiatives','user_preferences','reference_docs']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$s;
       CREATE TRIGGER trg_%1$s_updated_at
       BEFORE UPDATE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- SEED: Default organization + sample data
-- Run ONLY once. Comment out if re-running migrations.
-- ============================================================
DO $$
DECLARE
  org_uuid UUID;
  okr1_uuid UUID; okr2_uuid UUID; okr3_uuid UUID;
  theme1_uuid UUID; theme2_uuid UUID; theme3_uuid UUID;
  cap1_uuid UUID; cap4_uuid UUID; cap5_uuid UUID;
  ini1_uuid UUID; ini2_uuid UUID; ini3_uuid UUID;
BEGIN
  -- Bail out if org already exists
  SELECT id INTO org_uuid FROM organization LIMIT 1;
  IF org_uuid IS NOT NULL THEN
    RAISE NOTICE 'Seed data already present, skipping.';
    RETURN;
  END IF;

  -- Organization
  INSERT INTO organization (name, mission, vision, values)
  VALUES (
    'WealthTech Platform',
    'Empower financial advisors to deliver exceptional, personalized wealth management experiences that grow client assets and deepen long-term relationships.',
    'To be the most trusted technology partner for wealth management firms, enabling advisors to spend more time advising and less time on administration.',
    ARRAY['Client First','Data Integrity','Advisor Empowerment','Continuous Innovation','Regulatory Excellence']
  ) RETURNING id INTO org_uuid;

  -- OKRs
  INSERT INTO okrs (org_id, objective, key_results, owner, progress, sort_order)
  VALUES
    (org_uuid, 'Grow advisor-managed AUM by 18% through productivity and engagement improvements',
      ARRAY['Reduce advisor data aggregation time by 40%','Increase client meeting frequency by 25%','Improve advisor NPS from 34 to 55+'],
      'CPO', 34, 1) RETURNING id INTO okr1_uuid;
  INSERT INTO okrs (org_id, objective, key_results, owner, progress, sort_order)
  VALUES
    (org_uuid, 'Achieve platform reliability and compliance excellence',
      ARRAY['Maintain 99.95% uptime SLA','Complete SOC 2 Type II certification','Zero regulatory findings in annual audit'],
      'CTO', 67, 2) RETURNING id INTO okr2_uuid;
  INSERT INTO okrs (org_id, objective, key_results, owner, progress, sort_order)
  VALUES
    (org_uuid, 'Accelerate enterprise client acquisition',
      ARRAY['Sign 3 new enterprise clients (500+ advisors)','Reduce sales cycle from 9 to 6 months','Achieve $4.2M new ARR'],
      'CRO', 22, 3) RETURNING id INTO okr3_uuid;

  -- Strategic Themes
  INSERT INTO strategic_themes (org_id, name, theme, description, sort_order)
  VALUES
    (org_uuid, 'Advisor Productivity Platform', 'Wealth Management Growth', 'Unified tools that eliminate context switching and manual data aggregation', 1) RETURNING id INTO theme1_uuid;
  INSERT INTO strategic_themes (org_id, name, theme, description, sort_order)
  VALUES
    (org_uuid, 'Client Intelligence Engine', 'Digital Transformation', 'AI-powered insights that surface the right client action at the right moment', 2) RETURNING id INTO theme2_uuid;
  INSERT INTO strategic_themes (org_id, name, theme, description, sort_order)
  VALUES
    (org_uuid, 'Compliance Automation', 'Risk & Compliance', 'Automated regulatory monitoring and reporting to reduce compliance overhead', 3) RETURNING id INTO theme3_uuid;

  -- Capabilities
  INSERT INTO capabilities (org_id, name, description, sort_order) VALUES
    (org_uuid, 'Advisory Platform', 'Core advisor workspace and tools', 1) RETURNING id INTO cap1_uuid;
  INSERT INTO capabilities (org_id, name, description, sort_order) VALUES
    (org_uuid, 'Client Data Aggregation', 'Real-time multi-custodian data feeds', 2);
  INSERT INTO capabilities (org_id, name, description, sort_order) VALUES
    (org_uuid, 'Portfolio Analytics', 'Performance reporting and attribution', 3);
  INSERT INTO capabilities (org_id, name, description, sort_order) VALUES
    (org_uuid, 'Compliance Engine', 'Automated monitoring and audit trail', 4) RETURNING id INTO cap4_uuid;
  INSERT INTO capabilities (org_id, name, description, sort_order) VALUES
    (org_uuid, 'Client Portal', 'Self-service client engagement layer', 5) RETURNING id INTO cap5_uuid;

  -- Products
  INSERT INTO products (org_id, name, type, stage, advisors, sort_order) VALUES
    (org_uuid, 'AdvisorOS Desktop', 'Core Platform', 'GA', '2,400+', 1),
    (org_uuid, 'AdvisorOS Mobile', 'Mobile App', 'Beta', '800+', 2),
    (org_uuid, 'Client Wealth Portal', 'Client-Facing', 'GA', 'N/A', 3),
    (org_uuid, 'Compliance Dashboard', 'Internal Tool', 'GA', '180+', 4);

  -- User preferences
  INSERT INTO user_preferences (org_id, user_name) VALUES (org_uuid, 'Nicole');

  -- Initiative 1
  INSERT INTO initiatives (
    org_id, slug, title, stage, source, source_detail, problem, opportunity,
    okr_id, theme_id, capability_id,
    pivot_p, pivot_i, pivot_v, pivot_o, pivot_t,
    evidence_interviews, evidence_pain_confirmed, evidence_revenue_opp, evidence_cost_savings, evidence_competitive, evidence_nps,
    investment_requested, investment_approved, eng_teams, eng_sprints, eng_estimate,
    approved, approved_by, approved_date,
    wsjf_biz_value, wsjf_time_crit, wsjf_risk_reduction, wsjf_effort,
    sort_order
  ) VALUES (
    org_uuid, 'INI-001', 'Unified Advisor Intelligence Dashboard', 'delivery',
    'Executive Idea', 'CPO Q4 kickoff — advisors losing 90min/day to data aggregation',
    'Senior wealth advisors spend 60–90 minutes daily aggregating client data across 6 disconnected systems before meaningful client conversations can occur. This reduces advisory capacity by ~18% and directly impacts AUM growth.',
    'A unified intelligence dashboard aggregating portfolio data, client activity signals, and market context into a single real-time view — delivered at desktop and mobile.',
    okr1_uuid, theme1_uuid, cap1_uuid,
    8.4, 7.6, 6.2, 8.8, 5.9,
    '14', '11/14', '$6.8M', '$1.4M', '2 of 4 competitors launched similar capability in past 18 months', 'Advisor NPS 34 vs 61+ benchmark',
    1200000, 1000000, 3, 8, 840000,
    TRUE, 'Rania Khalil, CPO', '2025-01-08',
    9, 7, 8, 5, 1
  ) RETURNING id INTO ini1_uuid;

  -- Stakeholder note for INI-001
  INSERT INTO stakeholder_notes (initiative_id, author, note)
  VALUES (ini1_uuid, 'Marcus Chen, CFO', 'ROI timeline needs tightening — model assumes 8% retention improvement. Want sensitivity analysis before full funding.');

  -- Initiative 2
  INSERT INTO initiatives (
    org_id, slug, title, stage, source, source_detail, problem, opportunity,
    okr_id, theme_id, capability_id,
    pivot_p, pivot_i, pivot_v, pivot_o, pivot_t,
    evidence_interviews, evidence_pain_confirmed, evidence_revenue_opp, evidence_cost_savings, evidence_competitive, evidence_nps,
    investment_requested, investment_approved, eng_teams, eng_sprints, eng_estimate,
    wsjf_biz_value, wsjf_time_crit, wsjf_risk_reduction, wsjf_effort,
    sort_order
  ) VALUES (
    org_uuid, 'INI-002', 'AI-Powered Compliance Monitoring', 'discovery',
    'Regulatory Requirement', 'SEC Risk Alert Q4 2024 — increased scrutiny on suitability documentation',
    'Compliance officers spend 12–15 hours weekly manually reviewing advisor-client interaction logs for suitability violations. Current tooling has a 72-hour lag, creating regulatory exposure.',
    'Real-time AI monitoring of advisor activity with automated suitability flagging and audit trail generation.',
    okr2_uuid, theme3_uuid, cap4_uuid,
    7.1, 8.2, 5.4, 9.1, 6.8,
    '6', '6/6', '$2.1M', '$3.8M', 'Regulatory requirement — not competitive', 'Compliance NPS -12 (internal)',
    680000, 0, 2, 6, 540000,
    7, 9, 10, 6, 2
  ) RETURNING id INTO ini2_uuid;

  -- Initiative 3
  INSERT INTO initiatives (
    org_id, slug, title, stage, source, source_detail, problem, opportunity,
    okr_id, theme_id, capability_id,
    sort_order
  ) VALUES (
    org_uuid, 'INI-003', 'Client Self-Service Rebalancing', 'idea',
    'Customer Request', '47 support tickets in Q4 requesting advisor-supervised client rebalancing capability',
    'High-value clients want more control over tactical rebalancing within advisor-defined guardrails. Current process requires manual advisor intervention for every change.',
    'Advisor-configured rules engine that allows clients to initiate rebalancing within pre-approved parameters, with advisor notification and override capability.',
    okr1_uuid, theme2_uuid, cap5_uuid,
    3
  ) RETURNING id INTO ini3_uuid;

END $$;

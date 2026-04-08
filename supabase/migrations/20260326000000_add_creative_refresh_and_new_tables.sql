-- ============================================================
-- Migration 2: AdsClaw — Creative Refresh + Novas Tabelas
-- Data: 2026-03-26
-- Referência: references/PLAN.md §3, references/CONTRACTS.md §3
-- ============================================================

-- ============================================================
-- PARTE 1: Melhorias nas tabelas existentes
-- ============================================================

-- 1.1 Adiciona last_creative_refresh à client_rules
ALTER TABLE public.client_rules
  ADD COLUMN IF NOT EXISTS last_creative_refresh DATE DEFAULT NULL;

-- 1.2 Adiciona target_roas à client_rules
ALTER TABLE public.client_rules
  ADD COLUMN IF NOT EXISTS target_roas NUMERIC(6,2) CHECK (target_roas > 0);

-- 1.3 Adiciona max_context_turns (configuração de memória do agente)
ALTER TABLE public.client_rules
  ADD COLUMN IF NOT EXISTS max_context_turns INTEGER NOT NULL DEFAULT 20
    CHECK (max_context_turns BETWEEN 5 AND 100);

-- 1.4 Adiciona sector à client_rules (para benchmarks e SkillRouter)
ALTER TABLE public.client_rules
  ADD COLUMN IF NOT EXISTS sector TEXT CHECK (
    sector IN ('ecommerce', 'saas', 'educacao', 'saude_beleza', 'imobiliario', 'servicos', 'outros')
  );

-- 1.5 Adiciona telegram_chat_ids à clients (whitelist por cliente)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS telegram_chat_ids BIGINT[] DEFAULT '{}';

-- 1.6 Adiciona CHECK de status em clients
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_status_check
    CHECK (status IN ('active', 'paused', 'onboarding', 'inactive'));

-- 1.7 Adiciona CHECK de sender em chat_history
ALTER TABLE public.chat_history
  DROP CONSTRAINT IF EXISTS chat_history_sender_check;
ALTER TABLE public.chat_history
  ADD CONSTRAINT chat_history_sender_check
    CHECK (sender IN ('user', 'agent', 'telegram', 'system', 'tool'));

-- 1.8 Adiciona updated_at em chat_history (estava faltando)
ALTER TABLE public.chat_history
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ============================================================
-- PARTE 2: Tabela performance_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS public.performance_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'consolidated')),
  snapshot_date DATE NOT NULL,
  impressions   BIGINT NOT NULL DEFAULT 0,
  clicks        BIGINT NOT NULL DEFAULT 0,
  spend         NUMERIC(12,2) NOT NULL DEFAULT 0,
  conversions   INTEGER NOT NULL DEFAULT 0,
  ctr           NUMERIC(6,4),
  cpc           NUMERIC(10,2),
  cpa           NUMERIC(10,2),
  roas          NUMERIC(8,2),
  raw_data      JSONB,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, platform, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_perf_snapshots_client_date
  ON public.performance_snapshots(client_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_perf_snapshots_platform
  ON public.performance_snapshots(platform, snapshot_date DESC);

ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON public.performance_snapshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PARTE 3: Tabela alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  alert_type   TEXT NOT NULL CHECK (
    alert_type IN (
      'cpa_above_target',
      'ctr_below_threshold',
      'budget_90_percent',
      'creative_fatigue',
      'campaign_paused_auto',
      'roas_below_target'
    )
  ),
  severity     TEXT NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info', 'warning', 'critical')),
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  metadata     JSONB,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'acknowledged', 'resolved')),
  sent_at      TIMESTAMPTZ,
  resolved_at  TIMESTAMPTZ,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_client_status
  ON public.alerts(client_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_alerts_created_at
  ON public.alerts(created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON public.alerts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PARTE 4: Tabela pending_approvals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pending_approvals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  chat_id             BIGINT NOT NULL,
  action              TEXT NOT NULL,
  payload             JSONB NOT NULL,
  description         TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  telegram_message_id INTEGER,
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
  resolved_at         TIMESTAMPTZ,
  resolved_by         BIGINT,
  reject_reason       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_approvals_client_status
  ON public.pending_approvals(client_id, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_pending_approvals_expires_at
  ON public.pending_approvals(expires_at)
  WHERE status = 'pending';

ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON public.pending_approvals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PARTE 5: Tabela ad_creatives
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ad_creatives (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  asset_type   TEXT NOT NULL CHECK (asset_type IN ('image', 'video', 'copy', 'carousel')),
  storage_url  TEXT,
  copy_data    JSONB,
  prompt_used  TEXT,
  platform     TEXT CHECK (platform IN ('meta', 'google', 'instagram', 'all')),
  status       TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'approved', 'rejected', 'published', 'archived')),
  approval_id  UUID REFERENCES public.pending_approvals(id),
  published_at TIMESTAMPTZ,
  metadata     JSONB,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_creatives_client_status
  ON public.ad_creatives(client_id, status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON public.ad_creatives
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PARTE 6: Tabela benchmark_cache
-- ============================================================
CREATE TABLE IF NOT EXISTS public.benchmark_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector      TEXT NOT NULL,
  platform    TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'instagram', 'tiktok')),
  country     TEXT NOT NULL DEFAULT 'BR',
  data        JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sector, platform, country)
);

CREATE INDEX IF NOT EXISTS idx_benchmark_cache_sector_platform
  ON public.benchmark_cache(sector, platform, fetched_at DESC);

-- ============================================================
-- PARTE 7: Tabela llm_cost_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.llm_cost_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  provider      TEXT NOT NULL,
  model_id      TEXT NOT NULL,
  tier          TEXT NOT NULL CHECK (tier IN ('tier1', 'tier2', 'tier3')),
  tokens_input  INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  tokens_total  INTEGER NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(10,6) NOT NULL DEFAULT 0,
  operation     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_cost_log_client_date
  ON public.llm_cost_log(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_cost_log_date
  ON public.llm_cost_log(created_at DESC);

ALTER TABLE public.llm_cost_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON public.llm_cost_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PARTE 8: View clients_needing_refresh
-- ============================================================
CREATE OR REPLACE VIEW public.clients_needing_refresh AS
  SELECT
    c.id,
    c.name,
    c.status,
    cr.target_cpa,
    cr.creative_refresh_days,
    cr.last_creative_refresh,
    EXTRACT(
      DAY FROM now() - COALESCE(
        cr.last_creative_refresh::timestamptz,
        c.created_at
      )
    )::INTEGER AS days_since_refresh
  FROM public.clients c
  JOIN public.client_rules cr ON cr.client_id = c.id
  WHERE c.status = 'active'
    AND EXTRACT(
      DAY FROM now() - COALESCE(
        cr.last_creative_refresh::timestamptz,
        c.created_at
      )
    ) >= cr.creative_refresh_days;

-- ============================================================
-- PARTE 9: Função e Triggers para updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'clients', 'client_rules', 'chat_history',
    'performance_snapshots', 'alerts', 'pending_approvals',
    'ad_creatives', 'benchmark_cache'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'updated_at'
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%s;
         CREATE TRIGGER trg_%s_updated_at
           BEFORE UPDATE ON public.%s
           FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
        tbl, tbl, tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- PARTE 10: Seed para desenvolvimento
-- ============================================================
INSERT INTO public.clients (id, name, meta_ads_account_id, google_ads_account_id, status, telegram_chat_ids)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Loja Premium Test',
    'act_123456789',
    '1234567890',
    'active',
    '{}'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'SaaS Startup Test',
    NULL,
    NULL,
    'onboarding',
    '{}'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.client_rules (
  client_id, target_cpa, target_roas, daily_budget, brand_voice,
  primary_offer, creative_refresh_days, sector, max_context_turns
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    45.00,
    3.5,
    500.00,
    'Tom direto, focado em resultados, linguagem do cliente final (consumidor)',
    'Desconto de 20% para primeira compra',
    7,
    'ecommerce',
    20
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    85.00,
    2.0,
    200.00,
    'Tom técnico mas acessível, foco em eficiência e ROI para gestores',
    'Trial grátis por 14 dias, sem cartão',
    14,
    'saas',
    20
  )
ON CONFLICT (client_id) DO NOTHING;

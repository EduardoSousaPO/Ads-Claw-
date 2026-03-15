-- Extensão nativa do Postgres (suportada pelo Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela: clients
-- Armazena os clientes estruturais e links pros identificadores de APIs parceiras.
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    meta_ads_account_id VARCHAR(100),
    google_ads_account_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela: client_rules
-- O Santo Graal do AdsClaw! Essa tabela dita que aquele cliente específico não pode torrar o orçamento
CREATE TABLE IF NOT EXISTS public.client_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    target_cpa NUMERIC(10, 2) NOT NULL,
    daily_budget NUMERIC(10, 2) NOT NULL,
    brand_voice TEXT,
    primary_offer TEXT,
    creative_refresh_days INTEGER DEFAULT 14,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(client_id)
);

-- 3. Tabela: chat_history
-- Transcreve o "estado" do Telegram e do Agency Cockpit para registro ou fine-tuning posterior
CREATE TABLE IF NOT EXISTS public.chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    sender VARCHAR(50) NOT NULL, -- Valores: 'user', 'agent', 'telegram'
    message TEXT NOT NULL,
    metadata JSONB, -- Logs extras, outputs de tools MCP etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

------------------------------------------------------------------------------------------
-- SEGURANÇA E ISOLAMENTO: ROW LEVEL SECURITY (RLS)
------------------------------------------------------------------------------------------
-- RLS garante que nem mesmo via Dashboard um cliente vazará para o outro caso as regras peguem tração
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Exemplo RLS: Agency Cockpit Logged Users
-- Se os gestores logarem no painel com Supabase Auth, eles terão permissão em tudo
CREATE POLICY "Gestão Total para Agency Staff" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Gestão Total para Agency Staff" ON public.client_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Gestão Total para Agency Staff" ON public.chat_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- (Nota: O Node.js Agent de background fará bypass dessas regras rodando com a SERVICE_ROLE KEY)

------------------------------------------------------------------------------------------
-- STORAGE BUCKETS (Simulação de criação pra fins de documentação da Migration)
-- Obs: Normalmene a criação ocorre via Painel do Supabase -> Storage.
------------------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assets', 'assets', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('reports', 'reports', false) 
ON CONFLICT (id) DO NOTHING;

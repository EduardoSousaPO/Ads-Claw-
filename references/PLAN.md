# PLAN — Plano Técnico
> Projeto: AdsClaw — SWAS Performance Marketing Engine
> Data: 2026-03-26 | Atualizado: 2026-04-08
> Versão: 2.0
> Referência: SPEC v2.0, CONTRACTS v1.1, PRD v2.0
>
> **Changelog v2.0:** Adicionada seção 13 (Skills Operacionais — arquitetura e implementação). ADR-004 (Skills como metodologias codificadas).

---

## 1. Stack Tecnológica

| Camada | Tecnologia | Versão | Justificativa | ADR |
|--------|------------|--------|---------------|-----|
| **Agent Backend** | Node.js + TypeScript | 20 LTS + TS 5.x | IO assíncrono, ecossistema rico, mesmo stack do SandeClaw | — |
| **LLM Principal** | Google Gemini (via SDK) | gemini-2.0-flash | Function calling nativo, custo baixo, multimodal | ADR-001 |
| **LLM Interface** | ILlmProvider + ProviderFactory | — | Abstração para suportar múltiplos LLMs sem refactor | ADR-001 |
| **Framework Telegram** | grammy | 1.x | Moderno, tipado, long-polling, callbacks, inline keyboards | — |
| **HTTP Server** | Express | 4.x | Simples, maduro, CORS built-in, suficiente para uso interno | — |
| **Banco de Dados** | Supabase (PostgreSQL) | — | Multi-tenant com RLS nativo, Storage incluído, SDK TypeScript | ADR-002 |
| **MCP Protocol** | @modelcontextprotocol/sdk | 1.x | Protocolo padrão para tool calling externo via stdio | — |
| **Scraping** | Apify Client | 2.x | API gerenciada, actor `facebook-ads-scraper` pronto | — |
| **Geração de Mídia** | inference.sh CLI (`infsh`) | latest | Suporta FLUX-1-Schnell + Veo 3.1, CLI simples | ADR-003 |
| **Frontend Cockpit** | React 19 + Vite 8 | latest | Rápido, hot-reload, ecossistema maduro | — |
| **CSS Framework** | Tailwind CSS 4 | 4.x | Utility-first, dark mode, glassmorphism | — |
| **Validação** | Zod | 3.x | TypeScript-first, schemas como source of truth | — |
| **YAML Parser** | js-yaml | 4.x | Para leitura de frontmatter dos SKILL.md (SkillRouter) | — |
| **Cron** | node-cron | 3.x | Cron jobs para Orchestrator | — |
| **Process Manager** | PM2 | 5.x | Auto-restart, logs, startup no boot da VPS | — |
| **Servidor Web** | nginx (opcional) | — | Servir build do Cockpit em produção | — |

---

## 2. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ENTRADAS (I/O)                               │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────────┐  │
│  │   Telegram   │  │  HTTP /api/*  │  │  Orchestrator (Cron 6h)  │  │
│  │  (grammy)    │  │  (Express)    │  │  (node-cron)             │  │
│  └──────┬───────┘  └───────┬───────┘  └────────────┬─────────────┘  │
│         └──────────────────┴───────────────────────┘                 │
│                             │                                         │
│                    OmnichannelGateway                                 │
│              (StandardizedInput normalização)                         │
└─────────────────────────────┬───────────────────────────────────────┘
                               │
┌─────────────────────────────▼───────────────────────────────────────┐
│                        CORE (AgentController)                         │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                      SkillRouter                              │    │
│  │  (call leve ao LLM → decide persona: ads-manager / creative) │    │
│  └────────────────────────────┬─────────────────────────────────┘    │
│                                │ skillContent (system prompt)         │
│  ┌─────────────────────────────▼──────────────────────────────────┐  │
│  │                        AgentLoop (ReAct)                        │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  ProviderFactory → ILlmProvider (Gemini / DeepSeek / …) │   │  │
│  │  └──────────┬──────────────────────────┬────────────────────┘   │  │
│  │    Thought  │                            │  text response          │  │
│  │             ▼                            ▼                         │  │
│  │  ┌─────────────────┐         ┌─────────────────────────────┐   │  │
│  │  │  ToolRegistry   │         │     MemoryManager            │   │  │
│  │  │  (14 tools)     │         │  (Supabase chat_history)     │   │  │
│  │  └────────┬────────┘         └─────────────────────────────┘   │  │
│  │           │                                                       │  │
│  │  ┌────────▼────────────────────────────────────────────────┐   │  │
│  │  │              Tool Execution Layer                         │   │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │  │
│  │  │  │Supabase  │ │MCP Meta  │ │MCP Google│ │ Creative │   │   │  │
│  │  │  │  Tools   │ │Ads Tools │ │Ads Tools │ │   Lab    │   │   │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │  │
│  │  │  ┌──────────┐ ┌──────────┐                               │   │  │
│  │  │  │ Telegram │ │ Upload   │                               │   │  │
│  │  │  │  Notify  │ │ Storage  │                               │   │  │
│  │  │  └──────────┘ └──────────┘                               │   │  │
│  │  └────────────────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────▼───────────────────────────────────────┐
│                      SAÍDAS (Output)                                  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│  │ TelegramOutput  │  │   HTTP Response  │  │ Supabase Storage │    │
│  │ (chunking+MD)   │  │   (JSON API)     │  │  (assets bucket) │    │
│  └─────────────────┘  └──────────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘

SERVIÇOS EXTERNOS:
┌──────────────┐  ┌───────────┐  ┌────────────────┐  ┌─────────────┐
│ Gemini API   │  │ Supabase  │  │ Meta Ads API   │  │ Google Ads  │
│ (LLM)        │  │ (DB+Stor) │  │ (via MCP)      │  │ API (MCP)   │
└──────────────┘  └───────────┘  └────────────────┘  └─────────────┘
┌──────────────┐  ┌───────────┐
│  Apify API   │  │inference  │
│ (benchmarks) │  │ .sh CLI   │
└──────────────┘  └───────────┘
```

### Princípios Arquiteturais
- **Monolito Modular**: único processo Node.js, módulos bem separados por responsabilidade
- **Fail Gracefully**: toda integração externa tem try/catch + fallback — nunca crasha o processo
- **Tool-Driven**: toda ação do agente passa pelo ToolRegistry (testável, auditável, extensível)
- **Stateless HTTP**: HTTP Server é stateless; estado persiste no Supabase
- **Client Isolation First**: toda operação de dados inclui `client_id` — sem exceções

---

## 3. Estrutura de Diretórios (Pós-Reorganização)

```
adsclaw/
├── agent/                          ← Backend Node.js (único processo de produção)
│   ├── src/
│   │   ├── core/
│   │   │   ├── AgentController.ts  ← Facade: orquestra I/O + SkillRouter + AgentLoop
│   │   │   ├── AgentLoop.ts        ← ReAct com Gemini Function Calling
│   │   │   ├── SkillRouter.ts      ← Decide qual persona/skill injetar
│   │   │   └── Orchestrator.ts     ← Cron 6h: audit clientes + fadiga
│   │   ├── llm/                    ← NOVO: Provider Factory
│   │   │   ├── ILlmProvider.ts     ← Interface abstrata
│   │   │   ├── ProviderFactory.ts  ← Factory por nome
│   │   │   └── providers/
│   │   │       ├── GeminiProvider.ts
│   │   │       └── OpenAICompatibleProvider.ts (DeepSeek, Groq)
│   │   ├── tools/
│   │   │   ├── ToolRegistry.ts     ← Registra FunctionDeclarations + executeTool()
│   │   │   ├── BaseTool.ts         ← Interface abstrata para tools
│   │   │   └── implementations/    ← NOVO: 1 arquivo por tool
│   │   │       ├── SupabaseTools.ts  (get_client_rules, list_clients)
│   │   │       ├── MetaMCPTools.ts   (wrap do MCP meta-ads)
│   │   │       ├── GoogleMCPTools.ts (wrap do MCP google-ads)
│   │   │       ├── CreativeLabTools.ts (fetch_benchmarks, gen_copy, gen_image, gen_video)
│   │   │       ├── StorageTools.ts   (upload_asset)
│   │   │       └── TelegramTools.ts  (notify_manager, ask_approval)
│   │   ├── memory/
│   │   │   └── MemoryManager.ts    ← Supabase chat_history + sliding window
│   │   ├── io/
│   │   │   ├── TelegramHandler.ts  ← Grammy: input + inline keyboard callbacks
│   │   │   ├── TelegramOutput.ts   ← NOVO: chunking, markdown, error format
│   │   │   ├── HttpServer.ts       ← Express: /api/chat, /api/health
│   │   │   └── OmnichannelGateway.ts ← StandardizedInput normalizer
│   │   ├── services/
│   │   │   └── CreativeLab.ts      ← Apify + LLM + inference.sh
│   │   ├── types/                  ← NOVO: todos os tipos de domínio
│   │   │   ├── agent.types.ts      ← LlmResponse, StandardizedInput, AgentResponse
│   │   │   ├── ads.types.ts        ← BenchmarkResult, AdCopyVariation, CampaignMetrics
│   │   │   └── supabase.types.ts   ← Client, ClientRules, ChatMessage
│   │   ├── lib/
│   │   │   └── supabase.ts         ← Supabase client singleton (service role)
│   │   └── index.ts                ← Bootstrap
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── cockpit/                        ← Frontend React (build → dist/)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   └── ClientsPage.tsx
│   │   ├── components/
│   │   │   └── AgentChat.tsx
│   │   └── lib/supabase.ts         ← Anon key (read-only)
│   └── package.json
│
├── mcp-servers/
│   ├── meta-ads/                   ← MCP Meta Ads (stdio)
│   │   ├── src/index.ts
│   │   └── src/meta-api.ts
│   └── google-ads/                 ← MCP Google Ads (stdio)
│       └── src/index.ts
│
├── supabase/
│   └── migrations/
│       ├── 20260314000000_init_adsclaw_schema.sql
│       └── 20260326000000_add_last_creative_refresh.sql  ← NOVA migration
│
├── references/                     ← Docs SDD (este diretório)
│   ├── PRD.md
│   ├── SPEC.md
│   ├── CONTRACTS.md
│   ├── PLAN.md
│   ├── RULES.md
│   ├── TASKS.md
│   ├── adr/
│   │   ├── ADR-001-multi-llm-provider-factory.md
│   │   ├── ADR-002-supabase-vs-sqlite.md
│   │   └── ADR-003-inference-sh-for-media.md
│   └── specs-modules/              ← Specs detalhadas por módulo
│       ├── agent-loop.md
│       ├── memory-manager.md
│       ├── tool-registry.md
│       ├── telegram-io.md
│       ├── mcp-bridges.md
│       ├── creative-lab.md
│       └── web-cockpit.md
│
└── docs/outros/                    ← Referências e estudos (não é spec)
    ├── sandeclaw-specs/            ← Specs do SandeClaw para referência
    ├── habilidades_gestor_ads_senior
    └── sundayclaw_guide.md
```

---

## 4. Modelagem do Banco de Dados

### Migration 1 (existente): `20260314000000_init_adsclaw_schema.sql`

```sql
-- Tabela de clientes
CREATE TABLE clients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL CHECK (length(name) >= 2),
  meta_ads_account_id   TEXT CHECK (meta_ads_account_id LIKE 'act_%'),
  google_ads_account_id TEXT,
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'paused', 'onboarding')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Regras por cliente (1:1)
CREATE TABLE client_rules (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  target_cpa             DECIMAL(10,2) NOT NULL CHECK (target_cpa > 0),
  target_roas            DECIMAL(6,2) CHECK (target_roas > 0),
  daily_budget           DECIMAL(10,2) NOT NULL CHECK (daily_budget >= 1),
  brand_voice            TEXT CHECK (length(brand_voice) <= 2000),
  primary_offer          TEXT CHECK (length(primary_offer) <= 500),
  creative_refresh_days  INTEGER NOT NULL DEFAULT 7
                           CHECK (creative_refresh_days BETWEEN 3 AND 30),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Histórico de chat
CREATE TABLE chat_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID REFERENCES clients(id),
  sender     TEXT NOT NULL
               CHECK (sender IN ('user','agent','telegram','system','tool')),
  message    TEXT NOT NULL,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_client_rules_client_id ON client_rules(client_id);
CREATE INDEX idx_chat_history_client_id ON chat_history(client_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);

-- RLS
ALTER TABLE clients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Policies: apenas authenticated (service role bypassa RLS)
CREATE POLICY "agents_full_access" ON clients
  FOR ALL USING (true);  -- service role bypassa, anon_key usa RLS
CREATE POLICY "agents_full_access" ON client_rules FOR ALL USING (true);
CREATE POLICY "agents_full_access" ON chat_history FOR ALL USING (true);
```

### Migration 2 (nova): `20260326000000_add_last_creative_refresh.sql`

```sql
-- Adiciona campo para rastrear fadiga de criativos
ALTER TABLE client_rules
  ADD COLUMN last_creative_refresh DATE DEFAULT NULL;

-- View: clientes que precisam de refresh
CREATE VIEW clients_needing_refresh AS
  SELECT
    c.id,
    c.name,
    cr.target_cpa,
    cr.creative_refresh_days,
    cr.last_creative_refresh,
    EXTRACT(DAY FROM now() - COALESCE(cr.last_creative_refresh::timestamptz, c.created_at)) AS days_since_refresh
  FROM clients c
  JOIN client_rules cr ON cr.client_id = c.id
  WHERE c.status = 'active';
```

### Supabase Storage Buckets

```sql
-- Bucket público para assets de criativos
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true);

-- Bucket privado para relatórios
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false);

-- Policy: service role tem acesso total
CREATE POLICY "service_role_all" ON storage.objects FOR ALL
  USING (true) WITH CHECK (true);
```

---

## 5. Variáveis de Ambiente

```env
# ============================================================
# AGENT — agent/.env
# ============================================================

# Supabase
SUPABASE_URL=https://gbzepjbevvimijemnhcj.supabase.co
SUPABASE_SERVICE_KEY=                  # Service role key (NUNCA expor ao frontend)
SUPABASE_ANON_KEY=                     # Anon key (fallback para health checks)

# LLM
GEMINI_API_KEY=                        # Google AI Studio
ACTIVE_PROVIDER=gemini                 # gemini | deepseek | groq | claude | openai
ACTIVE_TIER2_PROVIDER=gemini-pro       # Para análises (v1.1+)
ACTIVE_TIER3_PROVIDER=claude           # Para copy premium (v1.1+)

# Telegram
TELEGRAM_BOT_TOKEN=                    # BotFather token
TELEGRAM_ALLOWED_USER_IDS=            # IDs separados por vírgula: "123,456"

# Integrações
APIFY_TOKEN=                           # Apify.com account token
META_ACCESS_TOKEN=                     # Meta Marketing API token
GOOGLE_ADS_DEVELOPER_TOKEN=            # Google Ads API developer token
GOOGLE_ADS_CUSTOMER_ID=               # Customer ID (sem hífens)

# Servidor
HTTP_PORT=3001
COCKPIT_URL=http://localhost:5173      # Domínio do Cockpit para CORS

# Agent Config
MAX_ITERATIONS=5                       # Máx iterações ReAct
MEMORY_WINDOW_SIZE=30                  # Mensagens no contexto
ORCHESTRATOR_CRON=0 */6 * * *         # Cron: a cada 6h
LOG_LEVEL=info                         # debug | info | warn | error

# ============================================================
# COCKPIT — cockpit/.env.local
# ============================================================
VITE_SUPABASE_URL=https://gbzepjbevvimijemnhcj.supabase.co
VITE_SUPABASE_ANON_KEY=               # Anon key apenas
VITE_API_URL=http://212.85.22.148:3001

# ============================================================
# MCP META ADS — mcp-servers/meta-ads/.env
# ============================================================
META_ACCESS_TOKEN=

# ============================================================
# MCP GOOGLE ADS — mcp-servers/google-ads/.env
# ============================================================
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
```

---

## 6. Contratos de API (Resumo)

Detalhes completos em `references/CONTRACTS.md`.

| Método | Rota | Auth | Notas |
|--------|------|------|-------|
| POST | /api/chat | Não (rede interna) | Corpo: `{ message, clientId?, sessionId? }` |
| GET | /api/health | Não | Status check do PM2 |
| GET | /api/clients | Não | Lista clientes ativos |
| GET | /api/clients/:id/rules | Não | Regras de um cliente |
| PATCH | /api/clients/:id | Não | Atualizar cliente (v1.1) |
| POST | /api/clients | Não | Criar cliente (v1.1) |

---

## 7. Autenticação e Autorização

### Estratégia de Acesso (3 layers)

| Camada | Credencial | Quem usa | Acesso |
|--------|-----------|----------|--------|
| **Supabase Service Role** | `SUPABASE_SERVICE_KEY` | Agent backend | Full access, bypassa RLS |
| **Supabase Anon Key** | `SUPABASE_ANON_KEY` | Cockpit frontend | Read-only, sujeito a RLS |
| **Telegram Whitelist** | `TELEGRAM_ALLOWED_USER_IDS` | TelegramHandler | Apenas IDs autorizados |

### Segurança de Rede
- VPS: porta 3001 aberta apenas para o Cockpit e uso interno
- Em produção: configurar nginx como reverse proxy com SSL (Let's Encrypt)
- `SUPABASE_SERVICE_KEY` apenas em variáveis de ambiente do servidor (nunca no código)

---

## 8. Estratégia de Testes

| Tipo | Ferramenta | O que Testar | Cobertura Alvo |
|------|-----------|--------------|----------------|
| Unitários | Vitest | AgentLoop (lógica de iteração), ToolRegistry (registro e execução), MemoryManager (sliding window), criativeLab (formatação JSON) | >80% das funções críticas |
| Integração | Vitest + Supabase test instance | Fluxo completo: input → AgentLoop → tool → Supabase → output | Todos os 4 fluxos da SPEC |
| E2E Manual | — | Deploy na VPS, teste via Telegram real | Fluxos 1-3 da SPEC |
| Contrato | Vitest | HTTP endpoints vs CONTRACTS.md | Todos os endpoints |

### Como testar o AgentLoop sem gastar tokens
```typescript
// Mock do ProviderFactory para testes
const mockProvider: ILlmProvider = {
  generateContent: vi.fn()
    .mockResolvedValueOnce({ functionCall: { name: 'get_client_rules', args: { client_id: 'test' } } })
    .mockResolvedValueOnce({ text: 'Análise completa: CPA está acima do target.' }),
  getName: () => 'mock'
};
```

---

## 9. Deploy e Infraestrutura

### Ambiente de Produção (VPS Hostinger)

```
IP: 212.85.22.148
OS: Ubuntu 22.04 LTS
Runtime: Node.js 20 LTS
Process Manager: PM2 5.x
```

### Serviços PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'adsclaw-agent',
      script: './agent/dist/index.js',
      cwd: '/opt/adsclaw',
      env: { NODE_ENV: 'production' },
      restart_delay: 5000,
      max_restarts: 10,
      log_file: '/opt/adsclaw/logs/agent.log',
      error_file: '/opt/adsclaw/logs/agent-error.log',
    },
    {
      name: 'adsclaw-cockpit',
      script: 'serve',
      args: '-s cockpit/dist -l 3000',
      cwd: '/opt/adsclaw',
    }
  ]
};
```

### Pipeline de Deploy

```bash
# 1. Build local e push para GitHub
npm run build  # em agent/ e cockpit/ e mcp-servers/
git push origin main

# 2. Na VPS
ssh root@212.85.22.148
cd /opt/adsclaw && git pull origin main
cd agent && npm install && npm run build
cd ../mcp-servers/meta-ads && npm run build
cd ../google-ads && npm run build
cd ../cockpit && npm install && npm run build
pm2 restart all
```

### Checklist de Deploy

- [ ] `.env` com todas as variáveis preenchidas na VPS
- [ ] `SUPABASE_SERVICE_KEY` configurado (não o anon key)
- [ ] `TELEGRAM_BOT_TOKEN` e `TELEGRAM_ALLOWED_USER_IDS` configurados
- [ ] `GEMINI_API_KEY` válido
- [ ] Migrations Supabase aplicadas (`supabase db push`)
- [ ] inference.sh CLI instalado: `npm install -g inference.sh`
- [ ] PM2 startup configurado: `pm2 startup && pm2 save`
- [ ] Firewall: porta 3001 aberta, 3000 para Cockpit
- [ ] Teste de saúde: `curl http://212.85.22.148:3001/api/health`

---

## 10. Segurança

### Checklist Obrigatório

- [ ] Nenhuma API key hardcoded no código — apenas `process.env.X`
- [ ] `.env` no `.gitignore` — nunca commitado
- [ ] `SUPABASE_SERVICE_KEY` nunca exposto ao frontend ou em logs
- [ ] Whitelist Telegram: `TELEGRAM_ALLOWED_USER_IDS` obrigatório
- [ ] RLS habilitado em todas as tabelas com dados de cliente
- [ ] CORS configurado com `COCKPIT_URL` em produção (não wildcard)
- [ ] Rate limiting implícito: MCP timeouts (10s), ReAct MAX_ITERATIONS (5)
- [ ] Logs nunca incluem tokens, senhas ou dados pessoais de clientes finais
- [ ] `try/catch` em toda integração externa (sem erros não tratados)
- [ ] Stack traces nos logs internos, mensagem amigável para o usuário

---

## 11. Riscos Técnicos

| # | Risco | Prob. | Impacto | Mitigação | ADR |
|---|-------|-------|---------|-----------|-----|
| R-001 | Gemini API muda Function Calling schema | Média | Alto | ProviderFactory isola a mudança em GeminiProvider.ts | ADR-001 |
| R-002 | Meta Marketing API depreca endpoints | Baixa | Alto | MCP server isola; versionar chamadas de API | — |
| R-003 | inference.sh CLI não disponível na VPS | Alta | Médio | Fallback: entrega apenas copies em texto; notifica gestor | ADR-003 |
| R-004 | Supabase fica fora do ar | Baixa | Muito Alto | Cache em memória de client_rules por sessão; Telegram continua sem DB temporariamente | ADR-002 |
| R-005 | Orchestrator gera spam de alertas | Média | Médio | Rate limit: 1 alerta por cliente por 24h. Registrar último alerta em `client_rules.last_alert_at` | — |
| R-006 | Gemini gera JSON malformado em tool calls | Alta | Baixo | Catch + Observation de erro + retry na próxima iteração (CA-003) | — |
| R-007 | VPS Hostinger reinicia inesperadamente | Baixa | Alto | PM2 startup automático; Supabase persiste todo estado | — |
| R-008 | Tokens Apify esgotados | Média | Médio | Monitoring de uso; fallback: copy sem benchmarks (CA-013) | — |

---

## 12. Aprovação

- [x] Stack validada e justificada (com ADRs)
- [x] Arquitetura documentada com diagrama
- [x] Estrutura de diretórios definida
- [x] Schema do banco definido com migrations DDL
- [x] Variáveis de ambiente documentadas
- [x] Estratégia de auth (3 camadas)
- [x] Estratégia de testes (unitários + integração + E2E)
- [x] Checklist de segurança
- [x] Pipeline de deploy documentado
- [x] Riscos técnicos identificados com mitigações
- [ ] PLAN revisado e aprovado pelo responsável (Eduardo)
- [ ] Pronto para avançar para RULES (Constitution)

---

## 13. Arquitetura de Skills Operacionais (v2.0)

> **ADR-004:** Skills Operacionais como Metodologias Codificadas

### Conceito

Inspirado no Google Ads Toolkit de Austin Lau, o AdsClaw opera com **skills operacionais** — workflows estruturados com passos explícitos, critérios de avaliação e outputs padronizados. Cada skill codifica uma metodologia de gestão de tráfego que o agente segue rigorosamente.

Diferença fundamental: o agente não "decide o que fazer" — ele **executa uma metodologia documentada** e apresenta resultados para aprovação humana.

### Implementação Técnica

Skills operacionais são implementadas como **prompts estruturados + sequências de tool calls** dentro do AgentLoop. Não são tools separadas — são "modos de operação" do agente.

```
┌─────────────────────────────────────────────────┐
│                   AgentLoop                       │
│                                                   │
│  ┌─────────────┐  ┌─────────────────────────┐   │
│  │ SkillRouter │→ │ Skill System Prompt       │   │
│  │ (persona)   │  │ (metodologia codificada)  │   │
│  └─────────────┘  └────────────┬────────────┘   │
│                                 │                  │
│  ┌──────────────────────────────▼────────────┐   │
│  │           Tool Call Sequence                │   │
│  │  1. get_search_terms (MCP)                  │   │
│  │  2. evaluate_terms (LLM reasoning)          │   │
│  │  3. generate_csv (output formatado)         │   │
│  │  4. ask_approval (batch por campanha)       │   │
│  │  5. add_negatives (MCP write)               │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Como uma Skill é Ativada

1. Operador envia comando via Telegram/Cockpit (ex: "minere os termos de busca do cliente X")
2. SkillRouter identifica a skill relevante (SK-001: search-term-mining)
3. System prompt da skill é injetado como systemInstruction no Gemini
4. AgentLoop executa os passos da skill via Function Calling
5. Cada passo gera output intermediário (rastreável em chat_history.metadata)
6. Output final é apresentado ao operador com Reasoning
7. Operador aprova/rejeita

### Skills Compostas

Skills podem referenciar outras (ex: SK-001 carrega a metodologia de avaliação de termos antes de executar). A composição é feita via inclusão do system prompt da skill referenciada no contexto.

### Armazenamento de Skills

Skills operacionais são definidas em `agent/src/skills/` como arquivos Markdown ou TypeScript:

```
agent/src/skills/
├── search-term-mining.md       ← SK-001
├── budget-optimization.md      ← SK-002
├── weekly-review.md            ← SK-003
├── campaign-investigation.md   ← SK-004
├── creative-audit.md           ← SK-005
├── ad-copy-audit.md            ← SK-006
├── account-health-check.md     ← SK-007
└── onboarding-setup.md         ← SK-008
```

Cada arquivo contém: objetivo, passos, critérios, output esperado, skills referenciadas.

### Cadência Automática

| Skill | Trigger | Cadência |
|-------|---------|----------|
| SK-001 Search Term Mining | Manual ou weekly | Sob demanda ou semanal |
| SK-002 Budget Optimization | Manual | Sob demanda |
| SK-003 Weekly Review | Automático (cron) | Segunda 08:00 |
| SK-004 Campaign Investigation | Manual ou anomalia | Sob demanda |
| SK-005 Creative Audit | Manual ou fadiga | Sob demanda |
| SK-006 Ad Copy Audit | Manual | Sob demanda |
| SK-007 Account Health Check | Automático (cron) | Mensal |
| SK-008 Onboarding Setup | Manual (novo cliente) | Sob demanda |

---

*PLAN v2.0 — Atualizado em 2026-04-08 para alinhar com PRD v2.0*

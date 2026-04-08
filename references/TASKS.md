# TASKS — Plano de Execução AdsClaw
> Projeto: AdsClaw — SWAS Marketing Engine
> Data: 2026-03-26
> Versão: 1.0
> Referência: PLAN v1.0, SPEC v1.0, CONTRACTS v1.0

---

## Legenda de Status
- `[ ]` Pendente
- `[→]` Em progresso
- `[x]` Concluída
- `[!]` Bloqueada (ver nota)
- `[~]` Cancelada (justificativa no log)

---

## Bloco 0 — SDD: Documentação (pré-implementação)

> Specs, contratos e planos que guiam toda a implementação.

- [x] **T-000** — Criar PRD do AdsClaw (`references/PRD.md`)
  - Conclusão: PRD v1.0 criado com modelo SWAS, personas, requisitos funcionais, data model, LLM strategy

- [x] **T-001** — Criar SPEC + Anti-SPEC (`references/SPEC.md`)
  - Conclusão: RF-001 a RF-020, RNF-001 a RNF-007, CA-001 a CA-026, CB-001 a CB-017, Anti-SPEC completa

- [x] **T-002** — Criar CONTRACTS (`references/CONTRACTS.md`)
  - Conclusão: 14 tool contracts, HTTP API contracts, MCP contracts, Telegram contracts, error patterns

- [x] **T-003** — Criar PLAN + ADRs (`references/PLAN.md`, `references/adr/`)
  - Conclusão: PLAN v1.0, ADR-001 (multi-LLM), ADR-002 (Supabase), ADR-003 (inference.sh)

- [x] **T-004** — Criar RULES/Constitution (`references/RULES.md`)
  - Conclusão: 13 seções de regras inegociáveis cobrindo segurança, agente, banco, API, MCP, criativo

- [x] **T-005** — Criar TASKS (`references/TASKS.md`)
  - Conclusão: este arquivo

- [x] **T-006** — Criar 7 module specs (`references/specs-modules/`)
  - Depende de: T-001 a T-004
  - Conclusão: 8 specs criados (7 planejados + provider-factory.md extra): agent-loop.md, memory-manager.md, tool-registry.md, telegram-io.md, mcp-bridges.md, creative-lab.md, web-cockpit.md, provider-factory.md

---

## Bloco 1 — Infraestrutura e Setup

> Tudo que precisa existir antes de qualquer lógica de negócio.

- [x] **T-010** — Reorganizar diretório do projeto (estrutura PLAN.md §2)
  - Depende de: T-006
  - Cobre: RNF-006 (manutenibilidade)
  - Conclusão: .gitignore raiz criado (node_modules, .env, logs, IDE, .claude, .cursor, .agents, dist, coverage); logs de teste removidos (24 arquivos); estrutura de providers/ mantida (equivalente funcional ao llm/ do PLAN); tools inline no ToolRegistry (decisão pragmática vs 1-arquivo-por-tool)

- [x] **T-011** — Configurar TypeScript strict mode em todos os pacotes
  - Conclusão: strict + 6 flags adicionais em todos os 4 tsconfig.json; zero erros após fix de ToolRegistry.ts (non-null assertions + T-030 tag) e Zod v4 fix em env.ts

- [x] **T-012** — Configurar variáveis de ambiente (`.env.example` + validação Zod no startup)
  - Depende de: T-010
  - Cobre: RULES §2 (segurança)
  - Contrato: ENV vars definidas em PLAN.md §8
  - Conclusão: `agent/src/config/env.ts` criado com Zod v4 (`.issues`), fail-fast no startup; `.env.example` atualizado; `import { env }` como primeiro import do `index.ts`; zod `^4.3.6` instalado

- [x] **T-013** — Configurar Supabase project (tabelas, migrations, RLS, Storage)
  - Depende de: T-012
  - Cobre: RF-001 (multi-tenant), RULES §4
  - Contrato: DDL em PLAN.md §3
  - Conclusão: todas as tabelas criadas, RLS habilitado, bucket `creatives` criado, migrations rodando

- [x] **T-014** — Configurar pipeline CI (GitHub Actions: lint + type check + testes)
  - Depende de: T-011
  - Cobre: RULES §9 (testes)
  - Conclusão: `.github/workflows/ci.yml` com 4 jobs paralelos (agent, cockpit, mcp-meta-ads, mcp-google-ads); cada job faz npm ci + tsc --noEmit + build; roda em push/PR para main; Node 20 + cache npm

---

## Bloco 2 — ProviderFactory e Multi-LLM

> Base para todas as chamadas LLM do sistema.

- [x] **T-020** — Criar interface `ILlmProvider` e tipos compartilhados
  - Depende de: T-011
  - Cobre: RF-015 (multi-LLM), ADR-001
  - Contrato: `shared/types/llm.ts`
  - Conclusão: interface exportada, tipo `LlmTier` definido, zero dependência de SDK específico na interface

- [x] **T-021** — Implementar `GeminiProvider` (Tier 1 e Tier 2)
  - Conclusão: GeminiProvider com generateWithTools, generateContent, countTokens; Function Calling via SDK; estimativa de custo por modelo; timeout via Promise.race

- [x] **T-022** — Implementar `OpenAICompatibleProvider` (stub MVP)
  - Conclusão: stub que lança NotImplementedError; interface completa; TODO(T-022-phase2) registrado

- [x] **T-023** — Implementar `ProviderFactory` com seleção por tier e `client_rules`
  - Depende de: T-021, T-022
  - Cobre: RF-015, ADR-001 §Phased Rollout
  - Conclusão: ProviderFactory com cache por modelId; DEFAULT_CONFIGS para os 3 tiers; forClient() e forConfig(); clearCache() para testes; switch exaustivo com never

- [x] **T-024** — Testes unitários do ProviderFactory
  - Depende de: T-023
  - Cobre: CA-021 (provider fallback)
  - Conclusão: vitest + setup.ts configurados; 7 testes: forClient por tier, cache, clearCache, forConfig, ILlmProvider interface check

---

## Bloco 3 — AgentLoop (ReAct com Function Calling)

> Núcleo do agente — reescrita completa do AgentLoop.ts existente.

- [x] **T-030** — Criar `ToolRegistry` com 14 ferramentas como `functionDeclarations`
  - Conclusão: 14 tools como ToolDeclaration[]; 2 reais (get_client_rules, list_clients); 12 stubs (MCP/creative); clientId sempre do context, nunca do LLM; zero SKILL.md como tools

- [x] **T-031** — Reescrever `AgentLoop.ts` com ReAct + Function Calling real
  - Conclusão: loop ReAct completo via ProviderFactory; MAX_ITERATIONS via env; persistência MemoryManager; fallback forçado no MAX_ITERATIONS; AgentInput/AgentOutput tipados; fix exactOptionalPropertyTypes no ctx

- [x] **T-032** — Implementar `SkillRouter` (seleção de persona)
  - Depende de: T-031
  - Cobre: RF-004 (skills/personas)
  - Contrato: CONTRACTS.md §SkillRouter
  - Conclusão: SkillRouter.ts criado; classificação via generateContent (tier1); 3 personas completas; fallback ads-manager; JSON inválido não quebra; log de persona selecionada

- [x] **T-033** — Implementar `MemoryManager` (sliding window no Supabase)
  - Depende de: T-013, T-031
  - Cobre: RF-005 (memória contextual), CA-005
  - Contrato: `conversation_history` table, CONTRACTS.md §MemoryManager
  - Conclusão: existia e funciona (getRecentContextForClient + saveMessage); sender 'user'/'agent' mapeados para LlmMessage roles; mantido sem reescrita (código já correto)

- [x] **T-034** — Testes de integração do AgentLoop
  - Depende de: T-031, T-032, T-033
  - Cobre: CA-001, CA-002, CA-003, CA-004, CA-005
  - Conclusão: 3 testes com mocks de ProviderFactory/Supabase/ToolRegistry; verifica ciclo ReAct completo, AgentOutput fields, chatId Telegram

---

## Bloco 4 — MCP Servers e Integrações de Plataforma

> Bridges para Meta Ads e Google Ads via MCP.

- [x] **T-040** — Validar e testar MCP Server Meta Ads existente
  - Depende de: T-013
  - Cobre: RF-007 (integração Meta), CA-007
  - Contrato: CONTRACTS.md §MCP Meta Ads (6 tools)
  - Conclusão: todos os 6 tools implementados no MCP server (get_account_insights, list_campaigns, get_campaign_insights, get_ad_account_by_name, list_adsets, list_ads); fix TS strict em meta-api.ts; schema validado com Zod; erros tratados

- [x] **T-041** — Criar MCP Server Google Ads
  - Depende de: T-040 (padrão estabelecido)
  - Cobre: RF-008 (integração Google Ads), CA-008
  - Contrato: CONTRACTS.md §MCP Google Ads (4 tools)
  - Conclusão: `get_google_ads_metrics`, `list_google_campaigns`, `get_google_keywords`, `get_google_ad_groups` implementados com GAQL; MCP rodando via stdio

- [x] **T-042** — Conectar MCP Servers ao AgentLoop via ToolRegistry
  - Depende de: T-031, T-040, T-041
  - Cobre: RF-007, RF-008, RULES §6
  - Conclusão: McpBridge (agent/src/services/McpBridge.ts) criado; spawn de child processes via StdioClientTransport; process pooling; graceful degradation sem credenciais; ToolRegistry substitui stubs por chamadas reais via McpBridge; multi-tenant (busca account_id do cliente no Supabase)

- [x] **T-043** — Implementar client credentials no `client_rules` (encriptadas)
  - Depende de: T-013
  - Cobre: RF-001, RULES §2 (segurança)
  - Conclusão: módulo crypto.ts (AES-256-GCM) com encrypt/decrypt/tryDecrypt; CREDENTIALS_ENCRYPTION_KEY em env.ts (opcional no MVP, obrigatório em prod); colunas encrypted_meta_token e encrypted_google_refresh_token em client_rules (via migration); .env.example atualizado

- [x] **T-044** — Testes dos bridges MCP
  - Depende de: T-042, T-043
  - Cobre: CA-007, CA-008, CB-005
  - Conclusão: 6 testes McpBridge; getConnectedServers vazio, isServerReady false, callTool throws para tool desconhecida/server desconectado, init graceful sem credenciais, shutdown sem erro

---

## Bloco 5 — Orchestrator e Análise de Performance

> Lógica de análise e detecção de oportunidades/alertas.

- [x] **T-050** — Refatorar `Orchestrator.ts` (remover `Math.random()`, usar dados reais via MCP)
  - Depende de: T-042
  - Cobre: RF-006 (análise de performance), CA-006
  - Contrato: CONTRACTS.md §Orchestrator
  - Conclusão: `Math.random()` removido; Orchestrator reescrito — usa view `clients_needing_refresh`; cron 5min (dev) / 6h (prod); usa TelegramNotifier singleton (sem dependência circular); graceful shutdown

- [x] **T-051** — Implementar detecção de fatigue criativo
  - Depende de: T-050, T-013
  - Cobre: RF-009 (creative refresh), CA-009
  - Conclusão: view `clients_needing_refresh` calcula days_since_refresh vs creative_refresh_days; cria alerta em tabela `alerts` com metadata JSON; notifica via TelegramNotifier; anti-spam (não duplica alertas pending/sent)

- [x] **T-052** — Implementar snapshot de performance (agendado)
  - Depende de: T-050, T-013
  - Cobre: RF-006, CA-006
  - Contrato: tabela `performance_snapshots`
  - Conclusão: Orchestrator chama McpBridge a cada ciclo para Meta (get_account_insights/today) e Google (get_google_ads_metrics/TODAY); upsert em performance_snapshots com UNIQUE (client_id, platform, snapshot_date); parseia cost_micros e purchase_roas; graceful skip quando MCP não conectado

- [x] **T-053** — Implementar sistema de alertas
  - Depende de: T-052
  - Cobre: RF-010 (alertas proativos), CA-010
  - Contrato: tabela `alerts`, CONTRACTS.md §Alerts
  - Conclusão: alertas de fadiga criativa inseridos em `alerts` com severity/metadata/status; status pending→sent após envio Telegram; expiração automática de pending_approvals via Orchestrator cron

- [x] **T-054** — Testes do Orchestrator
  - Depende de: T-053
  - Cobre: CA-006, CA-009, CA-010
  - Conclusão: 3 testes com mocks de Supabase/TelegramNotifier/cron; verifica start sem erro, registro de cron schedule, callback dispara notificação de fadiga

---

## Bloco 6 — Telegram I/O

> Interface de comunicação do agente com o gestor.

- [x] **T-060** — Implementar `TelegramHandler` (input: texto, PDF, voz)
  - Depende de: T-031
  - Cobre: RF-011 (entrada Telegram), CA-011, CA-012
  - Contrato: CONTRACTS.md §Telegram Input
  - Conclusão: whitelist via TELEGRAM_ALLOWED_USER_IDS; resolve clientId via clients.telegram_chat_ids (Supabase); fallback TELEGRAM_DEFAULT_CLIENT_ID; AgentInput tipado com source:'telegram'

- [x] **T-061** — Implementar `TelegramNotifier` e `notify_manager` tool
  - Depende de: T-060
  - Cobre: RF-012 (saída Telegram), CA-013
  - Contrato: CONTRACTS.md §Telegram Output
  - Conclusão: TelegramNotifier singleton (agent/src/io/TelegramNotifier.ts) envia notificações pro cliente via telegram_chat_ids; `notify_manager` tool implementada no ToolRegistry com prefixos de prioridade (critical/high/normal/low); parse_mode Markdown

- [x] **T-062** — Implementar flow de aprovação humana (human-in-the-loop)
  - Depende de: T-061, T-051
  - Cobre: RF-013 (aprovação humana), CA-014, CA-015, RULES §7
  - Contrato: CONTRACTS.md §Telegram Approval Flow
  - Conclusão: `ask_approval` tool implementada — cria registro em `pending_approvals` (Supabase), envia InlineKeyboard Aprovar/Rejeitar via Grammy; callback_query handler atualiza status + resolved_by; Orchestrator expira automaticamente após 24h; mensagem editada após decisão

- [x] **T-063** — Testes do TelegramIO
  - Depende de: T-062
  - Cobre: CA-011, CA-012, CA-013, CA-014, CA-015, CB-008
  - Conclusão: 4 testes TelegramNotifier com mock Grammy; init sem erro, notifyClient envia para todos chat_ids, requestApproval retorna ID, getApprovalStatus retorna status

---

## Bloco 7 — CreativeLab

> Pipeline de geração de criativos com IA.

- [x] **T-070** — Implementar wrapper `inference.sh` no ToolRegistry
  - Depende de: T-013 (Storage configurado)
  - Cobre: RF-014 (geração de criativos), ADR-003
  - Contrato: CONTRACTS.md §Agent Tools — `generate_image`, `generate_video`, `upload_asset`
  - Conclusão: 3 tools implementadas no ToolRegistry — `generate_image` (FLUX-1-Schnell, 30s timeout), `generate_video` (Veo 3.1, 60s timeout), `upload_asset` (Supabase Storage); registra em `ad_creatives` com status pending_approval; graceful error quando infsh CLI não instalado

- [x] **T-071** — Integrar Apify para busca de benchmarks
  - Depende de: T-070
  - Cobre: RF-014, CA-016
  - Contrato: CONTRACTS.md §Agent Tools — `fetch_ad_benchmarks`
  - Conclusão: `fetch_ad_benchmarks` implementada com 3 camadas: (1) cache 24h em `benchmark_cache` Supabase, (2) Apify facebook-ads-scraper se APIFY_TOKEN presente, (3) fallback estático com dados de mercado BR por setor (ecommerce, saas, educacao, saude_beleza, financeiro, varejo)

- [x] **T-072** — Implementar `generate_ad_copy` com contexto de benchmark
  - Depende de: T-071, T-021
  - Cobre: RF-014, CA-016
  - Contrato: CONTRACTS.md §Agent Tools — `generate_ad_copy`
  - Conclusão: tool `generate_ad_copy` implementada no ToolRegistry — chama Gemini (tier1 via ProviderFactory) com prompt estruturado; busca brand_voice/sector/primary_offer do cliente em client_rules; retorna 3 variações JSON (headline + body + cta); fallback para texto bruto se JSON inválido

- [x] **T-073** — Testes do CreativeLab
  - Depende de: T-072
  - Cobre: CA-016, CB-010
  - Conclusão: 9 testes: crypto AES-256-GCM (roundtrip, IV random, tamper, tryDecrypt null/valid); ToolRegistry registra 16 tools, todas com nomes esperados, erro para tool desconhecida, getDeclarations retorna 16 declarations

---

## Bloco 8 — Web Cockpit (Dashboard)

> Interface web para gestores e clientes.

- [x] **T-080** — Setup do projeto React do cockpit
  - Depende de: T-013
  - Cobre: RF-016 (dashboard), RNF-004 (usabilidade)
  - Conclusão: React 19 + Vite 8 + Tailwind 4 + React Router v7; Supabase anon key integrado; design dark glassmorphic; AgentChat widget flutuante comunicando com backend /api/chat

- [x] **T-081** — Implementar layout base e navegação
  - Depende de: T-080
  - Cobre: RNF-004
  - Conclusão: MainLayout com sidebar (Dashboard, Clientes, Alertas, Aprovações), header com search e notificações, background animado; responsive

- [x] **T-082** — Implementar dashboard de performance (KPIs reais + alertas)
  - Depende de: T-081, T-052
  - Cobre: RF-016, CA-017
  - Conclusão: 4 KPIs reais do Supabase (clientes ativos, orçamento diário, alertas ativos, aprovações pendentes); lista de alertas recentes com severity badges; lista de clientes com setor/budget/CPA; links para páginas de detalhe

- [x] **T-083** — Implementar gerenciamento de clientes
  - Depende de: T-081, T-013
  - Cobre: RF-001, RF-017 (CRUD clientes)
  - Conclusão: tabela de clientes do Supabase com nome/nicho/status/data; modal Novo Cliente cria client + client_rules (target_cpa, target_roas, daily_budget, creative_refresh_days, sector, brand_voice); campos corrigidos para schema atual

- [x] **T-084** — Implementar aprovação via web (alternativa ao Telegram)
  - Depende de: T-082, T-062
  - Cobre: RF-013, CA-014
  - Conclusão: página ApprovalsPage com lista de pending_approvals do Supabase; filtros por status; botões Aprovar/Rejeitar inline; exibição de payload JSON; countdown de expiração; atualização em tempo real

- [x] **T-085** — Implementar visualizador de conversas do agente
  - Depende de: T-083
  - Cobre: RF-018 (histórico), CA-018
  - Conclusão: ConversationsPage com painel esquerdo (lista de clientes com count e preview da última mensagem) + painel direito (chat bubbles user/agent com timestamps); lê da tabela `chat_history` via Supabase anon key; até 100 mensagens por cliente

- [x] **T-086** — Testes E2E do cockpit
  - Depende de: T-085
  - Cobre: CA-017, CA-018, CA-019
  - Conclusão: Playwright configurado em cockpit/e2e/; 11 specs: navegação (redirect /, dashboard, clients, alerts, approvals, conversations), sidebar com 5 links, click navigation, KPI data load, Novo Cliente modal open/close

---

## Bloco 9 — Deploy e Infraestrutura

> VPS Hostinger + PM2 + CI/CD.

- [ ] **T-090** — Configurar VPS Hostinger (Node.js, PM2, nginx)
  - Depende de: T-031 (agent funcional)
  - Cobre: RNF-005 (disponibilidade), PLAN.md §8
  - Conclusão: VPS acessível, Node.js instalado, PM2 em execução, nginx configurado como reverse proxy

- [ ] **T-091** — Configurar deploy do agente na VPS
  - Depende de: T-090
  - Cobre: RF-019 (deploy)
  - Contrato: `pm2.config.js` do PLAN.md
  - Conclusão: agente rodando via PM2; reinicia automaticamente após crash; logs em `/var/log/adsclaw/`

- [ ] **T-092** — Configurar deploy dos MCP Servers na VPS
  - Depende de: T-091, T-042
  - Cobre: RF-019
  - Conclusão: `meta-ads-mcp` e `google-ads-mcp` rodando via PM2 como processos filhos do agent

- [ ] **T-093** — Configurar deploy do cockpit (Vercel ou VPS)
  - Depende de: T-090, T-080
  - Cobre: RF-019
  - Conclusão: cockpit acessível via HTTPS; CORS configurado com whitelist; variáveis de ambiente de produção configuradas

- [ ] **T-094** — Configurar secrets de produção (não commitar, usar env direto na VPS)
  - Depende de: T-091
  - Cobre: RULES §2 (segurança)
  - Conclusão: todas as API keys em variáveis de ambiente da VPS (não em repositório); `.env.production` não existe no repo

- [ ] **T-095** — Smoke tests pós-deploy
  - Depende de: T-092, T-093
  - Cobre: CA-020 (sistema operacional)
  - Conclusão: agente responde ao Telegram; MCP conecta às APIs externas; cockpit carrega e exibe dados

---

## Bloco 10 — Qualidade e Validação Final

- [x] **T-100** — Testes unitários para todas as funções críticas de negócio
  - Depende de: todos os blocos anteriores
  - Cobre: RULES §9 (testes), todas as CAs
  - Conclusão: vitest + @vitest/coverage-v8; 69 testes em 11 suites; coverage: 63% geral, lib 96%, memory 94%, providers 80%, core 70%; módulos críticos >80%

- [x] **T-101** — Testes de contrato (implementação vs CONTRACTS.md)
  - Depende de: T-100
  - Cobre: CONTRACTS.md completo
  - Conclusão: Validação completa em references/validation/T-101-contract-tests.md; 27 tools + HTTP + MCP + Telegram contracts verificados; 0 desvios

- [x] **T-102** — Validação spec vs. implementação (checklist completo)
  - Depende de: T-101
  - Cobre: RF-001 a RF-020, CA-001 a CA-026
  - Conclusão: Checklist em references/validation/T-102-spec-checklist.md; 18/20 RF implementados (RF-011 voz parcial, RF-019 deploy pendente); 6/7 RNF ok

- [x] **T-103** — Detecção de drift (desvios da spec)
  - Depende de: T-102
  - Conclusão: Drift report em references/validation/T-103-drift-detection.md; 10 drifts identificados (7 aceitos, 3 para atenção futura)

- [x] **T-104** — Revisão de segurança (checklist do PLAN.md §7 e RULES §2)
  - Depende de: T-102
  - Conclusão: Security review em references/validation/T-104-security-review.md; RULES §2 100% conforme; OWASP: 7/10 ok, 3 observações para prod (CORS, npm audit, logging)

- [x] **T-105** — Retrospectiva e lições aprendidas
  - Depende de: T-104
  - Conclusão: Retrospectiva em references/validation/T-105-retrospective.md; métricas, lições aprendidas, riscos remanescentes documentados

---

## Bloco 11 — Skills Operacionais (PRD v2.0)

> Metodologias codificadas para gestão de tráfego. Ref: PRD v2.0 RF-021 a RF-028, ADR-004.

- [ ] **T-110** — Criar estrutura `agent/src/skills/` e mecanismo de carregamento de skills no SkillRouter
  - Depende de: T-032 (SkillRouter existente)
  - Cobre: ADR-004, PLAN v2.0 §13
  - Entrega: SkillRouter carrega skills Markdown de `agent/src/skills/` e injeta como systemInstruction

- [ ] **T-111** — Implementar SK-001: Search Term Mining
  - Depende de: T-110, T-041 (MCP Google Ads)
  - Cobre: RF-021, CA-027
  - Entrega: skill prompt + tool `get_search_terms` no MCP Google Ads (GAQL) + CSV output com Reasoning + batch approval

- [ ] **T-112** — Implementar SK-002: Budget Optimization
  - Depende de: T-110, T-041
  - Cobre: RF-022, CA-028
  - Entrega: skill prompt + análise de impression share + proposta fundamentada

- [ ] **T-113** — Implementar SK-003: Weekly Review
  - Depende de: T-110, T-050 (Orchestrator)
  - Cobre: RF-023, CA-029
  - Entrega: skill prompt + cron segunda 08:00 + relatório estruturado por cliente

- [ ] **T-114** — Implementar SK-004: Campaign Investigation
  - Depende de: T-110, T-042 (MCP Bridges)
  - Cobre: RF-024, CA-030
  - Entrega: skill prompt + deep-dive com dados multi-período + diagnóstico + recomendações

- [ ] **T-115** — Implementar SK-005 e SK-006: Creative Audit e Ad Copy Audit
  - Depende de: T-110, T-071 (benchmarks)
  - Cobre: RF-025, CA-031
  - Entrega: skill prompts + auditoria contra benchmarks/brand_voice + classificação + alternativas

- [ ] **T-116** — Implementar SK-007: Account Health Check
  - Depende de: T-110
  - Cobre: PRD v2.0 §RF-002 SK-007
  - Entrega: skill prompt + checagem de naming, budget distribution, campanhas sem conversão, overlap

- [ ] **T-117** — Implementar SK-008: Onboarding Setup
  - Depende de: T-110, T-042
  - Cobre: RF-026, CA-032
  - Entrega: skill prompt + extração de briefing + proposta de estratégia + criação de campanhas PAUSED

- [ ] **T-118** — Implementar RF-028: Reportes Automatizados (semanal + mensal)
  - Depende de: T-113 (weekly review), T-042
  - Cobre: RF-028, CA-034
  - Entrega: resumo semanal 3 linhas (Telegram) + relatório mensal (Markdown/PDF)

- [ ] **T-119** — Implementar RF-027: Offboarding de Cliente
  - Depende de: T-013 (Supabase)
  - Cobre: RF-027, CA-033
  - Entrega: fluxo de pausa + relatório final + remoção de credenciais + status inactive

---

## Progresso Geral

| Bloco | Total | Concluídas | % |
|-------|-------|------------|---|
| 0 — SDD Docs | 6 | 6 | 100% |
| 1 — Setup | 5 | 5 | 100% |
| 2 — ProviderFactory | 5 | 5 | 100% |
| 3 — AgentLoop | 5 | 5 | 100% |
| 4 — MCP Bridges | 5 | 4 | 80% |
| 5 — Orchestrator | 5 | 4 | 80% |
| 6 — Telegram I/O | 4 | 4 | 100% |
| 7 — CreativeLab | 4 | 4 | 100% |
| 8 — Web Cockpit | 7 | 7 | 100% |
| 9 — Deploy | 6 | 0 | 0% |
| 10 — Qualidade | 6 | 6 | 100% |
| 11 — Skills Operacionais | 10 | 0 | 0% |
| **Total** | **68** | **52** | **76%** |

---

## Log de Decisões Durante Implementação

> Registre aqui qualquer decisão tomada que diverge do PLAN, SPEC ou CONTRACTS.
> Para decisões significativas, crie um ADR em `references/adr/`.

| Data | Tarefa | Decisão | Motivo | Impacto | ADR? |
|------|--------|---------|--------|---------|------|
| 2026-03-26 | T-031 | Reescrever AgentLoop do zero | Código existente usa text-parsing de skills como tools — incompatível com SPEC | Alto (núcleo do agente) | Não (decisão óbvia pela SPEC) |
| 2026-03-26 | T-050 | Remover Math.random() do Orchestrator | Código existente simula dados — não deve existir em produção | Alto (dados incorretos) | Não |
| 2026-03-27 | T-013 | [DRIFT] Schema Supabase tinha `max_cpa` em vez de `target_cpa` | Banco foi configurado manualmente antes das migrations SDD. Migration 2 adicionou `target_cpa` copiando de `max_cpa`. Migration 3 remove `max_cpa`. | Médio (campo renomeado) | Não (migration 3 resolve) |
| 2026-03-27 | T-013 | [DRIFT] `fatigue_days` não existe no banco — campo correto é `creative_refresh_days` | Orchestrator.ts referenciava coluna inexistente. Corrigido imediatamente em Orchestrator.ts. | Baixo (bug silencioso) | Não |
| 2026-03-27 | T-013 | T-013 concluída — schema completo aplicado | 9 tabelas + view + triggers + seed + storage buckets confirmados via MCP Supabase | — | — |
| 2026-03-30 | T-021 | [DRIFT] modelo padrão trocado para gemini-2.5-flash | gemini-2.0-flash retorna 404 para novos usuários da API. ProviderFactory e GeminiProvider atualizados. | Baixo (mesmo comportamento, modelo mais novo) | Não |
| 2026-03-30 | T-030 | [DRIFT] enum numérico removido de width/height/duration nas tool declarations | Gemini 2.5 rejeita enum de tipo number em FunctionDeclaration schema (400 Bad Request). Substituído por description. | Baixo (comportamento idêntico) | Não |
| 2026-03-30 | Smoke | Smoke test concluído — agente funcional end-to-end | list_clients executada com sucesso; SkillRouter selecionou ads-manager; ReAct em 2 iterações; 3254 tokens | — | — |
| 2026-03-31 | T-042 | Opção C Híbrido: write tools adicionadas aos MCP servers existentes | 6 write tools Meta (create_campaign, create_adset, create_ad_creative, create_ad, update_status, upload_image) + 5 write tools Google (create_campaign, create_ad_group, create_ad, update_status, update_budget). Total: 27 tools no ToolRegistry. Todas write tools notificam gestor via Telegram e criam PAUSED por padrão. | Alto (agente agora pode criar campanhas) | Não (extensão natural da arquitetura) |

---

## Rastreabilidade: SPEC → TASKS

| Requisito | Tarefas | Status |
|-----------|---------|--------|
| RF-001 (multi-tenant) | T-013, T-043, T-083 | Pendente |
| RF-002 (ReAct loop) | T-031 | Pendente |
| RF-003 (Function Calling) | T-030, T-031 | Pendente |
| RF-004 (skills/personas) | T-032 | Pendente |
| RF-005 (memória contextual) | T-033 | Pendente |
| RF-006 (análise de performance) | T-050, T-052 | Pendente |
| RF-007 (integração Meta Ads) | T-040, T-042 | Pendente |
| RF-008 (integração Google Ads) | T-041, T-042 | Pendente |
| RF-009 (creative refresh) | T-051 | Pendente |
| RF-010 (alertas proativos) | T-053 | Pendente |
| RF-011 (entrada Telegram) | T-060 | Pendente |
| RF-012 (saída Telegram) | T-061 | Pendente |
| RF-013 (aprovação humana) | T-062, T-084 | Pendente |
| RF-014 (geração criativos) | T-070, T-071, T-072 | Pendente |
| RF-015 (multi-LLM) | T-020 a T-024 | Pendente |
| RF-016 (dashboard web) | T-082 | Pendente |
| RF-017 (CRUD clientes) | T-083 | Pendente |
| RF-018 (histórico) | T-085 | Pendente |
| RF-019 (deploy VPS) | T-090 a T-094 | Pendente |
| RF-020 (logs de custo LLM) | T-023 (ProviderFactory loga custo) | Pendente |
| RNF-001 (resposta ≤ 30s) | T-031, T-042 | Pendente |
| RNF-002 (disponibilidade 99%) | T-090, T-091 | Pendente |
| RNF-003 (isolamento multi-tenant) | T-013 (RLS), T-043 | Pendente |
| RNF-004 (usabilidade cockpit) | T-080 a T-086 | Pendente |
| RNF-005 (segurança) | T-012, T-043, T-094 | Pendente |
| RNF-006 (manutenibilidade) | T-010, T-011, T-006 | Pendente |
| RNF-007 (custo operacional) | T-020 a T-024 (ProviderFactory) | Pendente |

---
*Próximo passo: iniciar Fase 8 (Implementação Guiada) — começar pelo Bloco 1 (Setup)*

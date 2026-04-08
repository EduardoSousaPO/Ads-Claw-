# SPEC — Especificação Funcional + Anti-SPEC
> Projeto: AdsClaw — SWAS Performance Marketing Engine
> Data: 2026-03-26 | Atualizado: 2026-04-08
> Versão: 2.0
> Referência: PRD v2.0
>
> **Changelog v2.0:** Adicionados RF-021 a RF-028 (skills operacionais, onboarding, offboarding, reportes, batch approval, auditabilidade). Anti-SPEC atualizada para refletir write tools existentes. Novos CAs (CA-027 a CA-034). Novos CBs (CB-018 a CB-023).

---

## 1. Requisitos Funcionais

---

### RF-001 — AgentLoop ReAct com Gemini Function Calling
**Descrição:** O sistema deve implementar um ciclo ReAct (Reasoning and Acting) real, onde o Gemini decide chamar tools via Function Calling, o sistema executa a tool, injeta a observação de volta no contexto e itera — até 5 vezes ou até gerar resposta final.
**Prioridade:** Alta
**Critério de aceite:** CA-001, CA-002, CA-003
**Contrato:** `CONTRACTS.md §3 — Agent Tool Contracts`
**Notas:**
- Usar `model.generateContent({ contents, tools: [{ functionDeclarations }] })`
- Quando response.functionCall existe → executar tool → injetar resultado como `role: "tool"`
- Quando response.text existe → retornar como resposta final
- MAX_ITERATIONS = 5 (env configurável)
- Logs obrigatórios a cada step: `[AgentLoop] Thought: X | Action: Y | Observation: Z`

---

### RF-002 — ProviderFactory com ILlmProvider
**Descrição:** O sistema deve abstrair todos os LLMs atrás de uma interface `ILlmProvider` com um `ProviderFactory` que instancia o provider correto por nome. MVP inicia com Gemini apenas, mas a interface deve estar pronta para DeepSeek, Groq, Claude, GPT-4o.
**Prioridade:** Alta
**Critério de aceite:** CA-004
**Contrato:** `ADR-001-multi-llm-provider-factory.md`
**Notas:**
- Interface: `generateContent(messages, tools?, systemPrompt?): Promise<LlmResponse>`
- LlmResponse: `{ text?: string, functionCall?: { name, args }, provider: string }`
- Tier 1 (routing/chat): Gemini 2.0 Flash
- Tier 2 (analysis): Gemini 2.5 Pro ou DeepSeek V3
- Tier 3 (creative copy): Claude Sonnet ou GPT-4o
- MVP: só Tier 1 implementado. Tiers 2-3 ficam para v1.1

---

### RF-003 — ToolRegistry com Tools Executáveis Reais
**Descrição:** O sistema deve registrar tools executáveis como `functionDeclarations` para o Gemini. As tools são TypeScript classes/funções que chamam APIs reais (Supabase, MCP servers, Apify, inference.sh, Telegram). NÃO deve carregar Claude Code skills (SKILL.md) como runtime tools.
**Prioridade:** Alta
**Critério de aceite:** CA-005, CA-006
**Contrato:** `CONTRACTS.md §3 — Agent Tool Contracts (14 tools)`
**Notas:**
- Tools a registrar: `get_client_rules`, `list_clients`, `meta_get_account_insights`, `meta_list_campaigns`, `meta_get_campaign_insights`, `google_get_performance`, `google_list_campaigns`, `fetch_ad_benchmarks`, `generate_ad_copy`, `generate_image`, `generate_video`, `upload_asset`, `notify_manager`, `ask_approval`
- MCP tools carregadas via `client.callTool()` do MCP SDK
- ToolRegistry expõe: `getFunctionDeclarations(): FunctionDeclaration[]` para Gemini
- ToolRegistry expõe: `executeTool(name, args): Promise<unknown>` para o AgentLoop

---

### RF-004 — MemoryManager com Supabase (Sliding Window)
**Descrição:** O sistema deve persistir o histórico de chat na tabela `chat_history` do Supabase, com isolamento por `client_id`. O AgentLoop recebe apenas as últimas `MEMORY_WINDOW_SIZE` mensagens (padrão: 30) para evitar estouro de contexto.
**Prioridade:** Alta
**Critério de aceite:** CA-007, CA-008
**Contrato:** `CONTRACTS.md §2 — Schema: ChatMessage`
**Notas:**
- `saveMessage(clientId, sender, message, metadata?)`: insere em `chat_history`
- `getHistory(clientId, limit?)`: retorna últimas N mensagens ordenadas asc
- `sender` válidos: `"user" | "agent" | "telegram" | "system" | "tool"`
- `metadata` JSONB: armazena tool calls, MCP outputs, model usado
- `client_id` pode ser null para chat geral (sem contexto de cliente específico)

---

### RF-005 — Orchestrator Proativo com Métricas Reais
**Descrição:** O sistema deve executar auditorias periódicas (a cada 6 horas em produção) consultando métricas REAIS via MCP servers (não mocked). Compara métricas atuais com `client_rules` de cada cliente ativo.
**Prioridade:** Alta
**Critério de aceite:** CA-009
**Contrato:** `CONTRACTS.md §3 — Tool: meta_get_account_insights`
**Notas:**
- Cron: `0 */6 * * *` (a cada 6h). Durante dev/demo: `*/30 * * * *` (30min)
- Para cada cliente com `meta_ads_account_id` configurado: chamar MCP Meta para métricas
- Para cada cliente com `google_ads_account_id` configurado: chamar MCP Google para métricas
- Comparar CPA atual vs `client_rules.target_cpa`
- Comparar ROAS atual vs `client_rules.target_roas` (se configurado)
- Registrar resultado do audit em `chat_history` com `sender: "system"`

---

### RF-006 — Detecção de Fadiga de Criativo
**Descrição:** O sistema deve detectar fadiga quando: `dias_desde_ultimo_refresh >= creative_refresh_days` E `cpa_atual > target_cpa`. Ao detectar, marca o cliente como necessitando refresh e dispara o fluxo do Creative Dilemma.
**Prioridade:** Alta
**Critério de aceite:** CA-010, CA-011
**Contrato:** —
**Notas:**
- `dias_desde_ultimo_refresh`: calculado a partir do `last_creative_refresh` em `client_rules` (campo a adicionar na migration)
- Condição: `daysActive >= creative_refresh_days AND currentCPA > target_cpa`
- Não disparar mais de 1 alerta por cliente por período de 24h (evitar spam)
- Logar cada detecção: `[Orchestrator] Fadiga detectada: {clientName} | CPA: {atual} > {target}`

---

### RF-007 — Creative Dilemma com Human-in-the-Loop
**Descrição:** Quando fadiga é detectada, o sistema deve notificar o gestor via Telegram com botões inline: "Upload Manual" e "Laboratório Criativo". A resposta do gestor define o próximo passo. O agente aguarda a resposta antes de agir.
**Prioridade:** Alta
**Critério de aceite:** CA-012
**Contrato:** `CONTRACTS.md §5 — Telegram Message Contracts`
**Notas:**
- Mensagem de alerta: inclui nome do cliente, CPA atual, CPA alvo, dias ativos
- Inline keyboard com 2 botões: `callback_data: "manual_upload:{clientId}"` e `callback_data: "open_lab:{clientId}"`
- Grammy registra handler `bot.callbackQuery()` para interceptar o callback
- Resposta de "Upload Manual": mensagem "Ok! Assim que subir os criativos, avise para continuar o monitoramento."
- Resposta de "Laboratório Criativo": dispara RF-008

---

### RF-008 — Pipeline do Laboratório Criativo
**Descrição:** O sistema deve executar o pipeline completo de geração de criativos em 4 etapas: (1) Benchmark scraping, (2) Copy generation, (3) Media generation, (4) Storage upload.
**Prioridade:** Alta
**Critério de aceite:** CA-013, CA-014, CA-015
**Contrato:** `CONTRACTS.md §3 — Tools: fetch_ad_benchmarks, generate_ad_copy, generate_image, generate_video, upload_asset`
**Notas:**
- **Etapa 1 (Benchmark):** Apify `apify/facebook-ads-scraper`, nicho extraído de `client_rules.primary_offer`
- **Etapa 2 (Copy):** LLM Tier 2 ou Tier 3 (Gemini 2.5 Pro ou Claude Sonnet). Retorna JSON: `{ analysis, variations: [{ copy, headline, cta, visual_suggestion }] }`
- **Etapa 3 (Mídia):** `infsh app run black-forest-labs/flux-1-schnell` para imagens; `infsh app run google/veo-3-1-fast` para vídeos. inference.sh CLI deve estar instalado na VPS
- **Etapa 4 (Storage):** Upload para `assets/{client_id}/` no Supabase Storage. Retorna URL pública
- Fallback: se Etapa 3 falhar, notificar gestor e entregar apenas copies em texto

---

### RF-009 — MCP Meta Ads Bridge (Leitura)
**Descrição:** O sistema deve conectar ao Meta Ads MCP Server via stdio e disponibilizar suas 6 tools ao AgentLoop. O MCP server deve ser iniciado como processo filho ao inicializar o ToolRegistry.
**Prioridade:** Alta
**Critério de aceite:** CA-016
**Contrato:** `CONTRACTS.md §4 — MCP Server Contracts`
**Notas:**
- Tools disponíveis: `get_account_insights`, `list_campaigns`, `get_campaign_insights`, `get_ad_account_by_name`, `list_adsets`, `list_ads`
- Requer `META_ACCESS_TOKEN` no `.env`
- Timeout: 10 segundos por tool call
- Se META_ACCESS_TOKEN ausente: MCP não inicializa, tools ficam indisponíveis (graceful degradation)

---

### RF-010 — MCP Google Ads Bridge (Leitura)
**Descrição:** O sistema deve conectar ao Google Ads MCP Server via stdio com tools de leitura de performance e listagem de campanhas via GAQL.
**Prioridade:** Alta
**Critério de aceite:** CA-016
**Contrato:** `CONTRACTS.md §4 — MCP Server Contracts`
**Notas:**
- Tools disponíveis: `get_performance`, `list_campaigns`
- Requer `GOOGLE_ADS_CUSTOMER_ID` e `GOOGLE_ADS_DEVELOPER_TOKEN` no `.env`
- Graceful degradation se tokens ausentes

---

### RF-011 — Telegram Input Handler (Whitelist + Routing)
**Descrição:** O sistema deve escutar mensagens de texto no Telegram via Grammy long-polling, validar o `user_id` contra `TELEGRAM_ALLOWED_USER_IDS`, e rotear para o AgentController. Mensagens de usuários não autorizados são ignoradas silenciosamente.
**Prioridade:** Alta
**Critério de aceite:** CA-017
**Contrato:** `CONTRACTS.md §5 — Telegram Message Contracts`
**Notas:**
- Enviar `sendChatAction('typing')` imediatamente ao receber mensagem válida
- `TELEGRAM_ALLOWED_USER_IDS`: string com IDs separados por vírgula no `.env`
- Usuários não autorizados: sem resposta, sem log de conteúdo da mensagem (privacidade)
- Suporte a texto apenas (v1). Documentos, áudio e imagens recebem mensagem: "Por enquanto só processo texto. 📝"

---

### RF-012 — Telegram Output Handler (Chunking + Markdown)
**Descrição:** O sistema deve enviar respostas do agente via Telegram com suporte a chunking para mensagens longas (>4096 chars) e formatação Markdown.
**Prioridade:** Alta
**Critério de aceite:** CA-018
**Contrato:** `CONTRACTS.md §5`
**Notas:**
- Chunk em quebras de parágrafo (`\n\n`) para não cortar palavras ao meio
- `parse_mode: "Markdown"` em todas as mensagens
- Se parsing Markdown falhar: reenviar como texto puro (fallback)
- Rate limiting: aguardar 300ms entre chunks para evitar erro 429

---

### RF-013 — HTTP API Server (Express)
**Descrição:** O sistema deve expor uma API REST em `PORT=3001` com endpoints para o Cockpit: `POST /api/chat`, `GET /api/health`, `GET /api/clients`.
**Prioridade:** Alta
**Critério de aceite:** CA-019
**Contrato:** `CONTRACTS.md §1 — HTTP API Contracts`
**Notas:**
- CORS: `origin: process.env.COCKPIT_URL || "*"` (restringir em produção)
- `POST /api/chat`: `{ message, clientId?, sessionId? }` → `{ data: { reply, timestamp } }`
- `GET /api/health`: retorna `{ status: "ok", uptime, version }` — sem auth
- Sem autenticação nos endpoints (rede interna / VPS apenas)

---

### RF-014 — Agency Cockpit Dashboard
**Descrição:** O sistema deve disponibilizar um dashboard web (React/Vite/Tailwind 4) com KPIs da agência, lista de clientes e status de operação. Consome dados do Supabase (anon key) e da HTTP API.
**Prioridade:** Média
**Critério de aceite:** CA-020
**Contrato:** `CONTRACTS.md §2 — Schema: Client`
**Notas:**
- KPIs: contagem de clientes ativos, ROAS médio, CPA médio (calculados no frontend)
- Design: dark mode, glassmorphism, cores primárias em roxo/azul
- Build: `npm run build` gera `dist/` servido por nginx ou PM2 serve

---

### RF-015 — AgentChat Widget no Cockpit
**Descrição:** O sistema deve disponibilizar um widget de chat flutuante no Cockpit que se comunica com `POST /api/chat`, permite selecionar o cliente de contexto e exibe respostas com formatação Markdown.
**Prioridade:** Média
**Critério de aceite:** CA-021
**Contrato:** `CONTRACTS.md §1 — POST /api/chat`
**Notas:**
- Seletor de cliente (dropdown) antes de enviar mensagem
- `clientId` enviado no payload quando selecionado
- Renderização Markdown com `react-markdown` ou similar

---

### RF-016 — Gestão de Clientes no Cockpit
**Descrição:** O sistema deve permitir visualizar, criar e editar clientes e suas regras via Cockpit. Inclui campos: nome, meta_ads_account_id, google_ads_account_id, status. E regras: target_cpa, daily_budget, brand_voice, creative_refresh_days.
**Prioridade:** Média
**Critério de aceite:** CA-022
**Contrato:** `CONTRACTS.md §2 — Schemas: Client, ClientRules`
**Notas:**
- Edição de cliente: `PATCH /api/clients/:id` (a implementar no backend)
- Validação frontend antes de enviar (Zod)
- Cockpit usa ANON_KEY — operações de escrita passam pelo backend (service key)

---

### RF-017 — Isolamento Multi-Tenant Obrigatório
**Descrição:** Toda query ao Supabase executada pelo agente deve incluir filtro `client_id = X`. RLS policies impedem acesso cross-tenant. O agente usa `SERVICE_ROLE_KEY` (bypass RLS intencionalmente para o agente). O Cockpit usa `ANON_KEY` (sujeito a RLS).
**Prioridade:** Alta
**Critério de aceite:** CA-023
**Contrato:** `CONTRACTS.md §2 — RLS Policies`
**Notas:**
- Antes de qualquer ação que envolva dados de cliente: chamar `get_client_rules(clientId)` primeiro
- Nunca misturar `client_id` em queries combinadas
- Logs do agente incluem `[clientId: X]` em toda operação sensível

---

### RF-018 — Human Approval Gate para Ações Destrutivas
**Descrição:** Qualquer ação que modifique ou destrua dados de campanha (pausar, deletar, alterar orçamento) deve solicitar aprovação explícita via `ask_approval()` antes de executar. O agente NÃO executa sem resposta afirmativa.
**Prioridade:** Alta
**Critério de aceite:** CA-024
**Contrato:** `CONTRACTS.md §3 — Tool: ask_approval`
**Notas:**
- `ask_approval({ question: "Confirma pausa da campanha X?", options: ["Sim, pausar", "Não, cancelar"] })`
- Aguarda callback do Telegram antes de prosseguir (timeout: 5 minutos)
- Se timeout: abortar ação e notificar "Ação cancelada por inatividade."
- Implementar apenas quando ações de escrita nos MCPs estiverem disponíveis (v2)

---

### RF-019 — Skill Router (Personas Dinâmicas)
**Descrição:** O sistema deve fazer uma chamada leve ao LLM antes do AgentLoop para decidir qual persona/system prompt especializado injetar. O SkillRouter retorna `{"skillName": "ads-manager" | "creative-director" | "performance-analyst" | null}`.
**Prioridade:** Média
**Critério de aceite:** CA-025
**Contrato:** —
**Notas:**
- Personas disponíveis (SKILL.md em `.agents/skills/` — usado apenas em dev, injetado em runtime):
  - `ads-manager`: gestão de campanhas, métricas, otimização
  - `creative-director`: geração de copy, análise de benchmarks
  - `performance-analyst`: diagnóstico, ROAS, CPA, fadiga
- Se `skillName: null`: usar system prompt padrão do agente
- O conteúdo do SKILL.md é injetado apenas como `systemInstruction` — NÃO como tool

---

### RF-020 — Upload de Assets para Supabase Storage
**Descrição:** O sistema deve fazer upload de criativos gerados (imagens, vídeos, copies em texto) para o Supabase Storage no bucket `assets/` com path `{client_id}/{timestamp}_{filename}`.
**Prioridade:** Média
**Critério de aceite:** CA-026
**Contrato:** `CONTRACTS.md §3 — Tool: upload_asset`
**Notas:**
- Supabase Storage bucket: `assets` (público para imagens/vídeos)
- Path: `{client_id}/{year}/{month}/{timestamp}_{type}_{filename}`
- Retorna `{ storage_path, public_url }`
- Máx 50MB por arquivo. Formatos aceitos: jpg, png, mp4, webm, txt

---

### RF-021 — Skills Operacionais: Search Term Mining (SK-001)
**Descrição:** O sistema deve executar mineração de search terms negativos no Google Ads com avaliação baseada em relevância (não apenas conversões), gerando CSV auditável com coluna Reasoning.
**Prioridade:** Alta
**Critério de aceite:** CA-027
**Contrato:** `CONTRACTS.md §4 — MCP Google Ads: get_search_terms (novo)`
**Notas:**
- Puxar search terms via MCP Google Ads (GAQL), filtrar status=NONE, ordenar por spend desc
- Cross-reference triplo para cada termo: search term x keyword x tema do ad group/campanha
- Classificar como Negar ou Manter com justificativa escrita (Reasoning)
- Gerar CSV: Campaign, Ad Group, Keyword, Search Term, Match Type, Cost, Clicks, Impressions, CPC, CTR, Conversions, Reasoning
- Apresentar ao operador por lote (agrupado por campanha), aguardar "sim" para cada lote
- Executar adição de negativos via MCP em campaign level

---

### RF-022 — Skills Operacionais: Budget Optimization (SK-002)
**Descrição:** O sistema deve analisar impression share vs budget e propor ajustes fundamentados com dados.
**Prioridade:** Média
**Critério de aceite:** CA-028
**Contrato:** `CONTRACTS.md §4 — MCP Google Ads`
**Notas:**
- Puxar impression share por dia (últimos 7 dias) via MCP
- Identificar Lost to Budget como constraint dominante vs Lost to Rank
- Se Lost to Budget > 40% consistentemente → propor aumento com % específico
- Formato: dados diários + diagnóstico + proposta ("Aumentar de R$ X para R$ Y/dia")
- Aguardar aprovação antes de aplicar via ask_approval

---

### RF-023 — Skills Operacionais: Weekly Review (SK-003)
**Descrição:** O sistema deve gerar review semanal estruturada para cada cliente, automaticamente toda segunda-feira.
**Prioridade:** Alta
**Critério de aceite:** CA-029
**Contrato:** —
**Notas:**
- Para cada cliente ativo, gerar:
  - KPIs da semana vs semana anterior (spend, ROAS, CPA, CTR, conversões)
  - Top 3 campanhas (melhor performance) e Bottom 3 (pior)
  - Alertas da semana + ações tomadas
  - Recomendações para próxima semana
- Enviar via Telegram ao operador
- Cadência: cron toda segunda-feira 08:00

---

### RF-024 — Skills Operacionais: Campaign Investigation (SK-004)
**Descrição:** O sistema deve executar deep-dive em campanha específica com dados detalhados, diagnóstico e recomendações.
**Prioridade:** Média
**Critério de aceite:** CA-030
**Contrato:** `CONTRACTS.md §4 — MCP Meta/Google`
**Notas:**
- Trigger: operador pede ou anomalia detectada pelo Orchestrator
- Puxar métricas da campanha (7d, 14d, 30d)
- Analisar ad sets: distribuição de budget, performance por segmento
- Analisar anúncios: CTR, conversões, frequência (fadiga?)
- Diagnosticar causa raiz e propor 2-3 ações concretas

---

### RF-025 — Skills Operacionais: Creative Audit e Ad Copy Audit (SK-005, SK-006)
**Descrição:** O sistema deve auditar criativos existentes e copies ativas contra benchmarks, princípios de conversão e brand voice do cliente.
**Prioridade:** Média
**Critério de aceite:** CA-031
**Contrato:** —
**Notas:**
- Creative Audit: listar anúncios ativos via MCP → buscar benchmarks via Apify → comparar CTR/frequência → identificar fadiga → propor ação
- Ad Copy Audit: listar copies ativas → verificar vs brand_voice e primary_offer em client_rules → classificar (OK/Melhorar/Substituir) → gerar alternativas para "Substituir"

---

### RF-026 — Onboarding Completo de Cliente (SK-008)
**Descrição:** O sistema deve suportar workflow completo de onboarding: briefing (PDF/MD) → extração de contexto → proposta de estratégia → criação de campanhas PAUSED → revisão → ativação.
**Prioridade:** Alta
**Critério de aceite:** CA-032
**Contrato:** —
**Notas:**
- Operador fornece briefing como PDF ou Markdown após call com cliente
- AdsClaw extrai: nicho, público, oferta, brand voice, budget, objetivos
- AdsClaw propõe estratégia: quantidade de campanhas, estrutura, segmentação, budget split
- Operador aprova → campanhas criadas PAUSED → criativos gerados ou recebidos → revisão → ativação
- Prazo de onboarding: 3-5 dias úteis
- Transcrição de call pode ser usada como input complementar

---

### RF-027 — Offboarding de Cliente
**Descrição:** O sistema deve suportar fluxo de desativação de cliente com preservação temporária de dados.
**Prioridade:** Baixa
**Critério de aceite:** CA-033
**Contrato:** —
**Notas:**
- Pausar todas as campanhas ativas
- Gerar relatório final de performance
- Exportar dados (métricas, histórico, criativos)
- Remover credenciais encriptadas do Supabase
- Marcar cliente como status: inactive
- Dados mantidos por 90 dias, depois purgados

---

### RF-028 — Reportes Automatizados
**Descrição:** O sistema deve gerar reportes semanais (resumo curto) e mensais (PDF completo) sobre a performance de cada cliente.
**Prioridade:** Média
**Critério de aceite:** CA-034
**Contrato:** —
**Notas:**
- **Semanal:** 3 linhas — spend, ROAS, principais ações. Gerado automaticamente, enviado ao operador via Telegram.
- **Mensal:** PDF com KPIs, comparativo mês anterior, ações realizadas, próximos passos. Gerado semi-automaticamente (AdsClaw gera, operador revisa antes de enviar ao cliente).
- Cadência semanal: toda segunda junto com weekly review (SK-003)
- Cadência mensal: até dia 5 do mês seguinte

---

## 2. Requisitos Não Funcionais

### RNF-001 — Performance
- AgentLoop deve responder em < 30 segundos para queries sem tool calls
- Tool calls MCP devem retornar em < 10 segundos (timeout configurável)
- Creative Lab pipeline completo (copy apenas) em < 60 segundos
- Creative Lab pipeline com mídia (imagem) em < 120 segundos
- `GET /api/health` deve responder em < 100ms

### RNF-002 — Segurança
- `SUPABASE_SERVICE_KEY` nunca exposto no frontend ou em logs
- `META_ACCESS_TOKEN`, `GOOGLE_ADS_DEVELOPER_TOKEN` nunca logados
- `GEMINI_API_KEY` e demais API keys apenas em `.env` (jamais no código)
- Whitelist Telegram: usuários não autorizados ignorados sem log do conteúdo
- RLS habilitado em todas as tabelas com dados de cliente
- CORS restrito ao domínio do Cockpit em produção

### RNF-003 — Disponibilidade
- 99% uptime mensal no VPS Hostinger (212.85.22.148)
- PM2 com `--restart-delay=5000` e `max-restarts: 10`
- PM2 startup configurado para auto-iniciar após reboot da VPS
- Graceful degradation: se MCP falhar, agente opera sem aquela tool (não crasha)

### RNF-004 — Observabilidade
- Todos os logs no formato: `[YYYY-MM-DD HH:mm:ss] [Módulo] Mensagem`
- Níveis: `✅ sucesso`, `⚠️ aviso`, `❌ erro`, `🔍 debug`
- Logs de cada step do ReAct: `[AgentLoop] Step N/5 | Tool: X | Args: Y`
- PM2 logs persistidos em `/opt/adsclaw/logs/`

### RNF-005 — Escalabilidade
- Arquitetura suporta 20+ clientes sem mudanças estruturais
- ToolRegistry: adicionar nova tool = criar classe + registrar (sem modificar core)
- ProviderFactory: adicionar novo LLM = criar classe que implementa ILlmProvider

### RNF-006 — Custo de LLM
- MVP: Gemini 2.0 Flash para tudo (~$0.01/1M tokens)
- Routing calls (Skill Router): máximo 200 tokens de input
- Creative Lab copy: usar Tier 3 apenas quando explicitamente solicitado pelo gestor
- Não fazer chamadas LLM desnecessárias (cache de client_rules em memória por sessão)

### RNF-007 — Manutenibilidade
- TypeScript strict mode (`strict: true`)
- Cada arquivo de código: cabeçalho com RF coberto e módulo
- Funções: máximo 50 linhas. Arquivos: máximo 300 linhas
- Todos os tipos de domínio definidos em `agent/src/types/`

---

## 3. Fluxos Principais

### Fluxo 1 — Auditoria Proativa (Orchestrator)

**Pré-condição:** Agente rodando na VPS. Pelo menos 1 cliente ativo com regras configuradas e `meta_ads_account_id` preenchido.

1. Orchestrator dispara a cada 6 horas via node-cron
2. Busca todos os clientes com `status = "active"` no Supabase
3. Para cada cliente: lê `client_rules` do Supabase
4. Chama MCP Meta Ads `get_account_insights(meta_ads_account_id, "last_7d")`
5. Chama MCP Google Ads `get_performance(google_ads_account_id)` se configurado
6. Calcula: `cpa_atual = spend / conversions`
7. Detecta fadiga: `dias >= creative_refresh_days AND cpa_atual > target_cpa`
8. Se fadiga: dispara Creative Dilemma (RF-007)
9. Registra resultado em `chat_history` com `sender: "system"`, `metadata: { audit_result }`

**Pós-condição:** Todos os clientes auditados. Alertas disparados para clientes com fadiga.
**Requisitos cobertos:** RF-005, RF-006, RF-007

---

### Fluxo 2 — Pipeline do Laboratório Criativo

**Pré-condição:** Gestor aprovou "Laboratório Criativo" via Telegram. `client_id` conhecido. `client_rules.primary_offer` preenchido. `APIFY_TOKEN` e `GEMINI_API_KEY` configurados.

1. AgentLoop chama `fetch_ad_benchmarks({ niche: client_rules.primary_offer })`
2. Apify executa `facebook-ads-scraper`, retorna 5 anúncios concorrentes
3. AgentLoop chama `generate_ad_copy({ benchmarks, client_rules_json })`
4. LLM Tier 2/3 analisa benchmarks + regras, retorna JSON com 3 variações
5. AgentLoop notifica gestor: "3 copies geradas! Quer também criar imagens? (Sim/Não)"
6. Se "Sim": chama `generate_image({ prompt: variation.visual_suggestion })` para cada variação
7. inference.sh executa FLUX-1-Schnell, retorna URLs de imagens
8. AgentLoop chama `upload_asset({ client_id, file_url, file_type: "image" })` para cada
9. Envia resumo ao gestor: copies + links das imagens no Supabase Storage

**Pós-condição:** 3 copies + até 3 imagens geradas e armazenadas. Gestor notificado com links.
**Requisitos cobertos:** RF-008, RF-020

---

### Fluxo 3 — Chat Interativo (Telegram ou Web)

**Pré-condição:** Agente ativo. Usuário autenticado (whitelist Telegram) ou Cockpit aberto.

1. Usuário envia mensagem: "Como estão as campanhas do cliente X?"
2. TelegramHandler (ou HttpServer) recebe e cria `StandardizedInput`
3. AgentController roteia para SkillRouter
4. SkillRouter decide: `{ skillName: "performance-analyst" }` (call leve ao LLM)
5. AgentLoop inicia com systemPrompt do `performance-analyst` + memory dos últimos 30 msgs
6. **Iteração 1:** LLM pensa → decide chamar `get_client_rules({ client_id: "X" })`
7. ToolRegistry executa → retorna `{ target_cpa: 15, target_roas: 3.5, ... }`
8. **Iteração 2:** LLM pensa → decide chamar `meta_get_account_insights({ ad_account_id: "act_X" })`
9. MCP retorna métricas reais → `{ cpa: 18.5, roas: 2.8, spend: 1250 }`
10. **Iteração 3:** LLM formula resposta final com análise comparativa
11. MemoryManager salva: user message + tool calls + agent response
12. OmnichannelGateway envia resposta via Telegram ou HTTP

**Pós-condição:** Gestor recebe análise com CPA atual vs target, ROAS, recomendações.
**Requisitos cobertos:** RF-001, RF-002, RF-003, RF-004, RF-009, RF-019

---

### Fluxo 4 — Onboarding de Novo Cliente

**Pré-condição:** Gestor logado no Cockpit. Acesso ao Meta Ads account ID do cliente.

1. Gestor abre Cockpit → aba "Clientes" → botão "Novo Cliente"
2. Preenche: Nome, Meta Ads Account ID, Google Ads Customer ID, Status
3. Cockpit envia `POST /api/clients` (via backend com service key)
4. Backend cria registro em `clients` + cria `client_rules` com defaults
5. Gestor edita `client_rules`: target_cpa, daily_budget, brand_voice, primary_offer
6. Chat widget: "Ativar monitoramento para Cliente X?" → gestor confirma
7. Orchestrator inclui cliente no próximo ciclo de auditoria

**Pós-condição:** Cliente ativo, regras configuradas, monitoramento habilitado.
**Requisitos cobertos:** RF-016, RF-017

---

## 4. Critérios de Aceite

### CA-001 — ReAct Loop com Tool Call
**Cobre:** RF-001
```
Given: AgentLoop recebe input "Qual o CPA do cliente ABC?"
When: Gemini retorna functionCall { name: "get_client_rules", args: { client_id: "abc" } }
Then: ToolRegistry executa get_client_rules("abc")
  And: resultado é injetado de volta como role "tool" no histórico
  And: Gemini itera com o resultado
  And: após obter dados, Gemini retorna texto como resposta final
  And: loop encerra sem atingir MAX_ITERATIONS
```

### CA-002 — Max Iterations com Graceful Stop
**Cobre:** RF-001
```
Given: AgentLoop ativo com MAX_ITERATIONS = 5
When: LLM solicita tool call em 5 iterações consecutivas sem gerar texto final
Then: AgentLoop encerra na 5ª iteração
  And: retorna mensagem: "Não consegui completar a análise em 5 tentativas. Por favor, reformule ou tente novamente."
  And: log registra: "[AgentLoop] MAX_ITERATIONS atingido"
  And: memória salva a resposta de fallback
```

### CA-003 — JSON Malformado no Tool Call
**Cobre:** RF-001
```
Given: Gemini retorna functionCall com args malformados (não-parseable)
When: ToolRegistry tenta executar a tool
Then: catch captura o erro de parse
  And: Observation injetada: "Erro: argumentos inválidos para tool X. Tente novamente com formato correto."
  And: LLM recebe a observação e pode corrigir na próxima iteração
  And: erro NÃO é propagado para o usuário diretamente
```

### CA-004 — ProviderFactory Swap
**Cobre:** RF-002
```
Given: env ACTIVE_PROVIDER = "gemini"
When: ProviderFactory.create("gemini") é chamado
Then: retorna instância de GeminiProvider
  And: interface ILlmProvider é satisfeita (métodos generateContent, getName)
  And: trocar para ACTIVE_PROVIDER = "deepseek" retorna DeepSeekProvider sem erro de compilação
```

### CA-005 — ToolRegistry Carrega 14 Tools
**Cobre:** RF-003
```
Given: ToolRegistry inicializado com MCP servers conectados e todas as tool classes instanciadas
When: registry.getFunctionDeclarations() é chamado
Then: retorna array com 14 FunctionDeclaration válidas para o Gemini SDK
  And: cada declaration tem name, description, parameters (JSON Schema)
  And: registry.executeTool("get_client_rules", { client_id: "x" }) executa sem erro
```

### CA-006 — Tools NÃO incluem Claude Code Skills
**Cobre:** RF-003, Anti-SPEC
```
Given: pasta .agents/skills/ contém 30+ SKILL.md
When: ToolRegistry.getFunctionDeclarations() é chamado
Then: NÃO inclui nenhum SKILL.md como FunctionDeclaration
  And: NÃO há leitura de .agents/skills/ em tempo de execução da produção
  And: ToolRegistry apenas registra classes TypeScript implementando BaseTool
```

### CA-007 — Memory Sliding Window
**Cobre:** RF-004
```
Given: chat_history tem 50 mensagens para client_id "abc"
When: MemoryManager.getHistory("abc", 30) é chamado
Then: retorna exatamente as 30 mensagens mais recentes
  And: ordenadas do mais antigo ao mais recente (asc created_at)
  And: cada mensagem tem { id, sender, message, metadata, created_at }
```

### CA-008 — Memory Save com Metadata
**Cobre:** RF-004
```
Given: AgentLoop completou uma iteração com tool call
When: MemoryManager.saveMessage("abc", "tool", result, { tool_name, args, duration_ms }) é chamado
Then: insere registro em chat_history com sender="tool" e metadata JSONB
  And: nova busca por getHistory retorna esse registro
  And: client_id "abc" não contamina histórico de client_id "xyz"
```

### CA-009 — Orchestrator com Métricas Reais
**Cobre:** RF-005
```
Given: Orchestrator iniciado, cliente "Cliente X" ativo com meta_ads_account_id="act_123"
When: cron dispara e auditClients() executa
Then: chama MCP meta_get_account_insights("act_123", "last_7d")
  And: NÃO usa Math.random() ou valores mock
  And: resultado real é comparado com client_rules.target_cpa
  And: audit registrado em chat_history com sender="system"
```

### CA-010 — Detecção de Fadiga Correta
**Cobre:** RF-006
```
Given: cliente com creative_refresh_days=7, target_cpa=15.00, last_creative_refresh há 8 dias
When: Orchestrator calcula cpa_atual=18.50 via MCP
Then: isFatigued = true (8 >= 7 AND 18.50 > 15.00)
  And: dispara handleFatigueWarning()
  And: log registra "[Orchestrator] Fadiga detectada: Cliente X | CPA: 18.50 > 15.00"
```

### CA-011 — Sem Falso Positivo de Fadiga
**Cobre:** RF-006
```
Given: cliente com creative_refresh_days=7, target_cpa=15.00, last_creative_refresh há 5 dias
When: Orchestrator calcula cpa_atual=18.50 via MCP
Then: isFatigued = false (5 < 7, condição de dias NÃO atendida)
  And: nenhum alerta é disparado
```

### CA-012 — Creative Dilemma Inline Keyboard
**Cobre:** RF-007
```
Given: fadiga detectada para "Cliente X"
When: handleFatigueWarning() é chamado
Then: mensagem enviada via Telegram com InlineKeyboardMarkup
  And: botão 1: texto "📁 Upload Manual", callback_data: "manual_upload:clientXId"
  And: botão 2: texto "🤖 Laboratório Criativo", callback_data: "open_lab:clientXId"
  And: mensagem inclui: nome do cliente, CPA atual, CPA alvo, dias ativos
```

### CA-013 — Benchmark Scraping Retorna Dados
**Cobre:** RF-008
```
Given: APIFY_TOKEN válido, niche = "suplementos para academia"
When: fetch_ad_benchmarks({ niche }) é chamado
Then: retorna array com 1-5 BenchmarkResult
  And: cada resultado tem title, body, platform = "Meta"
  And: se Apify retorna 0 resultados: retorna array vazio sem erro
  And: se Apify falha: retorna [] com log de erro, não propaga exceção
```

### CA-014 — Copy Generation Retorna JSON Válido
**Cobre:** RF-008
```
Given: benchmarks não-vazios e client_rules com brand_voice preenchido
When: generate_ad_copy({ benchmarks, client_rules }) é chamado
Then: LLM retorna JSON parseável: { analysis: string, variations: [...] }
  And: variations tem exatamente 3 itens
  And: cada variation tem copy, headline, cta, visual_suggestion
  And: se LLM retorna JSON malformado: tenta parse, e se falha retorna { analysis: raw_text, variations: [] }
```

### CA-015 — Fallback de Mídia
**Cobre:** RF-008
```
Given: generate_image() chamado mas inference.sh CLI não está instalado na VPS
When: execAsync(infsh command) lança erro
Then: retorna { image_url: "ERROR_GENERATING_IMAGE", error: "inference.sh indisponível" }
  And: AgentLoop captura o erro e notifica gestor: "Geração de imagem indisponível. Ative o inference.sh na VPS."
  And: copies em texto são entregues normalmente
```

### CA-016 — MCP Graceful Degradation
**Cobre:** RF-009, RF-010
```
Given: META_ACCESS_TOKEN não configurado no .env
When: ToolRegistry.loadMCPServers() é executado
Then: meta-ads MCP não é inicializado
  And: log avisa: "[ToolRegistry] META_ACCESS_TOKEN ausente — MCP meta-ads desabilitado"
  And: tools do meta-ads NÃO são registradas no getFunctionDeclarations()
  And: AgentLoop opera normalmente com as demais tools disponíveis
```

### CA-017 — Whitelist Telegram
**Cobre:** RF-011
```
Given: TELEGRAM_ALLOWED_USER_IDS = "123456,789012"
When: mensagem chega de user_id = 999999 (não autorizado)
Then: mensagem é ignorada completamente
  And: nenhum log com o conteúdo da mensagem é gerado
  And: nenhuma API key é consumida

When: mensagem chega de user_id = 123456 (autorizado)
Then: sendChatAction('typing') é enviado imediatamente
  And: mensagem é roteada para AgentController
```

### CA-018 — Output Chunking
**Cobre:** RF-012
```
Given: AgentLoop retorna texto com 10000 caracteres
When: TelegramOutputHandler.send(text) é chamado
Then: texto é dividido em chunks de máx 4096 chars em quebras de parágrafo
  And: cada chunk é enviado com parse_mode="Markdown"
  And: aguarda 300ms entre cada chunk
  And: se chunk falha no Markdown parsing: reenvia como texto puro
```

### CA-019 — HTTP API Health Check
**Cobre:** RF-013
```
Given: agente rodando na VPS
When: GET http://212.85.22.148:3001/api/health
Then: response 200 com { status: "ok", uptime: number, version: "1.0.0" }
  And: responde em < 100ms
```

### CA-020 — Cockpit KPIs Carregam
**Cobre:** RF-014
```
Given: Supabase com 3 clientes ativos
When: usuário abre DashboardPage no browser
Then: exibe contagem de clientes = 3
  And: lista de clientes renderizada em menos de 3 segundos
  And: sem erros no console do browser
```

### CA-021 — Chat Widget Envia Mensagem
**Cobre:** RF-015
```
Given: Chat widget aberto, cliente "ABC" selecionado
When: usuário digita "como estão as campanhas?" e pressiona Enter
Then: POST /api/chat enviado com { message, clientId: "abc_id" }
  And: resposta do agente exibida no chat em < 30 segundos
  And: texto renderizado com Markdown (negrito, listas)
```

### CA-022 — CRUD de Cliente
**Cobre:** RF-016
```
Given: Cockpit aberto, aba Clientes
When: gestor cria novo cliente com meta_ads_account_id="act_123456"
Then: registro inserido em clients table
  And: client_rules criado com defaults (target_cpa=10, daily_budget=50, creative_refresh_days=7)
  And: cliente aparece na lista com status="onboarding"
```

### CA-023 — Isolamento Multi-Tenant
**Cobre:** RF-017
```
Given: dois clientes "ABC" (id: aaa) e "XYZ" (id: zzz) no sistema
When: AgentLoop processa request com clientId="aaa"
Then: TODA query ao Supabase inclui .eq('client_id', 'aaa')
  And: dados de cliente "XYZ" nunca aparecem na resposta
  And: mesmo com SERVICE_ROLE_KEY (bypass RLS), o código filtra por client_id
```

### CA-024 — Human Approval Gate
**Cobre:** RF-018
```
Given: agente identifica necessidade de pausar campanha (v2)
When: tool ask_approval({ question: "Pausar campanha X?", options: ["Sim", "Não"] }) é chamada
Then: Telegram envia mensagem com InlineKeyboardMarkup
  And: AgentLoop fica em estado "aguardando" (sem chamar mais tools)
  And: se gestor clica "Não": ação é abortada e log registra
  And: se gestor clica "Sim": ação é executada
  And: se timeout 5min: ação abortada automaticamente
```

### CA-025 — Skill Router Retorna Persona Correta
**Cobre:** RF-019
```
Given: usuário envia "Gera um copy para o cliente X"
When: SkillRouter processa a intenção
Then: retorna { skillName: "creative-director" }
  And: AgentLoop inicia com systemInstruction do creative-director SKILL.md
  And: SKILL.md NÃO é registrado como FunctionDeclaration no Gemini

Given: usuário envia "oi, tudo bem?"
When: SkillRouter processa
Then: retorna { skillName: null }
  And: AgentLoop usa system prompt padrão
```

### CA-026 — Upload Asset Supabase Storage
**Cobre:** RF-020
```
Given: generate_image() retornou url válida de imagem
When: upload_asset({ client_id: "abc", file_url: url, file_type: "image" }) é chamado
Then: arquivo baixado da URL e enviado ao Supabase Storage
  And: path = "abc/2026/03/1743000000000_image_flux.jpg"
  And: retorna { storage_path, public_url }
  And: public_url é acessível via browser sem autenticação
```

---

## 5. Casos de Borda

| ID | Cenário | Comportamento Esperado | Prioridade |
|----|---------|----------------------|------------|
| CB-001 | Meta Ads API retorna 503 durante auditoria | Log erro, pular cliente, continuar auditoria dos demais. Notificar gestor: "Meta API indisponível para Cliente X" | Alta |
| CB-002 | Google Ads API cota excedida (429) | Aguardar 60s e tentar 1 retry. Se falhar: pular e logar | Alta |
| CB-003 | Gemini API indisponível (503) | Retornar ao usuário: "⚠️ Processamento temporariamente indisponível. Tente em alguns minutos." Não crashar o processo | Alta |
| CB-004 | Cliente sem client_rules configurado | Agente responde: "Para analisar o Cliente X, preciso que as regras sejam configuradas no Cockpit primeiro." | Alta |
| CB-005 | Apify retorna 0 benchmarks | generate_ad_copy recebe [] de benchmarks. LLM gera copy baseado apenas em client_rules. Avisa gestor: "Sem benchmarks encontrados, copy gerado com base nas regras do cliente." | Média |
| CB-006 | inference.sh não instalado na VPS | generate_image/video retorna erro. AgentLoop notifica gestor. Entrega copies em texto. Não falha toda a pipeline | Alta |
| CB-007 | MAX_ITERATIONS atingido no ReAct loop | Retorna mensagem de fallback amigável. Registra em log e memória | Alta |
| CB-008 | LLM retorna JSON malformado para tool call | Catch, inject observation de erro, LLM tenta corrigir na próxima iteração | Alta |
| CB-009 | Resposta do Gemini > 4096 chars para Telegram | TelegramOutputHandler chunka automaticamente | Alta |
| CB-010 | Telegram rate limit 429 | Aguardar `Retry-After` header, reenviar. Log warning | Alta |
| CB-011 | MCP server (meta-ads) crasha durante operação | ToolRegistry detecta desconexão, tenta reconectar 1x. Se falhar: tool marcada como indisponível. Agente opera sem ela | Alta |
| CB-012 | Supabase connection timeout | Retry automático com backoff (1s, 3s, 5s). Se falhar após 3 tentativas: retornar erro ao usuário | Alta |
| CB-013 | AgentLoop context window próximo do limite | MemoryManager limita a 30 msgs. Se ainda muito grande: truncar msgs mais antigas preservando as 5 mais recentes | Média |
| CB-014 | Dois requests simultâneos para o mesmo cliente | Processar em série (fila por client_id) ou de forma independente. Nunca misturar contextos | Média |
| CB-015 | GEMINI_API_KEY inválida ou expirada | Agente inicia em "modo demo" com respostas mockadas. Log erro claro. Cockpit continua funcionando | Média |
| CB-016 | cliente_id inexistente passado via API | Retornar 404 `{ error: { code: "CLIENT_NOT_FOUND" } }`. Não crashar | Alta |
| CB-017 | upload_asset com arquivo > 50MB | Rejeitar antes do upload. Retornar erro: "Arquivo excede limite de 50MB" | Baixa |

---

## 6. Anti-SPEC (Especificação Negativa)

> Esta seção é tão importante quanto a SPEC positiva. Previne alucinações da IA, scope creep e bugs arquiteturais.

### O que NÃO construir na v1

- **NÃO** criar interface para clientes finais (o produto é B2B interno da agência)
- **NÃO** implementar autenticação/login no Cockpit (uso interno, rede privada)
- ~~NÃO implementar criação/modificação de campanhas~~ → **REMOVIDO na v2.0** — write tools já implementadas (27 tools), todas com aprovação obrigatória e status PAUSED por padrão
- **NÃO** adicionar suporte a voz/áudio no Telegram (sem Whisper, sem TTS)
- **NÃO** processar imagens ou PDFs recebidos via Telegram (v1 — apenas briefings via chat/upload ao agente)
- **NÃO** otimização automática de lances (real-time bidding)
- **NÃO** automação de A/B tests
- **NÃO** sistema de faturamento/pagamentos
- **NÃO** integração com outras plataformas além de Meta Ads e Google Ads
- **NÃO** sistema multi-usuário com roles na agência (só 1 operador no MVP)
- **NÃO** autonomia total (sem aprovação) em nenhuma ação — v3
- **NÃO** dashboard white-label para clientes finais
- **NÃO** growth engine integrado (aquisição de clientes para a agência é contexto separado)

### Comportamentos proibidos

- **NUNCA** carregar arquivos `.agents/skills/*/SKILL.md` como `FunctionDeclaration` para o Gemini — skills são prompts de desenvolvimento, NÃO tools de produção
- **NUNCA** executar ações destrutivas (pausar, deletar, alterar orçamento) sem `ask_approval()` com resposta afirmativa
- **NUNCA** cruzar dados de clientes diferentes em uma mesma query ou contexto de agente
- **NUNCA** logar `SUPABASE_SERVICE_KEY`, `META_ACCESS_TOKEN`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GEMINI_API_KEY` em nenhum nível de log
- **NUNCA** fazer `Math.random()` para simular métricas em produção — toda métrica vem dos MCPs
- **NUNCA** usar `generateContent()` simples sem verificar se response.functionCall existe antes de tratar como texto
- **NUNCA** enviar stack trace completo ao usuário via Telegram (apenas mensagem amigável + log interno)
- **NUNCA** iniciar Orchestrator com intervalo menor que 30 minutos em produção (evitar rate limit das APIs)

### Padrões a evitar

- **NÃO** usar polling ativo para aguardar resposta de approval — usar callback handlers do Grammy
- **NÃO** armazenar estado de sessão em memória RAM sem backup no Supabase (estado perdido em restart)
- **NÃO** criar um "AgentLoop God Object" que faz tudo — manter separação: AgentLoop → ToolRegistry → individual tool classes
- **NÃO** hardcodar `model: 'gemini-2.0-flash'` diretamente no AgentLoop — usar `ProviderFactory.create(process.env.ACTIVE_PROVIDER)`
- **NÃO** implementar lógica de negócio de Ads dentro do AgentLoop — lógica fica nas tool classes
- **NÃO** concatenar strings SQL — usar Supabase SDK (parametrizado por design)
- **NÃO** criar feature nova sem tarefa correspondente no TASKS.md

---

## 7. Modelos de Dados (Visão Funcional)

### Entidade: Client
| Campo | Tipo | Obrigatório | Descrição | Validação |
|-------|------|-------------|-----------|-----------|
| id | UUID | Sim | Identificador único | auto-gerado |
| name | string | Sim | Nome do cliente | 2-100 chars |
| meta_ads_account_id | string | Não | ID da conta Meta Ads | formato "act_XXXXXXXXX" |
| google_ads_account_id | string | Não | Customer ID Google Ads | 10 dígitos |
| status | enum | Sim | Estado do cliente | "active" \| "paused" \| "onboarding" |
| created_at | datetime | Sim | Data de criação | auto |
| updated_at | datetime | Sim | Última atualização | auto |

### Entidade: ClientRules
| Campo | Tipo | Obrigatório | Descrição | Validação |
|-------|------|-------------|-----------|-----------|
| id | UUID | Sim | Identificador único | auto |
| client_id | UUID | Sim | FK → clients.id (único) | unique |
| target_cpa | decimal | Sim | CPA máximo aceitável em R$ | min: 0.01 |
| target_roas | decimal | Não | ROAS mínimo aceitável | min: 0.1 |
| daily_budget | decimal | Sim | Orçamento diário em R$ | min: 1.0 |
| brand_voice | text | Não | Descrição do tom de voz da marca | max: 2000 chars |
| primary_offer | text | Não | Produto/serviço principal | max: 500 chars |
| creative_refresh_days | integer | Sim | Janela de fadiga em dias | 3-30, default: 7 |
| last_creative_refresh | date | Não | Data do último refresh | auto |

### Entidade: ChatHistory
| Campo | Tipo | Obrigatório | Descrição | Validação |
|-------|------|-------------|-----------|-----------|
| id | UUID | Sim | Identificador único | auto |
| client_id | UUID | Não | FK → clients.id | nullable |
| sender | enum | Sim | Origem da mensagem | "user"\|"agent"\|"telegram"\|"system"\|"tool" |
| message | text | Sim | Conteúdo da mensagem | required |
| metadata | JSONB | Não | Tool calls, outputs, model info | nullable |
| created_at | datetime | Sim | Timestamp | auto |

---

## 8. Limites de Escopo (v1)

| Item | Motivo da Exclusão | Planejado para |
|------|-------------------|----------------|
| ~~Criação/modificação de campanhas~~ | ~~v2~~ → **Implementado na v1** com write tools + aprovação obrigatória | ~~v2~~ **v1** |
| Interface para clientes finais | Produto é operado internamente; cliente final só vê resultados | v3 |
| Voz/áudio no Telegram | Whisper local não é necessário para MVP; gestor usa texto | v1.1 |
| TikTok Ads MCP | Meta + Google cobrem 90% do mercado da agência | v2 |
| A/B testing automatizado | Requer lógica de estatística e janelas de coleta | v2 |
| Multi-usuário com roles | Agência começa com 1 gestor principal | v1.1 |
| Relatórios PDF automáticos | Fora do modelo SWAS; cliente não acessa o sistema | v2 |
| Real-time bidding | Complexidade alta, risco de erros automáticos | v3 |
| ProviderFactory Tiers 2-3 | Gemini Flash é suficiente para MVP; custo otimizado depois | v1.1 |

---

## 9. Aprovação

- [x] Requisitos funcionais numerados e verificáveis (RF-001 a RF-020)
- [x] Requisitos não funcionais documentados (RNF-001 a RNF-007)
- [x] Fluxos principais com pré/pós-condições (4 fluxos)
- [x] Critérios de aceite em formato Given/When/Then (CA-001 a CA-026)
- [x] Casos de borda mapeados (CB-001 a CB-017)
- [x] Anti-SPEC preenchida com comportamentos proibidos e padrões a evitar
- [x] Modelos de dados com validações (Client, ClientRules, ChatHistory)
- [x] Limites de escopo explícitos com justificativa e roadmap
- [ ] SPEC revisada e aprovada pelo responsável (Eduardo)
- [ ] Pronto para avançar para CONTRACTS (já existe) e PLAN

---

## Critérios de Aceite Adicionais (v2.0)

### CA-027 — Search Term Mining Gera CSV com Reasoning
**Cobre:** RF-021
```
Given: cliente com google_ads_account_id configurado e campanhas ativas
When: skill SK-001 (search term mining) é executada
Then: puxa search terms via MCP Google Ads com filtro status=NONE
  And: avalia cada termo com cross-reference triplo (term x keyword x ad group theme)
  And: gera CSV com colunas: Campaign, Ad Group, Keyword, Search Term, Match Type, Cost, Clicks, Impressions, CPC, CTR, Conversions, Reasoning
  And: apresenta ao operador agrupado por campanha
  And: só executa adição de negativos após "sim" explícito por lote
```

### CA-028 — Budget Optimization com Dados de Impression Share
**Cobre:** RF-022
```
Given: cliente com campanhas Google Ads ativas
When: skill SK-002 (budget optimization) é executada
Then: puxa impression share dos últimos 7 dias via MCP
  And: identifica se Lost to Budget > 40%
  And: propõe ajuste com valor específico ("Aumentar de R$ X para R$ Y/dia")
  And: aguarda aprovação via ask_approval antes de aplicar
```

### CA-029 — Weekly Review Automática
**Cobre:** RF-023
```
Given: pelo menos 1 cliente ativo com campanhas
When: cron de weekly review dispara (segunda 08:00)
Then: para cada cliente, gera relatório com KPIs, top/bottom campanhas, alertas, recomendações
  And: envia ao operador via Telegram
  And: formato é legível e acionável (não é dump de dados)
```

### CA-030 — Campaign Investigation Deep-Dive
**Cobre:** RF-024
```
Given: operador pede "investigue campanha X do cliente Y"
When: skill SK-004 é acionada
Then: puxa métricas 7d/14d/30d via MCP
  And: analisa ad sets e anúncios individualmente
  And: diagnostica causa raiz com justificativa
  And: propõe 2-3 ações concretas
```

### CA-031 — Creative e Copy Audit
**Cobre:** RF-025
```
Given: cliente com anúncios ativos e brand_voice configurado em client_rules
When: skill SK-005 ou SK-006 é executada
Then: lista anúncios/copies ativos via MCP
  And: compara contra benchmarks (SK-005) ou brand_voice (SK-006)
  And: classifica cada item (OK/Melhorar/Substituir)
  And: para itens "Substituir", gera alternativas
```

### CA-032 — Onboarding End-to-End
**Cobre:** RF-026
```
Given: operador fornece briefing (PDF/MD) de novo cliente
When: skill SK-008 (onboarding setup) é executada
Then: extrai nicho, público, oferta, brand voice, budget, objetivos do briefing
  And: propõe estratégia com estrutura de campanhas e budget split
  And: após aprovação, cria campanhas com status PAUSED
  And: solicita criativos (gerar OU receber upload)
  And: após revisão completa, ativa campanhas
```

### CA-033 — Offboarding Preserva Dados
**Cobre:** RF-027
```
Given: cliente com status "active" e campanhas rodando
When: operador aciona offboarding
Then: pausa todas as campanhas ativas
  And: gera relatório final de performance
  And: marca cliente como status "inactive"
  And: credenciais encriptadas são removidas do Supabase
  And: dados mantidos por 90 dias antes de purge
```

### CA-034 — Reportes Automatizados
**Cobre:** RF-028
```
Given: clientes ativos com campanhas e métricas
When: cadência semanal/mensal é atingida
Then: semanal: gera resumo de 3 linhas (spend, ROAS, ações) e envia via Telegram
  And: mensal: gera relatório PDF com KPIs, comparativo, ações, próximos passos
  And: mensal requer revisão do operador antes de envio ao cliente
```

---

## Casos de Borda Adicionais (v2.0)

| ID | Cenário | Comportamento Esperado | Prioridade |
|----|---------|----------------------|------------|
| CB-018 | Search term mining retorna 0 termos para negar | Informar operador: "Nenhum termo negativo identificado. Conta limpa." | Baixa |
| CB-019 | Briefing de onboarding incompleto (sem budget ou nicho) | AdsClaw sinaliza campos faltantes e pede complemento ao operador | Média |
| CB-020 | Weekly review em semana sem dados (cliente recém-onboarded) | Gerar review parcial com nota "Dados insuficientes — primeira semana de operação" | Baixa |
| CB-021 | Operador rejeita todos os lotes de search term mining | Registrar rejeição, não adicionar negativos, logar reasoning | Baixa |
| CB-022 | Budget optimization propõe aumento mas cliente está no limite de daily_budget em client_rules | Sinalizar conflito: "Proposta excede daily_budget configurado (R$ X). Ajustar client_rules?" | Média |
| CB-023 | Offboarding com campanhas que têm saldo comprometido | Pausar (não deletar), alertar operador sobre saldo remanescente | Média |

---

## 9. Aprovação

- [x] Requisitos funcionais numerados e verificáveis (RF-001 a RF-028)
- [x] Requisitos não funcionais documentados (RNF-001 a RNF-007)
- [x] Fluxos principais com pré/pós-condições (4 fluxos originais)
- [x] Critérios de aceite em formato Given/When/Then (CA-001 a CA-034)
- [x] Casos de borda mapeados (CB-001 a CB-023)
- [x] Anti-SPEC atualizada (write tools refletidas, novos comportamentos proibidos)
- [x] Modelos de dados com validações
- [x] Limites de escopo atualizados
- [x] Skills Operacionais especificadas (RF-021 a RF-026)
- [ ] SPEC v2.0 revisada e aprovada pelo responsável (Eduardo)

---
*SPEC v2.0 — Atualizada em 2026-04-08 para alinhar com PRD v2.0*

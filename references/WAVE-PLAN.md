# WAVE-PLAN — Plano de Execução por Ondas

> **Projeto:** AdsClaw — SWAS Marketing Engine
> **Data:** 2026-04-08
> **Referência:** TASKS v2.0, skills-manifest.md, CONTRACTS v1.0
> **Tasks pendentes:** 16 (Bloco 9: Deploy + Bloco 11: Skills Operacionais)

---

## Protocolo de Agentes

```
┌─────────────────────────────────────────────────────────┐
│  [Painel 1]           [Painel 2]        [Painel 3]      │
│  Claude Code          Codex CLI         Cursor Agent     │
│  Orchestrator + QA    Dev Sênior        Dev Operacional  │
│                       (skills, tools,   (VPS, PM2,       │
│                        testes, lógica)   nginx, deploy)  │
└─────────────────────────────────────────────────────────┘
```

---

## Onda 1 — Deploy VPS (Fundação)

> **Pré-requisito:** Nenhum
> **Objetivo:** AdsClaw rodando na VPS com Telegram e MCP servers funcionais
> **Duração estimada:** 1-2 dias

| Task | Agente | Dependência | Entrega |
|------|--------|-------------|---------|
| **T-090** — Configurar VPS (Node.js, PM2, nginx) | Cursor Agent | — | VPS acessível, Node.js 20, PM2, nginx configurado |
| **T-091** — Deploy do agente na VPS | Cursor Agent | T-090 | Agente rodando via PM2, auto-restart |
| **T-092** — Deploy dos MCP Servers | Cursor Agent | T-091 | meta-ads e google-ads MCP rodando como child processes |

**Gate:** `curl http://VPS_IP:3001/api/health` retorna `{ status: "ok" }`

### Prompt para Cursor Agent (Onda 1)

```
Você é o Dev Operacional do AdsClaw. Sua missão é fazer deploy do sistema na VPS Hostinger.

Leia estes arquivos para contexto:
- references/PLAN.md §9 (Deploy e Infraestrutura)
- references/TASKS.md (T-090, T-091, T-092)
- deploy_vps.ps1 (script de referência)

Tasks a executar em sequência:
1. T-090: Configurar VPS — Node.js 20, PM2 global, nginx como reverse proxy
2. T-091: Deploy do agente — git clone, npm install + build em agent/, PM2 start
3. T-092: Deploy MCP servers — build meta-ads e google-ads, configurar como child processes

Regras:
- Usar PM2 ecosystem.config.js conforme PLAN.md §9
- .env deve ser criado diretamente na VPS (nunca commitado)
- Firewall: abrir portas 3001 (agent) e 3000 (cockpit)
- Testar: curl http://localhost:3001/api/health deve retornar ok

Ao terminar cada task, preencha handoff-report.md com o status.
```

---

## Onda 2 — Deploy Cockpit + Secrets + Smoke (Completar Deploy)

> **Pré-requisito:** Onda 1 completa (agent rodando)
> **Objetivo:** Sistema completo em produção, testado end-to-end
> **Duração estimada:** 1 dia

| Task | Agente | Dependência | Entrega |
|------|--------|-------------|---------|
| **T-093** — Deploy cockpit (Vercel ou VPS) | Cursor Agent | T-090 | Cockpit acessível via HTTPS |
| **T-094** — Secrets de produção | Cursor Agent | T-091 | Todas as API keys configuradas na VPS |
| **T-095** — Smoke tests pós-deploy | Claude Code (QA) | T-092, T-093 | Agente responde Telegram, MCP conecta, Cockpit carrega |

**Gate:** Smoke test pass — agente responde no Telegram, cockpit exibe dados, MCP retorna métricas

### Prompt para Cursor Agent (Onda 2 — T-093, T-094)

```
Continuando o deploy do AdsClaw. Agent já está rodando (Onda 1 concluída).

Tasks:
1. T-093: Deploy do cockpit React — npm run build em cockpit/, servir via nginx ou PM2 serve
2. T-094: Configurar secrets de produção — preencher .env na VPS com todas as variáveis de references/PLAN.md §5

Regras:
- CORS do agent deve permitir o domínio do cockpit
- SUPABASE_SERVICE_KEY apenas no agent, ANON_KEY no cockpit
- Nunca commitar .env no repositório
```

### Prompt para Claude Code QA (Onda 2 — T-095)

```
Executar smoke tests pós-deploy do AdsClaw.

Verificações:
1. curl http://VPS_IP:3001/api/health — deve retornar { status: "ok" }
2. Enviar mensagem no Telegram — agente deve responder
3. Acessar cockpit no browser — dashboard deve carregar com dados do Supabase
4. Verificar logs PM2: pm2 logs — sem erros críticos
5. Verificar MCP: agente deve conseguir chamar list_clients

Preencher handoff-report.md com resultado de cada verificação.
```

---

## Onda 3 — Fundação de Skills Operacionais

> **Pré-requisito:** Onda 2 completa (sistema em produção)
> **Objetivo:** Infraestrutura de skills + 2 skills de maior impacto implementadas
> **Duração estimada:** 2-3 dias

| Task | Agente | Dependência | Entrega |
|------|--------|-------------|---------|
| **T-110** — Estrutura de skills no SkillRouter | Codex (dev) | — | SkillRouter carrega skills de agent/src/skills/ |
| **T-111** — SK-001: Search Term Mining | Codex (dev) | T-110 | Skill prompt + get_search_terms no MCP + CSV + batch approval |
| **T-113** — SK-003: Weekly Review | Codex (dev) | T-110 | Skill prompt + cron segunda 08:00 + relatório estruturado |

**Gate:** Weekly review executa para pelo menos 1 cliente piloto. Search term mining gera CSV válido.

### Prompt para Codex (Onda 3)

```
Você é o Dev Sênior do AdsClaw. Sua missão é implementar a infraestrutura de skills operacionais e as 2 skills de maior impacto.

Leia:
- references/PLAN.md §13 (Arquitetura de Skills Operacionais)
- references/SPEC.md RF-021 (SK-001), RF-023 (SK-003)
- references/adr/ADR-004-operational-skills-as-codified-methodologies.md
- references/RULES.md §14 (regras de skills)

Tasks:
1. T-110: Criar pasta agent/src/skills/ com arquivos Markdown para cada skill. Atualizar SkillRouter para carregar skills operacionais e injetá-las como systemInstruction quando o operador solicitar a tarefa correspondente.

2. T-111 (SK-001): Implementar Search Term Mining:
   - Criar skill prompt em agent/src/skills/search-term-mining.md
   - Adicionar tool get_search_terms no MCP Google Ads (GAQL: SELECT search_term_view...)
   - O agente deve avaliar cada termo com cross-reference triplo
   - Gerar output CSV com coluna Reasoning
   - Usar batch approval (ask_approval por lote agrupado por campanha)
   - Ref: CA-027

3. T-113 (SK-003): Implementar Weekly Review:
   - Criar skill prompt em agent/src/skills/weekly-review.md
   - Adicionar cron no Orchestrator: segunda 08:00
   - Para cada cliente ativo: gerar KPIs semana vs anterior, top/bottom campanhas, alertas, recomendações
   - Enviar via Telegram ao operador
   - Ref: CA-029

Regras invioláveis (RULES.md §14):
- Methodology before action — seguir passos da skill
- Reasoning obrigatório — justificar cada decisão
- Batch approval — agrupar ações por campanha
- Output padronizado — respeitar formato definido

Abra PR para cada task. Preencha handoff-report.md.
```

---

## Onda 4 — Onboarding + Reportes (Pré-cliente)

> **Pré-requisito:** Onda 3 completa
> **Objetivo:** Pronto para receber primeiro cliente
> **Duração estimada:** 2-3 dias

| Task | Agente | Dependência | Entrega |
|------|--------|-------------|---------|
| **T-117** — SK-008: Onboarding Setup | Codex (dev) | T-110 | Skill de onboarding completa |
| **T-118** — Reportes semanal + mensal | Codex (dev) | T-113 | Resumo semanal (Telegram) + relatório mensal (MD/PDF) |
| **T-119** — Offboarding | Codex (dev) | — | Fluxo de desativação de cliente |

**Gate:** Conseguir fazer onboarding de uma conta piloto end-to-end (briefing → campanha PAUSED → ativação)

### Prompt para Codex (Onda 4)

```
Continuando implementação de skills operacionais. Infraestrutura de skills e SK-001/SK-003 já existem.

Tasks:
1. T-117 (SK-008): Onboarding Setup
   - Skill prompt em agent/src/skills/onboarding-setup.md
   - Aceita briefing (texto/MD) como input
   - Extrai: nicho, público, oferta, brand voice, budget, objetivos
   - Propõe estratégia de campanha
   - Após aprovação: cria campanhas PAUSED via MCP write tools
   - Ref: RF-026, CA-032

2. T-118: Reportes
   - Semanal: gerar resumo 3 linhas (spend, ROAS, ações) junto com weekly review
   - Mensal: gerar relatório MD completo com KPIs, comparativo, ações, próximos passos
   - Enviar semanal via Telegram, mensal salvo em Supabase Storage para revisão
   - Ref: RF-028, CA-034

3. T-119: Offboarding
   - Comando "offboard cliente X" → pausa campanhas → relatório final → status inactive → remove credenciais
   - Dados mantidos 90 dias
   - Ref: RF-027, CA-033
```

---

## Onda 5 — Skills Complementares (Pós-validação)

> **Pré-requisito:** Onda 4 completa + piloto interno validado
> **Objetivo:** Completar todas as skills operacionais
> **Duração estimada:** 3-4 dias

| Task | Agente | Dependência | Entrega |
|------|--------|-------------|---------|
| **T-112** — SK-002: Budget Optimization | Codex (dev) | T-110 | Skill de otimização de budget |
| **T-114** — SK-004: Campaign Investigation | Codex (dev) | T-110 | Skill de deep-dive em campanha |
| **T-115** — SK-005/006: Creative + Copy Audit | Codex (dev) | T-110 | Skills de auditoria |
| **T-116** — SK-007: Account Health Check | Codex (dev) | T-110 | Skill de health check mensal |

**Gate:** Todas as 8 skills operacionais implementadas e testadas

---

## Resumo de Ondas

| Onda | Tasks | Agentes | Duração | Gate |
|------|-------|---------|---------|------|
| 1 — Deploy base | T-090, T-091, T-092 | Cursor Agent | 1-2 dias | health check ok |
| 2 — Deploy completo | T-093, T-094, T-095 | Cursor Agent + QA | 1 dia | smoke test pass |
| 3 — Skills fundação | T-110, T-111, T-113 | Codex | 2-3 dias | weekly review + search mining ok |
| 4 — Onboarding + reportes | T-117, T-118, T-119 | Codex | 2-3 dias | onboarding end-to-end ok |
| 5 — Skills complementares | T-112, T-114, T-115, T-116 | Codex | 3-4 dias | 8 skills completas |
| **Total** | **16 tasks** | | **~10-13 dias** | |

---

## Timeline

```
Semana 1 (Abr 2026):  Onda 1 + Onda 2 → Deploy completo
Semana 2 (Abr 2026):  Onda 3 → Skills fundação
Semana 3 (Abr 2026):  Onda 4 → Onboarding + reportes
                       → Início piloto interno (4 empresas próprias)
Semana 4+ (Mai 2026):  Onda 5 → Skills complementares (em paralelo com piloto)
                       → Primeiro cliente externo (Jun 2026)
```

---

*WAVE-PLAN gerado em 2026-04-08. Atualizar após cada onda concluída.*

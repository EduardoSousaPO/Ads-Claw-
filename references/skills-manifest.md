# Skills Manifest — AdsClaw

> **Gerado em:** 2026-04-08
> **Referência:** PRD v2.0, TASKS v2.0, catálogo em `C:\Users\edusp\Projetos_App_Desktop`
> **Uso:** Define quais skills do catálogo cada agente/task recebe

---

## 1. Contexto

O AdsClaw tem **2 blocos pendentes** de implementação:
- **Bloco 9** — Deploy VPS (6 tasks: T-090 a T-095)
- **Bloco 11** — Skills Operacionais (10 tasks: T-110 a T-119)

Este manifest mapeia quais skills do catálogo são relevantes para cada task e qual agente deve executá-la.

---

## 2. Skills do Catálogo Relevantes para o AdsClaw

### 2.1 Skills que EXISTEM e serão REUTILIZADAS

| Skill | Origem | Task(s) que atende | Como usar |
|-------|--------|-------------------|-----------|
| `SDD-avancado` | Catálogo | T-000 a T-005 (concluído) | Já usado — gerou toda a documentação SDD |
| `consultor_prd` | Catálogo | PRD v2.0 (concluído) | Já usado — refinou o PRD |
| `consultor_copy` | Catálogo | T-115 (Ad Copy Audit SK-006) | Princípios de copywriting para validar copies geradas |
| `apify-lead-generation` | Catálogo | Growth engine (v2) | Para prospecção ativa de clientes da agência |
| `apify-competitor-intelligence` | Catálogo | T-115 (Creative Audit SK-005) | Benchmarks de concorrentes via Apify |
| `apify-content-analytics` | Catálogo | T-118 (Reportes) | Análise de performance de conteúdo |
| `canvas-design` | Catálogo | T-118 (Reportes mensais) | Geração de relatórios visuais (se PDF) |
| `mcp-builder` | Catálogo | T-111 (get_search_terms no MCP Google) | Referência para criar nova tool MCP |
| `multi-agent-handoff` | Catálogo | WAVE-PLAN | Protocolo de handoff entre agentes |
| `skill-creator` | Catálogo | T-110 | Para criar as skills operacionais do agente |
| `ai-video-generation` | Catálogo | T-070 (concluído) | Já usado — referência para Veo/FLUX |

### 2.2 Skills que NÃO EXISTEM e precisam ser CRIADAS

| Skill a criar | Task que atende | Descrição | Complexidade |
|--------------|----------------|-----------|-------------|
| `search-term-methodology` | T-111 (SK-001) | Metodologia de avaliação de search terms por relevância (cross-reference triplo). Prompt estruturado para o agente seguir | Média |
| `budget-optimization-methodology` | T-112 (SK-002) | Metodologia de análise de impression share e proposta de ajuste de budget | Média |
| `weekly-review-template` | T-113 (SK-003) | Template de review semanal estruturada com KPIs, top/bottom, alertas, recomendações | Baixa |
| `campaign-investigation-framework` | T-114 (SK-004) | Framework de deep-dive em campanha com diagnóstico e recomendação | Média |
| `creative-audit-criteria` | T-115 (SK-005) | Critérios de auditoria de criativos contra benchmarks e princípios de performance | Média |
| `ad-copy-principles` | T-115 (SK-006) | Princípios de copywriting para ads (CTA claro, benefício antes de feature, urgência, proof) | Baixa |
| `account-health-checklist` | T-116 (SK-007) | Checklist de saúde de conta (naming, budget distribution, overlap, frequência) | Baixa |
| `onboarding-workflow` | T-117 (SK-008) | Workflow de onboarding: briefing → extração → estratégia → campanhas | Média |
| `report-generator` | T-118 | Gerador de reportes semanal (3 linhas) e mensal (PDF/MD completo) | Média |

### 2.3 Skills que NÃO são necessárias

| Skill | Por que não usar |
|-------|-----------------|
| `apify-actor-development` | AdsClaw não cria actors customizados |
| `apify-actorization` | Não aplicável |
| `apify-audience-analysis` | Fora do escopo v1 |
| `apify-brand-reputation-monitoring` | Fora do escopo |
| `apify-ecommerce` | Fora do escopo |
| `apify-influencer-discovery` | Fora do escopo |
| `apify-market-research` | Possível v2, não agora |
| `apify-trend-analysis` | Possível v2, não agora |
| `apify-ultimate-scraper` | Já tem apify-competitor-intelligence |
| `algorithmic-art` | Irrelevante |
| `brainstorming` | Útil mas não essencial para tasks pendentes |
| `claude-api` | AdsClaw usa Gemini, não Claude API |
| `consultor_site_que_converte` | Fora do escopo |
| `project-kickoff` | Projeto já existe |
| `slack-gif-creator` | Irrelevante |

---

## 3. Mapeamento: Task → Agente → Skills

### Bloco 9 — Deploy VPS

| Task | Agente Recomendado | Skills necessárias | Notas |
|------|-------------------|-------------------|-------|
| T-090 — Configurar VPS | Cursor Agent (ops) | Nenhuma skill | Config manual: Node.js, PM2, nginx |
| T-091 — Deploy do agente | Cursor Agent (ops) | Nenhuma skill | Git clone + npm build + PM2 |
| T-092 — Deploy MCP Servers | Cursor Agent (ops) | Nenhuma skill | Build + PM2 como child processes |
| T-093 — Deploy cockpit | Cursor Agent (ops) | Nenhuma skill | Vite build + nginx ou PM2 serve |
| T-094 — Secrets de produção | Cursor Agent (ops) | Nenhuma skill | .env na VPS, nunca no repo |
| T-095 — Smoke tests | Claude Code (QA) | Nenhuma skill | curl + Telegram test + Cockpit load |

### Bloco 11 — Skills Operacionais

| Task | Agente Recomendado | Skills do catálogo | Skills a criar |
|------|-------------------|-------------------|---------------|
| T-110 — Estrutura de skills no SkillRouter | Codex (dev) | `skill-creator` (referência) | — |
| T-111 — SK-001 Search Term Mining | Codex (dev) | `mcp-builder` (referência) | `search-term-methodology` |
| T-112 — SK-002 Budget Optimization | Codex (dev) | — | `budget-optimization-methodology` |
| T-113 — SK-003 Weekly Review | Codex (dev) | — | `weekly-review-template` |
| T-114 — SK-004 Campaign Investigation | Codex (dev) | — | `campaign-investigation-framework` |
| T-115 — SK-005/006 Creative + Copy Audit | Codex (dev) | `consultor_copy`, `apify-competitor-intelligence` | `creative-audit-criteria`, `ad-copy-principles` |
| T-116 — SK-007 Account Health Check | Codex (dev) | — | `account-health-checklist` |
| T-117 — SK-008 Onboarding Setup | Codex (dev) | — | `onboarding-workflow` |
| T-118 — Reportes | Codex (dev) | `canvas-design` (PDF) | `report-generator` |
| T-119 — Offboarding | Codex (dev) | — | — (lógica simples) |

---

## 4. Resumo

| Métrica | Valor |
|---------|-------|
| Tasks pendentes | 16 (6 deploy + 10 skills) |
| Skills do catálogo reutilizadas | 11 |
| Skills novas a criar | 9 |
| Skills descartadas | 15 |

### Ordem recomendada de execução

1. **Bloco 9 (Deploy)** primeiro — sem infra rodando, não dá para testar skills com dados reais
2. **T-110** — Estrutura de carregamento de skills (pré-requisito de todas as outras)
3. **T-111 (SK-001)** e **T-113 (SK-003)** — Search Term Mining e Weekly Review são as skills de maior impacto imediato
4. **T-117 (SK-008)** — Onboarding é essencial para receber o primeiro cliente
5. **T-118** — Reportes (necessário antes do primeiro cliente)
6. Demais skills em paralelo conforme capacidade

---

*Skills Manifest gerado em 2026-04-08. Revisitar após cada skill implementada.*

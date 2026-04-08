# AdsClaw — Contexto do Projeto

> Atualizado em: 2026-04-08

## O que e o AdsClaw

Motor de IA autonomo para agencia de performance digital (modelo SWAS).
O cliente final compra resultados, nao software. O AdsClaw opera internamente.

## Stack

- **Agent Backend:** Node.js + TypeScript (tsx), Gemini 2.0 Flash
- **Frontend (Cockpit):** React 19 + Vite 8 + Tailwind 4
- **Banco:** Supabase (PostgreSQL + RLS + Storage)
- **MCP Servers:** Meta Ads + Google Ads (TypeScript, stdio)
- **Telegram:** grammy (long-polling, whitelist)
- **Criativos:** inference.sh (FLUX-1-Schnell, Veo 3.1) + Apify
- **Deploy:** VPS Hostinger + PM2

## Fase Atual

**Pre-deploy** — codigo base 76% completo. Faltam Bloco 9 (Deploy) e Bloco 11 (Skills Operacionais).

### Progresso por Bloco

| Bloco | Status |
|-------|--------|
| 0 — SDD Docs | 100% |
| 1 — Setup (TS, env, Supabase, CI) | 100% |
| 2 — ProviderFactory Multi-LLM | 100% |
| 3 — AgentLoop (ReAct + Function Calling) | 100% |
| 4 — MCP Bridges (Meta + Google) | 100% |
| 5 — Orchestrator (cron + alertas) | 100% |
| 6 — Telegram I/O | 100% |
| 7 — CreativeLab | 100% |
| 8 — Web Cockpit | 100% |
| 9 — Deploy VPS | **0% — PENDENTE** |
| 10 — Qualidade/Validacao | 100% |
| 11 — Skills Operacionais | **0% — NOVO (PRD v2.0)** |

### Tasks Pendentes (Bloco 9)

- [ ] T-090 — Configurar VPS Hostinger (Node.js, PM2, nginx)
- [ ] T-091 — Deploy do agente na VPS
- [ ] T-092 — Deploy dos MCP Servers na VPS
- [ ] T-093 — Deploy do cockpit (Vercel ou VPS)
- [ ] T-094 — Secrets de producao
- [ ] T-095 — Smoke tests pos-deploy

## Artefatos do Workflow

| Artefato | Status |
|----------|--------|
| PROCESS.md | Criado (2026-04-07, retroativo) |
| references/PRD.md | **v2.0 aprovado** (2026-04-08) |
| references/SPEC.md | **v2.0** — RF-021 a RF-028, CA-027 a CA-034, CB-018 a CB-023 |
| references/CONTRACTS.md | v1.0 completo (27 tools + HTTP + MCP + Telegram) |
| references/PLAN.md | **v2.0** — seção 13 (Skills Operacionais) + ADR-004 |
| references/RULES.md | **v2.0** — seções 14 (Skills) e 15 (Reportes) |
| references/TASKS.md | **v2.0** — 52/68 concluidas (Bloco 11 adicionado) |
| references/skills-manifest.md | **Criado** (2026-04-08) — 11 skills reutilizadas, 9 a criar |
| references/WAVE-PLAN.md | **Criado** (2026-04-08) — 5 ondas, 16 tasks, ~10-13 dias |

## Decisoes Tecnicas Importantes

- Gemini 2.5 Flash como modelo padrao (trocado de 2.0 por compatibilidade)
- 27 tools no ToolRegistry (14 originais + 6 write Meta + 5 write Google + 2 extras)
- McpBridge com graceful degradation (funciona sem credenciais)
- AES-256-GCM para encriptacao de tokens de clientes
- Write tools criam campanhas PAUSED por padrao + notificam gestor

## Documentacao de Referencia

- `references/specs-modules/` — 8 specs de modulos
- `references/adr/` — 3 ADRs (multi-LLM, Supabase, inference.sh)
- `references/validation/` — 5 relatorios de validacao (contratos, spec, drift, seguranca, retro)
- `docs/WORKFLOW-MANUAL.md` — manual de operacao da software house

## Skills Operacionais (PRD v2.0)

8 skills codificadas inspiradas no Google Ads Toolkit (Austin Lau):
- SK-001: Search Term Mining (negativos com reasoning)
- SK-002: Budget Optimization (impression share)
- SK-003: Weekly Review (relatorio semanal estruturado)
- SK-004: Campaign Investigation (deep-dive)
- SK-005: Creative Audit (criativos vs benchmarks)
- SK-006: Ad Copy Audit (copy vs brand voice)
- SK-007: Account Health Check (saude geral da conta)
- SK-008: Onboarding Setup (briefing → estrategia → campanhas)

## Modelo Financeiro

- Fee fixo: R$ 1.697/mes por cliente
- Ticket-alvo de midia: R$ 7k-15k/mes (minimo R$ 3k)
- Capacidade solo: ate 20 clientes (~R$ 34k/mes receita)
- Custo infra: ~R$ 60-200/mes

## Proximos Passos

1. ~~Refinar PRD v1.0 via /consultor-prd~~ → PRD v2.0 aprovado (2026-04-08)
2. ~~Atualizar SDD~~ → SPEC, PLAN, RULES, TASKS v2.0 (2026-04-08)
3. ~~skill-scout~~ → skills-manifest.md gerado (2026-04-08)
4. ~~cursor-team-protocol~~ → WAVE-PLAN.md gerado (2026-04-08)
5. **PROXIMO:** Executar Onda 1 — Deploy VPS (T-090, T-091, T-092)
6. Onda 2 — Deploy cockpit + secrets + smoke tests
7. Onda 3 — Skills fundacao (SkillRouter + SK-001 + SK-003)
8. Onda 4 — Onboarding + reportes
9. Piloto interno nas 4 empresas proprias
10. Onda 5 — Skills complementares

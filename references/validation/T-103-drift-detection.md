# T-103 — Detecção de Drift (Desvios da Spec)

> Data: 2026-03-31
> Status: Aprovado

## Drifts Identificados e Documentados

| # | Origem | Drift | Decisão | Impacto | Registrado em |
|---|--------|-------|---------|---------|---------------|
| 1 | PLAN.md §2 | Estrutura `llm/` prevista, implementado como `providers/` | Equivalente funcional, mantido | Nenhum | TASKS.md T-010 |
| 2 | PLAN.md §2 | Tools previstas em `tools/implementations/*.ts`, implementadas inline no ToolRegistry | Decisão pragmática — 27 tools inline é mais manutenível que 27 arquivos | Nenhum | TASKS.md T-010 |
| 3 | SPEC RF-011 | Voz via Whisper prevista, não implementada | Fora do MVP — foco em texto/Telegram | Baixo | Este documento |
| 4 | CONTRACTS.md | 14 tools previstas no contrato, implementadas 27 | Extensão (não breaking) — 11 write tools adicionadas | Positivo | TASKS.md log |
| 5 | ADR-001 | Tier1=Flash, Tier2=Pro, Tier3=Claude/GPT-4o | MVP usa Flash em todos os tiers | Baixo (Phase 2) | ADR-001 rollout |
| 6 | PLAN.md §3 | 9 tabelas previstas | 9 tabelas + 2 colunas extras (encrypted_meta_token, encrypted_google_refresh_token) | Positivo | T-043 |
| 7 | SPEC RF-016 | Dashboard com "gráficos de CPA, CTR, ROAS por período" | Dashboard com KPIs reais mas sem gráficos de série temporal (requer performance_snapshots preenchidos) | Médio | Este documento |
| 8 | PLAN.md | Cockpit previsto como "Next.js" | Implementado como React + Vite SPA | Nenhum (funcional equivalente) | TASKS.md T-080 |
| 9 | CONTRACTS.md §5 | Google Ads MCP com 4 tools | Implementado com 9 tools (4 read + 5 write) | Positivo | TASKS.md T-041 |
| 10 | RULES.md §3 | "Nunca ação irreversível sem ask_approval" | Write tools notificam gestor mas não forçam ask_approval inline (LLM decide) | Médio | Este documento |

## Drifts Aceitos (sem correção necessária)

- **#1, #2, #8**: Decisões de implementação pragmáticas sem impacto funcional
- **#4, #6, #9**: Extensões positivas além do scope original
- **#5**: Planejado para Phase 2

## Drifts que Requerem Atenção Futura

- **#3 (Voz)**: Implementar Whisper quando necessário
- **#7 (Gráficos)**: Requer dados em performance_snapshots (depende de tokens MCP)
- **#10 (Approval enforcement)**: Considerar forçar ask_approval antes de toda write tool no ToolRegistry

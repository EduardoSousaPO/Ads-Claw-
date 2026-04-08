# T-105 — Retrospectiva e Lições Aprendidas

> Data: 2026-03-31
> Projeto: AdsClaw — SWAS Performance Marketing Engine

## Métricas do Projeto

| Métrica | Valor |
|---------|-------|
| Tarefas completadas | 47/58 (81%) — Blocos 0-8 100%, 9-10 pendentes |
| Total de tools | 27 (16 originais + 11 write) |
| Testes automatizados | 69 testes, 11 suites |
| Coverage (linhas) | 63% geral, >80% em módulos críticos |
| Páginas cockpit | 5 (Dashboard, Clientes, Alertas, Aprovações, Conversas) |
| MCP Servers | 2 (Meta Ads: 12 tools, Google Ads: 9 tools) |
| Supabase tabelas | 9 + 1 view |
| Commits | ~15 sessões de desenvolvimento |

## O que funcionou bem

1. **SDD (Spec-Driven Development)** — Ter PRD, SPEC, CONTRACTS, PLAN e RULES antes de codificar evitou retrabalho significativo. Quando havia dúvida, a spec tinha a resposta.

2. **McpBridge pattern** — Separar MCP servers como processos filhos via stdio foi a decisão certa. Permite evoluir cada plataforma independentemente e crash isolation.

3. **ToolRegistry centralizado** — 27 tools num único arquivo é controverso, mas na prática facilita encontrar e editar tools. O factory pattern (createMetaWriteTool) reduziu boilerplate.

4. **TelegramNotifier singleton** — Resolveu o problema de dependência circular (TelegramHandler ↔ ToolRegistry) e habilitou notify_manager + ask_approval sem acoplamento.

5. **Delegação Claude Code + Cursor** — Code para implementação, Cursor para operações de banco (migrations, seeds, RLS policies). Fluxo eficiente.

6. **Graceful degradation** — MCP não conectado? Aviso no log, agente funciona sem. Apify sem token? Fallback estático. inference.sh não instalado? Erro claro.

## O que foi difícil

1. **Gemini modelo variando** — 2.0-flash deu 404, 2.5-flash rejeitou enum numérico em schemas. Cada mudança exigiu ajustes no ProviderFactory + ToolRegistry.

2. **TS strict + exactOptionalPropertyTypes** — Correto mas trabalhoso. Muitas correções de `string | undefined` que não existiriam com strict menos agressivo.

3. **Grammy multiple instances** — O bot do TelegramHandler e o TelegramNotifier conflitam se ambos fazem polling. Resolvido com TelegramNotifier usando bot apenas para envio.

4. **Supabase RLS para cockpit** — O cockpit usa anon key, que precisa de policies separadas. Cada tabela nova exigia criar policy para anon.

5. **client_rules como objeto vs array** — O Supabase retorna objeto em relações 1:1 mas array em 1:N. O cockpit precisou de `Array.isArray()` check.

## Decisões que tomaríamos diferente

1. **ToolRegistry split** — Com 27 tools, talvez valha dividir em arquivos por grupo (MetaReadTools, MetaWriteTools, GoogleTools, CreativeTools, CommsTools).

2. **Logging estruturado desde o início** — Console.log funciona mas não é pesquisável. Winston/Pino desde a v0.1 teria sido melhor.

3. **Playwright no cockpit mais cedo** — Os E2E specs foram escritos no final. Se tivessem sido escritos junto com as páginas, teriam pego o bug do client_rules array/objeto antes.

## Riscos Remanescentes

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:---:|:---:|-----------|
| Token Meta expirar (60 dias) | Alta | Alto | Implementar refresh automático |
| Gemini mudar schema de function calling | Média | Alto | Abstraído via GeminiProvider |
| Custo LLM escalar com mais clientes | Média | Médio | Tiers + MAX_ITERATIONS + cache |
| VPS Hostinger instável | Baixa | Alto | PM2 restart + health check |
| Write tools executando sem aprovação | Baixa | Crítico | System prompt instrui ask_approval |

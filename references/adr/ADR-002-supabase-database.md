# ADR-002 — Banco de Dados: Supabase (PostgreSQL gerenciado)
> Data: 2026-03-26
> Status: Aceito
> Projeto: AdsClaw

---

## Contexto

O AdsClaw é uma plataforma multi-tenant (SWAS) que precisa armazenar:
- Dados de múltiplos clientes com isolamento estrito
- Histórico de conversas do agente por cliente
- Snapshots de performance de campanhas (Meta Ads, Google Ads)
- Metadados de criativos e assets
- Configurações e regras por cliente

A decisão de banco de dados impacta: isolamento de dados, segurança multi-tenant, custo operacional, facilidade de deploy em VPS Hostinger, e velocidade de desenvolvimento.

## Opções Consideradas

### Opção A: Supabase (PostgreSQL gerenciado na nuvem)
- PostgreSQL hospedado com RLS nativo
- Auth, Storage e Realtime inclusos
- SDK TypeScript com type safety
- Região `sa-east-1` disponível (LGPD compliance)
- Free tier: 500MB, 2 projetos
- Pro tier: $25/mês, 8GB, backups automáticos

### Opção B: SQLite local na VPS (via better-sqlite3 ou Turso)
- Zero custo de infraestrutura
- Latência ultra-baixa (arquivo local)
- Sem RLS nativo — isolamento 100% no código da aplicação
- Turso (SQLite distribuído): $0 free tier, $29/mês Pro
- Backup manual necessário
- Sem realtime out-of-the-box

### Opção C: PostgreSQL autogerenciado na VPS Hostinger
- Controle total do banco
- Sem vendor lock-in
- Custo operacional alto: configurar PgBouncer, backups, SSL, replicação
- Sem RLS gerenciado nativamente na plataforma
- Equipe pequena não tem bandwidth para gerenciar infra de banco

### Opção D: PlanetScale (MySQL gerenciado)
- Branching de banco de dados
- Schema change sem downtime
- MySQL — ecossistema diferente do PostgreSQL
- Sem RLS nativo
- Free tier descontinuado em 2024

## Decisão

**Opção A: Supabase** é adotado como banco principal.

## Justificativa

1. **RLS nativo resolve isolamento multi-tenant com segurança em camada de banco** — a alternativa (isolamento só no código) é mais frágil e propensa a vazamento de dados entre clientes se houver bug de autorização.

2. **Auth, Storage e Realtime inclusos** eliminam a necessidade de serviços adicionais para funcionalidades que o AdsClaw já precisa: autenticação do cockpit (web dashboard), storage de assets criativos, e potencial realtime para alertas.

3. **`sa-east-1` disponível** — dados de clientes brasileiros permanecem no Brasil, alinhado com LGPD e com a regra da Constitution §13.

4. **SDK TypeScript com type generation** (`supabase gen types`) elimina erros de tipagem em queries — fundamental para um projeto TypeScript strict mode.

5. **Custo justificado**: $25/mês Pro vs o custo de engineering de gerenciar PostgreSQL autogerenciado (Opção C) ou implementar isolamento multi-tenant seguro no código sem RLS (Opção B).

6. **SandeClaw usou SQLite** (single-user, local) — AdsClaw é multi-tenant na nuvem. O SandeClaw pattern para banco não se aplica aqui. Esta é a diferença arquitetural mais crítica entre os dois projetos.

## Consequências

### Positivas
- Isolamento multi-tenant via RLS — seguro por design
- Backups automáticos inclusos no Pro tier
- Realtime disponível para alertas futuros sem infra adicional
- Type safety end-to-end com supabase-js

### Negativas / Riscos
- Vendor lock-in no Supabase — mitigação: toda query usa Supabase SDK mas a lógica de negócio não assume Supabase internamente; se necessário, migrar para PostgreSQL raw é viável
- Free tier tem limite de 500MB — monitorar crescimento de `conversation_history` e aplicar purge policy (sliding window já definida em RULES.md §4)
- Latência de rede VPS → Supabase São Paulo: esperado < 20ms (aceitável para o caso de uso)

## Schema Relacionado

Ver `references/PLAN.md §3` para DDL completo das tabelas, índices, triggers e políticas RLS.

## Referências

- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- PLAN.md §3 — Modelagem do Banco de Dados
- RULES.md §4 — Regras de Banco de Dados
- RULES.md §13 — Dados de clientes não saem do Brasil

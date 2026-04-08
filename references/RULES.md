# RULES — Constitution do AdsClaw
> Projeto: AdsClaw — SWAS Marketing Engine
> Data: 2026-03-26
> Versão: 1.0
> Referência: SPEC v1.0, PLAN v1.0

---

> Este documento é a Constitution do projeto — princípios inegociáveis que guiam toda
> a implementação. Qualquer violação deve ser justificada, aprovada e registrada em ADR antes de ser feita.
> Se houver conflito entre uma decisão técnica pontual e uma regra aqui, a regra prevalece.

---

## 1. Estrutura de Código

### Organização de Pastas

```
adsclaw/
├── agent/src/
│   ├── core/          → AgentLoop, Orchestrator, SkillRouter
│   ├── tools/         → ToolRegistry + 14 ferramentas de runtime
│   ├── services/      → CreativeLab, MemoryManager, TelegramIO
│   └── providers/     → ProviderFactory + implementações LLM
├── cockpit/src/       → React dashboard (web)
├── mcp-servers/       → Servidores MCP (meta-ads, google-ads)
├── shared/            → Tipos TypeScript compartilhados
├── references/        → Toda documentação SDD (SPEC, PLAN, CONTRACTS, etc.)
└── references/specs-modules/ → Specs técnicas por módulo
```

- **Proibido**: arquivos de código na raiz do projeto (exceto `package.json`, `.env.example`, configs de tooling)
- **Proibido**: misturar código de agent, cockpit e MCP no mesmo diretório
- **Obrigatório**: cada módulo tem seu spec em `references/specs-modules/`

### Nomenclatura

| Contexto | Padrão | Exemplo |
|----------|--------|---------|
| Arquivos TypeScript | `kebab-case` | `agent-loop.ts`, `tool-registry.ts` |
| Classes | `PascalCase` | `AgentLoop`, `ProviderFactory` |
| Interfaces | `IPascalCase` | `ILlmProvider`, `IAgentTool` |
| Variáveis/funções | `camelCase` | `runReactLoop()`, `clientId` |
| Constantes | `UPPER_SNAKE_CASE` | `MAX_ITERATIONS`, `DEFAULT_TIMEOUT_MS` |
| Tabelas no banco | `snake_case`, plural | `clients`, `conversation_history` |
| IDs | UUID v4 | nunca auto-increment exposto |
| Endpoints HTTP | `kebab-case`, plural | `/api/v1/agent-runs` |
| Nomes de ferramentas do agente | `snake_case` | `meta_get_account_insights` |
| Variáveis de ambiente | `UPPER_SNAKE_CASE` | `GEMINI_API_KEY`, `SUPABASE_URL` |

### Limites de Tamanho

- Funções: máximo **50 linhas** — se passar, refatorar em funções menores
- Arquivos TypeScript: máximo **300 linhas** — se passar, dividir em módulos
- Componentes React: máximo **200 linhas** — extrair sub-componentes
- Prompts LLM inline: máximo **20 linhas** — prompts maiores em arquivos `.txt` separados em `assets/prompts/`

---

## 2. Segurança (não negociável)

Estas regras não podem ser ignoradas sob nenhuma circunstância:

- **Credenciais e tokens existem APENAS em variáveis de ambiente**. Nunca hardcoded, nunca no código, nunca em logs.
- **`SUPABASE_SERVICE_ROLE_KEY` é usada APENAS no backend do agente (VPS)**. Nunca no frontend do cockpit nem exposta via API pública.
- **Toda query ao Supabase é obrigatoriamente filtrada por `client_id`** — nenhum dado de um cliente pode vazar para outro.
- **RLS (Row Level Security) habilitado em TODAS as tabelas com dados de clientes**.
- **Todo input do usuário (mensagem Telegram, parâmetros de API) é validado com Zod antes de qualquer operação**.
- **Queries parametrizadas obrigatórias** — concatenação de strings para SQL é proibida.
- **Senhas nunca são logadas, serializadas ou transmitidas** — somente hashes bcrypt quando aplicável.
- **Erros internos nunca são expostos ao usuário final** — mensagem genérica + código de referência.
- **Rate limiting obrigatório em endpoints de autenticação e operações destrutivas** (mínimo 5 req/min/IP em auth).
- **Audit log obrigatório para ações sensíveis**: login, mudança de role, deleção de dados, execução de ação sobre campanha ativa.
- **Chaves de API de plataformas (Meta, Google) são armazenadas encriptadas no Supabase** — nunca em texto plano.
- **Telegram Bot Token nunca em logs nem em respostas de erro**.
- **Whitelist de chat_ids do Telegram** — o agente não responde a IDs não autorizados.

---

## 3. Agente de IA — Regras de Runtime

### ReAct Loop

- O loop ReAct tem **MAX_ITERATIONS = 5** por execução. Nunca aumentar sem ADR.
- Se o agente não consegue concluir em 5 iterações, ele **para e reporta o estado** — nunca continua indefinidamente.
- Cada iteração deve produzir Thought + (Action OU FinalAnswer). Iterações sem Action nem FinalAnswer são erro.
- **Pensamentos (Thought)** são internos — nunca expostos diretamente ao usuário no Telegram.

### Function Calling

- Ferramentas de runtime são registradas como **`functionDeclarations` no Gemini SDK** — não como texto injetado no prompt.
- O `ToolRegistry` expõe apenas as 14 ferramentas definidas em `CONTRACTS.md` — nenhuma outra.
- **Ferramentas de Claude Code (SKILL.md files)** são apenas para desenvolvimento — nunca tratadas como ferramentas de runtime do agente.
- Toda ferramenta tem schema de parâmetros Zod validado antes de execução.
- Toda ferramenta retorna `{ success: boolean; data?: any; error?: string }`.

### SkillRouter vs Tools

- **Skills** (persona system prompts) são injetadas como `systemInstruction` no Gemini — nunca como `functionDeclarations`.
- **Tools** são `functionDeclarations` executáveis em runtime.
- O SkillRouter faz **uma chamada LLM leve** (Tier 1) para decidir qual persona injetar.
- A decisão do SkillRouter deve ser logada para rastreabilidade.

### Multi-LLM / ProviderFactory

- Toda chamada LLM passa pelo `ProviderFactory` — **nunca instanciar SDKs diretamente** no código de negócio.
- O provider padrão para MVP é Gemini Flash (Tier 1) e Gemini Pro (Tier 2).
- A troca de provider para um cliente específico requer registro na tabela `client_rules`.
- Tier 3 (Claude Sonnet, GPT-4o) é ativado apenas via `client_rules.enable_premium_llm = true`.

---

## 4. Banco de Dados

- **Migrations são a única forma de alterar o schema** — nunca alterar tabelas manualmente no Supabase Studio.
- Toda tabela tem `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` e `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
- **Deleção física (`DELETE`) apenas quando exigido por compliance** — preferir soft delete com `deleted_at`.
- Índices obrigatórios em campos usados em `WHERE`, `JOIN` e `ORDER BY` frequentes (ver lista em PLAN.md §3).
- **RLS habilitado em todas as tabelas com dados de clientes**: `clients`, `campaigns`, `ad_creatives`, `conversation_history`, `performance_snapshots`, `alerts`.
- **`conversation_history` usa sliding window**: manter apenas as últimas N mensagens por cliente (configurável via `client_rules.max_context_turns`, padrão 20).
- Connection pooling configurado para produção via Supabase Pooler (port 6543).
- Dados sensíveis (tokens de plataformas) encriptados antes de armazenar em `client_rules`.

---

## 5. API e Contratos

- Toda resposta de erro segue o padrão:
  ```json
  { "error": { "code": "ERROR_CODE", "message": "Mensagem amigável", "ref": "uuid-de-referência" } }
  ```
- Toda resposta de sucesso com dados segue:
  ```json
  { "data": { ... } }
  ```
- Versionamento: `/api/v1/` — nunca sem versão.
- HTTP Status codes semânticos: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.
- Listas sempre paginadas com `limit` e `offset` — nunca retornar coleções sem limite.
- `Content-Type: application/json` sempre explícito.
- **CORS configurado com whitelist de origens** — nunca wildcard em produção.
- Contratos formais definidos em `references/CONTRACTS.md` — toda mudança de contrato segue processo de evolução documentado ali.

---

## 6. MCP Servers

- Cada MCP Server (`meta-ads`, `google-ads`) é um **processo independente** — nunca importar código de MCP diretamente no agent.
- MCP Servers se comunicam com o agent via **stdio (stdin/stdout)** — sem REST, sem WebSocket.
- Todo MCP Server tem seu próprio `.env` isolado — credenciais de plataforma nunca no env do agent.
- MCP Servers expõem apenas ferramentas de **leitura e análise** — nenhuma ação destrutiva sem flag `require_approval: true`.
- O agent é responsável pelo `human-in-the-loop` antes de qualquer ação de escrita (ajuste de orçamento, pausa de campanha).

---

## 7. Criativo e Media

- **Benchmarks são consultados antes de toda geração de copy** — nunca gerar sem contexto de performance do setor.
- Geração de imagem usa **FLUX-1-Schnell via inference.sh CLI** — nunca via SDK direto.
- Geração de vídeo usa **Veo 3.1 via inference.sh CLI** — nunca via SDK direto.
- Todo asset gerado é salvo no **Supabase Storage** antes de ser enviado ao Telegram ou cockpit.
- **Aprovação humana obrigatória via Telegram inline keyboard** antes de publicar qualquer criativo.
- Fatigue detection baseada em `creative_refresh_days` — nunca usar campo `fatigue_days` (campo incorreto removido).
- A lógica de fatigue fica no `Orchestrator` — nunca inline no `AgentLoop`.

---

## 8. Tratamento de Erros

- **Erros silenciosos são proibidos** — `catch` vazio ou `catch (e) { }` sem log é violação desta Constitution.
- Erros inesperados são logados com contexto: `{ requestId, clientId, tool, error, stack, timestamp }`.
- **Stack traces nunca são expostos ao usuário** em produção (nem no Telegram, nem no cockpit).
- Erros esperados (validação, not found, rate limit) têm mensagens amigáveis em português.
- Erros inesperados mostram: `"Ocorreu um erro interno. Código: {ref}"`.
- Integrações externas (Meta API, Google API, Gemini) têm **timeout + retry com backoff exponencial**.
- Circuit breaker habilitado para chamadas ao Meta Ads API (maior histórico de instabilidade).

---

## 9. Testes

- Toda função de negócio crítica tem ao menos **um teste unitário**.
- **Testes não dependem de ordem de execução** — cada teste é isolado.
- **Banco de dados real (Supabase test project) para testes de integração** — sem mocks de banco (lição do histórico do projeto).
- Testes de contrato para toda interface definida em `CONTRACTS.md`.
- `main` sempre verde — nenhum merge com testes falhando.
- Fixtures/factories para dados de teste — nunca dados de produção.
- **Mocks são permitidos** apenas para: Gemini SDK (custo), Meta/Google APIs externas (rate limit), inference.sh CLI (recursos).
- Todo mock deve ter seu contrato Zod validado — não mockar com `any`.

---

## 10. Comentários e Documentação

- Comentários explicam o **porquê**, não o **o quê** (o código mostra o quê).
- Funções públicas têm JSDoc: o que faz, parâmetros, retorno, exceções.
- Código complexo ou contra-intuitivo merece comentário antes da linha.
- `TODO` e `FIXME` incluem contexto: `// TODO(nome, 2026-03-26): motivo + quando resolver`
- Cada arquivo de código tem cabeçalho com: feature coberta, requisito da SPEC referenciado, contrato referenciado.

---

## 11. Processo de Mudança

- **Mudança de escopo: atualizar SPEC antes de implementar** — nunca o contrário.
- Decisões técnicas divergentes do PLAN: registrar em ADR + log do TASKS.md.
- **Nenhuma feature começa sem tarefa no TASKS.md**.
- Mudança de contrato: seguir processo de evolução do CONTRACTS.md §Processo de Evolução.
- Refactor: só com testes existentes ou novos cobrindo o que muda.
- Toda mudança neste documento (RULES) exige registro de data, motivo e aprovação.

---

## 12. Regras para IA (guardrails de implementação)

Estas regras são especificamente para guiar a IA (Claude Code) durante a geração de código:

- **Implementar estritamente o que está na SPEC** — sem funcionalidades "extras" não solicitadas.
- **Se houver ambiguidade entre SPEC e código existente, seguir a SPEC** e registrar o drift no log de TASKS.md.
- Consultar a Anti-SPEC (`references/SPEC.md §Anti-SPEC`) antes de implementar qualquer feature para garantir que não está fazendo algo proibido.
- **Validar cada bloco de código contra o contrato correspondente em CONTRACTS.md**.
- Se a implementação requer violar qualquer regra desta Constitution, **parar e sinalizar ao usuário**.
- Manter o contexto focado: carregar apenas os documentos relevantes para a tarefa atual.
- **Não otimizar prematuramente** — implementar o requisito da SPEC primeiro, otimizar depois se necessário.
- **Drift identificado entre código existente e SPEC**: registrar no Log de Decisões do TASKS.md com tag `[DRIFT]`.
- Ao refatorar código existente com bugs arquiteturais (ex: `AgentLoop` sem Function Calling, `Orchestrator` com `Math.random()`), **criar tarefa específica** e seguir a SPEC — não apenas corrigir o sintoma.

---

## 13. Regras Específicas do AdsClaw

- **TypeScript strict mode** — `"strict": true` no tsconfig sem exceções.
- **Toda feature nova tem feature flag** em `client_rules.features` (JSON) antes de ir para produção.
- **Dados de clientes não saem do Brasil** — Supabase na região `sa-east-1` (São Paulo).
- **Componentes do cockpit usam exclusivamente shadcn/ui** — sem instalar libs de UI alternativas.
- **O agente não toma nenhuma ação irreversível sobre campanhas sem aprovação humana explícita** — isso nunca pode ser desativado, nem por `client_rules`.
- **Custo de API LLM por execução deve ser loggado** — toda chamada ao ProviderFactory registra tokens usados e custo estimado.
- **Rotação de provider por cliente**: cada cliente pode ter seu próprio provider LLM configurado em `client_rules` — o ProviderFactory deve honrar isso.
- **O agente responde APENAS a `chat_id`s na whitelist** — qualquer mensagem de ID desconhecido é descartada com log (nunca respondida).
- **Nomenclatura de ferramentas é fixa** conforme definida em `CONTRACTS.md §Agent Tool Contracts` — renomear uma ferramenta requer ADR.

---

## 14. Skills Operacionais (v2.0)

> Regras que governam a execução de skills operacionais codificadas (SK-001 a SK-008).

- **Metodologia antes de ação.** O agente deve seguir os passos da skill operacional relevante. Não tomar decisões ad-hoc quando existe uma skill codificada para a tarefa.
- **Reasoning obrigatório.** Decisões críticas (negação de termos, pausa de campanha, proposta de budget) devem incluir justificativa escrita na coluna/campo "Reasoning". Decisão sem justificativa é proibida.
- **Batch approval.** Ações de mesmo tipo devem ser agrupadas por campanha e apresentadas como lote ao operador. O operador aprova/rejeita o lote inteiro — nunca item a item silenciosamente.
- **Briefing como input.** Novas campanhas só são criadas a partir de briefing formal (PDF/MD) fornecido pelo operador. O AdsClaw propõe estratégia baseada no briefing — nunca inventa estratégia do nada.
- **Skills compostas.** Skills podem referenciar outras skills (ex: search-term-mining carrega search-term-methodology). A composição deve ser explícita no prompt da skill.
- **Output padronizado.** Cada skill tem formato de output definido (CSV, relatório, proposta). O agente deve respeitar o formato — não improvisar.
- **Auditabilidade total.** Outputs de skills (CSVs, relatórios, propostas) devem ser persistidos no chat_history.metadata ou em Supabase Storage para rastreabilidade.

---

## 15. Reportes e Comunicação (v2.0)

- **Reporte semanal:** gerado toda segunda-feira, automaticamente, 3 linhas (spend, ROAS, ações).
- **Reporte mensal:** PDF com KPIs + comparativo + ações + próximos passos. Semi-automático (AdsClaw gera, operador revisa).
- **O operador revisa TUDO antes de enviar ao cliente** — nenhum reporte vai direto ao cliente sem revisão humana.
- **Calls com cliente:** máximo 2 por mês, sob demanda do cliente.
- **Separação growth vs operação:** dados e campanhas de aquisição de clientes para a agência são contexto separado — nunca misturar com operação de clientes.

---

## Histórico de Mudanças

| Data | Versão | Mudança | Aprovado por |
|------|--------|---------|--------------|
| 2026-03-26 | 1.0 | Criação inicial da Constitution | Eduardo (PM) |
| 2026-04-08 | 2.0 | Adicionadas seções 14 (Skills Operacionais) e 15 (Reportes). Regras de methodology-before-action, reasoning obrigatório, batch approval, briefing-as-input, auditabilidade | Eduardo (PM) |

---
*Este documento é vivo: pode ser atualizado, mas nunca silenciosamente. Toda mudança exige registro de data, motivo e aprovação explícita.*

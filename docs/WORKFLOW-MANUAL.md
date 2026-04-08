# Software House Autônoma — Manual de Operação

> **Versão:** 1.0 — Abril 2026  
> **Autor:** Eduardo Spada  
> **Uso:** Cole este documento no Claude Code (Painel 1) ao iniciar qualquer
> projeto — novo ou já em andamento. Ele orienta o agente sobre o fluxo
> completo, as skills disponíveis e como proceder em cada situação.

---

## O que é este documento

Este é o **prompt inicial universal** da software house. Ele serve para dois cenários:

- **Projeto novo:** orienta como começar do zero seguindo o fluxo completo
- **Projeto em andamento:** orienta como identificar onde está e retomar sem perder contexto

Cole-o no Claude Code sempre que iniciar uma sessão em um projeto pela primeira vez,
ou quando precisar reorientar um agente sobre o processo correto.

---

## O Fluxo da Software House

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO COMPLETO                               │
│                                                                  │
│  /project-kickoff                                                │
│       ↓                                                          │
│  /consultor-prd         ← fase com o cliente                    │
│       ↓                                                          │
│  /SDD-avancado          ← spec completa + contratos             │
│       ↓                                                          │
│  skill-scout            ← catálogo de skills                    │
│       ↓                                                          │
│  /cursor-team-protocol  ← protocolo dos agentes                 │
│       ↓                                                          │
│  EXECUÇÃO               ← 3 agentes no Cursor IDE               │
│  (ondas paralelas)                                               │
│       ↓                                                          │
│  ENTREGA + CATÁLOGO CRESCE                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Skills instaladas — onde e quando usar

### `/project-kickoff`
**Quando:** Primeiro ato em qualquer projeto novo. Antes de tudo.  
**O que faz:** Cria a estrutura de pastas padrão, inicializa o Git,
gera o `PROCESS.md` preenchido com nome do projeto e cliente,
e entrega o checklist de faturamento por fase.  
**Output:** `PROCESS.md`, `CLAUDE.md` (esqueleto), `README.md`,
`.gitignore`, `assets/daily-checkin-prompt.md`  
**Tempo:** ~10 minutos  
**Gate:** Você mostra o `PROCESS.md` ao cliente antes de avançar.

---

### `/consultor-prd`
**Quando:** Após o kickoff. Com o cliente presente (ao vivo ou async).  
**O que faz:** Conduz o discovery completo, identifica o problema real
(não o sintoma), mapeia personas, define escopo e anti-escopo, e produz
o PRD estruturado e aprovável.  
**Input:** Nenhum documento anterior necessário — a skill conduz a conversa.  
**Output:** `references/PRD.md` aprovado pelo cliente  
**Tempo:** 1–3 horas  
**Gate:** Cliente aprova o PRD por escrito antes de avançar para o SDD.

---

### `/SDD-avancado`
**Quando:** Após PRD aprovado. Você e a skill trabalham juntos.  
**O que faz:** 10 fases de engenharia sênior — SPEC com anti-spec,
contratos formais OpenAPI/Zod, plano técnico com ADRs, constitution
do projeto (RULES) e tasks decompostas com dependências explícitas.  
**Input:** `references/PRD.md` aprovado  
**Output:**
- `references/SPEC.md` — requisitos funcionais e critérios de aceite
- `references/CONTRACTS.md` — **peça mais crítica**: interfaces, tipos, schemas
- `references/PLAN.md` — stack, arquitetura, ADRs
- `references/TASKS.md` — tasks com dependências explícitas
- `references/RULES.md` — regras invioláveis do projeto  

**Tempo:** 2–6 horas  
**Gate:** Você aprova cada fase individualmente. Sem aprovação não avança.  
**Atenção:** O `CONTRACTS.md` é o que permite os agentes trabalharem em
paralelo sem se atropelar. Se estiver vago, o desenvolvimento falha.

---

### `skill-scout`
**Quando:** Após o SDD aprovado, antes do `/cursor-team-protocol`.  
**O que faz:** Lê o SDD do projeto, varre o catálogo em
`C:\Users\edusp\Projetos_App_Desktop`, decide o que reutilizar,
adapta skills genéricas ou cria novas via `/skill-creator`, e entrega
o `skills-manifest.md` mapeando qual skill cada agente recebe por task.  
**Como ativar:** Cole o prompt do Skill Scout no Painel 1 (Claude Code)
após o SDD estar aprovado. Não é uma skill instalada no Claude.ai —
é um prompt que você salva e reutiliza.  
**Input:** Todo o SDD (`PLAN.md`, `SPEC.md`, `CONTRACTS.md`, `TASKS.md`)  
**Output:** `references/skills-manifest.md`  
**Tempo:** 15–20 minutos (automático)  
**Catálogo:** `C:\Users\edusp\Projetos_App_Desktop\` — cresce a cada projeto

---

### `/cursor-team-protocol`
**Quando:** Após o Skill Scout entregar o `skills-manifest.md`.  
**O que faz:** Organiza as tasks em ondas de execução paralela,
atribui Codex ou Cursor Agent para cada task, gera os prompts de
ativação prontos para colar nos painéis do Cursor, e completa o `CLAUDE.md`.  
**Input:** `TASKS.md` + `CONTRACTS.md` + `skills-manifest.md`  
**Output:**
- `references/WAVE-PLAN.md` — ondas com agente por task
- `references/AGENT-BRIEFS/orchestrator.md` — prompt do Claude Code
- `references/AGENT-BRIEFS/codex-dev.md` — prompt do Codex
- `references/AGENT-BRIEFS/cursor-ops.md` — prompt do Cursor Agent
- `CLAUDE.md` — completo com contexto do projeto e protocolo  

**Tempo:** 30–60 minutos  
**Gate:** Você revisa o `WAVE-PLAN.md` — a sequência de ondas faz sentido?

---

## O Time de Agentes no Cursor IDE

```
┌─────────────────────────────────────────────────────────────┐
│                     CURSOR IDE                               │
│                                                              │
│  [Painel 1]           [Painel 2]        [Painel 3]          │
│  Claude Code          Codex CLI         Cursor Agent        │
│  Orchestrator + QA    Dev Sênior        Dev Operacional     │
│                       (lógica, APIs,    (Supabase, Vercel,  │
│                        testes, React)    deploy, MCPs)      │
└─────────────────────────────────────────────────────────────┘
```

**Como abrir os painéis:**
- Painel 1 — Claude Code: `Ctrl+Shift+P` → "Claude Code: Open"
- Painel 2 — Codex: `Ctrl+Shift+P` → "Codex: Open"  
- Painel 3 — Cursor Agent: `Ctrl+L`

**MCPs necessários no Cursor (configurar uma vez, vale para todos os projetos):**
```json
{
  "mcpServers": {
    "github": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] },
    "supabase": { "command": "npx", "args": ["@supabase/mcp-server-supabase@latest", "--access-token", "SEU_TOKEN"] },
    "vercel": { "command": "npx", "args": ["-y", "@vercel/mcp-adapter"] }
  }
}
```

---

## Papéis e Limites dos Agentes

### Claude Code — Orchestrator e QA (Painel 1)

**Faz:**
- Lê o WAVE-PLAN e gera prompts de delegação para Codex e Cursor Agent
- Gerencia as ondas — só libera a próxima quando a atual está completa
- Lê os `handoff-report.md` e decide o próximo passo
- Revisa PRs como QA Agent (valida contra SPEC e CONTRACTS)
- Diagnostica bloqueios e fornece contexto adicional

**Nunca:**
- Escreve código de negócio diretamente
- Faz merge direto na main
- Inicia a onda N+1 antes de todos os PRs da onda N estarem mergeados

---

### Codex — Dev Sênior (Painel 2)

**Faz:**
- Lógica de negócio e regras de domínio
- APIs, endpoints, validações Zod/Pydantic
- Componentes React com lógica
- Testes unitários e de integração
- Abre PR + preenche `handoff-report.md`

**Nunca:**
- Usa MCPs de serviços externos (isso é do Cursor Agent)
- Cria tipos que já existem em `types/shared.ts`
- Faz merge de PR

---

### Cursor Agent — Dev Operacional (Painel 3)

**Faz:**
- Migrations SQL + RLS policies no Supabase
- Deploy e variáveis de ambiente no Vercel
- Storage, buckets, CDN
- GitHub Actions e CI/CD
- Usa MCPs: GitHub MCP, Supabase MCP, Vercel MCP
- Abre PR + preenche `handoff-report.md`

**Nunca:**
- Implementa lógica de negócio complexa
- Roda migrations destrutivas sem documentar como reverter
- Cria recursos em produção diretamente (apenas staging)

---

## O Loop de Uma Task

```
Você cola prompt → Agente trabalha (horas) → Agente abre PR + handoff-report
     ↓
Você lê handoff-report (30 seg) → Cola prompt QA no Painel 1
     ↓
QA revisa (30–60 min) → Aprovado → Você faz merge
     ↓
Atualiza CLAUDE.md → Próxima task ou próxima onda
```

**Tempo seu por task concluída:** ~4 minutos  
**Tempo dos agentes por task:** 2–8 horas  
**Total diário seu (projeto médio):** ~45 minutos

---

## O CLAUDE.md — Memória Viva do Projeto

O `CLAUDE.md` na raiz do projeto é lido automaticamente pelo Claude Code
ao iniciar qualquer sessão. Mantenha-o sempre atualizado.

**Atualize após:**
- Cada task concluída e mergeada
- Cada onda completa
- Qualquer mudança de escopo aprovada

**O que deve estar sempre atual no CLAUDE.md:**
- Fase atual do projeto
- Onda atual e tasks em andamento
- Branches disponíveis na main (módulos já implementados)
- Decisões técnicas relevantes tomadas

---

## O Daily Check-in

Todo dia que trabalhar em um projeto, antes de qualquer outra coisa,
cole o prompt de daily check-in no Painel 1. O arquivo está em:

```
assets/daily-checkin-prompt.md
```

O Claude Code lê `CLAUDE.md`, `WAVE-PLAN.md`, `TASKS.md` e `handoff-report.md`
e responde em ~30 segundos:

```
Onda atual: 2 de 4
Tasks em andamento: T-020 (Codex), T-021 (Cursor Agent)
PRs aguardando ação: #14 (QA aprovou — pronto para merge)
Bloqueios: nenhum
Próxima ação: gh pr merge 14 --squash, depois atualizar CLAUDE.md
```

---

## Regras Invioláveis do Processo

1. **Spec antes de código.** Sem SPEC e CONTRACTS aprovados, nenhum agente implementa nada.

2. **CONTRACTS.md é lei.** Todo agente lê antes de implementar. Violar um contrato
   quebra o time inteiro.

3. **Nenhum merge sem QA.** Todo PR passa pelo QA Agent. Sem exceção, nem para
   correções pequenas.

4. **Ondas em sequência.** A onda N+1 só começa quando todos os PRs da onda N
   estão mergeados na main.

5. **CLAUDE.md sempre atualizado.** É a memória do projeto entre sessões.
   Agente sem contexto atualizado vai na direção errada.

6. **Bloqueio vira relatório em 20 minutos.** Agente preso por mais de 20 minutos
   preenche `handoff-report.md` com `status: BLOCKED`. Não fica em loop.

7. **Mudança de escopo → fluxo formal.** Pausar agentes → atualizar SPEC → gerar ADR
   → avisar cliente → retomar. Nunca implementar mudança silenciosamente.

8. **Código em `scripts/`. Documentação em `references/`. Templates em `assets/`.**
   Sem exceção.

---

## Para Projetos em Andamento — Como Identificar Onde Está

Se você está abrindo um projeto que já existe, leia os arquivos abaixo
na ordem e responda: **qual é o próximo passo?**

```
1. Existe PROCESS.md?
   → Não → rode /project-kickoff primeiro
   → Sim → continue

2. Existe references/PRD.md?
   → Não → rode /consultor-prd
   → Sim, mas não aprovado → retome a aprovação com o cliente
   → Sim, aprovado → continue

3. Existe references/CONTRACTS.md?
   → Não → rode /SDD-avancado
   → Sim, mas incompleto (sem tipos, sem schemas) → retome a Fase 4 do SDD
   → Sim, completo → continue

4. Existe references/skills-manifest.md?
   → Não → rode o skill-scout
   → Sim → continue

5. Existe references/WAVE-PLAN.md?
   → Não → rode /cursor-team-protocol
   → Sim → continue

6. Existe CLAUDE.md completo (com fase atual e onda)?
   → Não/desatualizado → atualize antes de acionar qualquer agente
   → Sim → leia o daily-checkin-prompt e execute a próxima ação
```

---

## Estrutura de Pastas — Referência Rápida

```
projeto/
├── PROCESS.md              ← /project-kickoff
├── CLAUDE.md               ← /cursor-team-protocol (atualizado continuamente)
├── handoff-report.md       ← agentes escrevem, você lê
├── README.md               ← /project-kickoff
├── .gitignore              ← /project-kickoff
│
├── references/
│   ├── PRD.md              ← /consultor-prd
│   ├── SPEC.md             ← /SDD-avancado fase 3
│   ├── CONTRACTS.md        ← /SDD-avancado fase 4 ← CRÍTICO
│   ├── PLAN.md             ← /SDD-avancado fase 5
│   ├── TASKS.md            ← /SDD-avancado fase 7
│   ├── RULES.md            ← /SDD-avancado fase 6
│   ├── skills-manifest.md  ← skill-scout
│   ├── WAVE-PLAN.md        ← /cursor-team-protocol
│   ├── AGENT-BRIEFS/       ← /cursor-team-protocol
│   │   ├── orchestrator.md
│   │   ├── codex-dev.md
│   │   └── cursor-ops.md
│   └── adr/                ← /SDD-avancado + mudanças de escopo
│
├── scripts/                ← TODO o código vai aqui
└── assets/
    ├── daily-checkin-prompt.md    ← use todo dia
    ├── handoff-report-template.md
    └── pr-description-template.md
```

---

## Catálogo de Skills — Memória Institucional

**Localização:** `C:\Users\edusp\Projetos_App_Desktop\`

A cada projeto, o Skill Scout adiciona skills novas ao catálogo.
O próximo projeto herda essas skills e parte mais rápido.

**Skills já existentes no catálogo:**
- Skills de scraping com Apify (`apify-*`)
- Skills de documentação (`consultor_prd`, `SDD-avancado`)
- Skills de frontend (`frontend-design`, `canvas-design`)
- Skills de conteúdo e copy (`consultor_copy`, `consultor_site_que_converte`)
- Skills de integração (`claude-api`, `mcp-builder`)
- Skills meta (`skill-creator`, `multi-agent-handoff`)

**Skills a criar no primeiro projeto SaaS** (gaps atuais):
- `supabase-rls-patterns`
- `nextjs-auth-supabase`
- `stripe-billing`
- `vercel-deploy-ops`
- `zod-api-validation`

---

## Gates de Faturamento

| Marco | Gate | Faturar |
|-------|------|---------|
| 1 | PRD aprovado pelo cliente | Fase de discovery |
| 2 | SDD aprovado internamente | Fase de engenharia |
| 3 | Staging aprovado pelo cliente | Fase de desenvolvimento |
| 4 | Produção live | Entrega final |

Mudanças de escopo após o Marco 1 geram ADR com impacto em prazo e custo.

---

## Quanto Tempo Você Vai Gastar

| Atividade | Tempo |
|-----------|-------|
| Daily check-in | 2 min |
| Por task concluída (ler report + QA + merge) | ~4 min |
| Por bloqueio resolvido | ~3 min |
| Início de nova onda | ~5 min |
| Revisão de staging | 15–20 min |
| **Total diário (projeto médio)** | **~45 min** |

O resto: os agentes trabalham. Você cuida de outros projetos, do cliente,
ou desenvolve novas skills para o catálogo.

---

## Checklist de Início de Projeto (novo)

```
[ ] Abrir este documento no Claude Code (Painel 1)
[ ] Rodar /project-kickoff com nome e cliente
[ ] Mostrar PROCESS.md ao cliente
[ ] Cliente confirma → rodar /consultor-prd
[ ] PRD aprovado → rodar /SDD-avancado
[ ] SDD aprovado → rodar skill-scout no Painel 1
[ ] skills-manifest.md gerado → rodar /cursor-team-protocol
[ ] WAVE-PLAN.md revisado e aprovado
[ ] Abrir 3 painéis no Cursor
[ ] Colar prompt do orchestrator no Painel 1
[ ] Colar prompts de Onda 1 nos Painéis 2 e 3
[ ] Usar daily-checkin-prompt.md todo dia
```

## Checklist de Retomada de Projeto (em andamento)

```
[ ] Abrir este documento no Claude Code (Painel 1)
[ ] Executar o diagnóstico "Para Projetos em Andamento" acima
[ ] Identificar em qual fase o projeto está
[ ] Executar a skill/ação correspondente à próxima fase
[ ] Atualizar CLAUDE.md se estiver desatualizado
[ ] Colar daily-checkin-prompt.md e executar a próxima ação indicada
```

---

*Manual de Operação — Software House Autônoma*  
*Mantenha este arquivo atualizado conforme o processo evolui.*

# ADR-001 — Multi-LLM ProviderFactory com Tiers de Custo/Qualidade

> **Status:** Aceita
> **Data:** 2026-03-26
> **Decisores:** Eduardo (PM/Owner)

---

## Contexto

O **AdsClaw** e um agente de IA especializado em gestao de campanhas de midia paga (Meta Ads e Google Ads) para uma agencia de marketing de performance. O sistema opera via Telegram e interface Web, processando solicitacoes atraves de um loop cognitivo ReAct (`AgentLoop`) que atualmente usa exclusivamente o **Gemini 2.0 Flash** como LLM (instanciado diretamente via `@google/generative-ai`).

O problema central e que **diferentes tarefas do agente possuem requisitos drasticamente distintos de custo vs. qualidade**:

### Natureza das chamadas ao LLM no AdsClaw

| Caso de Uso | Volume Estimado | Requisito Principal | Exemplo Concreto |
|-------------|----------------|--------------------|--------------------|
| **Routing / Tool Calling** | ~90% das chamadas | Velocidade + custo infimo | Decidir se o usuario quer ver metricas, gerar copy ou conversar. Escolher qual tool chamar no loop ReAct. |
| **Analise de Dados / Diagnostico** | ~8% das chamadas | Raciocinio logico solido | Interpretar ROAS em queda, correlacionar CPA com fadiga criativa, sugerir realocacao de budget entre campanhas. |
| **Geracao de Copy Criativa** | ~2% das chamadas | Qualidade literaria em PT-BR, persuasao, criatividade | Gerar 3 variacoes de headline + body + CTA para um anuncio de Meta Ads, respeitando regras do cliente. |
| **Skill Routing** | Embutido no routing | Baixa latencia | Decidir qual persona/prompt especializado ativar (CreativeLab, Diagnostico, Chat casual). |

### Situacao atual (AgentLoop.ts)

Atualmente, o `AgentLoop` instancia o Gemini diretamente sem nenhuma camada de abstracao:

```typescript
// agent/src/core/AgentLoop.ts (estado atual)
private gemini: GoogleGenerativeAI | null = null;

constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
        this.gemini = new GoogleGenerativeAI(apiKey);
    }
}
```

Da mesma forma, o `CreativeLab` (em `agent/src/services/CreativeLab.ts`) instancia seu proprio Gemini diretamente para geracao de copy:

```typescript
// agent/src/services/CreativeLab.ts (estado atual)
private genAI: GoogleGenerativeAI;
constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');
}
```

Isso gera **tres problemas concretos**:

1. **Acoplamento direto:** Cada modulo instancia o SDK do Gemini por conta propria. Trocar de provedor exige alterar N arquivos.
2. **Custo subotimo:** Usar Gemini Flash para gerar copy criativa de alta qualidade entrega resultado mediocre. Usar um modelo premium para routing seria desperdicio financeiro.
3. **Sem fallback:** Se a API do Gemini cair, todo o sistema para. O proprio documento de arquitetura do SandeClaw (projeto irmao) ja identifica isso como risco e prescreve fallback via `ProviderFactory`.

### Precedente do SandeClaw

O projeto irmao **SandeClaw** ja define em sua arquitetura (`docs/outros/sandeclaw-specs/architecture.md`) o pattern `ProviderFactory` para instanciar diferentes provedores de LLM, e o `ILlmProvider` como interface obrigatoria de dependencia do AgentLoop (`docs/outros/sandeclaw-specs/agent-loop.md`). O AdsClaw, sendo um fork conceitual do SandeClaw adaptado para agencia, deve herdar e evoluir essa decisao arquitetural.

---

## Opcoes Avaliadas

### Opcao A: Mono-LLM (Gemini Flash para tudo)

**Descricao:** Manter a abordagem atual. Um unico provedor (Gemini 2.0 Flash) para todas as tarefas: routing, analise, geracao criativa, skill routing.

**Vantagens:**
- Simplicidade maxima: sem abstracoes, sem configuracao adicional.
- Apenas 1 API key para gerenciar.
- Sem complexidade de fallback/retry entre provedores.
- Latencia previsivel e uniforme.

**Desvantagens:**
- **Qualidade criativa insuficiente:** Gemini Flash e otimizado para velocidade, nao para escrita persuasiva em PT-BR. A copy gerada pelo `CreativeLab` fica generica e sem punch.
- **Raciocinio analitico limitado:** Para diagnosticos complexos (correlacionar multiplas metricas de campanha, identificar patterns de fadiga criativa), Flash frequentemente simplifica demais ou alucina relacoes causais.
- **Ponto unico de falha:** Se o Gemini cair (ja aconteceu em 2025 varias vezes), o AdsClaw inteiro para de funcionar.
- **Lock-in em provedor unico:** Impossibilita aproveitar modelos mais baratos (Groq) ou mais capazes (Claude Sonnet) conforme evoluem.
- **Custo nao e otimo nem no floor:** Para routing simples, provedores como Groq oferecem inferencia a custo praticamente zero com latencia ainda menor.

**Custo estimado mensal (1000 interacoes/dia):**
- ~$0.50-1.00/mes (tudo no Flash)

**Veredito:** Funciona para MVP, mas cria teto de qualidade rapidamente visivel na copy criativa e nos diagnosticos.

---

### Opcao B: Multi-LLM com ProviderFactory e Tiers (ESCOLHIDA)

**Descricao:** Criar uma interface abstrata `ILlmProvider` e uma `ProviderFactory` que instancia provedores por **tier de custo/qualidade**. Cada caso de uso do agente solicita um tier, e a Factory resolve qual provedor concreto usar.

**Tres Tiers definidos:**

| Tier | Nome | Uso Principal | % de Chamadas | Modelo(s) | Custo Estimado |
|------|------|--------------|---------------|-----------|----------------|
| 1 | `CHEAP` | Routing, tool calling, chat casual, skill routing | ~90% | Gemini 2.0 Flash / Groq Llama 3.3 | ~$0.01/1M tokens input |
| 2 | `BALANCED` | Analise de dados, diagnosticos de campanha, relatorios | ~8% | Gemini 2.5 Pro / DeepSeek V3 | ~$0.10/1M tokens input |
| 3 | `PREMIUM` | Copy criativa, decisoes estrategicas, briefings de criativo | ~2% | Claude Sonnet 4 / GPT-4o | ~$3.00/1M tokens input |

**Interface proposta:**

```typescript
// agent/src/llm/ILlmProvider.ts
export interface ILlmProvider {
    readonly name: string;
    chat(messages: ChatMessage[], options?: LlmOptions): Promise<LlmResponse>;
    chatWithTools(messages: ChatMessage[], tools: ToolDefinition[], options?: LlmOptions): Promise<LlmToolResponse>;
}

export type LlmTier = 'CHEAP' | 'BALANCED' | 'PREMIUM';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    toolCallId?: string;
}

export interface LlmResponse {
    content: string;
    usage?: { inputTokens: number; outputTokens: number };
    model: string;
}

export interface LlmToolResponse extends LlmResponse {
    toolCalls?: ToolCall[];
}
```

```typescript
// agent/src/llm/ProviderFactory.ts
export class ProviderFactory {
    private providers: Map<LlmTier, ILlmProvider> = new Map();
    private fallbacks: Map<LlmTier, ILlmProvider[]> = new Map();

    register(tier: LlmTier, provider: ILlmProvider, fallbacks?: ILlmProvider[]): void;
    get(tier: LlmTier): ILlmProvider;           // retorna provider primario
    getWithFallback(tier: LlmTier): ILlmProvider; // tenta primario, depois fallbacks
}
```

**Vantagens:**
- **Custo otimizado por caso de uso:** 90% das chamadas no tier mais barato, premium apenas quando a qualidade justifica.
- **Qualidade maxima onde importa:** Copy criativa com Claude Sonnet (reconhecidamente superior em escrita PT-BR) ou GPT-4o.
- **Resiliencia:** Fallback automatico entre provedores do mesmo tier. Gemini caiu? DeepSeek assume o tier BALANCED.
- **Desacoplamento:** `AgentLoop`, `CreativeLab` e qualquer novo modulo pedem um tier, nao um modelo especifico.
- **Extensibilidade:** Adicionar um novo provedor = implementar `ILlmProvider` + registrar na Factory. Zero mudanca nos consumidores.
- **Compatibilidade OpenAI:** DeepSeek e Groq usam API compativel com OpenAI. Um unico `OpenAICompatibleProvider` cobre ambos (e qualquer futuro provedor compativel).

**Desvantagens:**
- Complexidade adicional: mais arquivos, mais configuracao, mais testes.
- Gerenciamento de multiplas API keys (GEMINI_API_KEY, DEEPSEEK_API_KEY, GROQ_API_KEY, ANTHROPIC_API_KEY).
- Latencia variavel entre tiers (Flash ~200ms, Claude Sonnet ~2-4s).
- Necessidade de definir criterios claros de quando usar cada tier para evitar "tier creep" (tudo virando PREMIUM).

**Custo estimado mensal (1000 interacoes/dia):**
- Tier 1 (90%): ~$0.45/mes
- Tier 2 (8%): ~$0.40/mes
- Tier 3 (2%): ~$3.00/mes
- **Total: ~$3.85/mes** (vs. ~$0.75 mono-LLM, porem com qualidade dramaticamente superior na copy e diagnostico)

**Veredito:** Melhor relacao custo-beneficio. O custo adicional de ~$3/mes se paga no primeiro anuncio com copy superior que melhora CTR.

---

### Opcao C: Orquestrador Externo (LangChain / LlamaIndex)

**Descricao:** Adotar um framework de orquestracao de LLMs como LangChain.js ou LlamaIndex.TS para gerenciar o roteamento entre modelos, chains, e tool calling.

**Vantagens:**
- Ecossistema rico: chains pre-construidas, integracoes com vector stores, RAG nativo.
- Routing de LLM ja implementado (LangChain Router Chains).
- Comunidade grande, muitos exemplos.

**Desvantagens:**
- **Overhead absurdo para o escopo:** O AdsClaw nao precisa de RAG, vector stores, ou chains complexas. O pattern ReAct ja esta implementado no `AgentLoop`.
- **Dependencia pesada:** LangChain.js puxa centenas de dependencias. O `package.json` atual do AdsClaw e enxuto (~12 deps). LangChain dobraria isso.
- **Abstracao leaky:** LangChain e famoso por abstrair demais e dificultar debug. Quando a IA alucina no meio de uma chain, rastrear o erro e penoso.
- **Curva de aprendizado desnecessaria:** Eduardo ja domina o pattern Factory + Interface do SandeClaw. Reaprender LangChain nao agrega.
- **Vendor lock-in invertido:** Em vez de lock-in no provedor de LLM, cria lock-in no framework de orquestracao.
- **Performance:** Cada chamada passa por N camadas de abstracao do framework antes de chegar ao LLM. Para routing (que precisa ser ultra-rapido), isso e inaceitavel.

**Custo estimado mensal:**
- Mesmo custo de APIs que Opcao B, porem com custo de complexidade/manutencao muito maior.

**Veredito:** Over-engineering. Resolve problemas que o AdsClaw nao tem e cria problemas que nao precisava ter.

---

## Decisao

**Adotamos a Opcao B: Multi-LLM com ProviderFactory e Tiers de custo/qualidade.**

A implementacao seguira o pattern ja comprovado no SandeClaw (`ProviderFactory` + `ILlmProvider`), adaptado para as necessidades especificas do AdsClaw com sistema de tiers.

### Arquitetura de Implementacao

```
agent/src/llm/
  ILlmProvider.ts          # Interface abstrata
  ProviderFactory.ts        # Factory com tiers + fallback
  providers/
    GeminiProvider.ts       # Wraps @google/generative-ai (Flash + Pro)
    OpenAICompatibleProvider.ts  # Cobre DeepSeek, Groq, e qualquer API OpenAI-compat
    AnthropicProvider.ts    # Claude Sonnet via SDK @anthropic-ai/sdk
  types.ts                  # ChatMessage, LlmResponse, LlmTier, etc.
  config.ts                 # Mapeamento tier -> provider via .env
```

### Mapeamento de Tiers por Caso de Uso no Codebase

| Modulo | Metodo | Tier | Justificativa |
|--------|--------|------|---------------|
| `AgentLoop.run()` | Iteracoes ReAct (Thought/Action) | `CHEAP` | Alto volume, precisa ser rapido e barato. Gemini Flash e ideal. |
| `AgentLoop.run()` | Resposta final sintetizada | `CHEAP` | A sintese final e rapida, nao precisa de modelo premium. |
| `CreativeLab.analyzeAndGenerate()` | Geracao de copy/headline/CTA | `PREMIUM` | Qualidade criativa e o diferencial. Claude Sonnet e GPT-4o escrevem copy PT-BR muito superior ao Flash. |
| `CreativeLab.fetchBenchmarks()` | Analise de benchmarks coletados | `BALANCED` | Precisa de bom raciocinio para desconstruir estrategias de concorrentes, mas nao precisa de prosa criativa. |
| `Orchestrator.auditClients()` | Diagnostico de fadiga criativa | `BALANCED` | Precisa correlacionar metricas (CPA subindo + dias ativos + ROAS caindo). Raciocinio medio-alto. |
| `ToolRegistry` / Skill Router | Decidir qual skill/persona ativar | `CHEAP` | Classificacao simples de intent. Flash faz isso perfeitamente. |
| Futuro: Relatorios semanais | Narrativa analitica para o gestor | `BALANCED` | Precisa de boa escrita, mas nao e copy de anuncio. DeepSeek V3 ou Gemini Pro bastam. |

### Rollout em Fases

O rollout sera incremental para minimizar risco e permitir validacao a cada etapa:

**Fase MVP (Semana 1-2): Interface pronta, apenas Gemini Flash**

```typescript
// Apenas GeminiProvider implementado
factory.register('CHEAP', new GeminiProvider('gemini-2.0-flash'));
factory.register('BALANCED', new GeminiProvider('gemini-2.0-flash')); // temporario
factory.register('PREMIUM', new GeminiProvider('gemini-2.0-flash'));  // temporario
```

- Implementar `ILlmProvider`, `ProviderFactory`, `GeminiProvider`.
- Refatorar `AgentLoop` para usar `factory.get('CHEAP')` em vez de instanciar Gemini diretamente.
- Refatorar `CreativeLab` para usar `factory.get('PREMIUM')` (que por ora resolve para Flash).
- **Criterio de aceite:** Comportamento identico ao atual, mas com a abstracao pronta.

**Fase v1.1 (Semana 3-4): DeepSeek + Groq**

```typescript
factory.register('CHEAP', new OpenAICompatibleProvider('groq', 'llama-3.3-70b'));
factory.register('BALANCED', new OpenAICompatibleProvider('deepseek', 'deepseek-chat'));
factory.register('PREMIUM', new GeminiProvider('gemini-2.0-flash')); // ainda temporario

// Fallbacks
factory.registerFallback('CHEAP', new GeminiProvider('gemini-2.0-flash'));
factory.registerFallback('BALANCED', new GeminiProvider('gemini-2.5-pro'));
```

- Implementar `OpenAICompatibleProvider` (1 classe cobre DeepSeek e Groq, pois ambos sao API-compat com OpenAI).
- Adicionar `GROQ_API_KEY` e `DEEPSEEK_API_KEY` ao `.env`.
- Configurar fallback chains: se Groq cair, Flash assume; se DeepSeek cair, Gemini Pro assume.
- **Criterio de aceite:** Routing via Groq (latencia < 100ms), diagnosticos via DeepSeek, fallback funcional.

**Fase v1.2 (Semana 5-6): Claude Sonnet no Creative Lab**

```typescript
factory.register('PREMIUM', new AnthropicProvider('claude-sonnet-4-20250514'));
factory.registerFallback('PREMIUM', new OpenAICompatibleProvider('openai', 'gpt-4o'));
factory.registerFallback('PREMIUM', new GeminiProvider('gemini-2.5-pro'));
```

- Implementar `AnthropicProvider` usando `@anthropic-ai/sdk`.
- Adicionar `ANTHROPIC_API_KEY` ao `.env`.
- Validar qualidade da copy gerada: teste A/B informal comparando copies Flash vs. Sonnet.
- **Criterio de aceite:** Copy criativa PT-BR notavelmente superior (avaliacao subjetiva do Eduardo + metricas de CTR quando em producao).

### Configuracao via .env

```env
# Tier 1 - CHEAP (Routing/Tool Calling)
LLM_CHEAP_PROVIDER=gemini
LLM_CHEAP_MODEL=gemini-2.0-flash

# Tier 2 - BALANCED (Analise/Diagnostico)
LLM_BALANCED_PROVIDER=deepseek
LLM_BALANCED_MODEL=deepseek-chat

# Tier 3 - PREMIUM (Copy Criativa)
LLM_PREMIUM_PROVIDER=anthropic
LLM_PREMIUM_MODEL=claude-sonnet-4-20250514

# API Keys
GEMINI_API_KEY=...
DEEPSEEK_API_KEY=...
GROQ_API_KEY=...
ANTHROPIC_API_KEY=...
```

### OpenAICompatibleProvider: Uma classe, multiplos provedores

O insight chave e que DeepSeek, Groq, Together AI, Fireworks, e dezenas de outros provedores usam a mesma API compativel com OpenAI. Portanto, um unico `OpenAICompatibleProvider` parametrizado por `baseURL` cobre todos eles:

```typescript
export class OpenAICompatibleProvider implements ILlmProvider {
    private client: OpenAI;
    readonly name: string;

    constructor(providerName: string, model: string, baseUrl: string, apiKey: string) {
        this.name = `${providerName}/${model}`;
        this.client = new OpenAI({ baseURL: baseUrl, apiKey });
    }
    // ... implementa chat() e chatWithTools() usando client.chat.completions.create()
}

// Uso:
new OpenAICompatibleProvider('deepseek', 'deepseek-chat', 'https://api.deepseek.com/v1', key);
new OpenAICompatibleProvider('groq', 'llama-3.3-70b-versatile', 'https://api.groq.com/openai/v1', key);
new OpenAICompatibleProvider('openai', 'gpt-4o', 'https://api.openai.com/v1', key);
```

---

## Consequencias

### Positivas

1. **Otimizacao de custo drastica:** 90% das chamadas no tier mais barato ($0.01/1M tokens) mantem o custo operacional negligenciavel, enquanto os 2% de chamadas premium garantem qualidade maxima onde importa (copy de anuncio).

2. **Qualidade criativa superior:** Claude Sonnet e GPT-4o produzem textos persuasivos em PT-BR significativamente melhores que Gemini Flash. Para uma agencia de marketing, a qualidade da copy e diretamente conversivel em CTR e ROAS para os clientes.

3. **Resiliencia operacional:** Com fallback chains configurados, a queda de um provedor nao derruba o agente. O `ProviderFactory` automaticamente redireciona para o proximo provedor do tier. Isso e critico para um sistema que precisa operar 24/7 monitorando campanhas.

4. **Desacoplamento arquitetural limpo:** Modulos como `AgentLoop`, `CreativeLab`, `Orchestrator` e futuros modulos pedem um tier semantico ("preciso de qualidade PREMIUM"), nao um modelo especifico. Trocar Claude por GPT-5 amanha e uma mudanca de 1 linha no `.env`.

5. **Extensibilidade para novos provedores:** Qualquer novo provedor OpenAI-compatible (Mistral, Cohere, etc.) e adicionado em minutos: instanciar `OpenAICompatibleProvider` com nova `baseURL`. Zero codigo novo.

6. **Precedente validado:** O SandeClaw ja usa esse pattern com sucesso. O AdsClaw herda uma decisao arquitetural comprovada, nao experimental.

7. **Facilita experimentacao:** Testar um novo modelo e trivial: registrar no tier, rodar por 1 dia, comparar resultados. Sem refatorar nada.

### Negativas

1. **Complexidade adicional:** De 0 arquivos na camada LLM para ~6 arquivos (`ILlmProvider`, `ProviderFactory`, 3 providers, `types`, `config`). Mais codigo para manter.

2. **Multiplas API keys:** De 1 key (`GEMINI_API_KEY`) para 4 keys. Mais segredos para gerenciar, mais pontos de configuracao que podem dar errado.

3. **Latencia heterogenea:** Tier CHEAP (~100-200ms) vs. Tier PREMIUM (~2-4s). O `CreativeLab` ficara notavelmente mais lento quando migrar para Claude Sonnet. Isso e aceitavel pois geracao de copy nao e interativa em tempo real.

4. **Custo mensal ligeiramente maior:** De ~$0.75/mes (tudo Flash) para ~$3.85/mes (multi-tier). Aumento de ~5x, porem ainda insignificante em termos absolutos.

5. **Complexidade de debug:** Quando algo falha, precisa identificar qual provedor de qual tier falhou. Mitigacao: logging estruturado com `[ProviderFactory][TIER][provider-name]` em cada chamada.

### Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| **API key de um tier expira/invalida sem perceber** | Media | Alto (tier inteiro falha) | Health check periodico no `Orchestrator` que testa cada provedor a cada 6h. Fallback automatico para proximo provider do tier. |
| **Tier creep:** Desenvolvedores (ou o proprio Eduardo) comecam a usar `PREMIUM` para tudo | Media | Medio (custo sobe) | Documentar criterios claros por tier nesta ADR. Logging de uso por tier no console. Alerta se PREMIUM > 5% das chamadas. |
| **DeepSeek ou Groq descontinuam free tier ou mudam pricing** | Baixa | Baixo (fallback para Gemini) | Fallback chain garante continuidade. Monitorar changelogs dos provedores. |
| **Inconsistencia de output entre provedores do mesmo tier** | Media | Medio | Padronizar system prompts para funcionar com qualquer LLM. Evitar depender de features exclusivas de um provedor (ex: Gemini-specific JSON mode). |
| **Rate limiting em provedores gratuitos (Groq)** | Alta | Baixo | Groq tem rate limit generoso (30 RPM no free). Para o volume do AdsClaw (~1000 interacoes/dia, nao simultaneas), e mais que suficiente. Fallback para Flash se exceder. |
| **Complexidade prematura se o MVP nunca sair do Tier 1** | Baixa | Baixo | O rollout em fases garante que a interface fica pronta sem custo operacional: Fase MVP usa Flash em todos os tiers. Overhead de codigo e minimo (~200 linhas no total). |

---

## Referencias

### Internas ao Projeto

- `docs/outros/sandeclaw-specs/architecture.md` -- Secao 2.7 (Design Patterns: Factory, ProviderFactory) e Secao 2.10 (Riscos: fallback no ProviderFactory)
- `docs/outros/sandeclaw-specs/agent-loop.md` -- Secao 10 (Dependencias: ILlmProvider como dependencia obrigatoria do AgentLoop)
- `docs/outros/sandeclaw-specs/PRD.md` -- RF-03 (Alternar LLMs via ProviderFactory) e Secao 10 (Fallback no ProviderFactory)
- `agent/src/core/AgentLoop.ts` -- Implementacao atual com Gemini hardcoded (a ser refatorada)
- `agent/src/services/CreativeLab.ts` -- Instanciacao direta de Gemini para copy (a ser refatorada)
- `agent/src/core/Orchestrator.ts` -- Consumer futuro do tier BALANCED para diagnosticos

### Externas

- [Google Gemini API Pricing](https://ai.google.dev/pricing) -- Gemini 2.0 Flash: $0.01/1M input tokens
- [DeepSeek API Pricing](https://platform.deepseek.com/api-docs/pricing/) -- DeepSeek V3: $0.14/1M input tokens (cache hit: $0.014)
- [Groq API Pricing](https://groq.com/pricing/) -- Llama 3.3 70B: $0.59/1M input tokens (com free tier generoso)
- [Anthropic API Pricing](https://www.anthropic.com/pricing) -- Claude Sonnet 4: $3.00/1M input tokens
- [OpenAI API Pricing](https://openai.com/api/pricing/) -- GPT-4o: $2.50/1M input tokens
- Factory Pattern (GoF) -- Gamma, Helm, Johnson, Vlissides. "Design Patterns: Elements of Reusable Object-Oriented Software", 1994
- Strategy Pattern (GoF) -- Usado implicitamente: cada provider e uma Strategy de inferencia intercambiavel pela Factory

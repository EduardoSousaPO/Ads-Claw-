# Spec Técnica: AgentLoop
> Módulo: `agent/src/core/AgentLoop.ts`
> Requisitos: RF-002, RF-003, RF-004
> Contratos: CONTRACTS.md §AgentLoop, §SkillRouter
> Versão: 1.0 — 2026-03-26

---

## Responsabilidade

O `AgentLoop` é o núcleo do agente de IA. Ele implementa o padrão **ReAct (Reasoning and Acting)**: recebe uma mensagem do usuário (via Telegram ou API), executa um loop de Thought → Action → Observation até produzir uma resposta final, e retorna o resultado.

---

## Padrão ReAct

```
INPUT: { clientId, message, history }
  │
  ▼
[SkillRouter] → seleciona persona (systemInstruction)
  │
  ▼
┌─────────────────────────────────────────┐
│  REACT LOOP (máximo MAX_ITERATIONS = 5) │
│                                         │
│  1. THOUGHT: LLM raciocina sobre estado │
│  2. ACTION: LLM chama tool (opcional)   │
│  3. OBSERVATION: resultado da tool      │
│  4. Se FinalAnswer → sair do loop       │
│  5. Se MAX_ITERATIONS → forçar resposta │
└─────────────────────────────────────────┘
  │
  ▼
OUTPUT: AgentResponse { text, assets?, approvalRequired? }
```

---

## Interface Pública

```typescript
// agent/src/core/AgentLoop.ts

interface AgentLoopConfig {
  maxIterations?: number;      // default: 5
  timeoutMs?: number;          // default: 25_000 (25s)
}

interface AgentInput {
  clientId: string;            // UUID do cliente
  chatId: number;              // Telegram chat_id (para logs)
  message: string;             // mensagem processada (texto)
  history: ConversationTurn[]; // histórico do MemoryManager
}

interface AgentResponse {
  text: string;                // resposta final em texto
  assets?: Asset[];            // imagens/vídeos gerados (se houver)
  approvalRequired?: ApprovalRequest; // se agente pediu aprovação humana
  iterationsUsed: number;      // para monitoramento de custo
  tokensUsed: number;          // para log de custo
  providerUsed: string;        // ex: "gemini-2.0-flash"
}

class AgentLoop {
  constructor(
    private toolRegistry: ToolRegistry,
    private providerFactory: ProviderFactory,
    private skillRouter: SkillRouter,
    private memoryManager: MemoryManager,
    private config: AgentLoopConfig = {}
  ) {}

  async run(input: AgentInput): Promise<AgentResponse>;
}
```

---

## Implementação do Loop

```typescript
async run(input: AgentInput): Promise<AgentResponse> {
  const { clientId, message, history } = input;
  const MAX_ITERATIONS = this.config.maxIterations ?? 5;

  // 1. Selecionar persona via SkillRouter (chamada LLM leve)
  const systemInstruction = await this.skillRouter.selectPersona({
    clientId,
    message,
    history
  });

  // 2. Obter provider e tool declarations
  const provider = await this.providerFactory.forClient(clientId, 'tier1');
  const toolDeclarations = this.toolRegistry.getDeclarations();

  // 3. Construir messages array (history + nova mensagem)
  const messages = this.buildMessages(history, message);

  let iterationsUsed = 0;
  let totalTokens = 0;

  // 4. ReAct Loop
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterationsUsed++;

    const response = await provider.generateWithTools({
      systemInstruction,
      messages,
      tools: toolDeclarations,
      timeoutMs: this.config.timeoutMs ?? 25_000
    });

    totalTokens += response.tokensUsed;

    // 5. Se FinalAnswer (sem tool call) → retornar
    if (!response.toolCall) {
      await this.memoryManager.saveExchange(clientId, message, response.text);
      return {
        text: response.text,
        assets: response.assets,
        approvalRequired: response.approvalRequired,
        iterationsUsed,
        tokensUsed: totalTokens,
        providerUsed: provider.modelId
      };
    }

    // 6. Executar tool
    const toolResult = await this.toolRegistry.execute(
      response.toolCall.name,
      response.toolCall.args,
      { clientId }
    );

    // 7. Adicionar tool call + resultado ao messages array
    messages.push(
      { role: 'model', content: response.toolCall }, // function call
      { role: 'function', content: toolResult }       // observation
    );

    // Log para rastreabilidade
    logger.info({
      clientId,
      iteration: i + 1,
      tool: response.toolCall.name,
      success: toolResult.success
    });
  }

  // 8. MAX_ITERATIONS atingido — forçar resposta final
  const fallbackResponse = await provider.generateContent({
    systemInstruction,
    messages: [...messages, {
      role: 'user',
      content: 'Baseado no que você analisou até agora, forneça a melhor resposta possível.'
    }]
  });

  await this.memoryManager.saveExchange(clientId, message, fallbackResponse.text);

  return {
    text: fallbackResponse.text,
    iterationsUsed,
    tokensUsed: totalTokens + fallbackResponse.tokensUsed,
    providerUsed: provider.modelId
  };
}
```

---

## SkillRouter

O `SkillRouter` faz uma chamada LLM **leve** (Gemini Flash) para classificar o intent da mensagem e retornar o `systemInstruction` correto.

```typescript
// agent/src/core/SkillRouter.ts

type Persona = 'ads-manager' | 'creative-director' | 'performance-analyst';

interface SkillRouterResult {
  persona: Persona;
  systemInstruction: string;
  confidence: number; // 0-1
}

class SkillRouter {
  async selectPersona(context: {
    clientId: string;
    message: string;
    history: ConversationTurn[];
  }): Promise<string>;  // retorna systemInstruction
}
```

### Personas Definidas

| Persona | Quando ativar | System instruction foco |
|---------|--------------|-------------------------|
| `ads-manager` | Perguntas sobre campanhas, orçamento, performance geral | Análise de dados, recomendações estratégicas |
| `creative-director` | Pedidos de copy, criativo, imagem, vídeo | Criatividade, copywriting, briefing de arte |
| `performance-analyst` | Análise detalhada de métricas, comparativos, relatórios | Métricas, benchmarks, análise estatística |

**Regra**: Skills são injetadas como `systemInstruction` — NUNCA como `functionDeclarations`.

---

## Erros e Edge Cases

| Situação | Comportamento |
|----------|--------------|
| Tool retorna `success: false` | Adiciona erro como observação, continua loop |
| Provider timeout (>25s) | Lança `AgentTimeoutError`, retorna mensagem de erro amigável |
| MAX_ITERATIONS atingido | Usa mensagens acumuladas para forçar resposta final |
| Provider indisponível | ProviderFactory faz fallback para Gemini Flash |
| `clientId` não encontrado | Lança `ClientNotFoundError` antes do loop |

---

## Testes

```typescript
describe('AgentLoop', () => {
  it('should complete in one iteration when no tools needed')
  it('should call tool and continue when tool call received')
  it('should stop at MAX_ITERATIONS and return fallback response')
  it('should persist conversation to memory after response')
  it('should inject correct persona from SkillRouter')
  it('should log iterations and token usage')
  it('should handle tool error gracefully (continue loop)')
  it('should throw ClientNotFoundError for unknown clientId')
})
```

---

## Dependências

| Módulo | Como usa |
|--------|---------|
| `ProviderFactory` | Para obter provider LLM configurado por cliente |
| `ToolRegistry` | Para `getDeclarations()` e `execute()` |
| `SkillRouter` | Para selecionar `systemInstruction` |
| `MemoryManager` | Para recuperar e salvar histórico |

---

## Arquivo de Referência (código existente com drift)

- `agent/src/core/AgentLoop.ts` — **DEVE SER REESCRITO** (T-031)
  - Problema atual: usa `generateContent(enrichedPrompt)` com skills como texto injetado
  - Correto conforme esta spec: `generateWithTools(messages, functionDeclarations)`

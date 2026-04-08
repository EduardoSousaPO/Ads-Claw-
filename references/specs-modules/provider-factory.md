# Spec Técnica: ProviderFactory e Multi-LLM
> Módulo: `agent/src/providers/`
> Requisitos: RF-015, RF-020
> Contratos: CONTRACTS.md §ProviderFactory
> ADR: ADR-001
> Versão: 1.0 — 2026-03-26

---

## Responsabilidade

O `ProviderFactory` é a camada de abstração para todas as chamadas LLM do agente. Ele:
1. Expõe uma interface única `ILlmProvider` independente de SDK
2. Seleciona o provider correto por tier e configuração do cliente
3. Loga custo estimado de cada chamada
4. Faz fallback para Gemini Flash quando o provider configurado está indisponível

---

## Interface `ILlmProvider`

```typescript
// shared/types/llm.ts

export type LlmTier = 'tier1' | 'tier2' | 'tier3';

export interface LlmMessage {
  role: 'user' | 'model' | 'system' | 'function';
  content: string | FunctionCall | FunctionResult;
}

export interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface FunctionResult {
  name: string;
  result: unknown;
}

export interface GenerateWithToolsRequest {
  systemInstruction: string;
  messages: LlmMessage[];
  tools: FunctionDeclaration[];
  timeoutMs?: number;
}

export interface GenerateContentRequest {
  systemInstruction: string;
  messages: LlmMessage[];
  timeoutMs?: number;
}

export interface LlmResponse {
  text: string;
  toolCall?: FunctionCall;      // presente se LLM quer chamar uma tool
  tokensUsed: number;
  costEstimateUsd: number;
  assets?: Asset[];
  approvalRequired?: ApprovalRequest;
}

export interface ILlmProvider {
  readonly modelId: string;
  readonly tier: LlmTier;

  generateWithTools(request: GenerateWithToolsRequest): Promise<LlmResponse>;
  generateContent(request: GenerateContentRequest): Promise<LlmResponse>;
  transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string>;
  countTokens(text: string): Promise<number>;
}
```

---

## ProviderFactory

```typescript
// agent/src/providers/ProviderFactory.ts

export type ProviderName = 'gemini' | 'deepseek' | 'groq' | 'claude' | 'openai';

export interface ProviderConfig {
  name: ProviderName;
  tier: LlmTier;
  modelId: string;
  apiKey: string;
  baseUrl?: string;  // para providers OpenAI-compatible
}

const DEFAULT_PROVIDERS: Record<LlmTier, ProviderConfig> = {
  tier1: {
    name: 'gemini',
    tier: 'tier1',
    modelId: 'gemini-2.0-flash',
    apiKey: process.env.GEMINI_API_KEY!
  },
  tier2: {
    name: 'gemini',
    tier: 'tier2',
    modelId: 'gemini-2.0-pro',
    apiKey: process.env.GEMINI_API_KEY!
  },
  tier3: {
    name: 'claude',
    tier: 'tier3',
    modelId: 'claude-sonnet-4-6',
    apiKey: process.env.ANTHROPIC_API_KEY!
  }
};

class ProviderFactory {
  private cache: Map<string, ILlmProvider> = new Map();

  async forClient(clientId: string, tier: LlmTier): Promise<ILlmProvider> {
    // 1. Verificar configuração do cliente
    const clientConfig = await this.getClientProviderConfig(clientId, tier);

    // 2. Usar config do cliente ou default
    const config = clientConfig ?? DEFAULT_PROVIDERS[tier];

    // 3. Cache por modelo (evitar instanciar múltiplos)
    const cacheKey = `${config.name}:${config.modelId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 4. Instanciar provider
    const provider = this.createProvider(config);
    this.cache.set(cacheKey, provider);
    return provider;
  }

  private createProvider(config: ProviderConfig): ILlmProvider {
    switch (config.name) {
      case 'gemini':
        return new GeminiProvider(config);
      case 'deepseek':
      case 'groq':
      case 'openai':
        return new OpenAICompatibleProvider(config);  // mesmo adapter
      case 'claude':
        return new ClaudeProvider(config);
      default:
        throw new Error(`Unknown provider: ${config.name}`);
    }
  }
}
```

---

## GeminiProvider

```typescript
// agent/src/providers/GeminiProvider.ts
import { GoogleGenerativeAI, FunctionDeclaration } from '@google/generative-ai';

class GeminiProvider implements ILlmProvider {
  readonly modelId: string;
  readonly tier: LlmTier;
  private client: GoogleGenerativeAI;

  constructor(config: ProviderConfig) {
    this.modelId = config.modelId;
    this.tier = config.tier;
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async generateWithTools(request: GenerateWithToolsRequest): Promise<LlmResponse> {
    const model = this.client.getGenerativeModel({
      model: this.modelId,
      systemInstruction: request.systemInstruction,
      tools: [{ functionDeclarations: request.tools }]
    });

    const chat = model.startChat({
      history: this.toGeminiHistory(request.messages.slice(0, -1))
    });

    const lastMessage = request.messages[request.messages.length - 1];
    const result = await chat.sendMessage(
      typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content)
    );

    const response = result.response;
    const functionCall = response.functionCalls()?.[0];

    // Log de custo
    const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0;
    await this.logCost(tokensUsed);

    return {
      text: response.text(),
      toolCall: functionCall ? {
        name: functionCall.name,
        args: functionCall.args as Record<string, unknown>
      } : undefined,
      tokensUsed,
      costEstimateUsd: this.estimateCost(tokensUsed)
    };
  }

  private estimateCost(tokens: number): number {
    // Gemini Flash: $0.075/1M tokens input, $0.30/1M output
    // Estimativa conservadora usando preço de output
    return (tokens / 1_000_000) * 0.30;
  }
}
```

---

## OpenAICompatibleProvider (DeepSeek + Groq)

```typescript
// agent/src/providers/OpenAICompatibleProvider.ts
// Um único adapter para DeepSeek, Groq e OpenAI (mesma API)

import OpenAI from 'openai';

class OpenAICompatibleProvider implements ILlmProvider {
  readonly modelId: string;
  readonly tier: LlmTier;
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    this.modelId = config.modelId;
    this.tier = config.tier;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl  // ex: 'https://api.deepseek.com' ou 'https://api.groq.com/openai/v1'
    });
  }

  async generateWithTools(request: GenerateWithToolsRequest): Promise<LlmResponse> {
    const messages = this.toOpenAIMessages(request.messages, request.systemInstruction);
    const tools = this.toOpenAITools(request.tools);

    const completion = await this.client.chat.completions.create({
      model: this.modelId,
      messages,
      tools,
      tool_choice: 'auto'
    });

    const choice = completion.choices[0];
    const toolCall = choice.message.tool_calls?.[0];
    const tokensUsed = completion.usage?.total_tokens ?? 0;

    return {
      text: choice.message.content ?? '',
      toolCall: toolCall ? {
        name: toolCall.function.name,
        args: JSON.parse(toolCall.function.arguments)
      } : undefined,
      tokensUsed,
      costEstimateUsd: 0  // custo varia muito por provider, logar 0 e recalcular depois
    };
  }
}
```

---

## Configuração de Provider por Cliente

Em `client_rules`, o campo `llm_provider` pode sobrescrever o provider padrão:

```json
{
  "client_id": "uuid",
  "llm_provider": {
    "tier1": { "name": "groq", "modelId": "llama-3.1-70b-versatile" },
    "tier2": { "name": "deepseek", "modelId": "deepseek-chat" }
  }
}
```

---

## Log de Custo (RF-020)

```typescript
async function logCost(
  clientId: string,
  provider: string,
  modelId: string,
  tokensUsed: number,
  costUsd: number
): Promise<void> {
  await supabase.from('llm_cost_log').insert({
    client_id: clientId,
    provider,
    model_id: modelId,
    tokens_used: tokensUsed,
    cost_usd: costUsd,
    brl_rate: await getUsdBrlRate()  // cache diário do câmbio
  });
}
```

---

## Testes

```typescript
describe('ProviderFactory', () => {
  it('should return GeminiProvider for default tier1')
  it('should return OpenAICompatibleProvider for deepseek')
  it('should respect client_rules.llm_provider override')
  it('should cache provider instances by model')
  it('should fallback to Gemini if configured provider throws')
})

describe('GeminiProvider', () => {
  it('should call generateContent and return text')
  it('should detect function call in response')
  it('should log token usage')
  it('should timeout after configured ms')
})

describe('OpenAICompatibleProvider', () => {
  it('should work with DeepSeek base URL')
  it('should work with Groq base URL')
  it('should convert functionDeclarations to OpenAI tool format')
})
```

// agent/src/providers/ILlmProvider.ts
// Interface central de abstração LLM do AdsClaw
// Referência: references/specs-modules/provider-factory.md
// Regra: nenhum módulo de negócio importa SDK de LLM diretamente (RULES.md §3)

export type LlmTier = 'tier1' | 'tier2' | 'tier3';

export type ProviderName = 'gemini' | 'deepseek' | 'groq' | 'claude' | 'openai';

export interface LlmMessage {
  role: 'user' | 'model' | 'function';
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

// FunctionDeclaration compatível com Gemini SDK (reexportado para evitar import direto)
export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface GenerateWithToolsRequest {
  systemInstruction: string;
  messages: LlmMessage[];
  tools: ToolDeclaration[];
  timeoutMs?: number;
}

export interface GenerateContentRequest {
  systemInstruction: string;
  messages: LlmMessage[];
  timeoutMs?: number;
}

export interface LlmResponse {
  text: string;
  toolCall?: FunctionCall; // presente quando LLM quer chamar uma tool
  tokensUsed: number;
  costEstimateUsd: number;
}

export interface ProviderConfig {
  name: ProviderName;
  tier: LlmTier;
  modelId: string;
  apiKey: string;
  baseUrl?: string; // para providers OpenAI-compatible
}

export interface ILlmProvider {
  readonly modelId: string;
  readonly tier: LlmTier;
  readonly providerName: ProviderName;

  generateWithTools(request: GenerateWithToolsRequest): Promise<LlmResponse>;
  generateContent(request: GenerateContentRequest): Promise<LlmResponse>;
  countTokens(text: string): Promise<number>;
}

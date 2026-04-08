// agent/src/providers/GeminiProvider.ts
// Implementação do ILlmProvider para Google Gemini (Tier 1 e Tier 2)
// Referência: references/specs-modules/provider-factory.md §GeminiProvider
// ADR: references/adr/ADR-001-multi-llm-provider-factory.md

import {
  GoogleGenerativeAI,
  type Content,
  type FunctionDeclaration as GeminiFunctionDeclaration,
  type GenerateContentResult,
} from '@google/generative-ai';
import type {
  ILlmProvider,
  LlmTier,
  ProviderName,
  ProviderConfig,
  GenerateWithToolsRequest,
  GenerateContentRequest,
  LlmResponse,
  LlmMessage,
  ToolDeclaration,
} from './ILlmProvider';

export class GeminiProvider implements ILlmProvider {
  readonly modelId: string;
  readonly tier: LlmTier;
  readonly providerName: ProviderName = 'gemini';

  private readonly client: GoogleGenerativeAI;

  // Preços aproximados por 1M tokens (output) para estimativa de custo
  private static readonly COST_PER_MILLION_TOKENS: Record<string, number> = {
    'gemini-2.5-flash': 0.3,
    'gemini-2.5-pro': 2.5,
    'gemini-1.5-flash': 0.075,
    'gemini-1.5-pro': 3.5,
  };

  constructor(config: ProviderConfig) {
    this.modelId = config.modelId;
    this.tier = config.tier;
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async generateWithTools(request: GenerateWithToolsRequest): Promise<LlmResponse> {
    const model = this.client.getGenerativeModel({
      model: this.modelId,
      systemInstruction: request.systemInstruction,
      tools: [{ functionDeclarations: this.toGeminiFunctionDeclarations(request.tools) }],
    });

    const history = this.toGeminiHistory(request.messages.slice(0, -1));
    const chat = model.startChat({ history });

    const lastMessage = request.messages[request.messages.length - 1];
    const lastContent =
      typeof lastMessage?.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage?.content ?? '');

    const result: GenerateContentResult = await Promise.race([
      chat.sendMessage(lastContent),
      this.timeoutPromise<GenerateContentResult>(request.timeoutMs ?? 25_000),
    ]);

    const response = result.response;
    const functionCalls = response.functionCalls();
    const firstCall = functionCalls?.[0];

    const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0;
    const costEstimateUsd = this.estimateCost(tokensUsed);

    const base: LlmResponse = {
      text: response.text(),
      tokensUsed,
      costEstimateUsd,
    };

    if (firstCall) {
      return {
        ...base,
        toolCall: { name: firstCall.name, args: firstCall.args as Record<string, unknown> },
      };
    }
    return base;
  }

  async generateContent(request: GenerateContentRequest): Promise<LlmResponse> {
    const model = this.client.getGenerativeModel({
      model: this.modelId,
      systemInstruction: request.systemInstruction,
    });

    const history = this.toGeminiHistory(request.messages.slice(0, -1));
    const chat = model.startChat({ history });

    const lastMessage = request.messages[request.messages.length - 1];
    const lastContent =
      typeof lastMessage?.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage?.content ?? '');

    const result = await Promise.race([
      chat.sendMessage(lastContent),
      this.timeoutPromise<GenerateContentResult>(request.timeoutMs ?? 25_000),
    ]);

    const response = result.response;
    const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0;

    return {
      text: response.text(),
      tokensUsed,
      costEstimateUsd: this.estimateCost(tokensUsed),
    };
  }

  async countTokens(text: string): Promise<number> {
    const model = this.client.getGenerativeModel({ model: this.modelId });
    const result = await model.countTokens(text);
    return result.totalTokens;
  }

  // --- Helpers privados ---

  private toGeminiHistory(messages: LlmMessage[]): Content[] {
    return messages.map((msg) => ({
      role: GeminiProvider.mapRole(msg.role),
      parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }],
    }));
  }

  /** Gemini chat history só aceita 'user' | 'model'. */
  private static mapRole(role: LlmMessage['role']): 'user' | 'model' {
    if (role === 'model') return 'model';
    return 'user';
  }

  private toGeminiFunctionDeclarations(tools: ToolDeclaration[]): GeminiFunctionDeclaration[] {
    return tools.map(
      (tool) =>
        ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        }) as GeminiFunctionDeclaration,
    );
  }

  private estimateCost(tokens: number): number {
    const rate = GeminiProvider.COST_PER_MILLION_TOKENS[this.modelId] ?? 0.3;
    return (tokens / 1_000_000) * rate;
  }

  private timeoutPromise<T>(ms: number): Promise<T> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`LLM timeout após ${ms}ms`)), ms),
    );
  }
}

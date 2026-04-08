// agent/src/providers/OpenAICompatibleProvider.ts
// Adapter OpenAI-compatible para DeepSeek, Groq e OpenAI
// STATUS: Stub para MVP — implementação completa na Fase 2 (ADR-001 §Phased Rollout)
// Referência: references/specs-modules/provider-factory.md §OpenAICompatibleProvider

import type {
  ILlmProvider,
  LlmTier,
  ProviderName,
  ProviderConfig,
  GenerateWithToolsRequest,
  GenerateContentRequest,
  LlmResponse,
} from './ILlmProvider';

export class OpenAICompatibleProvider implements ILlmProvider {
  readonly modelId: string;
  readonly tier: LlmTier;
  readonly providerName: ProviderName;

  constructor(config: ProviderConfig) {
    this.modelId = config.modelId;
    this.tier = config.tier;
    this.providerName = config.name;
  }

  async generateWithTools(_request: GenerateWithToolsRequest): Promise<LlmResponse> {
    // TODO(T-022-phase2): Implementar com openai SDK apontando para baseUrl do provider
    throw new Error(
      `OpenAICompatibleProvider (${this.providerName}) não implementado no MVP. ` +
        'Configure ACTIVE_PROVIDER=gemini ou implemente a Fase 2.',
    );
  }

  async generateContent(_request: GenerateContentRequest): Promise<LlmResponse> {
    throw new Error(`OpenAICompatibleProvider (${this.providerName}) não implementado no MVP.`);
  }

  async countTokens(_text: string): Promise<number> {
    throw new Error('countTokens não disponível para OpenAICompatibleProvider no MVP.');
  }
}

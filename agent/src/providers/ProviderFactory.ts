// agent/src/providers/ProviderFactory.ts
// Factory central para seleção de providers LLM por tier e configuração de cliente
// Referência: references/specs-modules/provider-factory.md §ProviderFactory
// Regra: toda chamada LLM DEVE passar por esta factory (RULES.md §3)

import { env } from '../config/env';
import { GeminiProvider } from './GeminiProvider';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider';
import type { ILlmProvider, LlmTier, ProviderConfig } from './ILlmProvider';

// Providers padrão por tier (configuráveis via env)
const DEFAULT_CONFIGS: Record<LlmTier, ProviderConfig> = {
  tier1: {
    name: 'gemini',
    tier: 'tier1',
    modelId: 'gemini-2.5-flash',
    apiKey: env.GEMINI_API_KEY,
  },
  tier2: {
    name: 'gemini',
    tier: 'tier2',
    modelId: 'gemini-2.5-flash', // Flash no MVP; trocar para pro quando aprovado
    apiKey: env.GEMINI_API_KEY,
  },
  tier3: {
    name: 'gemini',
    tier: 'tier3',
    modelId: 'gemini-2.5-flash', // Tier 3 (Claude/GPT-4o) ativo apenas na Fase 2
    apiKey: env.GEMINI_API_KEY,
  },
};

export class ProviderFactory {
  // Cache de instâncias por modelId para evitar múltiplas instâncias desnecessárias
  private static cache: Map<string, ILlmProvider> = new Map();

  /**
   * Retorna o provider LLM para um cliente e tier específicos.
   * No MVP, ignora configurações por cliente e usa os defaults.
   * Na Fase 2, lerá client_rules.llm_provider do Supabase.
   */
  static forClient(_clientId: string, tier: LlmTier): ILlmProvider {
    // MVP: usar provider padrão por tier
    // TODO(T-023-phase2): Buscar client_rules.llm_provider do Supabase para override
    const config = DEFAULT_CONFIGS[tier];
    return ProviderFactory.getOrCreate(config);
  }

  /**
   * Retorna um provider diretamente por configuração (sem lookup de cliente).
   * Usado pelo SkillRouter (tier1 fixo).
   */
  static forConfig(config: ProviderConfig): ILlmProvider {
    return ProviderFactory.getOrCreate(config);
  }

  private static getOrCreate(config: ProviderConfig): ILlmProvider {
    const cacheKey = `${config.name}:${config.modelId}`;

    if (ProviderFactory.cache.has(cacheKey)) {
      return ProviderFactory.cache.get(cacheKey)!;
    }

    const provider = ProviderFactory.create(config);
    ProviderFactory.cache.set(cacheKey, provider);
    return provider;
  }

  private static create(config: ProviderConfig): ILlmProvider {
    switch (config.name) {
      case 'gemini':
        return new GeminiProvider(config);
      case 'deepseek':
      case 'groq':
      case 'openai':
        return new OpenAICompatibleProvider(config);
      case 'claude':
        // TODO(T-022-phase2): ClaudeProvider
        return new OpenAICompatibleProvider({ ...config, name: 'claude' });
      default: {
        const exhaustive: never = config.name;
        throw new Error(`Provider desconhecido: ${String(exhaustive)}`);
      }
    }
  }

  /** Limpa o cache (usado em testes). */
  static clearCache(): void {
    ProviderFactory.cache.clear();
  }
}

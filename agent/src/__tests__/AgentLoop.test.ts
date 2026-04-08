// T-034: Integration tests for AgentLoop
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
  },
}));

// Mock TelegramNotifier
vi.mock('../io/TelegramNotifier', () => ({
  telegramNotifier: {
    notifyClient: vi.fn().mockResolvedValue(0),
    requestApproval: vi.fn().mockResolvedValue(null),
    init: vi.fn(),
  },
}));

// Mock McpBridge
vi.mock('../services/McpBridge', () => ({
  mcpBridge: {
    isServerReady: () => false,
    callTool: vi.fn(),
    init: vi.fn(),
    shutdown: vi.fn(),
    getConnectedServers: () => [],
  },
}));

// Mock ProviderFactory
let llmCallCount = 0;
vi.mock('../providers/ProviderFactory', () => ({
  ProviderFactory: {
    forClient: () => ({
      modelId: 'test-model',
      tier: 'tier1',
      providerName: 'gemini',
      generateWithTools: vi.fn().mockImplementation(async () => {
        llmCallCount++;
        if (llmCallCount % 2 === 1) {
          return { text: '', toolCall: { name: 'list_clients', args: {} }, tokensUsed: 100, costEstimateUsd: 0 };
        }
        return { text: 'Existem 2 clientes ativos.', tokensUsed: 200, costEstimateUsd: 0 };
      }),
      generateContent: vi.fn().mockResolvedValue({ text: '{"persona":"ads-manager"}', tokensUsed: 50, costEstimateUsd: 0 }),
      countTokens: vi.fn().mockResolvedValue(100),
    }),
    clearCache: vi.fn(),
  },
}));

import { AgentLoop } from '../core/AgentLoop';

describe('AgentLoop', () => {
  let loop: AgentLoop;

  beforeEach(() => {
    llmCallCount = 0;
    loop = new AgentLoop();
  });

  it('runs a complete ReAct cycle and returns content', async () => {
    const result = await loop.run({
      clientId: 'test-client-id',
      content: 'Quais clientes estão ativos?',
      source: 'web',
    });

    expect(result).toBeDefined();
    expect(result.content).toBeTruthy();
    expect(result.iterationsUsed).toBeGreaterThan(0);
    expect(result.tokensUsed).toBeGreaterThan(0);
  });

  it('returns AgentOutput with all required fields', async () => {
    const result = await loop.run({
      clientId: 'test-client-id',
      content: 'Teste',
      source: 'web',
    });

    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('iterationsUsed');
    expect(result).toHaveProperty('tokensUsed');
    expect(typeof result.content).toBe('string');
  });

  it('handles chatId for Telegram context', async () => {
    const result = await loop.run({
      clientId: 'test-client-id',
      content: 'Teste Telegram',
      chatId: 12345,
      source: 'telegram',
    });

    expect(result).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
  });
});

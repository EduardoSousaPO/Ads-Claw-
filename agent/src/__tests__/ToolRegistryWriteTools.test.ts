// T-100: Write tools coverage — Meta + Google write operations
import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { meta_ads_account_id: 'act_999', google_ads_account_id: '9876543210', telegram_chat_ids: [12345] },
                error: null,
              }),
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === 'client_rules') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { target_cpa: 30, brand_voice: 'Bold', sector: 'saas', primary_offer: 'Free trial' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'test' }, error: null }) }) }),
      };
    }),
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: 'url' } }) }) },
  },
}));

vi.mock('../services/McpBridge', () => ({
  mcpBridge: {
    isServerReady: (s: string) => s === 'meta-ads', // Only Meta connected
    callTool: vi.fn().mockResolvedValue({ id: 'created_123' }),
    init: vi.fn(),
    shutdown: vi.fn(),
    getConnectedServers: () => ['meta-ads'],
  },
}));

vi.mock('../io/TelegramNotifier', () => ({
  telegramNotifier: {
    notifyClient: vi.fn().mockResolvedValue(1),
    requestApproval: vi.fn().mockResolvedValue('appr-1'),
    init: vi.fn(),
  },
}));

vi.mock('../providers/ProviderFactory', () => ({
  ProviderFactory: {
    forClient: () => ({
      modelId: 'test', tier: 'tier1', providerName: 'gemini',
      generateContent: vi.fn().mockResolvedValue({ text: '{}', tokensUsed: 50, costEstimateUsd: 0 }),
    }),
    clearCache: vi.fn(),
  },
}));

import { ToolRegistry } from '../tools/ToolRegistry';
import { telegramNotifier } from '../io/TelegramNotifier';

describe('Write Tools — Meta Ads', () => {
  const registry = new ToolRegistry();
  const ctx = { clientId: 'client-uuid', chatId: 12345 };

  it('meta_create_campaign calls MCP and notifies', async () => {
    const result = await registry.execute('meta_create_campaign', {
      name: 'Black Friday Campaign',
      objective: 'OUTCOME_SALES',
      daily_budget: 5000,
    }, ctx);
    expect(result.success).toBe(true);
    expect(telegramNotifier.notifyClient).toHaveBeenCalled();
  });

  it('meta_create_adset calls MCP', async () => {
    const result = await registry.execute('meta_create_adset', {
      campaign_id: '123',
      name: 'BR 18-65',
      daily_budget: 3000,
      optimization_goal: 'CONVERSIONS',
      targeting: '{"geo_locations":{"countries":["BR"]}}',
    }, ctx);
    expect(result.success).toBe(true);
  });

  it('meta_create_creative calls MCP', async () => {
    const result = await registry.execute('meta_create_creative', {
      name: 'Creative v1',
      page_id: 'page_123',
      message: 'Buy now!',
      link: 'https://example.com',
    }, ctx);
    expect(result.success).toBe(true);
  });

  it('meta_create_ad calls MCP', async () => {
    const result = await registry.execute('meta_create_ad', {
      name: 'Ad v1',
      adset_id: 'adset_123',
      creative_id: 'creative_123',
    }, ctx);
    expect(result.success).toBe(true);
  });

  it('meta_update_status calls MCP', async () => {
    const result = await registry.execute('meta_update_status', {
      object_id: 'campaign_123',
      status: 'ACTIVE',
    }, ctx);
    expect(result.success).toBe(true);
  });

  it('meta_upload_image calls MCP', async () => {
    const result = await registry.execute('meta_upload_image', {
      image_url: 'https://example.com/image.jpg',
    }, ctx);
    expect(result.success).toBe(true);
  });
});

describe('Write Tools — Google Ads (not connected)', () => {
  const registry = new ToolRegistry();
  const ctx = { clientId: 'client-uuid', chatId: 12345 };

  it('google_create_campaign fails when MCP not connected', async () => {
    const result = await registry.execute('google_create_campaign', {
      name: 'Search Campaign',
      channel_type: 'SEARCH',
      daily_budget_micros: 50000000,
    }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('não');
  });

  it('google_update_status fails when MCP not connected', async () => {
    const result = await registry.execute('google_update_status', {
      campaign_id: '123',
      status: 'PAUSED',
    }, ctx);
    expect(result.success).toBe(false);
  });

  it('google_update_budget fails when MCP not connected', async () => {
    const result = await registry.execute('google_update_budget', {
      campaign_id: '123',
      daily_budget_micros: 30000000,
    }, ctx);
    expect(result.success).toBe(false);
  });
});

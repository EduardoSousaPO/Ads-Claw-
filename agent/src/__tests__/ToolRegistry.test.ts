// T-100: ToolRegistry coverage — test individual tool executions
import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'client_rules') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { target_cpa: 45, target_roas: 3.5, daily_budget: 500, brand_voice: 'Direto', primary_offer: '20% OFF', creative_refresh_days: 7, sector: 'ecommerce', max_context_turns: 10 },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'clients') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { meta_ads_account_id: 'act_123', google_ads_account_id: '1234567890', telegram_chat_ids: [12345] },
                error: null,
              }),
              order: () => Promise.resolve({
                data: [{ id: '1', name: 'Test', status: 'active', meta_ads_account_id: 'act_123', google_ads_account_id: '123' }],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'benchmark_cache') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
            }),
          }),
          upsert: () => Promise.resolve({ error: null }),
        };
      }
      if (table === 'pending_approvals') {
        return {
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'appr-1' }, error: null }) }) }),
        };
      }
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        insert: () => Promise.resolve({ error: null }),
      };
    }),
    storage: { from: () => ({ upload: vi.fn().mockResolvedValue({ error: null }), getPublicUrl: () => ({ data: { publicUrl: 'https://test/file.png' } }) }) },
  },
}));

vi.mock('../services/McpBridge', () => ({
  mcpBridge: {
    isServerReady: (server: string) => server === 'meta-ads',
    callTool: vi.fn().mockResolvedValue({ data: [{ spend: '100', ctr: '1.5' }] }),
    init: vi.fn(),
    shutdown: vi.fn(),
    getConnectedServers: () => ['meta-ads'],
  },
}));

vi.mock('../io/TelegramNotifier', () => ({
  telegramNotifier: {
    notifyClient: vi.fn().mockResolvedValue(1),
    requestApproval: vi.fn().mockResolvedValue('appr-123'),
    getApprovalStatus: vi.fn().mockResolvedValue({ id: 'appr-123', status: 'pending' }),
    init: vi.fn(),
  },
}));

vi.mock('../providers/ProviderFactory', () => ({
  ProviderFactory: {
    forClient: () => ({
      modelId: 'test',
      tier: 'tier1',
      providerName: 'gemini',
      generateContent: vi.fn().mockResolvedValue({
        text: '{"variations":[{"headline":"Test","body":"Test body","cta":"Buy"}]}',
        tokensUsed: 100,
        costEstimateUsd: 0,
      }),
    }),
    clearCache: vi.fn(),
  },
}));

import { ToolRegistry } from '../tools/ToolRegistry';

describe('ToolRegistry — tool execution', () => {
  const registry = new ToolRegistry();
  const ctx = { clientId: 'test-client-uuid', chatId: 12345 };

  it('get_client_rules returns client rules', async () => {
    const result = await registry.execute('get_client_rules', {}, ctx);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('target_cpa', 45);
    expect(result.data).toHaveProperty('sector', 'ecommerce');
  });

  it('list_clients returns client list', async () => {
    const result = await registry.execute('list_clients', {}, ctx);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('list_clients accepts status filter', async () => {
    const result = await registry.execute('list_clients', { status: 'paused' }, ctx);
    expect(result.success).toBe(true);
  });

  it('meta_get_account_insights calls MCP bridge', async () => {
    const result = await registry.execute('meta_get_account_insights', { date_range: 'last_7d' }, ctx);
    expect(result.success).toBe(true);
  });

  it('google_get_performance fails when MCP not connected', async () => {
    const result = await registry.execute('google_get_performance', { date_range: 'LAST_7_DAYS' }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('não está conectado');
  });

  it('fetch_ad_benchmarks returns static fallback without Apify token', async () => {
    delete process.env['APIFY_TOKEN'];
    const result = await registry.execute('fetch_ad_benchmarks', { sector: 'ecommerce', platform: 'meta' }, ctx);
    expect(result.success).toBe(true);
    expect((result.data as any).source).toBe('static_fallback');
    expect((result.data as any).avg_cpa).toBeDefined();
  });

  it('generate_ad_copy returns variations', async () => {
    const result = await registry.execute('generate_ad_copy', { objective: 'conversions', platform: 'meta' }, ctx);
    expect(result.success).toBe(true);
    expect((result.data as any).variations).toBeDefined();
  });

  it('generate_image returns error when infsh not installed', async () => {
    const result = await registry.execute('generate_image', { prompt: 'test', width: 1024, height: 1024 }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('infsh');
  });

  it('generate_video returns error when infsh not installed', async () => {
    const result = await registry.execute('generate_video', { prompt: 'test', duration: 6, aspect_ratio: '16:9' }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('infsh');
  });

  it('notify_manager sends Telegram notification', async () => {
    const result = await registry.execute('notify_manager', { message: 'Test alert', priority: 'high' }, ctx);
    expect(result.success).toBe(true);
    expect((result.data as any).messages_sent).toBe(1);
  });

  it('meta_create_campaign calls MCP write tool', async () => {
    const result = await registry.execute('meta_create_campaign', {
      name: 'Test Campaign',
      objective: 'OUTCOME_SALES',
    }, ctx);
    expect(result.success).toBe(true);
  });

  it('meta_update_status calls MCP', async () => {
    const result = await registry.execute('meta_update_status', {
      object_id: 'campaign_123',
      status: 'PAUSED',
    }, ctx);
    expect(result.success).toBe(true);
  });

  it('unknown tool returns error', async () => {
    const result = await registry.execute('nonexistent', {}, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('não encontrada');
  });

  it('getDeclarations returns 27 declarations', () => {
    const decls = registry.getDeclarations();
    expect(decls.length).toBe(27);
    decls.forEach(d => {
      expect(d.name).toBeTruthy();
      expect(d.description).toBeTruthy();
      expect(d.parameters).toBeDefined();
    });
  });
});

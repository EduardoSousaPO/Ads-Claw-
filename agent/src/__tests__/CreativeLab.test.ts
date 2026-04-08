// T-073: Tests for CreativeLab tools + Crypto
import { describe, it, expect, vi } from 'vitest';
import { encrypt, decrypt, tryDecrypt } from '../lib/crypto';

// Mock dependencies for ToolRegistry import
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
          gte: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
          in: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
          lt: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
        }),
        is: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'test' }, error: null }) }) }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      upsert: () => Promise.resolve({ error: null }),
    }),
    storage: { from: () => ({ upload: vi.fn().mockResolvedValue({ error: null }), getPublicUrl: () => ({ data: { publicUrl: 'https://test.com/file.png' } }) }) },
  },
}));

vi.mock('../services/McpBridge', () => ({
  mcpBridge: { isServerReady: () => false, callTool: vi.fn(), init: vi.fn(), shutdown: vi.fn(), getConnectedServers: () => [] },
}));

vi.mock('../io/TelegramNotifier', () => ({
  telegramNotifier: { notifyClient: vi.fn().mockResolvedValue(0), requestApproval: vi.fn().mockResolvedValue(null), init: vi.fn() },
}));

describe('Crypto (AES-256-GCM)', () => {
  it('encrypt/decrypt roundtrip', () => {
    const original = 'EAAxxxxxxx_my_secret_token';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':');
    expect(decrypt(encrypted)).toBe(original);
  });

  it('different ciphertexts for same input (random IV)', () => {
    const e1 = encrypt('test');
    const e2 = encrypt('test');
    expect(e1).not.toBe(e2);
    expect(decrypt(e1)).toBe('test');
    expect(decrypt(e2)).toBe('test');
  });

  it('decrypt fails with tampered data', () => {
    const encrypted = encrypt('secret');
    const tampered = 'xxxx' + encrypted.substring(4);
    expect(() => decrypt(tampered)).toThrow();
  });

  it('tryDecrypt returns null for invalid', () => {
    expect(tryDecrypt(null)).toBeNull();
    expect(tryDecrypt(undefined)).toBeNull();
    expect(tryDecrypt('')).toBeNull();
    expect(tryDecrypt('invalid')).toBeNull();
  });

  it('tryDecrypt returns value for valid', () => {
    expect(tryDecrypt(encrypt('token'))).toBe('token');
  });
});

describe('ToolRegistry', () => {
  it('registers 27 tools (16 original + 11 write)', async () => {
    const { ToolRegistry } = await import('../tools/ToolRegistry');
    const registry = new ToolRegistry();
    expect(registry.listTools().length).toBe(27);
  });

  it('has all expected tool names including write tools', async () => {
    const { ToolRegistry } = await import('../tools/ToolRegistry');
    const registry = new ToolRegistry();
    const tools = registry.listTools();

    const expected = [
      // Read tools
      'get_client_rules', 'list_clients',
      'meta_get_account_insights', 'meta_list_campaigns', 'meta_get_campaign_insights',
      'google_get_performance', 'google_list_campaigns', 'google_get_keywords', 'google_get_ad_groups',
      'fetch_ad_benchmarks', 'generate_ad_copy',
      'generate_image', 'generate_video', 'upload_asset',
      'notify_manager', 'ask_approval',
      // Meta write tools
      'meta_create_campaign', 'meta_create_adset', 'meta_create_creative',
      'meta_create_ad', 'meta_update_status', 'meta_upload_image',
      // Google write tools
      'google_create_campaign', 'google_create_ad_group', 'google_create_ad',
      'google_update_status', 'google_update_budget',
    ];

    for (const name of expected) {
      expect(tools).toContain(name);
    }
  });

  it('returns error for unknown tool', async () => {
    const { ToolRegistry } = await import('../tools/ToolRegistry');
    const registry = new ToolRegistry();
    const result = await registry.execute('nonexistent', {}, { clientId: 'test' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('não encontrada');
  });

  it('getDeclarations returns array of ToolDeclarations', async () => {
    const { ToolRegistry } = await import('../tools/ToolRegistry');
    const registry = new ToolRegistry();
    const declarations = registry.getDeclarations();
    expect(declarations.length).toBe(27);
    for (const d of declarations) {
      expect(d).toHaveProperty('name');
      expect(d).toHaveProperty('description');
      expect(d).toHaveProperty('parameters');
    }
  });
});

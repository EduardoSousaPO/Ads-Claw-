// T-063: Tests for Telegram I/O (TelegramNotifier)
import { describe, it, expect, vi } from 'vitest';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { telegram_chat_ids: [12345, 67890] },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'pending_approvals') {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: { id: 'approval-uuid-123' },
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { id: 'approval-uuid-123', status: 'pending' },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: () => Promise.resolve({ data: [], error: null }) };
    }),
  },
}));

// Mock Grammy with proper class constructors
vi.mock('grammy', () => {
  class MockBot {
    api = {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 42 }),
    };
    on = vi.fn();
  }
  class MockInlineKeyboard {
    text() { return this; }
  }
  return { Bot: MockBot, InlineKeyboard: MockInlineKeyboard };
});

// Mock McpBridge (pulled in by TelegramNotifier indirectly)
vi.mock('../services/McpBridge', () => ({
  mcpBridge: { isServerReady: () => false, callTool: vi.fn(), init: vi.fn(), shutdown: vi.fn(), getConnectedServers: () => [] },
}));

describe('TelegramNotifier', () => {
  it('initializes without error', async () => {
    const mod = await import('../io/TelegramNotifier');
    expect(() => mod.telegramNotifier.init()).not.toThrow();
  });

  it('notifyClient sends to all chat IDs of client', async () => {
    const mod = await import('../io/TelegramNotifier');
    mod.telegramNotifier.init();
    const sent = await mod.telegramNotifier.notifyClient('client-uuid', 'Test');
    expect(sent).toBe(2);
  });

  it('requestApproval returns approval ID', async () => {
    const mod = await import('../io/TelegramNotifier');
    mod.telegramNotifier.init();
    const id = await mod.telegramNotifier.requestApproval({
      clientId: 'client-uuid',
      chatId: 12345,
      action: 'pause_campaign',
      description: 'Test approval',
      payload: {},
    });
    expect(id).toBe('approval-uuid-123');
  });

  it('getApprovalStatus returns status', async () => {
    const mod = await import('../io/TelegramNotifier');
    const status = await mod.telegramNotifier.getApprovalStatus('approval-uuid-123');
    expect(status).toBeDefined();
    expect(status?.status).toBe('pending');
  });
});

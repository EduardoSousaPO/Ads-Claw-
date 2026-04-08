// T-054: Tests for Orchestrator
import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env['SUPABASE_URL'] = 'https://test.supabase.co';
process.env['SUPABASE_SERVICE_KEY'] = 'test-service-key-min-20-chars';
process.env['GEMINI_API_KEY'] = 'test-gemini-key';
process.env['TELEGRAM_BOT_TOKEN'] = 'test-bot-token';
process.env['TELEGRAM_ALLOWED_USER_IDS'] = '123456';
process.env['NODE_ENV'] = 'test';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'clients_needing_refresh') {
        return {
          select: () => Promise.resolve({
            data: [{
              id: 'client-1',
              name: 'Test Client',
              status: 'active',
              target_cpa: 45,
              creative_refresh_days: 7,
              last_creative_refresh: '2026-03-10',
              days_since_refresh: 21,
            }],
            error: null,
          }),
        };
      }
      if (table === 'alerts') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: () => ({
                  limit: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'pending_approvals') {
        return {
          update: () => ({
            eq: () => ({
              lt: () => ({
                select: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'clients') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return {
        select: () => Promise.resolve({ data: [], error: null }),
      };
    }),
  },
}));

// Mock TelegramNotifier
vi.mock('../io/TelegramNotifier', () => ({
  telegramNotifier: {
    notifyClient: vi.fn().mockResolvedValue(1),
    init: vi.fn(),
  },
}));

// Mock McpBridge
vi.mock('../services/McpBridge', () => ({
  mcpBridge: {
    isServerReady: () => false,
    callTool: vi.fn(),
  },
}));

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn((_, callback) => {
      // Store for manual trigger
      (global as any).__cronCallback = callback;
    }),
  },
}));

import { Orchestrator } from '../core/Orchestrator';
import { telegramNotifier } from '../io/TelegramNotifier';

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new Orchestrator();
  });

  it('starts without error', () => {
    expect(() => orchestrator.start()).not.toThrow();
  });

  it('registers a cron schedule on start', async () => {
    const cron = await import('node-cron');
    orchestrator.start();
    expect(cron.default.schedule).toHaveBeenCalledTimes(1);
  });

  it('cron callback runs fatigue check and expire approvals', async () => {
    orchestrator.start();
    const callback = (global as any).__cronCallback;
    expect(callback).toBeDefined();

    // Run the cron callback manually
    await callback();

    // Should have tried to notify
    expect(telegramNotifier.notifyClient).toHaveBeenCalledWith(
      'client-1',
      expect.stringContaining('Test Client')
    );
  });
});

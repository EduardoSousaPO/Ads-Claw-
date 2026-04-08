// T-100: MemoryManager coverage tests
import { describe, it, expect, vi } from 'vitest';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => mockSelect(),
          }),
        }),
      }),
      insert: () => mockInsert(),
      delete: () => ({
        eq: () => mockDelete(),
      }),
    })),
  },
}));

import { MemoryManager } from '../memory/MemoryManager';

describe('MemoryManager', () => {
  const mm = new MemoryManager();

  it('getRecentContextForClient returns messages in chronological order', async () => {
    mockSelect.mockResolvedValueOnce({
      data: [
        { id: '2', client_id: 'c1', sender: 'agent', message: 'Olá', created_at: '2026-01-02' },
        { id: '1', client_id: 'c1', sender: 'user', message: 'Oi', created_at: '2026-01-01' },
      ],
      error: null,
    });

    const result = await mm.getRecentContextForClient('c1');
    expect(result.length).toBe(2);
    // Should be reversed (oldest first)
    expect(result[0]!.message).toBe('Oi');
    expect(result[1]!.message).toBe('Olá');
  });

  it('getRecentContextForClient returns empty on error', async () => {
    mockSelect.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
    const result = await mm.getRecentContextForClient('c1');
    expect(result).toEqual([]);
  });

  it('getRecentContextForClient handles exception', async () => {
    mockSelect.mockRejectedValueOnce(new Error('Network fail'));
    const result = await mm.getRecentContextForClient('c1');
    expect(result).toEqual([]);
  });

  it('saveMessage inserts without error', async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    await expect(mm.saveMessage({
      client_id: 'c1',
      sender: 'user',
      message: 'Test message',
    })).resolves.not.toThrow();
  });

  it('saveMessage handles DB error gracefully', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'Insert failed' } });
    await expect(mm.saveMessage({
      client_id: 'c1',
      sender: 'agent',
      message: 'Test',
    })).resolves.not.toThrow();
  });

  it('clearClientMemory returns true on success', async () => {
    mockDelete.mockResolvedValueOnce({ error: null });
    const result = await mm.clearClientMemory('c1');
    expect(result).toBe(true);
  });

  it('clearClientMemory returns false on error', async () => {
    mockDelete.mockResolvedValueOnce({ error: { message: 'Delete failed' } });
    const result = await mm.clearClientMemory('c1');
    expect(result).toBe(false);
  });
});

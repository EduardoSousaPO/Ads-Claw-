// T-044: Tests for McpBridge
import { describe, it, expect, beforeEach } from 'vitest';
import { McpBridge } from '../services/McpBridge';

describe('McpBridge', () => {
  let bridge: McpBridge;

  beforeEach(() => {
    bridge = new McpBridge();
  });

  it('starts with no connected servers', () => {
    expect(bridge.getConnectedServers()).toEqual([]);
  });

  it('isServerReady returns false for unknown server', () => {
    expect(bridge.isServerReady('meta-ads')).toBe(false);
    expect(bridge.isServerReady('google-ads')).toBe(false);
    expect(bridge.isServerReady('nonexistent')).toBe(false);
  });

  it('callTool throws for unmapped tool', async () => {
    await expect(bridge.callTool('nonexistent_tool', {}))
      .rejects.toThrow("não mapeada a nenhum MCP server");
  });

  it('callTool throws when server not connected', async () => {
    await expect(bridge.callTool('get_account_insights', { ad_account_id: 'act_123' }))
      .rejects.toThrow("não está conectado");
  });

  it('init gracefully handles missing credentials', async () => {
    delete process.env['META_ACCESS_TOKEN'];
    delete process.env['GOOGLE_ADS_CLIENT_ID'];
    delete process.env['GOOGLE_ADS_CLIENT_SECRET'];
    delete process.env['GOOGLE_ADS_DEVELOPER_TOKEN'];
    delete process.env['GOOGLE_ADS_REFRESH_TOKEN'];

    await bridge.init();
    expect(bridge.getConnectedServers()).toEqual([]);
  });

  it('shutdown completes without error', async () => {
    await expect(bridge.shutdown()).resolves.not.toThrow();
  });
});

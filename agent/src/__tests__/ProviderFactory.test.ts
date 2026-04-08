// T-024: Unit tests for ProviderFactory
import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderFactory } from '../providers/ProviderFactory';
import type { ILlmProvider } from '../providers/ILlmProvider';

describe('ProviderFactory', () => {
  beforeEach(() => {
    ProviderFactory.clearCache();
  });

  it('returns a provider for tier1', () => {
    const provider = ProviderFactory.forClient('test-client', 'tier1');
    expect(provider).toBeDefined();
    expect(provider.providerName).toBe('gemini');
    expect(provider.tier).toBe('tier1');
    expect(provider.modelId).toBe('gemini-2.5-flash');
  });

  it('returns a provider for tier2', () => {
    const provider = ProviderFactory.forClient('test-client', 'tier2');
    expect(provider.tier).toBe('tier2');
  });

  it('returns a provider for tier3', () => {
    const provider = ProviderFactory.forClient('test-client', 'tier3');
    expect(provider.tier).toBe('tier3');
  });

  it('caches providers by modelId', () => {
    const p1 = ProviderFactory.forClient('client-a', 'tier1');
    const p2 = ProviderFactory.forClient('client-b', 'tier1');
    expect(p1).toBe(p2);
  });

  it('clearCache resets the cache', () => {
    const p1 = ProviderFactory.forClient('client-a', 'tier1');
    ProviderFactory.clearCache();
    const p2 = ProviderFactory.forClient('client-a', 'tier1');
    expect(p1).not.toBe(p2);
  });

  it('forConfig creates provider from explicit config', () => {
    const provider = ProviderFactory.forConfig({
      name: 'gemini',
      tier: 'tier1',
      modelId: 'gemini-2.5-flash',
      apiKey: 'test-key',
    });
    expect(provider.providerName).toBe('gemini');
  });

  it('provider implements ILlmProvider interface', () => {
    const provider: ILlmProvider = ProviderFactory.forClient('test', 'tier1');
    expect(typeof provider.generateWithTools).toBe('function');
    expect(typeof provider.generateContent).toBe('function');
    expect(typeof provider.countTokens).toBe('function');
  });
});

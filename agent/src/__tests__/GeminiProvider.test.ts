// T-100: GeminiProvider coverage via mock
import { describe, it, expect, vi } from 'vitest';

// Mock the Gemini SDK
vi.mock('@google/generative-ai', () => {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: {
      text: () => 'Test response',
      usageMetadata: { totalTokenCount: 150 },
      candidates: [{ content: { parts: [{ text: 'Test response' }] } }],
    },
  });

  const mockSendMessage = vi.fn().mockResolvedValue({
    response: {
      text: () => 'Tool response',
      usageMetadata: { totalTokenCount: 200 },
      candidates: [{ content: { parts: [{ text: 'Tool response' }] } }],
      functionCalls: () => null,
    },
  });

  const mockCountTokens = vi.fn().mockResolvedValue({ totalTokens: 42 });

  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        generateContent: mockGenerateContent,
        countTokens: mockCountTokens,
        startChat: () => ({
          sendMessage: mockSendMessage,
        }),
      };
    }
  }

  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

import { GeminiProvider } from '../providers/GeminiProvider';

describe('GeminiProvider', () => {
  const provider = new GeminiProvider({
    name: 'gemini',
    tier: 'tier1',
    modelId: 'gemini-2.5-flash',
    apiKey: 'test-api-key',
  });

  it('has correct properties', () => {
    expect(provider.modelId).toBe('gemini-2.5-flash');
    expect(provider.tier).toBe('tier1');
    expect(provider.providerName).toBe('gemini');
  });

  it('generateContent returns text and tokens', async () => {
    const result = await provider.generateContent({
      systemInstruction: 'You are helpful',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.text).toBeTruthy();
    expect(result.tokensUsed).toBeGreaterThan(0);
    expect(typeof result.costEstimateUsd).toBe('number');
  });

  it('generateWithTools returns response', async () => {
    const result = await provider.generateWithTools({
      systemInstruction: 'You are helpful',
      messages: [{ role: 'user', content: 'List clients' }],
      tools: [{
        name: 'list_clients',
        description: 'Lists clients',
        parameters: { type: 'object', properties: {}, required: [] },
      }],
    });

    expect(result.text).toBeTruthy();
    expect(result.tokensUsed).toBeGreaterThan(0);
  });

  it('countTokens returns a number', async () => {
    const count = await provider.countTokens('Hello world');
    expect(count).toBe(42);
  });
});

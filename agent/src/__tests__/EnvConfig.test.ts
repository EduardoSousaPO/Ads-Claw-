// T-100: env.ts and config coverage
import { describe, it, expect } from 'vitest';
import { env } from '../config/env';

describe('Environment Configuration', () => {
  it('loads required env vars', () => {
    expect(env.SUPABASE_URL).toBeTruthy();
    expect(env.SUPABASE_SERVICE_KEY).toBeTruthy();
    expect(env.GEMINI_API_KEY).toBeTruthy();
    expect(env.TELEGRAM_BOT_TOKEN).toBeTruthy();
    expect(env.TELEGRAM_ALLOWED_USER_IDS).toBeTruthy();
  });

  it('has correct defaults', () => {
    expect(env.HTTP_PORT).toBe(3001);
    expect(env.MAX_ITERATIONS).toBe(3); // Overridden in setup.ts
    expect(env.ACTIVE_PROVIDER).toBe('gemini');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.NODE_ENV).toBe('test');
  });

  it('CREDENTIALS_ENCRYPTION_KEY is 64 chars', () => {
    expect(env.CREDENTIALS_ENCRYPTION_KEY).toBeTruthy();
    expect(env.CREDENTIALS_ENCRYPTION_KEY!.length).toBe(64);
  });
});

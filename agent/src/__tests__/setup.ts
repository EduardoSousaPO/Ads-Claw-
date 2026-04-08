// Global test setup — mock env vars before any module loads
process.env['SUPABASE_URL'] = 'https://test.supabase.co';
process.env['SUPABASE_SERVICE_KEY'] = 'test-service-key-that-is-at-least-20-chars-long';
process.env['GEMINI_API_KEY'] = 'test-gemini-api-key';
process.env['TELEGRAM_BOT_TOKEN'] = 'test-telegram-bot-token';
process.env['TELEGRAM_ALLOWED_USER_IDS'] = '123456';
process.env['CREDENTIALS_ENCRYPTION_KEY'] = 'a'.repeat(64);
process.env['NODE_ENV'] = 'test';
process.env['MAX_ITERATIONS'] = '3';

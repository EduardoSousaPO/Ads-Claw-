// agent/src/config/env.ts
// Validacao de variaveis de ambiente no startup do agent.
// Se qualquer variavel obrigatoria estiver ausente, o processo termina com exit(1).

import { z } from 'zod';

const EnvSchema = z.object({
  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL deve ser uma URL valida'),
  SUPABASE_SERVICE_KEY: z.string().min(20, 'SUPABASE_SERVICE_KEY obrigatorio'),

  // LLM
  GEMINI_API_KEY: z.string().min(10, 'GEMINI_API_KEY obrigatorio'),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().min(10, 'TELEGRAM_BOT_TOKEN obrigatorio'),
  TELEGRAM_ALLOWED_USER_IDS: z.string().min(1, 'TELEGRAM_ALLOWED_USER_IDS obrigatorio'),
  /** Fallback quando nenhum cliente tem o chat_id em clients.telegram_chat_ids (dev/MVP) */
  TELEGRAM_DEFAULT_CLIENT_ID: z.string().uuid().optional(),

  // Servidor
  HTTP_PORT: z.coerce.number().int().min(1024).max(65535).default(3001),

  // Agent Config
  MAX_ITERATIONS: z.coerce.number().int().min(1).max(20).default(5),
  MEMORY_WINDOW_SIZE: z.coerce.number().int().min(5).max(100).default(30),

  // Opcionais (MVP)
  APIFY_TOKEN: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().optional(),
  ACTIVE_PROVIDER: z.enum(['gemini', 'deepseek', 'groq', 'claude', 'openai']).default('gemini'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  COCKPIT_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase Anon (opcional)
  SUPABASE_ANON_KEY: z.string().optional(),

  // Criptografia de credenciais per-client (opcional no MVP — obrigatório em produção)
  CREDENTIALS_ENCRYPTION_KEY: z.string().length(64, 'Deve ser 32 bytes em hex (64 chars)').optional(),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    // Zod v4: .errors renamed to .issues
    const errors = result.error.issues
      .map((e: z.ZodIssue) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');

    console.error(
      `\n[AdsClaw] Variaveis de ambiente invalidas ou ausentes:\n${errors}\n` +
        `\nCopie .env.example para .env e preencha os valores obrigatorios.\n`,
    );
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();

// agent/src/lib/supabase.ts
// Cliente Supabase admin (service role) para o agente backend
// RULES.md §2: SUPABASE_SERVICE_KEY nunca exposta ao frontend
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

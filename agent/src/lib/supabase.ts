import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Força o carregamento do .env na raiz do agente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';

// Preferência: Service Role Key (bypass RLS, acesso admin completo)
// Fallback: Anon/Publishable Key (limitada ao RLS público)
const supabaseKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRÍTICO: SUPABASE_URL e SUPABASE_SERVICE_KEY (ou SUPABASE_ANON_KEY) são obrigatórias no .env!');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  console.warn('⚠️  [Supabase] Usando ANON KEY — adicione SUPABASE_SERVICE_KEY para bypass total do RLS.');
}

/**
 * Cliente Supabase com permissões Administrativas (Service Role preferido).
 * O Service Role Key dá bypass completo do RLS, ideal para o agente autônomo.
 * Para obtê-lo: Supabase Dashboard → Settings → API → service_role key
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

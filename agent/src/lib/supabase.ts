import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Força o carregamento do .env na raiz do agente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ ATENÇÃO: Variáveis SUPABASE_URL ou SUPABASE_SERVICE_KEY não encontradas no .env.\n👉 O agente operará as "Skills" e o "Telegram" normalmente, mas as chamadas de banco (Client fetch) poderão falhar!');
}

/**
 * Cliente Supabase com permissões Administrativas (Service Role).
 * IMPORTANTE: No AdsClaw SWAS, nós usamos o Service Role Key na aplicação *Server-Side*
 * (Background Agent). Ele terá poder de escrita e bypass do RLS para conseguir
 * gerenciar as campanhas autonomamente!
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

import { AgentController } from './core/AgentController';
import { supabase as supabaseClient } from './lib/supabase';

export const supabase = supabaseClient;

async function bootstrap() {
  console.log('🚀 [AdsClaw Agent] - Motor SWAS Iniciando processo background...');
  
  try {
    // Diagnóstico de Conexão com Supabase no arranque!
    const { data, error } = await supabase.from('clients').select('id, name');
    
    if (error) {
      console.error('❌ Erro de RLS ou Configuração do Supabase:', error.message);
    } else {
      console.log(`✅ [Supabase Conectado]: Motor enxergou a base de clientes (Total atual: ${data.length}).`);
    }

    // A partir daqui, as próximas implementações envolverão o pooling
    // do node-telegram-bot-api e a orquestração do Gemini...
    const controller = new AgentController();
    await controller.start();

  } catch (ex) {
    console.error('💥 Motor colidiu durante o arranque interno:', ex);
  }
}

// Inicia o agente de forma global
bootstrap();

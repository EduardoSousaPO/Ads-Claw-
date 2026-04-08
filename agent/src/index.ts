// 1. Carrega .env antes de qualquer validação (deve ser o primeiro import)
import 'dotenv/config';
// 2. Valida variáveis obrigatórias — falha com exit(1) se alguma estiver ausente
import { env } from './config/env';
import { AgentController } from './core/AgentController';
import { supabase as supabaseClient } from './lib/supabase';
import { mcpBridge } from './services/McpBridge';
import { telegramNotifier } from './io/TelegramNotifier';

export const supabase = supabaseClient;
void env;

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

    // Inicializa MCP Bridges (Meta Ads, Google Ads) — falha parcial não impede startup
    await mcpBridge.init();
    const connected = mcpBridge.getConnectedServers();
    if (connected.length > 0) {
      console.log(`🔌 [McpBridge] Servidores ativos: ${connected.join(', ')}`);
    }

    // Inicializa o notificador Telegram (notify_manager, ask_approval)
    telegramNotifier.init();

    const controller = new AgentController();
    await controller.start();

  } catch (ex) {
    console.error('💥 Motor colidiu durante o arranque interno:', ex);
  }
}

// Graceful shutdown — fecha MCP servers
process.on('SIGINT', async () => {
  console.log('\n🛑 [AdsClaw Agent] Encerrando...');
  await mcpBridge.shutdown();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await mcpBridge.shutdown();
  process.exit(0);
});

// Inicia o agente de forma global
bootstrap();

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const AgentController_1 = require("./core/AgentController");
const supabase_1 = require("./lib/supabase");
exports.supabase = supabase_1.supabase;
async function bootstrap() {
    console.log('🚀 [AdsClaw Agent] - Motor SWAS Iniciando processo background...');
    try {
        // Diagnóstico de Conexão com Supabase no arranque!
        const { data, error } = await exports.supabase.from('clients').select('id, name');
        if (error) {
            console.error('❌ Erro de RLS ou Configuração do Supabase:', error.message);
        }
        else {
            console.log(`✅ [Supabase Conectado]: Motor enxergou a base de clientes (Total atual: ${data.length}).`);
        }
        // A partir daqui, as próximas implementações envolverão o pooling
        // do node-telegram-bot-api e a orquestração do Gemini...
        const controller = new AgentController_1.AgentController();
        await controller.start();
    }
    catch (ex) {
        console.error('💥 Motor colidiu durante o arranque interno:', ex);
    }
}
// Inicia o agente de forma global
bootstrap();

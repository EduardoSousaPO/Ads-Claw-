"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orchestrator = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const index_1 = require("../index");
const CreativeLab_1 = require("../services/CreativeLab");
class Orchestrator {
    tg;
    lab;
    constructor(tgHandler) {
        this.tg = tgHandler;
        this.lab = new CreativeLab_1.CreativeLab();
    }
    /**
     * Inicia o monitoramento proativo.
     * Rodando a cada 6 horas (simulação).
     */
    start() {
        console.log('🚀 [Orchestrator] Motor de automação proativa iniciado.');
        // Simulação: roda a cada minuto para demonstração, mas no PRD seria '0 */6 * * *'
        node_cron_1.default.schedule('* * * * *', async () => {
            console.log('⏳ [Orchestrator] Executando verificação de rotina nas contas...');
            await this.auditClients();
        });
    }
    async auditClients() {
        try {
            // 1. Busca todos os clientes e suas regras
            const { data: clients, error } = await index_1.supabase
                .from('clients')
                .select('id, name, client_rules(max_cpa, target_roas, fatigue_days)');
            if (error || !clients)
                return;
            for (const client of clients) {
                const rules = client.client_rules?.[0];
                if (!rules)
                    continue;
                console.log(`🔍 Auditando: ${client.name} | CPA Alvo: R$ ${rules.max_cpa}`);
                // 2. Simulação de Leitura de Métricas (seria via MCP na Fase 4 real)
                const currentCPA = Math.random() * 10; // Mockando CPA atual
                const daysActive = 10; // Mockando dias de anúncio
                // 3. Lógica de Detecção de Fadiga Criativa (Task 6.2)
                const isFatigued = daysActive >= (rules.fatigue_days || 7) && currentCPA > (rules.max_cpa || 5);
                if (isFatigued) {
                    await this.handleFatigueWarning(client.id, client.name, currentCPA);
                }
            }
        }
        catch (err) {
            console.error('❌ Erro no ciclo do Orchestrator:', err);
        }
    }
    async handleFatigueWarning(clientId, clientName, cpa) {
        console.warn(`⚠️ Fadiga detectada para ${clientName}! CPA atual: R$ ${cpa.toFixed(2)}`);
        const message = `🚨 *ALERTA DE PERFORMANCE: ${clientName}*\n\n` +
            `Detectamos fadiga criativa. O CPA subiu para *R$ ${cpa.toFixed(2)}*.\n` +
            `O limite era R$ 5.00. \n\n` +
            `🤖 *Ação Sugerida:* O AdsClaw já analisou benchmarks e está pronto para gerar novos vídeos de refresh. \n` +
            `Deseja iniciar a produção no Laboratório Criativo?`;
        // Notifica o gestor via Telegram
        // No mundo real, buscaríamos o Telegram ID do gestor associado ao cliente
        const adminId = process.env.TELEGRAM_ALLOWED_USER_ID;
        if (adminId) {
            await this.tg.sendMessage(adminId, message);
        }
    }
}
exports.Orchestrator = Orchestrator;

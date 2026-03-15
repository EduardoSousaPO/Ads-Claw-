"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OmnichannelGateway = void 0;
const TelegramHandler_1 = require("./TelegramHandler");
/**
 * Omnichannel Gateway
 *
 * Intercepta dezenas de canais distintos (Portal React via Rest,
 * Mobile via Telegram bot API, etc) e uniformiza a sintaxe para o AgentController ler e vice-versa.
 */
class OmnichannelGateway {
    controller;
    telegramHandler;
    constructor(controller) {
        this.controller = controller;
        this.telegramHandler = new TelegramHandler_1.TelegramHandler(this);
    }
    /**
     * Levanta os Ouvintes (Sockets ou Polling).
     */
    async startListening() {
        console.log("🌐 [Omnichannel] Escalando ouvintes. Iniciando listener do Telegram...");
        await this.telegramHandler.start();
        // No futuro (Fase 3): Start server Express para escutar o Dashboard Web (Agency Cockpit) REST.
    }
    /**
     * Recebimento unificado de dados e envio direto ao cérebro (AgentController).
     */
    async processInput(standardizedInput) {
        await this.controller.handleInput(standardizedInput);
    }
    /**
     * O cérebro quer "Falar". Este método roteia de volta para
     * o canal de onde o input brotou.
     */
    async sendOutput(response, sourceInput) {
        if (sourceInput.source === 'telegram') {
            await this.telegramHandler.sendResponse(response, sourceInput);
        }
        else if (sourceInput.source === 'web') {
            console.log("🌐 [Omnichannel] Payload seria enviado via Web/Socket ao Painel. (Não instanciado).", response);
        }
    }
}
exports.OmnichannelGateway = OmnichannelGateway;

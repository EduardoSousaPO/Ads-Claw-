import { AgentController } from '../core/AgentController';
import type { AgentInput, AgentOutput } from '../core/AgentLoop';
import { TelegramHandler } from './TelegramHandler';

/**
 * Omnichannel Gateway
 *
 * Intercepta dezenas de canais distintos (Portal React via Rest,
 * Mobile via Telegram bot API, etc) e uniformiza a sintaxe para o AgentController ler e vice-versa.
 */
export class OmnichannelGateway {
    private controller: AgentController;
    public telegramHandler: TelegramHandler;

    constructor(controller: AgentController) {
        this.controller = controller;
        this.telegramHandler = new TelegramHandler(this);
    }

    async startListening() {
        console.log("🌐 [Omnichannel] Escalando ouvintes. Iniciando listener do Telegram...");
        await this.telegramHandler.start();
    }

    async processInput(standardizedInput: AgentInput): Promise<AgentOutput> {
        return this.controller.handleInput(standardizedInput);
    }

    async sendOutput(response: AgentOutput, sourceInput: AgentInput): Promise<void> {
        if (sourceInput.source === 'telegram') {
            await this.telegramHandler.sendResponse(response, sourceInput);
        } else if (sourceInput.source === 'web') {
            console.log("🌐 [Omnichannel] Payload seria enviado via Web/Socket ao Painel. (Não instanciado).", response);
        }
    }
}

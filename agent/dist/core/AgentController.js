"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentController = void 0;
const AgentLoop_1 = require("./AgentLoop");
const OmnichannelGateway_1 = require("../io/OmnichannelGateway");
const Orchestrator_1 = require("./Orchestrator");
/**
 * Controller principal da arquitetura baseada no SandeClaw.
 *
 * Ele é o regente (Facade) responsável por instanciar a "Boca" (Gateway/Output),
 * o "Ouvido" (Gateway/Input) e o "Cérebro" (AgentLoop).
 */
class AgentController {
    loop;
    gateway;
    orchestrator;
    constructor() {
        this.loop = new AgentLoop_1.AgentLoop();
        this.gateway = new OmnichannelGateway_1.OmnichannelGateway(this);
        this.orchestrator = new Orchestrator_1.Orchestrator(this.gateway.telegramHandler);
    }
    /**
     * Starta a vida do robô (listeners e workers).
     */
    async start() {
        console.log("🎮 [AgentController] Inicializando Engine Cognitiva e Gateways...");
        // Inicia o pool de listeners proativos
        this.orchestrator.start();
        await this.gateway.startListening();
    }
    /**
     * Recebe inputs já sanitizados e padronizados dos diferentes canais
     * e os envia ao Motor Cognitivo (Agent Loop).
     *
     * @param input Objeto padronizado de Input contendo source, id, userId, content, etc.
     */
    async handleInput(input) {
        console.log(`🧠 [AgentController] Recebido Input do tipo '${input.type}' oriundo do '${input.source}'. Roteando para AgentLoop...`);
        try {
            // Executa iterações base (Thought -> Action -> Observation)
            const response = await this.loop.run(input);
            console.log(`📤 [AgentController] AgentLoop Concluído. Devolvendo resposta para a fonte base (${input.source})...`);
            // Retorna ao output do respectivo gateway
            await this.gateway.sendOutput(response, input);
        }
        catch (error) {
            console.error('💥 [AgentController] Falha Crítica no Ciclo ReAct:', error);
            // Estratégia de Fallback Seguro
            await this.gateway.sendOutput({
                content: `⚠️ Ocorreu uma exceção fatal interna no ciclo cognitivo: ${error.message}`
            }, input);
        }
    }
}
exports.AgentController = AgentController;

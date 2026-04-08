import { AgentLoop, type AgentInput, type AgentOutput } from './AgentLoop';
import { OmnichannelGateway } from '../io/OmnichannelGateway';
import { Orchestrator } from './Orchestrator';
import { HttpServer } from '../io/HttpServer';

/**
 * Controller principal da arquitetura AdsClaw.
 * Orquestra Telegram, Chat Web (HTTP) e o Orchestrator proativo.
 */
export class AgentController {
    private loop: AgentLoop;
    private gateway: OmnichannelGateway;
    private orchestrator: Orchestrator;
    private httpServer: HttpServer;

    constructor() {
        this.loop = new AgentLoop();
        this.gateway = new OmnichannelGateway(this);
        this.orchestrator = new Orchestrator();

        // Inicializa o servidor HTTP de Chat Web (para o Cockpit/Vercel)
        this.httpServer = new HttpServer(
            (input) => this.handleInput(input),
            Number(process.env['HTTP_PORT']) || 3001
        );
    }

    /**
     * Starta a vida do robô (listeners e workers).
     */
    async start() {
        console.log("🎮 [AgentController] Inicializando Engine Cognitiva e Gateways...");
        
        // 1. Cron jobs de auditoria proativa
        this.orchestrator.start();
        
        // 2. Servidor HTTP de Chat para o Frontend Web
        this.httpServer.start();
        
        // 3. Telegram (listener principal de comandos)
        await this.gateway.startListening();
    }

    /**
     * Recebe inputs já sanitizados e padronizados dos diferentes canais
     * e os envia ao Motor Cognitivo (Agent Loop).
     */
    async handleInput(input: AgentInput): Promise<AgentOutput> {
        console.log(`🧠 [AgentController] Input '${input.source ?? 'unknown'}' → AgentLoop...`);

        try {
            const response = await this.loop.run(input);
            await this.gateway.sendOutput(response, input);
            return response;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('💥 [AgentController] Falha no ciclo ReAct:', message);

            const fallback: AgentOutput = {
                content: `⚠️ Ocorreu um erro interno. Tente novamente em alguns instantes.`
            };
            await this.gateway.sendOutput(fallback, input);
            return fallback;
        }
    }
}

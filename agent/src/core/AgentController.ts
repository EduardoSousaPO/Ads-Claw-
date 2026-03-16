import { AgentLoop } from './AgentLoop';
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
        this.orchestrator = new Orchestrator(this.gateway.telegramHandler);
        
        // Inicializa o servidor HTTP de Chat Web (para o Cockpit/Vercel)
        this.httpServer = new HttpServer(
            (input) => this.handleInput(input),
            Number(process.env.HTTP_PORT) || 3001
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
     * 
     * @param input Objeto padronizado de Input contendo source, id, userId, content, etc.
     */
    async handleInput(input: any) {
        console.log(`🧠 [AgentController] Recebido Input do tipo '${input.type}' oriundo do '${input.source}'. Roteando para AgentLoop...`);
        
        try {
            // Executa iterações base (Thought -> Action -> Observation)
            const response = await this.loop.run(input);
            console.log(`📤 [AgentController] AgentLoop Concluído. Devolvendo resposta para a fonte base (${input.source})...`);
            
            // Retorna ao output do respectivo gateway
            await this.gateway.sendOutput(response, input);
        } catch (error: any) {
            console.error('💥 [AgentController] Falha Crítica no Ciclo ReAct:', error);
            
            // Estratégia de Fallback Seguro
            await this.gateway.sendOutput({ 
                content: `⚠️ Ocorreu uma exceção fatal interna no ciclo cognitivo: ${error.message}` 
            }, input);
        }
    }
}

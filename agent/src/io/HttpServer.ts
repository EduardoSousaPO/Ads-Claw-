import express, { Request, Response } from 'express';
import cors from 'cors';

/**
 * Servidor HTTP do AdsClaw Agent.
 * Expõe uma rota /api/chat para que o Cockpit (Frontend/Vercel)
 * possa enviar mensagens e receber respostas do AgentLoop.
 */
export class HttpServer {
  private app: express.Application;
  private port: number;
  private onMessage: (input: any) => Promise<any>;

  constructor(onMessage: (input: any) => Promise<any>, port = 3001) {
    this.port = port;
    this.onMessage = onMessage;
    this.app = express();
    this.app.use(cors()); // Permite requisições da Vercel (domínio externo)
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    // Health Check - para confirmar que o agente está online
    this.app.get('/api/health', (_req: Request, res: Response) => {
      res.json({ status: 'online', agent: 'AdsClaw SWAS', timestamp: new Date().toISOString() });
    });

    // Rota principal de Chat
    this.app.post('/api/chat', async (req: Request, res: Response) => {
      const { message, clientId, sessionId } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Campo "message" é obrigatório.' });
        return;
      }

      console.log(`💬 [HttpServer] Mensagem recebida via Web: "${message.substring(0, 80)}..."`);

      try {
        // Formata o input no mesmo padrão do Telegram para reutilizar o AgentLoop
        const input = {
          source: 'web',
          type: 'text',
          userId: sessionId || 'web-user',
          clientId: clientId || null,
          content: message,
        };

        const response = await this.onMessage(input);

        res.json({
          reply: response?.content || 'Entendido. Processando sua solicitação.',
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error('❌ [HttpServer] Erro ao processar mensagem:', err);
        res.status(500).json({ error: 'Erro interno do Agente.', detail: err.message });
      }
    });
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`🌐 [HttpServer] API de Chat rodando em http://localhost:${this.port}/api/chat`);
    });
  }
}

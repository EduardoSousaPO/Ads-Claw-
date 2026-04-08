import express, { Request, Response } from 'express';
import cors from 'cors';
import type { AgentInput, AgentOutput } from '../core/AgentLoop';

// Aceita qualquer UUID bem formatado (incluindo seeds de dev com zeros)
const UUID_RE =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isClientUuid(value: unknown): value is string {
    return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Servidor HTTP do AdsClaw Agent.
 * Expõe uma rota /api/chat para que o Cockpit (Frontend/Vercel)
 * possa enviar mensagens e receber respostas do AgentLoop.
 */
export class HttpServer {
  private app: express.Application;
  private port: number;
  private onMessage: (input: AgentInput) => Promise<AgentOutput>;

  constructor(onMessage: (input: AgentInput) => Promise<AgentOutput>, port = 3001) {
    this.port = port;
    this.onMessage = onMessage;
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.get('/api/health', (_req: Request, res: Response) => {
      res.json({ status: 'online', agent: 'AdsClaw SWAS', timestamp: new Date().toISOString() });
    });

    this.app.post('/api/chat', async (req: Request, res: Response) => {
      const { message, clientId, sessionId } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Campo "message" é obrigatório.' });
        return;
      }

      if (!isClientUuid(clientId)) {
        res.status(400).json({
          error: 'Campo "clientId" é obrigatório e deve ser um UUID válido do cliente.',
        });
        return;
      }

      console.log(`💬 [HttpServer] Mensagem recebida via Web: "${message.substring(0, 80)}..."`);

      try {
        const input: AgentInput = {
          source: 'web',
          clientId,
          content: message,
        };
        void sessionId;

        const response = await this.onMessage(input);

        res.json({
          reply: response?.content || 'Entendido. Processando sua solicitação.',
          timestamp: new Date().toISOString(),
        });
      } catch (err: unknown) {
        const detail = err instanceof Error ? err.message : String(err);
        console.error('❌ [HttpServer] Erro ao processar mensagem:', err);
        res.status(500).json({ error: 'Erro interno do Agente.', detail });
      }
    });
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`🌐 [HttpServer] API de Chat rodando em http://localhost:${this.port}/api/chat`);
    });
  }
}

import { Bot } from 'grammy';
import { OmnichannelGateway } from './OmnichannelGateway';
import dotenv from 'dotenv';
import path from 'path';

// Força ler o .env do host principal
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

/**
 * Telegram Handler (Inspirado no grammy SandeClaw handler)
 * Ouve o long-polling do Telegram e dispara o input processado no gateway.
 */
export class TelegramHandler {
    private bot: Bot;
    private gateway: OmnichannelGateway;
    private allowedUserId: string;

    constructor(gateway: OmnichannelGateway) {
        this.gateway = gateway;
        
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if(!token) {
            console.warn("⚠️ [TelegramHandler] TELEGRAM_BOT_TOKEN ausente no .env. Bot mudo (Dummy Mode).");
        }
        
        this.allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID || '';
        this.bot = new Bot(token || 'dummy_token');

        this.setupRoutes();
    }

    private setupRoutes() {
        // [Middleware] Hard-lock Security Restrita à Agência (Whitelist)
        this.bot.use(async (ctx, next) => {
            const userId = ctx.from?.id.toString();
            if (userId !== this.allowedUserId) {
                console.warn(`🔒 [TelegramHandler] Bloqueio de Segurança: Usuario ID ${userId} tentou acesso sem possuir White-Listing.`);
                // Return vazio (Drop payload) para não responder invasores ou scapers 
                return;
            }
            // Prossegue
            await next();
        });

        // 1. Mensagens Textuais Puras
        this.bot.on('message:text', async (ctx) => {
            // Sinaliza que a IA "Está digitando..."
            await ctx.replyWithChatAction('typing');

            const standardizedInput = {
                id: ctx.message.message_id,
                source: 'telegram',
                type: 'text',
                content: ctx.message.text,
                userId: ctx.from.id.toString(),
                chatId: ctx.chat.id,
                timestamp: new Date()
            };
            
            await this.gateway.processInput(standardizedInput);
        });

        // 2. Anexos de Voice (Feature futura Fase 2: STT/Whisper)
        this.bot.on(['message:voice', 'message:audio'], async (ctx) => {
            // Placeholder pro Spec: O Agent deve interceptar os OGG do telegram.
            await ctx.reply("🎙️ Modulo de Voz (Agent-STT) ainda não está ativado no NodeJS! Mande texto.");
        });
        
        // 3. Documentos PDF / MD
        this.bot.on('message:document', async (ctx) => {
            await ctx.reply("📄 Recebi o documento, mas o parser de Documentos do Gateway ainda não está online!");
        });
    }

    /**
     * Starta o Polling Assincrono não-bloqueante na API da Meta/Telegram.
     */
    async start() {
        if (!process.env.TELEGRAM_BOT_TOKEN) return;
        console.log("✈️  [TelegramHandler] Long Polling (Grammy) online e escutando!");
        // Tratar crash do polling para não abater o node loop num catch unhandled...
        this.bot.start().catch(err => console.error("Erro grammy pooling:", err));
    }

    /**
     * Envia uma mensagem unificada (aproveitando o context ou chatId).
     */
    async sendResponse(response: any, sourceInput: any) {
        await this.bot.api.sendMessage(sourceInput.id, response.content);
    }

    /**
     * Envia uma mensagem direta (usado para notificações e alertas proativos).
     */
    async sendMessage(chatId: string | number, text: string) {
        try {
            await this.bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Falha ao enviar mensagem direta no Telegram:', error);
        }
    }
}

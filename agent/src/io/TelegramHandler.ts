import { Bot } from 'grammy';
import { OmnichannelGateway } from './OmnichannelGateway';
import { env } from '../config/env';
import { supabase } from '../lib/supabase';
import type { AgentInput } from '../core/AgentLoop';

/**
 * Telegram Handler (Inspirado no grammy SandeClaw handler)
 * Ouve o long-polling do Telegram e dispara o input processado no gateway.
 */
export class TelegramHandler {
    private bot: Bot;
    private gateway: OmnichannelGateway;
    private readonly allowedUserIds: Set<string>;

    constructor(gateway: OmnichannelGateway) {
        this.gateway = gateway;

        const token = env.TELEGRAM_BOT_TOKEN;
        if (!token) {
            console.warn("⚠️ [TelegramHandler] TELEGRAM_BOT_TOKEN ausente no .env. Bot mudo (Dummy Mode).");
        }

        this.allowedUserIds = new Set(
            env.TELEGRAM_ALLOWED_USER_IDS.split(',')
                .map((s) => s.trim())
                .filter(Boolean),
        );

        this.bot = new Bot(token || 'dummy_token');

        this.setupRoutes();
    }

    /** Mapeia o chat_id do Telegram para client_id via clients.telegram_chat_ids ou env fallback. */
    private async resolveClientIdForTelegramChat(chatId: number): Promise<string | null> {
        const { data, error } = await supabase
            .from('clients')
            .select('id')
            .contains('telegram_chat_ids', [chatId])
            .limit(1)
            .maybeSingle();

        if (!error && data?.id) {
            return data.id;
        }

        if (env.TELEGRAM_DEFAULT_CLIENT_ID) {
            return env.TELEGRAM_DEFAULT_CLIENT_ID;
        }

        return null;
    }

    private setupRoutes() {
        this.bot.use(async (ctx, next) => {
            const userId = ctx.from?.id.toString();
            if (!userId || !this.allowedUserIds.has(userId)) {
                console.warn(`🔒 [TelegramHandler] Bloqueio de Segurança: Usuario ID ${userId} fora da whitelist.`);
                return;
            }
            await next();
        });

        this.bot.on('message:text', async (ctx) => {
            await ctx.replyWithChatAction('typing');

            const chatId = ctx.chat.id;
            const clientId = await this.resolveClientIdForTelegramChat(chatId);

            if (!clientId) {
                await ctx.reply(
                    '⚠️ Este chat não está vinculado a um cliente. Peça para um admin incluir este `chat_id` ' +
                        'em `clients.telegram_chat_ids` no Supabase, ou defina `TELEGRAM_DEFAULT_CLIENT_ID` no .env (apenas dev).',
                );
                return;
            }

            const standardizedInput: AgentInput = {
                clientId,
                content: ctx.message.text,
                chatId,
                source: 'telegram',
            };

            await this.gateway.processInput(standardizedInput);
        });

        this.bot.on(['message:voice', 'message:audio'], async (ctx) => {
            await ctx.reply("🎙️ Modulo de Voz (Agent-STT) ainda não está ativado no NodeJS! Mande texto.");
        });

        this.bot.on('message:document', async (ctx) => {
            await ctx.reply("📄 Recebi o documento, mas o parser de Documentos do Gateway ainda não está online!");
        });
    }

    async start() {
        if (!env.TELEGRAM_BOT_TOKEN) return;
        console.log("✈️  [TelegramHandler] Long Polling (Grammy) online e escutando!");
        this.bot.start().catch((err) => console.error("Erro grammy pooling:", err));
    }

    async sendResponse(response: { content: string }, sourceInput: AgentInput) {
        if (sourceInput.chatId === undefined) {
            console.error('❌ [TelegramHandler] sendResponse: chatId ausente (obrigatório para Telegram).');
            return;
        }
        await this.bot.api.sendMessage(sourceInput.chatId, response.content, { parse_mode: 'Markdown' });
    }

    async sendMessage(chatId: string | number, text: string) {
        try {
            await this.bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Falha ao enviar mensagem direta no Telegram:', error);
        }
    }
}

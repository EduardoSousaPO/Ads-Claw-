// agent/src/io/TelegramNotifier.ts
// Módulo singleton para envio de notificações proativas via Telegram
// Usado por: ToolRegistry (notify_manager, ask_approval) e Orchestrator
// Separado do TelegramHandler para evitar dependência circular

import { Bot, InlineKeyboard } from 'grammy';
import { env } from '../config/env';
import { supabase } from '../lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ApprovalRequest {
  clientId: string;
  chatId: number;
  action: string;
  description: string;
  payload: Record<string, unknown>;
}

export interface ApprovalRecord {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
}

// ─── Singleton ────────────────────────────────────────────────────────────────

class TelegramNotifier {
  private bot: Bot | null = null;
  private initialized = false;

  /**
   * Inicializa o bot e registra o listener de callback_query para aprovações.
   * Deve ser chamado UMA vez, pelo AgentController ou index.ts.
   * Se o TelegramHandler já criou um Bot, use setBotInstance() em vez de init().
   */
  init() {
    if (this.initialized) return;

    const token = env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn('⚠️ [TelegramNotifier] Token ausente. Notificações desabilitadas.');
      return;
    }

    // Cria uma instância do Bot APENAS para envio (não faz polling)
    this.bot = new Bot(token);
    this.setupApprovalCallbacks();
    this.initialized = true;
    console.log('📢 [TelegramNotifier] Pronto para enviar notificações.');
  }

  /** Permite injetar o bot do TelegramHandler (evita 2 instâncias) */
  setBotInstance(bot: Bot) {
    this.bot = bot;
    if (!this.initialized) {
      this.setupApprovalCallbacks();
      this.initialized = true;
      console.log('📢 [TelegramNotifier] Usando bot do TelegramHandler.');
    }
  }

  // ─── Envio de notificações ──────────────────────────────────────────────

  /**
   * Envia mensagem simples para os chat_ids do Telegram vinculados ao cliente.
   * Retorna quantidade de mensagens enviadas.
   */
  async notifyClient(clientId: string, text: string): Promise<number> {
    if (!this.bot) return 0;

    const chatIds = await this.getClientChatIds(clientId);
    if (chatIds.length === 0) return 0;

    let sent = 0;
    for (const chatId of chatIds) {
      try {
        await this.bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        sent++;
      } catch (err) {
        console.error(`❌ [TelegramNotifier] Falha ao enviar para chat ${chatId}:`, err);
      }
    }
    return sent;
  }

  /**
   * Cria um pedido de aprovação: salva no Supabase e envia mensagem com botões inline.
   * Retorna o ID do registro de aprovação.
   */
  async requestApproval(req: ApprovalRequest): Promise<string | null> {
    if (!this.bot) return null;

    // 1. Inserir no Supabase
    const { data, error } = await supabase
      .from('pending_approvals')
      .insert({
        client_id: req.clientId,
        chat_id: req.chatId,
        action: req.action,
        description: req.description,
        payload: req.payload,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('❌ [TelegramNotifier] Erro ao criar pending_approval:', error?.message);
      return null;
    }

    const approvalId = data.id as string;

    // 2. Montar mensagem com inline keyboard
    const keyboard = new InlineKeyboard()
      .text('✅ Aprovar', `approve:${approvalId}`)
      .text('❌ Rejeitar', `reject:${approvalId}`);

    const message =
      `🔔 *Aprovação Necessária*\n\n` +
      `**Ação:** ${req.action}\n` +
      `**Descrição:** ${req.description}\n\n` +
      `_Responda com os botões abaixo. Expira em 24h._`;

    try {
      const sent = await this.bot.api.sendMessage(req.chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });

      // Salvar o message_id para referência futura
      await supabase
        .from('pending_approvals')
        .update({ telegram_message_id: sent.message_id })
        .eq('id', approvalId);

      return approvalId;
    } catch (err) {
      console.error('❌ [TelegramNotifier] Falha ao enviar pedido de aprovação:', err);
      return null;
    }
  }

  /**
   * Consulta o status de uma aprovação existente.
   */
  async getApprovalStatus(approvalId: string): Promise<ApprovalRecord | null> {
    const { data, error } = await supabase
      .from('pending_approvals')
      .select('id, status')
      .eq('id', approvalId)
      .single();

    if (error || !data) return null;
    return data as ApprovalRecord;
  }

  // ─── Privados ───────────────────────────────────────────────────────────

  private async getClientChatIds(clientId: string): Promise<number[]> {
    const { data } = await supabase
      .from('clients')
      .select('telegram_chat_ids')
      .eq('id', clientId)
      .single();

    if (!data?.telegram_chat_ids || !Array.isArray(data.telegram_chat_ids)) {
      return [];
    }

    return data.telegram_chat_ids.map(Number).filter((n: number) => !isNaN(n));
  }

  private setupApprovalCallbacks() {
    if (!this.bot) return;

    this.bot.on('callback_query:data', async (ctx) => {
      const cbData = ctx.callbackQuery.data;

      // Formato: "approve:<uuid>" ou "reject:<uuid>"
      const match = cbData.match(/^(approve|reject):(.+)$/);
      if (!match) return;

      const [, action, approvalId] = match;
      const userId = ctx.from.id;

      // Buscar a aprovação
      const { data: approval, error } = await supabase
        .from('pending_approvals')
        .select('id, status, action, description')
        .eq('id', approvalId)
        .single();

      if (error || !approval) {
        await ctx.answerCallbackQuery({ text: '⚠️ Aprovação não encontrada.' });
        return;
      }

      if (approval.status !== 'pending') {
        await ctx.answerCallbackQuery({ text: `Já foi ${approval.status === 'approved' ? 'aprovado' : 'rejeitado'}.` });
        return;
      }

      // Atualizar status
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      await supabase
        .from('pending_approvals')
        .update({
          status: newStatus,
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
        })
        .eq('id', approvalId);

      // Editar mensagem original para refletir decisão
      const emoji = action === 'approve' ? '✅' : '❌';
      const statusText = action === 'approve' ? 'APROVADO' : 'REJEITADO';

      try {
        await ctx.editMessageText(
          `${emoji} *${statusText}*\n\n` +
          `**Ação:** ${approval.action}\n` +
          `**Descrição:** ${approval.description}\n\n` +
          `_Decidido por usuário ${userId}_`,
          { parse_mode: 'Markdown' },
        );
      } catch {
        // Mensagem pode ter expirado
      }

      await ctx.answerCallbackQuery({ text: `${statusText} com sucesso!` });
      console.log(`📋 [TelegramNotifier] Aprovação ${approvalId}: ${newStatus} por ${userId}`);
    });
  }
}

export const telegramNotifier = new TelegramNotifier();

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryManager = void 0;
const supabase_1 = require("../lib/supabase");
/**
 * MemoryManager (Supabase Relacional)
 *
 * Responsável por garantir que a janela de contexto (Context Window)
 * não exploda em requests astronômicas da LLM, além de arquivar tudo
 * na conta do inquilino correto.
 */
class MemoryManager {
    // Quantas conversas manter no buffer a cada Request pra não quebrar Token Bounds (Sliding Window)
    MEMORY_WINDOW_SIZE = 30;
    constructor() { }
    /**
     * Extrai a memória contextual de um cliente, truncando
     * nas "N" msgs mais recentes para caber no token limit do Gemini.
     */
    async getRecentContextForClient(clientId) {
        console.log(`🧠 [Memory] Recuperando últimas ${this.MEMORY_WINDOW_SIZE} mensagens do cliente ${clientId}...`);
        try {
            const { data, error } = await supabase_1.supabase
                .from('chat_history')
                .select('*')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false }) // Pega os ultimos
                .limit(this.MEMORY_WINDOW_SIZE); // Truncamento seguro
            if (error) {
                console.error("🚫 Falha ao buscar histórico base:", error.message);
                return [];
            }
            // Precisamos reverter a ordem cronológica pro Gemini ler "velho -> novo"
            return data.reverse();
        }
        catch (ex) {
            console.error("💥 Memory Manager estourou Exceção:", ex);
            return [];
        }
    }
    /**
     * Persiste as inferências e interações proativamente no painel/banco
     */
    async saveMessage(chatData) {
        try {
            const { error } = await supabase_1.supabase
                .from('chat_history')
                .insert([{
                    client_id: chatData.client_id,
                    sender: chatData.sender,
                    message: chatData.message,
                    metadata: chatData.metadata || {}
                }]);
            if (error) {
                console.error("🚫 Falha SQL ao persistir memória:", error.message);
            }
        }
        catch (ex) {
            console.error("💥 Memory Manager: Erro fatal no Insert:", ex);
        }
    }
    /**
     * Apaga rastros corrompidos ou força um "esquecimento" manual pra limpar tokens
     * do limite da agent/loop num cliente isolado.
     */
    async clearClientMemory(clientId) {
        console.warn(`🧹 [Memory] Agência ordenou purge completo de contexto do cliente ${clientId}`);
        const { error } = await supabase_1.supabase.from('chat_history').delete().eq('client_id', clientId);
        return !error;
    }
}
exports.MemoryManager = MemoryManager;

import { supabase } from '../lib/supabase';

export interface ChatMessage {
    id?: string;
    client_id: string;      // ID da conta Meta/Google do cliente alvo
    sender: 'user' | 'agent' | 'telegram' | 'system';
    message: string;
    metadata?: any;         // Dados MCP, JSON Schemas de actions, etc.
    created_at?: string;
}

/**
 * MemoryManager (Supabase Relacional)
 * 
 * Responsável por garantir que a janela de contexto (Context Window)
 * não exploda em requests astronômicas da LLM, além de arquivar tudo
 * na conta do inquilino correto.
 */
export class MemoryManager {
    // Quantas conversas manter no buffer a cada Request pra não quebrar Token Bounds (Sliding Window)
    private readonly MEMORY_WINDOW_SIZE = 30;

    constructor() {}

    /**
     * Extrai a memória contextual de um cliente, truncando
     * nas "N" msgs mais recentes para caber no token limit do Gemini.
     */
    async getRecentContextForClient(clientId: string): Promise<ChatMessage[]> {
        console.log(`🧠 [Memory] Recuperando últimas ${this.MEMORY_WINDOW_SIZE} mensagens do cliente ${clientId}...`);
        
        try {
            const { data, error } = await supabase
                .from('chat_history')
                .select('*')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false }) // Pega os ultimos
                .limit(this.MEMORY_WINDOW_SIZE);           // Truncamento seguro
            
            if (error) {
                console.error("🚫 Falha ao buscar histórico base:", error.message);
                return [];
            }

            // Precisamos reverter a ordem cronológica pro Gemini ler "velho -> novo"
            return (data as ChatMessage[]).reverse();

        } catch (ex) {
            console.error("💥 Memory Manager estourou Exceção:", ex);
            return [];
        }
    }

    /**
     * Persiste as inferências e interações proativamente no painel/banco
     */
    async saveMessage(chatData: ChatMessage): Promise<void> {
        try {
            const { error } = await supabase
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
        } catch (ex) {
            console.error("💥 Memory Manager: Erro fatal no Insert:", ex);
        }
    }

    /**
     * Apaga rastros corrompidos ou força um "esquecimento" manual pra limpar tokens
     * do limite da agent/loop num cliente isolado.
     */
    async clearClientMemory(clientId: string): Promise<boolean> {
        console.warn(`🧹 [Memory] Agência ordenou purge completo de contexto do cliente ${clientId}`);
        const { error } = await supabase.from('chat_history').delete().eq('client_id', clientId);
        return !error;
    }
}

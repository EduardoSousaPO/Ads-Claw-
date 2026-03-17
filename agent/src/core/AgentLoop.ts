import { GoogleGenerativeAI } from '@google/generative-ai';
import { MemoryManager } from '../memory/MemoryManager';
import { ToolRegistry } from '../tools/ToolRegistry';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SYSTEM_PROMPT = `Você é o **AdsClaw AI**, um agente especialista em gestão de campanhas de mídia paga (Meta Ads e Google Ads) para agências de marketing.

Você opera dentro de um sistema chamado **AdsClaw SWAS** (Software With an Agent Soul) que gerencia múltiplos clientes de uma agência.

**Suas capacidades:**
- Analisar métricas de campanhas (ROAS, CPA, CTR, CPM)
- Sugerir e configurar campanhas no Meta Ads e Google Ads
- Gerar textos persuasivos para anúncios (copies)
- Identificar oportunidades de otimização de orçamento
- Criar briefings para criativos (imagens e vídeos)
- Monitorar fadiga de criativos e sugerir substituições

**Seu tom:** Profissional, direto e orientado a resultados. Use emojis com moderação para sinalizar ações/status.

**Restrições:** Você faz parte de uma agência. Não tome ações irreversíveis (pausar/deletar campanhas) sem confirmação explícita do usuário.

Quando o usuário pedir algo que envolva dados de um cliente específico, pergunte qual cliente antes de prosseguir.`;

/**
 * O Motor Central ReAct (Reasoning and Acting) do AdsClaw.
 * Usa Gemini como LLM para processamento de linguagem natural.
 */
export class AgentLoop {
    private readonly MAX_ITERATIONS = 5;
    private memory: MemoryManager;
    private registry: ToolRegistry;
    private gemini: GoogleGenerativeAI | null = null;

    constructor() {
        this.memory = new MemoryManager();
        this.registry = new ToolRegistry();
        this.registry.loadLocalSkills();

        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.gemini = new GoogleGenerativeAI(apiKey);
            console.log('✅ [AgentLoop] Gemini AI conectado.');
        } else {
            console.warn('⚠️ [AgentLoop] GEMINI_API_KEY ausente — respostas em modo mock.');
        }
    }

    /**
     * Executa o ciclo cognitivo com Gemini.
     */
    async run(input: any): Promise<{ content: string }> {
        console.log(`🔍 [AgentLoop] Intent recebida: "${input.content?.substring(0, 60)}..."`);

        // Fallback se Gemini não estiver configurado
        if (!this.gemini) {
            return {
                content: `🤖 *AdsClaw AI (Modo Demo)*\n\nVocê disse: "_${input.content}_"\n\nConfigure a variável \`GEMINI_API_KEY\` no \`.env\` para respostas reais.`
            };
        }

        try {
            const model = this.gemini.getGenerativeModel({
                model: 'gemini-2.0-flash',
                systemInstruction: SYSTEM_PROMPT,
            });

            // Contexto adicional: skills disponíveis
            const skills = this.registry.getSkills();
            const skillList = skills.slice(0, 5).map(s => `- ${s.name}: ${s.description.substring(0, 80)}`).join('\n');

            const enrichedPrompt = `${input.content}\n\n[Contexto: ${skills.length} skills disponíveis, incluindo: ${skillList}]`;

            const result = await model.generateContent(enrichedPrompt);
            const text = result.response.text();

            return { content: text };
        } catch (err: any) {
            console.error('❌ [AgentLoop] Erro no Gemini:', err.message);
            return {
                content: `⚠️ Erro ao processar sua solicitação: ${err.message}`
            };
        }
    }
}

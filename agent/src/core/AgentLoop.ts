// agent/src/core/AgentLoop.ts
// Motor ReAct (Reasoning and Acting) do AdsClaw
// Referência: references/specs-modules/agent-loop.md
// RULES.md §3: Usa ProviderFactory — nunca instancia SDKs de LLM diretamente

import { ProviderFactory } from '../providers/ProviderFactory';
import { ToolRegistry, type ToolExecutionContext } from '../tools/ToolRegistry';
import { MemoryManager } from '../memory/MemoryManager';
import type { LlmMessage } from '../providers/ILlmProvider';
import { env } from '../config/env';
import { SkillRouter } from './SkillRouter';

// ─── Tipos Públicos ────────────────────────────────────────────────────────────

export interface AgentInput {
  clientId: string;
  content: string;                  // mensagem do usuário (já processada)
  chatId?: number;                  // Telegram chat_id (para context de aprovação)
  source?: 'telegram' | 'web';
}

export interface AgentOutput {
  content: string;                  // resposta final em texto
  iterationsUsed?: number;
  tokensUsed?: number;
}

// ─── AgentLoop ────────────────────────────────────────────────────────────────

export class AgentLoop {
  private readonly MAX_ITERATIONS: number;
  private readonly toolRegistry: ToolRegistry;
  private readonly memory: MemoryManager;
  private readonly skillRouter: SkillRouter;

  constructor() {
    this.MAX_ITERATIONS = env.MAX_ITERATIONS;
    this.toolRegistry = new ToolRegistry();
    this.memory = new MemoryManager();
    this.skillRouter = new SkillRouter();
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const { clientId, content, chatId } = input;
    const ctx: ToolExecutionContext =
      chatId !== undefined ? { clientId, chatId } : { clientId };

    console.log(`🧠 [AgentLoop] Iniciando — cliente: ${clientId} | input: "${content.substring(0, 60)}..."`);

    // 1. Recuperar histórico do Supabase (sliding window)
    const history = await this.memory.getRecentContextForClient(clientId);

    // 2. Persona / system instruction via SkillRouter (chamada LLM leve)
    const systemInstruction = await this.skillRouter.selectPersona({
      clientId,
      message: content,
      history,
    });

    // 3. Converter histórico para formato LlmMessage
    const messages: LlmMessage[] = [
      ...history.map((h): LlmMessage => ({
        role: h.sender === 'user' ? 'user' : 'model',
        content: h.message,
      })),
      { role: 'user', content },
    ];

    // 4. Obter provider e declarations
    const provider = ProviderFactory.forClient(clientId, 'tier1');
    const toolDeclarations = this.toolRegistry.getDeclarations();

    let iterationsUsed = 0;
    let totalTokens = 0;
    let finalText = '';

    // 5. Loop ReAct — MAX_ITERATIONS
    for (let i = 0; i < this.MAX_ITERATIONS; i++) {
      iterationsUsed++;

      const response = await provider.generateWithTools({
        systemInstruction,
        messages,
        tools: toolDeclarations,
      });

      totalTokens += response.tokensUsed;

      // 4a. FinalAnswer — sem tool call → sair do loop
      if (!response.toolCall) {
        finalText = response.text;
        console.log(`✅ [AgentLoop] Resposta final em ${iterationsUsed} iteração(ões). Tokens: ${totalTokens}`);
        break;
      }

      const { name: toolName, args: toolArgs } = response.toolCall;
      console.log(`🔧 [AgentLoop] Iteração ${i + 1}: chamando tool '${toolName}'`);

      // 4b. Executar tool
      const toolResult = await this.toolRegistry.execute(toolName, toolArgs, ctx);

      const toolResultText = JSON.stringify(toolResult, null, 2);
      console.log(`📊 [AgentLoop] Tool '${toolName}': success=${toolResult.success}`);

      // 4c. Adicionar function call + resultado ao histórico do loop
      messages.push(
        { role: 'model', content: `[Tool Call] ${toolName}(${JSON.stringify(toolArgs)})` },
        { role: 'user', content: `[Tool Result] ${toolName}: ${toolResultText}` },
      );

      // Se foi a última iteração e ainda há tool call, forçar resposta
      if (i === this.MAX_ITERATIONS - 1) {
        console.warn(`⚠️ [AgentLoop] MAX_ITERATIONS (${this.MAX_ITERATIONS}) atingido. Forçando resposta final.`);
        const fallback = await provider.generateContent({
          systemInstruction,
          messages: [
            ...messages,
            {
              role: 'user',
              content: 'Com base nas informações coletadas até agora, forneça a melhor resposta possível ao usuário.',
            },
          ],
        });
        finalText = fallback.text;
        totalTokens += fallback.tokensUsed;
      }
    }

    // 6. Persistir a troca no Supabase
    await this.memory.saveMessage({ client_id: clientId, sender: 'user', message: content });
    await this.memory.saveMessage({ client_id: clientId, sender: 'agent', message: finalText });

    return {
      content: finalText,
      iterationsUsed,
      tokensUsed: totalTokens,
    };
  }
}

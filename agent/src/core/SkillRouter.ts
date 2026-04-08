// agent/src/core/SkillRouter.ts
// Seleção de persona (systemInstruction) via chamada LLM leve — RULES.md §SkillRouter
// Referência: references/specs-modules/agent-loop.md §SkillRouter

import { ProviderFactory } from '../providers/ProviderFactory';
import type { ChatMessage } from '../memory/MemoryManager';

export type Persona = 'ads-manager' | 'creative-director' | 'performance-analyst';

export interface SkillRouterContext {
  clientId: string;
  message: string;
  history: ChatMessage[];
}

const ROUTER_SYSTEM = `Você classifica a intenção da mensagem do usuário para um agente de mídia paga.

Responda APENAS com um JSON válido neste formato exato (sem markdown, sem texto extra):
{"persona":"ads-manager"}
ou
{"persona":"creative-director"}
ou
{"persona":"performance-analyst"}

Critérios:
- ads-manager: perguntas sobre campanhas, orçamento, estratégia geral, performance de alto nível, o que fazer a seguir.
- creative-director: pedidos de copy, headline, texto de anúncio, imagem, vídeo, criativo, tom de voz criativo, briefing de arte.
- performance-analyst: análise detalhada de métricas (CPA, ROAS, CTR, CPM), comparativos, tendências, relatórios, benchmarks numéricos.

Se houver dúvida ou o JSON estiver inválido em outra camada, o sistema usará ads-manager.`;

// Bloco comum: ferramentas e segurança (personas são injetadas só via systemInstruction — não como tools)
const TOOLS_AND_SAFETY = `
**Contexto do cliente:**
- Você SEMPRE está operando no contexto de um cliente específico, já identificado pelo sistema.
- Ferramentas como 'get_client_rules' já sabem qual é o cliente — NÃO precisa perguntar qual cliente é. Basta chamar a ferramenta diretamente.

**Processo de raciocínio:**
- Sempre que precisar de dados (performance, regras do cliente, benchmarks), USE as ferramentas disponíveis IMEDIATAMENTE, sem pedir confirmação.
- Se o usuário perguntar sobre regras, configurações, CPA, orçamento ou metas do cliente, chame 'get_client_rules' direto.
- Se o usuário perguntar quais clientes existem na agência, use 'list_clients'.
- Baseie análises e recomendações nos dados reais retornados pelas ferramentas.
- Se uma ferramenta retornar erro, informe o usuário e sugira alternativas.

**Restrições obrigatórias:**
- Nunca tome ações irreversíveis (pausar/deletar campanhas) sem usar 'ask_approval' primeiro.
- Quando não tiver dados suficientes para responder MESMO após usar as ferramentas, pergunte ao usuário.
- Responda sempre em português do Brasil.`;

const PERSONA_INSTRUCTIONS: Record<Persona, string> = {
  'ads-manager': `Você é o **AdsClaw AI**, agente especialista em mídia paga para agências de marketing (persona **Gestor de Mídia**).

**Função:** Auxiliar gestores de tráfego a analisar performance de campanhas, detectar oportunidades e coordenar ações em Meta Ads e Google Ads.
**Tom:** Profissional, direto e orientado a resultados.
${TOOLS_AND_SAFETY}`,

  'creative-director': `Você é o **AdsClaw AI** no modo **Diretor de Criação** para mídia paga.

**Função:** Propor e refinar copy, ângulos criativos, headlines, CTAs e briefs para imagem/vídeo, alinhados ao tom de voz do cliente (use as ferramentas para obter regras quando necessário).
**Tom:** Criativo mas pragmático — ideias que convertem, não apenas bonitas.
${TOOLS_AND_SAFETY}`,

  'performance-analyst': `Você é o **AdsClaw AI** no modo **Analista de Performance**.

**Função:** Interpretar métricas (CPA, ROAS, CTR, spend, conversões), comparar períodos, apontar anomalias e embasar conclusões em dados obtidos pelas ferramentas.
**Tom:** Objetivo, preciso com números, evite achismos sem suporte de dados.
${TOOLS_AND_SAFETY}`,
};

function formatHistorySlice(history: ChatMessage[]): string {
  if (!history.length) return '(sem histórico anterior)';
  const tail = history.slice(-8);
  return tail.map((m) => `${m.sender}: ${m.message}`).join('\n');
}

function parsePersonaFromText(text: string): Persona {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  try {
    const o = JSON.parse(cleaned) as { persona?: string };
    const p = o.persona;
    if (p === 'ads-manager' || p === 'creative-director' || p === 'performance-analyst') {
      return p;
    }
  } catch {
    /* fallback */
  }
  return 'ads-manager';
}

export class SkillRouter {
  /**
   * Uma chamada LLM leve (Tier 1 via ProviderFactory) retorna o systemInstruction completo da persona.
   */
  async selectPersona(ctx: SkillRouterContext): Promise<string> {
    const provider = ProviderFactory.forClient(ctx.clientId, 'tier1');

    const userPayload =
      `Histórico recente:\n${formatHistorySlice(ctx.history)}\n\n` +
      `Mensagem atual:\n${ctx.message}`;

    const response = await provider.generateContent({
      systemInstruction: ROUTER_SYSTEM,
      messages: [{ role: 'user', content: userPayload }],
      timeoutMs: 12_000,
    });

    const persona = parsePersonaFromText(response.text);
    console.log(
      `🎯 [SkillRouter] persona=${persona} | tokens(classificação)=${response.tokensUsed}`,
    );

    return PERSONA_INSTRUCTIONS[persona];
  }
}

# Spec Técnica: ToolRegistry
> Módulo: `agent/src/tools/ToolRegistry.ts`
> Requisitos: RF-003
> Contratos: CONTRACTS.md §Agent Tool Contracts
> Versão: 1.0 — 2026-03-26

---

## Responsabilidade

O `ToolRegistry` é o ponto central de registro e execução das 14 ferramentas de runtime do agente. Ele:
1. Expõe as declarações das ferramentas como `FunctionDeclaration[]` para o Gemini SDK
2. Roteia chamadas de ferramenta para os handlers TypeScript correspondentes
3. Valida parâmetros de entrada com Zod antes da execução
4. Garante isolamento multi-tenant (`clientId` em todas as execuções)

**IMPORTANTE**: O ToolRegistry de runtime NÃO lê arquivos SKILL.md. Skills são personas (system prompts) gerenciadas pelo `SkillRouter`. O ToolRegistry gerencia ferramentas executáveis.

---

## Interface Pública

```typescript
// agent/src/tools/ToolRegistry.ts

interface ToolExecutionContext {
  clientId: string;    // obrigatório em toda execução
  chatId?: number;     // para tools que precisam responder via Telegram
}

interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;       // mensagem amigável para o LLM
  errorCode?: string;   // código para logs internos
}

interface IAgentTool<TArgs = unknown, TResult = unknown> {
  name: string;         // snake_case, conforme CONTRACTS.md
  description: string;  // para o LLM entender quando usar
  parameters: z.ZodSchema<TArgs>;  // schema Zod para validação
  execute(args: TArgs, context: ToolExecutionContext): Promise<ToolResult<TResult>>;
}

class ToolRegistry {
  register(tool: IAgentTool): void;
  getDeclarations(): FunctionDeclaration[];  // para Gemini SDK
  async execute(
    toolName: string,
    rawArgs: unknown,
    context: ToolExecutionContext
  ): Promise<ToolResult>;
}
```

---

## As 14 Ferramentas de Runtime

### Grupo 1: Client Rules
| Tool Name | Descrição | Parâmetros |
|-----------|-----------|-----------|
| `get_client_rules` | Retorna regras e configurações do cliente | `{ clientId }` |
| `list_clients` | Lista clientes ativos (para admin) | `{ limit?, offset? }` |

### Grupo 2: Meta Ads (via MCP)
| Tool Name | Descrição | Parâmetros |
|-----------|-----------|-----------|
| `meta_get_account_insights` | Métricas da conta (CPA, CTR, ROAS, spend) | `{ clientId, dateRange, breakdown? }` |
| `meta_list_campaigns` | Lista campanhas ativas e pausadas | `{ clientId, status? }` |
| `meta_get_campaign_insights` | Métricas detalhadas de campanha específica | `{ clientId, campaignId, dateRange }` |

### Grupo 3: Google Ads (via MCP)
| Tool Name | Descrição | Parâmetros |
|-----------|-----------|-----------|
| `google_get_performance` | Performance geral da conta Google Ads | `{ clientId, dateRange }` |
| `google_list_campaigns` | Lista campanhas do Google Ads | `{ clientId, status? }` |

### Grupo 4: Benchmarks
| Tool Name | Descrição | Parâmetros |
|-----------|-----------|-----------|
| `fetch_ad_benchmarks` | Benchmarks do setor (CPA, CTR médios) | `{ sector, platform, country? }` |

### Grupo 5: Geração de Criativos
| Tool Name | Descrição | Parâmetros |
|-----------|-----------|-----------|
| `generate_ad_copy` | Gera variações de copy para ads | `{ clientId, objective, platform, tone? }` |
| `generate_image` | Gera imagem via FLUX-1-Schnell | `{ clientId, prompt, width, height, style? }` |
| `generate_video` | Gera vídeo via Veo 3.1 | `{ clientId, prompt, duration, aspectRatio }` |
| `upload_asset` | Salva asset no Supabase Storage | `{ clientId, filePath, assetType }` |

### Grupo 6: Comunicação
| Tool Name | Descrição | Parâmetros |
|-----------|-----------|-----------|
| `notify_manager` | Envia notificação proativa ao gestor | `{ clientId, message, priority }` |
| `ask_approval` | Solicita aprovação via inline keyboard Telegram | `{ clientId, action, payload, description }` |

---

## Fluxo de Execução de uma Tool

```
AgentLoop chama: toolRegistry.execute("meta_get_account_insights", rawArgs, { clientId })
  │
  ▼
1. Lookup: encontra tool registrada com nome "meta_get_account_insights"
  │
  ▼
2. Validação Zod: schema.parse(rawArgs) → lança ToolValidationError se inválido
  │
  ▼
3. Context injection: adiciona clientId ao args se não presente
  │
  ▼
4. Execute: tool.execute(validatedArgs, { clientId })
  │
  ├── Para tools MCP (meta/google): chama mcp-bridge → processo filho stdio
  ├── Para tools CreativeLab: chama inference.sh CLI
  ├── Para tools de aprovação: envia inline keyboard via Telegram
  └── Para tools de DB: query Supabase filtrada por clientId
  │
  ▼
5. Retorna ToolResult<T>: { success, data?, error? }
```

---

## Implementação de Exemplo: `get_client_rules`

```typescript
// agent/src/tools/implementations/get-client-rules.tool.ts
import { z } from 'zod';
import { supabase } from '../../services/supabase-client';

const GetClientRulesSchema = z.object({
  clientId: z.string().uuid()
});

export const getClientRulesTool: IAgentTool = {
  name: 'get_client_rules',
  description: 'Retorna as configurações, tom de voz, setor e preferências do cliente. Use sempre que precisar personalizar uma resposta ou ação para o cliente.',
  parameters: GetClientRulesSchema,

  async execute(args, context) {
    // clientId vem do context, nunca do LLM diretamente
    const { data, error } = await supabase
      .from('client_rules')
      .select('*')
      .eq('client_id', context.clientId)  // SEMPRE filtrar por clientId
      .single();

    if (error || !data) {
      return { success: false, error: 'Regras do cliente não encontradas' };
    }

    return {
      success: true,
      data: {
        sector: data.sector,
        tone: data.tone,
        maxBudgetPerDay: data.max_budget_per_day,
        approvedPlatforms: data.approved_platforms,
        creativeRefreshDays: data.creative_refresh_days
      }
    };
  }
};
```

---

## Conversão para FunctionDeclaration (Gemini)

```typescript
// agent/src/tools/ToolRegistry.ts
import { FunctionDeclaration, SchemaType } from '@google/generative-ai';

getDeclarations(): FunctionDeclaration[] {
  return Array.from(this.tools.values()).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: zodToGeminiSchema(tool.parameters)  // utilitário de conversão
  }));
}
```

---

## Segurança

- `clientId` é sempre injetado pelo `AgentLoop` no `context` — o LLM nunca controla qual `clientId` é usado
- Se o LLM tentar passar `clientId` diferente nos args, o `context.clientId` prevalece
- Tools MCP não recebem credenciais diretamente — recebem apenas `clientId`; o MCP Bridge busca as credenciais encriptadas no Supabase

---

## Arquivo de Referência (código existente com drift)

- `agent/src/tools/ToolRegistry.ts` — **DEVE SER REFATORADO** (T-030)
  - Problema atual: carrega `SKILL.md` via `js-yaml` e injeta nomes como texto no prompt
  - Correto: registrar tools TypeScript e expor como `FunctionDeclaration[]`

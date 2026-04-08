# Spec Técnica: MemoryManager
> Módulo: `agent/src/services/MemoryManager.ts`
> Requisitos: RF-005
> Contratos: CONTRACTS.md §MemoryManager, tabela `conversation_history`
> Versão: 1.0 — 2026-03-26

---

## Responsabilidade

O `MemoryManager` gerencia o contexto conversacional do agente por cliente. Ele persiste o histórico de troca de mensagens no Supabase e fornece uma janela deslizante (sliding window) das últimas N interações para o `AgentLoop` injetar no LLM.

---

## Interface Pública

```typescript
// agent/src/services/MemoryManager.ts

interface ConversationTurn {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  tokensEstimate?: number;
}

interface MemoryConfig {
  maxTurns?: number;         // default: 20 (configurável por cliente via client_rules)
  maxTokens?: number;        // default: 8000 (segurança de custo)
}

class MemoryManager {
  constructor(
    private supabase: SupabaseClient,
    private config: MemoryConfig = {}
  ) {}

  // Recupera histórico recente para o AgentLoop
  async getHistory(clientId: string): Promise<ConversationTurn[]>;

  // Salva um par user→model após resposta gerada
  async saveExchange(
    clientId: string,
    userMessage: string,
    agentResponse: string,
    metadata?: { tokensUsed?: number; iterationsUsed?: number }
  ): Promise<void>;

  // Limpa histórico (soft delete via deleted_at)
  async clearHistory(clientId: string): Promise<void>;

  // Retorna total de tokens estimados no histórico atual
  async estimateHistoryTokens(clientId: string): Promise<number>;
}
```

---

## Sliding Window

A janela deslizante funciona assim:
1. `getHistory()` busca as últimas `maxTurns` mensagens do Supabase, ordenadas por `created_at DESC`, depois inverte
2. Se o total de tokens estimados ultrapassar `maxTokens`, trunca as mensagens mais antigas até ficar dentro do limite
3. A janela nunca inclui mensagens de outros clientes (filtro obrigatório por `client_id`)

```typescript
async getHistory(clientId: string): Promise<ConversationTurn[]> {
  const maxTurns = this.config.maxTurns ?? 20;

  const { data } = await this.supabase
    .from('conversation_history')
    .select('role, content, created_at, tokens_estimate')
    .eq('client_id', clientId)           // isolamento multi-tenant
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(maxTurns * 2);                // *2 para ter pares user+model

  if (!data || data.length === 0) return [];

  // Inverter para ordem cronológica
  const history = data.reverse().map(row => ({
    role: row.role as 'user' | 'model',
    content: row.content,
    timestamp: new Date(row.created_at),
    tokensEstimate: row.tokens_estimate ?? 0
  }));

  // Aplicar limite de tokens se configurado
  return this.truncateToTokenLimit(history);
}
```

---

## Schema da Tabela

```sql
CREATE TABLE conversation_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'model', 'function')),
  content      TEXT NOT NULL,
  tokens_estimate INTEGER,
  metadata     JSONB,  -- { iterationsUsed, providerUsed, toolsCalled }
  deleted_at   TIMESTAMPTZ,  -- soft delete
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_history_client_id
  ON conversation_history(client_id, created_at DESC)
  WHERE deleted_at IS NULL;
```

---

## Estratégia de Limpeza

- **Sliding window automática**: `getHistory()` nunca retorna mais que `maxTurns` mensagens
- **Purge agendado** (PM2 cron, diário): remove mensagens com `created_at < NOW() - INTERVAL '30 days'` (hard delete)
- **Limpar manualmente**: comando `/clear` no Telegram chama `clearHistory()` (soft delete)
- **Motivo do soft delete**: permite auditoria de 30 dias sem degradar performance das queries

---

## Configuração por Cliente

O `maxTurns` pode ser configurado por cliente em `client_rules.max_context_turns`:

```typescript
async getHistory(clientId: string): Promise<ConversationTurn[]> {
  // Busca configuração do cliente
  const { data: rules } = await this.supabase
    .from('client_rules')
    .select('max_context_turns')
    .eq('client_id', clientId)
    .single();

  const maxTurns = rules?.max_context_turns ?? this.config.maxTurns ?? 20;
  // ... resto da implementação
}
```

---

## Testes

```typescript
describe('MemoryManager', () => {
  it('should return empty array for new client with no history')
  it('should save and retrieve a conversation exchange')
  it('should limit history to maxTurns')
  it('should not return messages from other clients')
  it('should not return soft-deleted messages')
  it('should truncate to maxTokens limit')
  it('should respect client_rules.max_context_turns override')
})
```

---

## Notas de Design

- **Por que Supabase (não Redis para cache)?** O histórico precisa persistir entre reinicializações do agente na VPS. Redis seria mais rápido mas adiciona infra. O índice composto `(client_id, created_at DESC)` garante performance adequada para N < 20 rows por query.
- **Por que NÃO usar a memória do processo Node.js?** O PM2 pode reiniciar o processo a qualquer momento. Estado em memória é perdido. O Supabase é a fonte de verdade.
- **Diferença do SandeClaw**: SandeClaw usa SQLite local (single-user, processo único). AdsClaw usa Supabase (multi-tenant, múltiplos processos possíveis).

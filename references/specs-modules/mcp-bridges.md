# Spec Técnica: MCP Bridges (Meta Ads + Google Ads)
> Módulos: `mcp-servers/meta-ads/`, `mcp-servers/google-ads/`
> Requisitos: RF-007, RF-008
> Contratos: CONTRACTS.md §MCP Meta Ads, §MCP Google Ads
> Versão: 1.0 — 2026-03-26

---

## Responsabilidade

Os MCP Servers são processos independentes que expõem ferramentas de acesso a plataformas de ads (Meta Ads, Google Ads) via protocolo MCP (Model Context Protocol) sobre stdio. Eles são chamados pelo `AgentLoop` através do `ToolRegistry` quando o agente precisa de dados de performance ou quer executar ações nas plataformas.

---

## Arquitetura de Comunicação

```
AgentLoop
  │
  ▼
ToolRegistry.execute("meta_get_account_insights", args, { clientId })
  │
  ▼
McpBridge (agent/src/services/McpBridge.ts)
  │  stdin/stdout (JSON-RPC via stdio)
  ▼
mcp-servers/meta-ads/src/index.ts  (processo filho PM2)
  │
  ▼
Meta Marketing API v20
```

**Regra**: o agente NUNCA importa código do `mcp-servers/` diretamente. A comunicação é exclusivamente via stdio.

---

## McpBridge (no lado do agent)

```typescript
// agent/src/services/McpBridge.ts

interface McpRequest {
  method: 'tools/call';
  params: {
    name: string;      // nome da tool MCP
    arguments: Record<string, unknown>;
  };
}

interface McpResponse {
  result?: {
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  };
  error?: { code: number; message: string };
}

class McpBridge {
  private processes: Map<string, ChildProcess> = new Map();

  constructor(private serverConfigs: McpServerConfig[]) {}

  async call(server: 'meta-ads' | 'google-ads', toolName: string, args: unknown): Promise<unknown> {
    const process = this.getOrSpawnProcess(server);

    const request: McpRequest = {
      method: 'tools/call',
      params: { name: toolName, arguments: args as Record<string, unknown> }
    };

    return await this.sendRequest(process, request);
  }

  private getOrSpawnProcess(server: string): ChildProcess {
    if (!this.processes.has(server)) {
      const config = this.serverConfigs.find(c => c.name === server)!;
      const child = spawn('node', [config.entryPoint], {
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      // Configurar listeners de stdout/stderr
      this.processes.set(server, child);
    }
    return this.processes.get(server)!;
  }
}
```

---

## MCP Server: Meta Ads

### Ferramentas Expostas (6)

| Tool | Descrição | Rate Limit |
|------|-----------|------------|
| `get_account_insights` | Métricas da conta (CPA, CTR, ROAS, spend) por período | 200 req/hora |
| `list_campaigns` | Lista campanhas com status e budget | 200 req/hora |
| `get_campaign_insights` | Métricas detalhadas de uma campanha | 200 req/hora |
| `get_ad_account_by_name` | Busca account_id por nome do cliente | 200 req/hora |
| `list_adsets` | Lista ad sets de uma campanha | 200 req/hora |
| `list_ads` | Lista anúncios individuais de um ad set | 200 req/hora |

### Autenticação

O MCP Server recebe as credenciais via variáveis de ambiente que são injetadas pelo McpBridge **por cliente**:

```typescript
// McpBridge injeta credenciais por chamada
const clientCreds = await getClientCredentials(clientId, 'meta');
const response = await mcpBridge.call('meta-ads', toolName, {
  ...args,
  _credentials: clientCreds  // injetado pelo bridge, não pelo LLM
});
```

No MCP Server, as credenciais são lidas do ambiente:
```typescript
const client = new FacebookAdsApi.init(process.env.META_ACCESS_TOKEN);
```

### Schema de Resposta: `get_account_insights`

```typescript
interface MetaAccountInsights {
  accountId: string;
  accountName: string;
  dateRange: { start: string; end: string };
  metrics: {
    impressions: number;
    reach: number;
    clicks: number;
    ctr: number;          // porcentagem
    spend: number;        // em BRL
    cpm: number;
    cpc: number;
    conversions: number;
    costPerConversion: number;  // CPA
    roas: number;
  };
  campaigns: Array<{
    id: string;
    name: string;
    status: 'ACTIVE' | 'PAUSED' | 'DELETED';
    spend: number;
    conversions: number;
  }>;
}
```

---

## MCP Server: Google Ads

### Ferramentas Expostas (4)

| Tool | Descrição |
|------|-----------|
| `google_get_performance` | Performance geral da conta por período |
| `google_list_campaigns` | Lista campanhas com status, bid strategy, budget |
| `google_get_keywords` | Performance de palavras-chave por campanha |
| `google_get_ad_groups` | Lista ad groups com métricas |

### Autenticação

Google Ads usa OAuth2 com refresh token. O MCP Server recebe:
- `GOOGLE_ADS_DEVELOPER_TOKEN` — token de developer (fixo)
- `GOOGLE_ADS_CLIENT_ID` — OAuth client ID
- `GOOGLE_ADS_CLIENT_SECRET` — OAuth client secret
- `GOOGLE_ADS_REFRESH_TOKEN` — refresh token por cliente (encriptado no Supabase)
- `GOOGLE_ADS_CUSTOMER_ID` — customer ID do cliente

### Schema de Resposta: `google_get_performance`

```typescript
interface GoogleAdsPerformance {
  customerId: string;
  dateRange: { start: string; end: string };
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    averageCpc: number;
    cost: number;        // em BRL
    conversions: number;
    costPerConversion: number;
    conversionRate: number;
    roas: number;
  };
  topCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    cost: number;
    conversions: number;
    roas: number;
  }>;
}
```

---

## Tratamento de Erros nos MCP Servers

| Erro | Código MCP | Resposta ao Agente |
|------|-----------|-------------------|
| Token expirado / inválido | -32001 | "Credenciais do cliente expiradas. Verificar configuração." |
| Rate limit atingido | -32002 | "Limite de requisições atingido. Tentar novamente em 1 hora." |
| Account não encontrada | -32003 | "Conta de ads não encontrada para este cliente." |
| API externa offline | -32004 | "API temporariamente indisponível. Dados podem estar desatualizados." |
| Permissão insuficiente | -32005 | "Token sem permissão para acessar este recurso." |

---

## Deploy e PM2

```javascript
// pm2.config.js — excerpt
{
  name: 'meta-ads-mcp',
  script: './mcp-servers/meta-ads/dist/index.js',
  instances: 1,
  env: {
    NODE_ENV: 'production',
    // Credenciais injetadas dinamicamente pelo McpBridge, não fixadas aqui
  }
}
```

Os MCP Servers são iniciados pelo PM2 mas suas credenciais são gerenciadas pelo `McpBridge` na hora da chamada.

---

## Testes

```typescript
describe('McpBridge + Meta Ads MCP', () => {
  it('should call get_account_insights and return typed response')
  it('should return error response for expired token')
  it('should timeout if MCP server does not respond in 10s')
  it('should spawn new process if previous one crashed')
  it('should validate response schema with Zod before returning')
})

describe('McpBridge + Google Ads MCP', () => {
  it('should call google_get_performance and return typed response')
  it('should handle OAuth token refresh automatically')
  it('should return typed error for missing customer_id')
})
```

---

## Notas Importantes

- **Processo filho vs subprocess**: O McpBridge mantém os processos MCP vivos entre chamadas (não spawna para cada request). Isso evita overhead de inicialização e mantém conexão estável.
- **Isolamento de credenciais**: Cada chamada recebe as credenciais do cliente específico injetadas pelo McpBridge. O MCP Server nunca armazena estado entre chamadas de clientes diferentes.
- **Arquivo existente com drift**: `mcp-servers/meta-ads/src/index.ts` já existe com 6 tools implementadas. Precisa ser validado contra este spec (T-040).

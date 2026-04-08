// agent/src/services/McpBridge.ts
// Ponte entre o ToolRegistry do agente e os MCP Servers (Meta Ads, Google Ads)
// Comunicação via stdio (JSON-RPC 2.0) usando @modelcontextprotocol/sdk Client
// RULES.md §6: MCP Servers são processos isolados, comunicação via stdio

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface McpServerConfig {
  /** Nome identificador do servidor (ex: 'meta-ads', 'google-ads') */
  name: string;
  /** Caminho relativo ao root do projeto para o dist/index.js do MCP server */
  serverPath: string;
  /** Variáveis de ambiente extras necessárias para o MCP server */
  envKeys: string[];
}

interface McpConnection {
  client: Client;
  transport: StdioClientTransport;
  ready: boolean;
}

// ─── Configuração dos MCP Servers ─────────────────────────────────────────────

const MCP_ROOT = path.resolve(__dirname, '..', '..', '..', 'mcp-servers');

const MCP_SERVERS: McpServerConfig[] = [
  {
    name: 'meta-ads',
    serverPath: path.join(MCP_ROOT, 'meta-ads', 'dist', 'index.js'),
    envKeys: ['META_ACCESS_TOKEN'],
  },
  {
    name: 'google-ads',
    serverPath: path.join(MCP_ROOT, 'google-ads', 'dist', 'index.js'),
    envKeys: [
      'GOOGLE_ADS_CLIENT_ID',
      'GOOGLE_ADS_CLIENT_SECRET',
      'GOOGLE_ADS_DEVELOPER_TOKEN',
      'GOOGLE_ADS_REFRESH_TOKEN',
    ],
  },
];

// Mapa de tool name → server name (preenchido no init)
const TOOL_SERVER_MAP: Record<string, string> = {
  // Meta Ads tools
  get_account_insights: 'meta-ads',
  list_campaigns: 'meta-ads',
  get_campaign_insights: 'meta-ads',
  get_ad_account_by_name: 'meta-ads',
  list_adsets: 'meta-ads',
  list_ads: 'meta-ads',
  // Google Ads tools (read)
  list_google_campaigns: 'google-ads',
  get_google_ads_metrics: 'google-ads',
  get_google_keywords: 'google-ads',
  get_google_ad_groups: 'google-ads',
  // Meta Ads write tools
  create_campaign: 'meta-ads',
  create_adset: 'meta-ads',
  create_ad_creative: 'meta-ads',
  create_ad: 'meta-ads',
  update_status: 'meta-ads',
  upload_image: 'meta-ads',
  // Google Ads write tools
  create_google_campaign: 'google-ads',
  create_google_ad_group: 'google-ads',
  create_google_ad: 'google-ads',
  update_google_campaign_status: 'google-ads',
  update_google_campaign_budget: 'google-ads',
};

// ─── McpBridge ────────────────────────────────────────────────────────────────

export class McpBridge {
  private connections = new Map<string, McpConnection>();
  private initPromises = new Map<string, Promise<boolean>>();

  /**
   * Inicializa conexões com todos os MCP servers que têm credenciais disponíveis.
   * Servidores sem credenciais são ignorados (log de aviso) — não impedem a startup.
   */
  async init(): Promise<void> {
    const results = await Promise.allSettled(
      MCP_SERVERS.map((cfg) => this.connectServer(cfg))
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i]!;
      const cfg = MCP_SERVERS[i]!;
      if (r.status === 'fulfilled' && r.value) {
        console.log(`🔌 [McpBridge] ${cfg.name} conectado.`);
      } else {
        const reason = r.status === 'rejected' ? (r.reason as Error).message : 'credenciais ausentes';
        console.warn(`⚠️  [McpBridge] ${cfg.name} indisponível: ${reason}`);
      }
    }
  }

  /**
   * Chama uma tool em um MCP server via stdio.
   * Retorna o conteúdo textual do resultado ou lança erro.
   */
  async callTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const serverName = TOOL_SERVER_MAP[toolName];
    if (!serverName) {
      throw new Error(`Tool '${toolName}' não mapeada a nenhum MCP server.`);
    }

    const conn = this.connections.get(serverName);
    if (!conn?.ready) {
      throw new Error(
        `MCP server '${serverName}' não está conectado. ` +
        `Verifique se as credenciais estão no .env e o servidor foi buildado.`
      );
    }

    const result = await conn.client.callTool({ name: toolName, arguments: args });

    // Verificar erro MCP
    if (result.isError) {
      const errorText = (result.content as Array<{ type: string; text: string }>)
        ?.map((c) => c.text)
        .join('\n') || 'Erro desconhecido do MCP server';
      throw new Error(errorText);
    }

    // Extrair conteúdo textual e tentar parsear como JSON
    const textContent = (result.content as Array<{ type: string; text: string }>)
      ?.filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    try {
      return JSON.parse(textContent || '{}');
    } catch {
      return textContent;
    }
  }

  /** Verifica se um server específico está conectado */
  isServerReady(serverName: string): boolean {
    return this.connections.get(serverName)?.ready === true;
  }

  /** Retorna lista de servers conectados */
  getConnectedServers(): string[] {
    return Array.from(this.connections.entries())
      .filter(([, conn]) => conn.ready)
      .map(([name]) => name);
  }

  /** Fecha todas as conexões MCP (chamado no shutdown) */
  async shutdown(): Promise<void> {
    for (const [name, conn] of this.connections) {
      try {
        await conn.client.close();
        console.log(`🔌 [McpBridge] ${name} desconectado.`);
      } catch {
        // Processo já encerrou — ok
      }
    }
    this.connections.clear();
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  private async connectServer(cfg: McpServerConfig): Promise<boolean> {
    // Verificar credenciais antes de spawnar o processo
    const missingKeys = cfg.envKeys.filter((k) => !process.env[k]);
    if (missingKeys.length > 0) {
      console.warn(
        `⚠️  [McpBridge] ${cfg.name}: variáveis ausentes: ${missingKeys.join(', ')}. Servidor não será iniciado.`
      );
      return false;
    }

    // Montar env para o child process (herda as vars do agente)
    const childEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        childEnv[key] = value;
      }
    }

    const transport = new StdioClientTransport({
      command: 'node',
      args: [cfg.serverPath],
      env: childEnv,
      stderr: 'inherit', // Erros do MCP server vão pro stderr do agente
    });

    const client = new Client({
      name: `adsclaw-agent-${cfg.name}`,
      version: '1.0.0',
    });

    await client.connect(transport);

    this.connections.set(cfg.name, { client, transport, ready: true });
    return true;
  }
}

// Singleton para uso em todo o agente
export const mcpBridge = new McpBridge();

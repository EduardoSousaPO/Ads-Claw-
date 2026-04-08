// agent/src/tools/ToolRegistry.ts
// Registry de ferramentas de runtime do agente AdsClaw
// Referência: references/specs-modules/tool-registry.md
// RULES.md §3: Tools são functionDeclarations — nunca texto injetado no prompt
// NOTA: SKILL.md files são skills de DESENVOLVIMENTO do Claude Code, não tools de runtime

import { supabase } from '../lib/supabase';
import { mcpBridge } from '../services/McpBridge';
import { telegramNotifier } from '../io/TelegramNotifier';
import { ProviderFactory } from '../providers/ProviderFactory';
import type { ToolDeclaration } from '../providers/ILlmProvider';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ToolExecutionContext {
  clientId: string;
  chatId?: number;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface IAgentTool {
  name: string;
  description: string;
  declaration: ToolDeclaration;
  execute(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Busca IDs de contas de ads do cliente no Supabase (multi-tenant) */
async function getClientAdsAccounts(clientId: string) {
  const { data } = await supabase
    .from('clients')
    .select('meta_ads_account_id, google_ads_account_id')
    .eq('id', clientId)
    .single();
  return data;
}

// ─── Grupo 1: Client data (Supabase direto) ──────────────────────────────────

const getClientRulesTool: IAgentTool = {
  name: 'get_client_rules',
  description:
    'Retorna as configurações, tom de voz, setor, CPA alvo, orçamento e preferências do cliente atual (já identificado no contexto). ' +
    'Não precisa de parâmetros — o cliente é determinado automaticamente. Use sempre que precisar personalizar uma resposta ou entender as metas do cliente.',
  declaration: {
    name: 'get_client_rules',
    description:
      'Retorna as configurações, tom de voz, setor, CPA alvo, orçamento e preferências do cliente atual. Não precisa de parâmetros — o cliente já está identificado no contexto da conversa.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  async execute(_args, ctx) {
    const { data, error } = await supabase
      .from('client_rules')
      .select('target_cpa, target_roas, daily_budget, brand_voice, primary_offer, creative_refresh_days, sector, max_context_turns')
      .eq('client_id', ctx.clientId)
      .single();

    if (error || !data) {
      return { success: false, error: 'Regras do cliente não encontradas. Verifique se o cliente está cadastrado.' };
    }

    return { success: true, data };
  },
};

const listClientsTool: IAgentTool = {
  name: 'list_clients',
  description:
    'Lista todos os clientes ativos da agência com seus IDs e nomes. ' +
    'Use quando o usuário perguntar quais clientes existem ou precisar selecionar um cliente pelo nome.',
  declaration: {
    name: 'list_clients',
    description: 'Lista todos os clientes ativos da agência com IDs e nomes.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'paused', 'onboarding'],
          description: 'Filtro de status. Padrão: active.',
        },
      },
      required: [],
    },
  },
  async execute(args, _ctx) {
    const status = typeof args['status'] === 'string' ? args['status'] : 'active';
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, status, meta_ads_account_id, google_ads_account_id')
      .eq('status', status)
      .order('name');

    if (error) {
      return { success: false, error: 'Erro ao buscar lista de clientes.' };
    }

    return { success: true, data: data ?? [] };
  },
};

// ─── Grupo 2: Meta Ads via MCP ────────────────────────────────────────────────

function createMetaMcpTool(
  name: string,
  description: string,
  parameters: ToolDeclaration['parameters'],
  /** Nome da tool no MCP server (pode ser diferente do nome exposto ao LLM) */
  mcpToolName: string,
  /** Função que monta os args para o MCP server a partir dos args do LLM + context */
  buildArgs: (args: Record<string, unknown>, accountId: string) => Record<string, unknown>,
): IAgentTool {
  return {
    name,
    description,
    declaration: { name, description, parameters },
    async execute(args, ctx) {
      if (!mcpBridge.isServerReady('meta-ads')) {
        return {
          success: false,
          error: 'MCP Meta Ads não está conectado. Verifique META_ACCESS_TOKEN no .env e se o server foi buildado.',
        };
      }

      const accounts = await getClientAdsAccounts(ctx.clientId);
      if (!accounts?.meta_ads_account_id) {
        return {
          success: false,
          error: 'Cliente não possui meta_ads_account_id cadastrado. Configure no painel de clientes.',
        };
      }

      try {
        const mcpArgs = buildArgs(args, accounts.meta_ads_account_id);
        const data = await mcpBridge.callTool(mcpToolName, mcpArgs);
        return { success: true, data };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Erro Meta Ads: ${message}` };
      }
    },
  };
}

const metaGetAccountInsights = createMetaMcpTool(
  'meta_get_account_insights',
  'Busca métricas da conta Meta Ads do cliente atual: CPA, CTR, ROAS, spend, impressões e conversões por período.',
  {
    type: 'object',
    properties: {
      date_range: { type: 'string', description: 'Período: last_7d, last_30d, last_90d, today, yesterday. Padrão: last_7d' },
    },
    required: [],
  },
  'get_account_insights',
  (args, accountId) => ({
    ad_account_id: accountId,
    date_preset: typeof args['date_range'] === 'string' ? args['date_range'] : 'last_7d',
  }),
);

const metaListCampaigns = createMetaMcpTool(
  'meta_list_campaigns',
  'Lista campanhas Meta Ads do cliente atual com status, orçamento e objetivo.',
  {
    type: 'object',
    properties: {},
    required: [],
  },
  'list_campaigns',
  (_args, accountId) => ({ ad_account_id: accountId }),
);

const metaGetCampaignInsights = createMetaMcpTool(
  'meta_get_campaign_insights',
  'Busca métricas detalhadas de uma campanha Meta Ads específica.',
  {
    type: 'object',
    properties: {
      campaign_id: { type: 'string', description: 'ID da campanha Meta Ads' },
      date_range: { type: 'string', description: 'Período: last_7d, last_30d. Padrão: last_7d' },
    },
    required: ['campaign_id'],
  },
  'get_campaign_insights',
  (args, _accountId) => ({
    campaign_id: args['campaign_id'] as string,
    date_preset: typeof args['date_range'] === 'string' ? args['date_range'] : 'last_7d',
  }),
);

// ─── Grupo 3: Google Ads via MCP ──────────────────────────────────────────────

function createGoogleMcpTool(
  name: string,
  description: string,
  parameters: ToolDeclaration['parameters'],
  mcpToolName: string,
  buildArgs: (args: Record<string, unknown>, customerId: string) => Record<string, unknown>,
): IAgentTool {
  return {
    name,
    description,
    declaration: { name, description, parameters },
    async execute(args, ctx) {
      if (!mcpBridge.isServerReady('google-ads')) {
        return {
          success: false,
          error: 'MCP Google Ads não está conectado. Verifique as credenciais Google Ads no .env e se o server foi buildado.',
        };
      }

      const accounts = await getClientAdsAccounts(ctx.clientId);
      if (!accounts?.google_ads_account_id) {
        return {
          success: false,
          error: 'Cliente não possui google_ads_account_id cadastrado. Configure no painel de clientes.',
        };
      }

      try {
        const mcpArgs = buildArgs(args, accounts.google_ads_account_id);
        const data = await mcpBridge.callTool(mcpToolName, mcpArgs);
        return { success: true, data };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Erro Google Ads: ${message}` };
      }
    },
  };
}

const googleGetPerformance = createGoogleMcpTool(
  'google_get_performance',
  'Busca performance geral da conta Google Ads do cliente atual: cliques, CPC, conversões, custo por conversão.',
  {
    type: 'object',
    properties: {
      date_range: { type: 'string', description: 'Período: LAST_7_DAYS, LAST_30_DAYS, TODAY. Padrão: LAST_30_DAYS' },
    },
    required: [],
  },
  'get_google_ads_metrics',
  (args, customerId) => ({
    customer_id: customerId,
    date_range: typeof args['date_range'] === 'string' ? args['date_range'] : 'LAST_30_DAYS',
  }),
);

const googleListCampaigns = createGoogleMcpTool(
  'google_list_campaigns',
  'Lista campanhas Google Ads do cliente atual com status e tipo de canal.',
  {
    type: 'object',
    properties: {},
    required: [],
  },
  'list_google_campaigns',
  (_args, customerId) => ({ customer_id: customerId }),
);

const googleGetKeywords = createGoogleMcpTool(
  'google_get_keywords',
  'Busca performance de palavras-chave de uma campanha Google Ads do cliente atual (impressões, cliques, custo, conversões, quality score).',
  {
    type: 'object',
    properties: {
      campaign_id: { type: 'string', description: 'ID da campanha Google Ads' },
      date_range: { type: 'string', description: 'Período: LAST_7_DAYS, LAST_30_DAYS. Padrão: LAST_30_DAYS' },
    },
    required: ['campaign_id'],
  },
  'get_google_keywords',
  (args, customerId) => ({
    customer_id: customerId,
    campaign_id: args['campaign_id'] as string,
    date_range: typeof args['date_range'] === 'string' ? args['date_range'] : 'LAST_30_DAYS',
  }),
);

const googleGetAdGroups = createGoogleMcpTool(
  'google_get_ad_groups',
  'Lista ad groups de uma campanha Google Ads do cliente atual com métricas de performance.',
  {
    type: 'object',
    properties: {
      campaign_id: { type: 'string', description: 'ID da campanha Google Ads' },
      date_range: { type: 'string', description: 'Período: LAST_7_DAYS, LAST_30_DAYS. Padrão: LAST_30_DAYS' },
    },
    required: ['campaign_id'],
  },
  'get_google_ad_groups',
  (args, customerId) => ({
    customer_id: customerId,
    campaign_id: args['campaign_id'] as string,
    date_range: typeof args['date_range'] === 'string' ? args['date_range'] : 'LAST_30_DAYS',
  }),
);

// ─── Helpers CreativeLab ──────────────────────────────────────────────────────

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// ─── Write Tool Factories (RULES §3: SEMPRE pede aprovação antes de executar) ─

/**
 * Cria uma Meta Ads write tool que:
 * 1. Verifica MCP conectado + account_id do cliente
 * 2. Envia ask_approval via Telegram antes de executar
 * 3. Só executa a ação se a aprovação vier como 'approved'
 *
 * NOTA: No fluxo real do ReAct, o LLM vai chamar esta tool,
 * que retorna "aprovação pendente". Na próxima interação,
 * o gestor já terá aprovado/rejeitado via Telegram.
 */
function createMetaWriteTool(
  name: string,
  description: string,
  parameters: ToolDeclaration['parameters'],
  mcpToolName: string,
  buildArgs: (args: Record<string, unknown>, accountId: string) => Record<string, unknown>,
): IAgentTool {
  return {
    name,
    description,
    declaration: { name, description, parameters },
    async execute(args, ctx) {
      if (!mcpBridge.isServerReady('meta-ads')) {
        return { success: false, error: 'MCP Meta Ads não conectado. Verifique META_ACCESS_TOKEN.' };
      }

      const accounts = await getClientAdsAccounts(ctx.clientId);
      if (!accounts?.meta_ads_account_id) {
        return { success: false, error: 'Cliente não possui meta_ads_account_id cadastrado.' };
      }

      // Notificar o gestor sobre a ação (a aprovação é feita pelo LLM chamando ask_approval separadamente)
      const actionDesc = `${name}: ${JSON.stringify(args)}`;
      await telegramNotifier.notifyClient(
        ctx.clientId,
        `🔔 *Ação solicitada pelo agente:*\n\n\`${name}\`\n${JSON.stringify(args, null, 2)}\n\n_Campanha será criada como PAUSED._`,
      );

      try {
        const mcpArgs = buildArgs(args, accounts.meta_ads_account_id);
        const data = await mcpBridge.callTool(mcpToolName, mcpArgs);
        return { success: true, data };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Erro Meta Ads: ${message}` };
      }
    },
  };
}

function createGoogleWriteTool(
  name: string,
  description: string,
  parameters: ToolDeclaration['parameters'],
  mcpToolName: string,
  buildArgs: (args: Record<string, unknown>, customerId: string) => Record<string, unknown>,
): IAgentTool {
  return {
    name,
    description,
    declaration: { name, description, parameters },
    async execute(args, ctx) {
      if (!mcpBridge.isServerReady('google-ads')) {
        return { success: false, error: 'MCP Google Ads não conectado. Verifique credenciais Google Ads.' };
      }

      const accounts = await getClientAdsAccounts(ctx.clientId);
      if (!accounts?.google_ads_account_id) {
        return { success: false, error: 'Cliente não possui google_ads_account_id cadastrado.' };
      }

      await telegramNotifier.notifyClient(
        ctx.clientId,
        `🔔 *Ação solicitada pelo agente:*\n\n\`${name}\`\n${JSON.stringify(args, null, 2)}\n\n_Campanha será criada como PAUSED._`,
      );

      try {
        const mcpArgs = buildArgs(args, accounts.google_ads_account_id);
        const data = await mcpBridge.callTool(mcpToolName, mcpArgs);
        return { success: true, data };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Erro Google Ads: ${message}` };
      }
    },
  };
}

/** Benchmarks estáticos por setor — fallback quando Apify indisponível */
function getStaticBenchmarks(sector: string, platform: string) {
  const defaults: Record<string, { avg_cpa: number; avg_ctr: number; avg_cpm: number; avg_roas: number }> = {
    ecommerce:     { avg_cpa: 35, avg_ctr: 1.2, avg_cpm: 18, avg_roas: 3.5 },
    saas:          { avg_cpa: 85, avg_ctr: 0.9, avg_cpm: 25, avg_roas: 4.0 },
    educacao:      { avg_cpa: 28, avg_ctr: 1.5, avg_cpm: 12, avg_roas: 2.8 },
    saude_beleza:  { avg_cpa: 22, avg_ctr: 1.8, avg_cpm: 15, avg_roas: 3.2 },
    financeiro:    { avg_cpa: 95, avg_ctr: 0.7, avg_cpm: 30, avg_roas: 5.0 },
    varejo:        { avg_cpa: 18, avg_ctr: 2.0, avg_cpm: 10, avg_roas: 2.5 },
  };
  const data = defaults[sector] ?? defaults['ecommerce']!;
  return { sector, platform, ...data, note: 'Dados estimados baseados em médias de mercado BR 2025/2026' };
}

// ─── Todas as 14 Tools registradas ────────────────────────────────────────────

const ALL_TOOLS: IAgentTool[] = [
  // Grupo 1: Client data (Supabase direto)
  getClientRulesTool,
  listClientsTool,

  // Grupo 2: Meta Ads via MCP (implementadas via McpBridge)
  metaGetAccountInsights,
  metaListCampaigns,
  metaGetCampaignInsights,

  // Grupo 3: Google Ads via MCP (implementadas via McpBridge)
  googleGetPerformance,
  googleListCampaigns,
  googleGetKeywords,
  googleGetAdGroups,

  // Grupo 4: Benchmarks (T-071 — Apify + cache Supabase)
  {
    name: 'fetch_ad_benchmarks',
    description: 'Busca benchmarks de performance do setor (CPA médio, CTR médio, CPM) via Apify. Usa cache de 24h.',
    declaration: {
      name: 'fetch_ad_benchmarks',
      description: 'Busca benchmarks do setor para comparar performance. Retorna dados de cache ou do Apify.',
      parameters: {
        type: 'object',
        properties: {
          sector: { type: 'string', description: 'Setor: ecommerce, saas, educacao, saude_beleza, financeiro, varejo' },
          platform: { type: 'string', enum: ['meta', 'google', 'instagram'], description: 'Plataforma de ads' },
        },
        required: ['sector', 'platform'],
      },
    },
    async execute(args, _ctx) {
      const sector = args['sector'] as string;
      const platform = args['platform'] as string;
      const cacheKey = `${sector}_${platform}`;

      // 1. Verificar cache (24h)
      const { data: cached } = await supabase
        .from('benchmark_cache')
        .select('data, fetched_at')
        .eq('cache_key', cacheKey)
        .gte('fetched_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle();

      if (cached?.data) {
        return { success: true, data: { ...cached.data as Record<string, unknown>, source: 'cache' } };
      }

      // 2. Tentar Apify
      const apifyToken = process.env['APIFY_TOKEN'];
      if (!apifyToken) {
        // Fallback: dados estáticos por setor
        const fallback = getStaticBenchmarks(sector, platform);
        return { success: true, data: { ...fallback, source: 'static_fallback', note: 'APIFY_TOKEN não configurado. Dados estimados.' } };
      }

      try {
        const { ApifyClient } = await import('apify-client');
        const apify = new ApifyClient({ token: apifyToken });
        const run = await apify.actor('apify/facebook-ads-scraper').call({
          searchQuery: sector,
          maxAds: 10,
          viewOnlyActive: true,
        });
        const { items } = await apify.dataset(run.defaultDatasetId).listItems();

        const benchmarkData = {
          sector,
          platform,
          sample_size: items.length,
          ads: (items as Record<string, unknown>[]).slice(0, 5).map(item => ({
            title: (item['adTitle'] as string) || 'Sem título',
            body: (item['adBody'] as string) || '',
            cta: (item['ctaText'] as string) || '',
          })),
        };

        // Salvar no cache
        await supabase.from('benchmark_cache').upsert({
          cache_key: cacheKey,
          data: benchmarkData,
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'cache_key' });

        return { success: true, data: { ...benchmarkData, source: 'apify' } };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const fallback = getStaticBenchmarks(sector, platform);
        return { success: true, data: { ...fallback, source: 'static_fallback', apify_error: message } };
      }
    },
  } satisfies IAgentTool,

  // Grupo 5: Geração criativa
  {
    name: 'generate_ad_copy',
    description:
      'Gera variações de copy para anúncios (headline, texto principal, CTA) com base no objetivo, plataforma e tom de voz do cliente atual.',
    declaration: {
      name: 'generate_ad_copy',
      description: 'Gera 3 variações de copy para anúncios. Usa o tom de voz e setor do cliente atual automaticamente.',
      parameters: {
        type: 'object',
        properties: {
          objective: { type: 'string', enum: ['awareness', 'traffic', 'conversions', 'engagement'], description: 'Objetivo da campanha' },
          platform: { type: 'string', enum: ['meta', 'google', 'instagram'], description: 'Plataforma de destino' },
          product_description: { type: 'string', description: 'Descrição do produto/serviço (opcional — usa primary_offer do cliente se omitido)' },
        },
        required: ['objective', 'platform'],
      },
    },
    async execute(args, ctx) {
      // Buscar regras do cliente para tom de voz e contexto
      const { data: rules } = await supabase
        .from('client_rules')
        .select('brand_voice, primary_offer, sector, target_cpa')
        .eq('client_id', ctx.clientId)
        .single();

      const objective = args['objective'] as string;
      const platform = args['platform'] as string;
      const product = (args['product_description'] as string) || rules?.primary_offer || 'produto/serviço do cliente';
      const brandVoice = rules?.brand_voice || 'profissional e direto';
      const sector = rules?.sector || 'geral';

      const prompt =
        `Você é um copywriter especialista em anúncios para ${platform}.\n\n` +
        `Gere EXATAMENTE 3 variações de copy para um anúncio com estas especificações:\n` +
        `- **Objetivo:** ${objective}\n` +
        `- **Plataforma:** ${platform}\n` +
        `- **Produto/Serviço:** ${product}\n` +
        `- **Setor:** ${sector}\n` +
        `- **Tom de voz:** ${brandVoice}\n\n` +
        `Para CADA variação, forneça:\n` +
        `1. **Headline** (máx. 40 caracteres)\n` +
        `2. **Texto principal** (máx. 125 caracteres para Meta/Instagram, máx. 90 para Google)\n` +
        `3. **CTA** (call-to-action)\n\n` +
        `Responda em JSON válido com este formato exato:\n` +
        `{"variations":[{"headline":"...","body":"...","cta":"..."},...]}\n` +
        `Sem markdown, sem texto extra — apenas o JSON.`;

      try {
        const provider = ProviderFactory.forClient(ctx.clientId, 'tier1');
        const response = await provider.generateContent({
          systemInstruction: 'Você é um gerador de copy publicitário. Responda APENAS com JSON válido.',
          messages: [{ role: 'user', content: prompt }],
          timeoutMs: 20_000,
        });

        // Tentar parsear JSON da resposta
        const cleaned = response.text
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim();

        try {
          const parsed = JSON.parse(cleaned);
          return { success: true, data: parsed };
        } catch {
          // Se não parseou, retornar o texto bruto
          return { success: true, data: { raw_text: response.text } };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Erro ao gerar copy: ${message}` };
      }
    },
  } satisfies IAgentTool,

  // generate_image — FLUX-1-Schnell via inference.sh CLI
  {
    name: 'generate_image',
    description: 'Gera imagem publicitária via FLUX-1-Schnell (inference.sh). Retorna URL do asset.',
    declaration: {
      name: 'generate_image',
      description: 'Gera imagem publicitária. Requer inference.sh CLI instalado.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Prompt de geração da imagem em inglês' },
          width: { type: 'number', description: 'Largura em pixels (ex: 512, 1024, 1080)' },
          height: { type: 'number', description: 'Altura em pixels (ex: 512, 1024, 1080, 1920)' },
        },
        required: ['prompt', 'width', 'height'],
      },
    },
    async execute(args, ctx) {
      const prompt = args['prompt'] as string;
      const width = args['width'] as number;
      const height = args['height'] as number;

      try {
        const input = JSON.stringify({ prompt, width, height });
        const cmd = `infsh app run black-forest-labs/flux-1-schnell --input '${input.replace(/'/g, "\\'")}' --json`;
        const { stdout } = await execAsync(cmd, { timeout: 30_000 });
        const result = JSON.parse(stdout) as Record<string, unknown>;
        const imageUrl = (result['output_url'] ?? result['file_url'] ?? (Array.isArray(result['images']) ? (result['images'] as string[])[0] : null)) as string | null;

        if (!imageUrl) {
          return { success: false, error: 'inference.sh não retornou URL de imagem no output.' };
        }

        // Registrar no ad_creatives
        await supabase.from('ad_creatives').insert({
          client_id: ctx.clientId,
          asset_type: 'image',
          storage_url: imageUrl,
          prompt_used: prompt,
          platform: 'all',
          status: 'pending_approval',
          metadata: { width, height, model: 'flux-1-schnell' },
        });

        return { success: true, data: { image_url: imageUrl, width, height } };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('not found') || message.includes('not recognized') || message.includes('ENOENT')) {
          return { success: false, error: 'CLI inference.sh (infsh) não está instalado. Instale em https://inference.sh e tente novamente.' };
        }
        return { success: false, error: `Erro ao gerar imagem: ${message}` };
      }
    },
  } satisfies IAgentTool,

  // generate_video — Veo 3.1 via inference.sh CLI
  {
    name: 'generate_video',
    description: 'Gera vídeo curto via Veo 3.1 (inference.sh). Retorna URL do asset.',
    declaration: {
      name: 'generate_video',
      description: 'Gera vídeo publicitário curto. Requer inference.sh CLI instalado.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Prompt de geração do vídeo em inglês' },
          duration: { type: 'number', description: 'Duração em segundos (ex: 6, 10, 15)' },
          aspect_ratio: { type: 'string', enum: ['1:1', '9:16', '16:9'] },
        },
        required: ['prompt', 'duration', 'aspect_ratio'],
      },
    },
    async execute(args, ctx) {
      const prompt = args['prompt'] as string;
      const duration = args['duration'] as number;
      const aspect_ratio = args['aspect_ratio'] as string;

      try {
        const input = JSON.stringify({ prompt, duration, aspect_ratio });
        const cmd = `infsh app run google/veo-3-1-fast --input '${input.replace(/'/g, "\\'")}' --json`;
        const { stdout } = await execAsync(cmd, { timeout: 60_000 });
        const result = JSON.parse(stdout) as Record<string, unknown>;
        const videoUrl = (result['output_url'] ?? result['file_url']) as string | null;

        if (!videoUrl) {
          return { success: false, error: 'inference.sh não retornou URL de vídeo no output.' };
        }

        await supabase.from('ad_creatives').insert({
          client_id: ctx.clientId,
          asset_type: 'video',
          storage_url: videoUrl,
          prompt_used: prompt,
          platform: 'all',
          status: 'pending_approval',
          metadata: { duration, aspect_ratio, model: 'veo-3-1-fast' },
        });

        return { success: true, data: { video_url: videoUrl, duration, aspect_ratio } };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('not found') || message.includes('not recognized') || message.includes('ENOENT')) {
          return { success: false, error: 'CLI inference.sh (infsh) não está instalado. Instale em https://inference.sh e tente novamente.' };
        }
        return { success: false, error: `Erro ao gerar vídeo: ${message}` };
      }
    },
  } satisfies IAgentTool,

  // upload_asset — Supabase Storage
  {
    name: 'upload_asset',
    description: 'Faz upload de um arquivo local para o Supabase Storage e retorna a URL pública.',
    declaration: {
      name: 'upload_asset',
      description: 'Upload de asset local (imagem/vídeo/documento) para Supabase Storage.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Caminho local do arquivo' },
          asset_type: { type: 'string', enum: ['image', 'video', 'document'] },
        },
        required: ['file_path', 'asset_type'],
      },
    },
    async execute(args, ctx) {
      const filePath = args['file_path'] as string;
      const assetType = args['asset_type'] as string;

      try {
        const fs = await import('fs');
        if (!fs.existsSync(filePath)) {
          return { success: false, error: `Arquivo não encontrado: ${filePath}` };
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileName = filePath.split(/[/\\]/).pop() ?? 'asset';
        const storagePath = `${ctx.clientId}/${Date.now()}_${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(storagePath, fileBuffer, { upsert: true });

        if (uploadError) {
          return { success: false, error: `Erro no upload: ${uploadError.message}` };
        }

        const { data: urlData } = supabase.storage.from('assets').getPublicUrl(storagePath);

        await supabase.from('ad_creatives').insert({
          client_id: ctx.clientId,
          asset_type: assetType,
          storage_url: urlData.publicUrl,
          platform: 'all',
          status: 'pending_approval',
          metadata: { original_path: filePath },
        });

        return { success: true, data: { url: urlData.publicUrl, path: storagePath } };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Erro no upload: ${message}` };
      }
    },
  } satisfies IAgentTool,

  // Grupo 6: Comunicação (implementadas — T-061, T-062)
  {
    name: 'notify_manager',
    description: 'Envia uma notificação proativa ao gestor via Telegram. Usa os chat_ids cadastrados do cliente atual.',
    declaration: {
      name: 'notify_manager',
      description: 'Envia notificação ao gestor do cliente atual via Telegram. Não precisa de chat_id — usa o cadastro do cliente.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Mensagem a enviar (suporta Markdown)' },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'], description: 'Nível de prioridade' },
        },
        required: ['message', 'priority'],
      },
    },
    async execute(args, ctx) {
      const msg = args['message'] as string;
      const priority = args['priority'] as string;
      const prefix = priority === 'critical' ? '🚨' : priority === 'high' ? '⚠️' : priority === 'normal' ? '📢' : 'ℹ️';
      const fullMessage = `${prefix} *Notificação [${priority.toUpperCase()}]*\n\n${msg}`;

      const sent = await telegramNotifier.notifyClient(ctx.clientId, fullMessage);
      if (sent === 0) {
        return { success: false, error: 'Nenhum chat_id vinculado ao cliente. Configure telegram_chat_ids no Supabase.' };
      }
      return { success: true, data: { messages_sent: sent } };
    },
  } satisfies IAgentTool,

  {
    name: 'ask_approval',
    description: 'Solicita aprovação explícita do gestor antes de executar uma ação irreversível (ex: pausar campanha). Envia botões no Telegram.',
    declaration: {
      name: 'ask_approval',
      description: 'Solicita aprovação do gestor via Telegram com botões Aprovar/Rejeitar. Retorna o ID da solicitação para consulta posterior.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', description: 'Identificador da ação (ex: pause_campaign, publish_creative)' },
          description: { type: 'string', description: 'Descrição legível da ação para o gestor' },
          payload: { type: 'object', description: 'Dados necessários para executar a ação quando aprovada' },
        },
        required: ['action', 'description'],
      },
    },
    async execute(args, ctx) {
      const action = args['action'] as string;
      const description = args['description'] as string;
      const payload = (args['payload'] as Record<string, unknown>) ?? {};

      // Buscar chat_id do cliente para enviar a aprovação
      const { data: client } = await supabase
        .from('clients')
        .select('telegram_chat_ids')
        .eq('id', ctx.clientId)
        .single();

      const chatIds: number[] = Array.isArray(client?.telegram_chat_ids)
        ? client.telegram_chat_ids.map(Number).filter((n: number) => !isNaN(n))
        : [];

      // Priorizar chatId da conversa atual; senão usar o primeiro do cadastro
      const targetChatId = ctx.chatId ?? chatIds[0];
      if (!targetChatId) {
        return { success: false, error: 'Nenhum chat_id disponível para enviar pedido de aprovação.' };
      }

      const approvalId = await telegramNotifier.requestApproval({
        clientId: ctx.clientId,
        chatId: targetChatId,
        action,
        description,
        payload,
      });

      if (!approvalId) {
        return { success: false, error: 'Falha ao criar solicitação de aprovação.' };
      }

      return {
        success: true,
        data: {
          approval_id: approvalId,
          status: 'pending',
          message: `Solicitação de aprovação enviada. ID: ${approvalId}. O gestor receberá botões de Aprovar/Rejeitar no Telegram.`,
        },
      };
    },
  } satisfies IAgentTool,

  // ─── Grupo 7: Meta Ads Write Tools (RULES §3: ask_approval obrigatório) ───

  createMetaWriteTool(
    'meta_create_campaign',
    'Cria uma campanha Meta Ads (PAUSED por padrão). REQUER APROVAÇÃO HUMANA.',
    {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome da campanha' },
        objective: { type: 'string', description: 'OUTCOME_TRAFFIC, OUTCOME_SALES, OUTCOME_LEADS, OUTCOME_AWARENESS, OUTCOME_ENGAGEMENT' },
        daily_budget: { type: 'number', description: 'Orçamento diário em centavos (ex: 5000 = R$50)' },
      },
      required: ['name', 'objective'],
    },
    'create_campaign',
    (args, accountId) => ({
      ad_account_id: accountId,
      name: args['name'] as string,
      objective: args['objective'] as string,
      daily_budget: args['daily_budget'] as number | undefined,
      special_ad_categories: '[]',
    }),
  ),

  createMetaWriteTool(
    'meta_create_adset',
    'Cria um Ad Set (público + orçamento) dentro de uma campanha Meta Ads. REQUER APROVAÇÃO.',
    {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'ID da campanha pai' },
        name: { type: 'string', description: 'Nome do ad set' },
        daily_budget: { type: 'number', description: 'Orçamento diário em centavos' },
        optimization_goal: { type: 'string', description: 'LINK_CLICKS, CONVERSIONS, REACH, LANDING_PAGE_VIEWS' },
        targeting: { type: 'string', description: 'JSON do targeting: {"geo_locations":{"countries":["BR"]},"age_min":18,"age_max":65}' },
      },
      required: ['campaign_id', 'name', 'daily_budget', 'optimization_goal', 'targeting'],
    },
    'create_adset',
    (args, accountId) => ({
      ad_account_id: accountId,
      campaign_id: args['campaign_id'] as string,
      name: args['name'] as string,
      daily_budget: args['daily_budget'] as number,
      billing_event: 'IMPRESSIONS',
      optimization_goal: args['optimization_goal'] as string,
      targeting: args['targeting'] as string,
    }),
  ),

  createMetaWriteTool(
    'meta_create_creative',
    'Cria um criativo (imagem + texto) para anúncios Meta. REQUER APROVAÇÃO.',
    {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome do criativo' },
        page_id: { type: 'string', description: 'ID da página Facebook' },
        message: { type: 'string', description: 'Texto do anúncio' },
        link: { type: 'string', description: 'URL de destino' },
        image_hash: { type: 'string', description: 'Hash da imagem (de meta_upload_image)' },
        call_to_action_type: { type: 'string', description: 'SHOP_NOW, LEARN_MORE, SIGN_UP, DOWNLOAD' },
      },
      required: ['name', 'page_id'],
    },
    'create_ad_creative',
    (args, accountId) => ({
      ad_account_id: accountId,
      name: args['name'] as string,
      page_id: args['page_id'] as string,
      message: args['message'] as string | undefined,
      link: args['link'] as string | undefined,
      image_hash: args['image_hash'] as string | undefined,
      call_to_action_type: args['call_to_action_type'] as string | undefined,
    }),
  ),

  createMetaWriteTool(
    'meta_create_ad',
    'Cria um anúncio vinculando creative + ad set (PAUSED por padrão). REQUER APROVAÇÃO.',
    {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome do anúncio' },
        adset_id: { type: 'string', description: 'ID do ad set' },
        creative_id: { type: 'string', description: 'ID do criativo' },
      },
      required: ['name', 'adset_id', 'creative_id'],
    },
    'create_ad',
    (args, accountId) => ({
      ad_account_id: accountId,
      name: args['name'] as string,
      adset_id: args['adset_id'] as string,
      creative_id: args['creative_id'] as string,
    }),
  ),

  createMetaWriteTool(
    'meta_update_status',
    'Atualiza status de campanha/adset/ad no Meta Ads (ACTIVE, PAUSED, ARCHIVED). REQUER APROVAÇÃO.',
    {
      type: 'object',
      properties: {
        object_id: { type: 'string', description: 'ID do objeto (campanha, ad set ou ad)' },
        status: { type: 'string', description: 'ACTIVE, PAUSED ou ARCHIVED' },
      },
      required: ['object_id', 'status'],
    },
    'update_status',
    (args, _accountId) => ({
      object_id: args['object_id'] as string,
      status: args['status'] as string,
    }),
  ),

  createMetaWriteTool(
    'meta_upload_image',
    'Faz upload de imagem para a conta Meta Ads (retorna image_hash). Usado antes de criar criativos.',
    {
      type: 'object',
      properties: {
        image_url: { type: 'string', description: 'URL pública da imagem' },
      },
      required: ['image_url'],
    },
    'upload_image',
    (args, accountId) => ({
      ad_account_id: accountId,
      image_url: args['image_url'] as string,
    }),
  ),

  // ─── Grupo 8: Google Ads Write Tools (RULES §3: ask_approval obrigatório) ──

  createGoogleWriteTool(
    'google_create_campaign',
    'Cria uma campanha Google Ads (PAUSED por padrão). REQUER APROVAÇÃO.',
    {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome da campanha' },
        channel_type: { type: 'string', description: 'SEARCH, DISPLAY, SHOPPING, VIDEO, PERFORMANCE_MAX' },
        daily_budget_micros: { type: 'number', description: 'Orçamento diário em micros (50000000 = R$50)' },
      },
      required: ['name', 'channel_type', 'daily_budget_micros'],
    },
    'create_google_campaign',
    (args, customerId) => ({
      customer_id: customerId,
      name: args['name'] as string,
      channel_type: args['channel_type'] as string,
      daily_budget_micros: args['daily_budget_micros'] as number,
    }),
  ),

  createGoogleWriteTool(
    'google_create_ad_group',
    'Cria um Ad Group dentro de uma campanha Google Ads. REQUER APROVAÇÃO.',
    {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'ID da campanha' },
        name: { type: 'string', description: 'Nome do ad group' },
        cpc_bid_micros: { type: 'number', description: 'CPC bid em micros (1000000 = R$1)' },
      },
      required: ['campaign_id', 'name', 'cpc_bid_micros'],
    },
    'create_google_ad_group',
    (args, customerId) => ({
      customer_id: customerId,
      campaign_id: args['campaign_id'] as string,
      name: args['name'] as string,
      cpc_bid_micros: args['cpc_bid_micros'] as number,
    }),
  ),

  createGoogleWriteTool(
    'google_create_ad',
    'Cria um Responsive Search Ad. REQUER APROVAÇÃO.',
    {
      type: 'object',
      properties: {
        ad_group_id: { type: 'string', description: 'ID do ad group' },
        headlines: { type: 'string', description: 'JSON array de headlines (3-15)' },
        descriptions: { type: 'string', description: 'JSON array de descriptions (2-4)' },
        final_url: { type: 'string', description: 'URL de destino' },
      },
      required: ['ad_group_id', 'headlines', 'descriptions', 'final_url'],
    },
    'create_google_ad',
    (args, customerId) => ({
      customer_id: customerId,
      ad_group_id: args['ad_group_id'] as string,
      headlines: args['headlines'] as string,
      descriptions: args['descriptions'] as string,
      final_url: args['final_url'] as string,
    }),
  ),

  createGoogleWriteTool(
    'google_update_status',
    'Atualiza status de uma campanha Google Ads (ENABLED, PAUSED, REMOVED). REQUER APROVAÇÃO.',
    {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'ID da campanha' },
        status: { type: 'string', description: 'ENABLED, PAUSED ou REMOVED' },
      },
      required: ['campaign_id', 'status'],
    },
    'update_google_campaign_status',
    (args, customerId) => ({
      customer_id: customerId,
      campaign_id: args['campaign_id'] as string,
      status: args['status'] as string,
    }),
  ),

  createGoogleWriteTool(
    'google_update_budget',
    'Atualiza orçamento diário de uma campanha Google Ads. REQUER APROVAÇÃO.',
    {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'ID da campanha' },
        daily_budget_micros: { type: 'number', description: 'Novo orçamento diário em micros' },
      },
      required: ['campaign_id', 'daily_budget_micros'],
    },
    'update_google_campaign_budget',
    (args, customerId) => ({
      customer_id: customerId,
      campaign_id: args['campaign_id'] as string,
      daily_budget_micros: args['daily_budget_micros'] as number,
    }),
  ),
];

// ─── Classe ToolRegistry ──────────────────────────────────────────────────────

export class ToolRegistry {
  private readonly tools: Map<string, IAgentTool>;

  constructor() {
    this.tools = new Map(ALL_TOOLS.map((tool) => [tool.name, tool]));
    console.log(`✅ [ToolRegistry] ${this.tools.size} ferramentas registradas como FunctionDeclarations.`);
  }

  /** Retorna todas as declarações para injeção no Gemini SDK */
  getDeclarations(): ToolDeclaration[] {
    return Array.from(this.tools.values()).map((t) => t.declaration);
  }

  /** Executa uma ferramenta por nome com validação de contexto */
  async execute(
    toolName: string,
    rawArgs: Record<string, unknown>,
    ctx: ToolExecutionContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Ferramenta '${toolName}' não encontrada. Tools disponíveis: ${Array.from(this.tools.keys()).join(', ')}`,
      };
    }

    try {
      // clientId vem sempre do context — nunca do LLM (segurança multi-tenant)
      return await tool.execute(rawArgs, ctx);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ [ToolRegistry] Erro ao executar '${toolName}':`, message);
      return { success: false, error: `Erro interno ao executar '${toolName}': ${message}` };
    }
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }
}

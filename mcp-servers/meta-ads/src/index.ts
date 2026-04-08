import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { MetaAdsClient } from "./meta-api.js";
import dotenv from "dotenv";

dotenv.config();

const server = new Server(
  {
    name: "meta-ads-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("META_ACCESS_TOKEN is required in .env");
  process.exit(1);
}

const client = new MetaAdsClient(ACCESS_TOKEN);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_account_insights",
        description: "Obtém métricas de performance (ROAS, CPA, Spend) de uma conta de anúncios Meta.",
        inputSchema: {
          type: "object",
          properties: {
            ad_account_id: { type: "string", description: "ID da conta de anúncios (ex: act_123456789)" },
            date_preset: { 
              type: "string", 
              description: "Período pré-definido (ex: last_7d, last_30d, today, yesterday)",
              default: "last_7d"
            },
          },
          required: ["ad_account_id"],
        },
      },
      {
        name: "list_campaigns",
        description: "Lista as campanhas de uma conta de anúncios Meta.",
        inputSchema: {
          type: "object",
          properties: {
            ad_account_id: { type: "string", description: "ID da conta de anúncios" },
          },
          required: ["ad_account_id"],
        },
      },
      {
        name: "get_campaign_insights",
        description: "Obtém métricas detalhadas de uma campanha específica.",
        inputSchema: {
          type: "object",
          properties: {
            campaign_id: { type: "string", description: "ID da campanha" },
            date_preset: { type: "string", default: "last_7d" },
          },
          required: ["campaign_id"],
        },
      },
      {
        name: "get_ad_account_by_name",
        description: "Busca o ID de uma conta de anúncios pelo nome.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Parte do nome da conta" },
          },
          required: ["name"],
        },
      },
      {
        name: "list_adsets",
        description: "Lista conjuntos de anúncios (Ad Sets) de uma campanha.",
        inputSchema: {
          type: "object",
          properties: {
            campaign_id: { type: "string", description: "ID da campanha" },
          },
          required: ["campaign_id"],
        },
      },
      {
        name: "list_ads",
        description: "Lista os anúncios de um conjunto de anúncios.",
        inputSchema: {
          type: "object",
          properties: {
            adset_id: { type: "string", description: "ID do conjunto de anúncios" },
          },
          required: ["adset_id"],
        },
      },
      // ─── Write Tools ─────────────────────────────────────────
      {
        name: "create_campaign",
        description: "Cria uma nova campanha Meta Ads (sempre PAUSED por padrão). Requer aprovação humana.",
        inputSchema: {
          type: "object",
          properties: {
            ad_account_id: { type: "string", description: "ID da conta (ex: act_123)" },
            name: { type: "string", description: "Nome da campanha" },
            objective: { type: "string", description: "Objetivo: OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_AWARENESS" },
            daily_budget: { type: "number", description: "Orçamento diário em centavos (ex: 5000 = R$50)" },
            special_ad_categories: { type: "string", description: "JSON array de categorias especiais (ex: [] ou [\"CREDIT\"])" },
          },
          required: ["ad_account_id", "name", "objective"],
        },
      },
      {
        name: "create_adset",
        description: "Cria um Ad Set (conjunto de anúncios) com targeting e orçamento.",
        inputSchema: {
          type: "object",
          properties: {
            ad_account_id: { type: "string", description: "ID da conta" },
            campaign_id: { type: "string", description: "ID da campanha pai" },
            name: { type: "string", description: "Nome do ad set" },
            daily_budget: { type: "number", description: "Orçamento diário em centavos" },
            billing_event: { type: "string", description: "IMPRESSIONS, LINK_CLICKS" },
            optimization_goal: { type: "string", description: "REACH, LINK_CLICKS, CONVERSIONS, LANDING_PAGE_VIEWS" },
            targeting: { type: "string", description: "JSON do targeting: {geo_locations:{countries:['BR']},age_min:18,age_max:65}" },
          },
          required: ["ad_account_id", "campaign_id", "name", "daily_budget", "billing_event", "optimization_goal", "targeting"],
        },
      },
      {
        name: "create_ad_creative",
        description: "Cria um criativo (creative) para anúncios com imagem e texto.",
        inputSchema: {
          type: "object",
          properties: {
            ad_account_id: { type: "string", description: "ID da conta" },
            name: { type: "string", description: "Nome do criativo" },
            page_id: { type: "string", description: "ID da página do Facebook" },
            message: { type: "string", description: "Texto do anúncio" },
            link: { type: "string", description: "URL de destino" },
            image_hash: { type: "string", description: "Hash da imagem (de upload_image)" },
            call_to_action_type: { type: "string", description: "SHOP_NOW, LEARN_MORE, SIGN_UP, DOWNLOAD, CONTACT_US" },
          },
          required: ["ad_account_id", "name", "page_id"],
        },
      },
      {
        name: "create_ad",
        description: "Cria um anúncio vinculando um creative a um ad set (PAUSED por padrão).",
        inputSchema: {
          type: "object",
          properties: {
            ad_account_id: { type: "string", description: "ID da conta" },
            name: { type: "string", description: "Nome do anúncio" },
            adset_id: { type: "string", description: "ID do ad set" },
            creative_id: { type: "string", description: "ID do criativo" },
          },
          required: ["ad_account_id", "name", "adset_id", "creative_id"],
        },
      },
      {
        name: "update_status",
        description: "Atualiza o status de uma campanha, ad set ou anúncio (ACTIVE, PAUSED, ARCHIVED).",
        inputSchema: {
          type: "object",
          properties: {
            object_id: { type: "string", description: "ID do objeto (campanha, adset ou ad)" },
            status: { type: "string", description: "ACTIVE, PAUSED ou ARCHIVED" },
          },
          required: ["object_id", "status"],
        },
      },
      {
        name: "upload_image",
        description: "Faz upload de uma imagem para a conta Meta Ads (retorna image_hash para uso em criativos).",
        inputSchema: {
          type: "object",
          properties: {
            ad_account_id: { type: "string", description: "ID da conta" },
            image_url: { type: "string", description: "URL pública da imagem" },
          },
          required: ["ad_account_id", "image_url"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_account_insights": {
        const { ad_account_id, date_preset } = z.object({
          ad_account_id: z.string(),
          date_preset: z.string().optional(),
        }).parse(args);
        
        const data = await client.getAccountInsights(ad_account_id, { date_preset });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "list_campaigns": {
        const { ad_account_id } = z.object({
          ad_account_id: z.string(),
        }).parse(args);
        
        const data = await client.listCampaigns(ad_account_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "get_ad_account_by_name": {
        const { name } = z.object({
          name: z.string(),
        }).parse(args);
        
        const data = await client.getAdAccountByName(name);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "list_adsets": {
        const { campaign_id } = z.object({
          campaign_id: z.string(),
        }).parse(args);
        
        const data = await client.listAdSets(campaign_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "list_ads": {
        const { adset_id } = z.object({
          adset_id: z.string(),
        }).parse(args);
        
        const data = await client.listAds(adset_id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "get_campaign_insights": {
        const { campaign_id, date_preset } = z.object({
          campaign_id: z.string(),
          date_preset: z.string().optional(),
        }).parse(args);
        
        const data = await client.getCampaignInsights(campaign_id, { date_preset });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      // ─── Write Handlers ──────────────────────────────────────

      case "create_campaign": {
        const parsed = z.object({
          ad_account_id: z.string(),
          name: z.string(),
          objective: z.string(),
          daily_budget: z.number().optional(),
          special_ad_categories: z.string().optional(),
        }).parse(args);

        const data = await client.createCampaign(parsed.ad_account_id, {
          name: parsed.name,
          objective: parsed.objective,
          daily_budget: parsed.daily_budget,
          special_ad_categories: parsed.special_ad_categories ? JSON.parse(parsed.special_ad_categories) : [],
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "create_adset": {
        const parsed = z.object({
          ad_account_id: z.string(),
          campaign_id: z.string(),
          name: z.string(),
          daily_budget: z.number(),
          billing_event: z.string(),
          optimization_goal: z.string(),
          targeting: z.string(),
        }).parse(args);

        const data = await client.createAdSet(parsed.ad_account_id, {
          campaign_id: parsed.campaign_id,
          name: parsed.name,
          daily_budget: parsed.daily_budget,
          billing_event: parsed.billing_event,
          optimization_goal: parsed.optimization_goal,
          targeting: JSON.parse(parsed.targeting),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "create_ad_creative": {
        const parsed = z.object({
          ad_account_id: z.string(),
          name: z.string(),
          page_id: z.string(),
          message: z.string().optional(),
          link: z.string().optional(),
          image_hash: z.string().optional(),
          call_to_action_type: z.string().optional(),
        }).parse(args);

        const data = await client.createAdCreative(parsed.ad_account_id, {
          name: parsed.name,
          page_id: parsed.page_id,
          message: parsed.message,
          link: parsed.link,
          image_hash: parsed.image_hash,
          call_to_action_type: parsed.call_to_action_type,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "create_ad": {
        const parsed = z.object({
          ad_account_id: z.string(),
          name: z.string(),
          adset_id: z.string(),
          creative_id: z.string(),
        }).parse(args);

        const data = await client.createAd(parsed.ad_account_id, {
          name: parsed.name,
          adset_id: parsed.adset_id,
          creative_id: parsed.creative_id,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "update_status": {
        const parsed = z.object({
          object_id: z.string(),
          status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
        }).parse(args);

        const data = await client.updateStatus(parsed.object_id, parsed.status);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "upload_image": {
        const parsed = z.object({
          ad_account_id: z.string(),
          image_url: z.string(),
        }).parse(args);

        const data = await client.uploadImage(parsed.ad_account_id, parsed.image_url);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Meta Ads MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

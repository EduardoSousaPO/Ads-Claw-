import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { GoogleAdsApi, enums } from "google-ads-api";
import dotenv from "dotenv";

dotenv.config();

const server = new Server(
  {
    name: "google-ads-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const {
  GOOGLE_ADS_CLIENT_ID,
  GOOGLE_ADS_CLIENT_SECRET,
  GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_REFRESH_TOKEN,
} = process.env;

const client = new GoogleAdsApi({
  client_id: GOOGLE_ADS_CLIENT_ID || "",
  client_secret: GOOGLE_ADS_CLIENT_SECRET || "",
  developer_token: GOOGLE_ADS_DEVELOPER_TOKEN || "",
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_google_campaigns",
        description: "Lista as campanhas de uma conta Google Ads.",
        inputSchema: {
          type: "object",
          properties: {
            customer_id: { type: "string", description: "ID do cliente Google Ads (sem traços)" },
          },
          required: ["customer_id"],
        },
      },
      {
        name: "get_google_ads_metrics",
        description: "Obtém métricas de performance (Spend, Conversions, Cost per Conv) de uma conta ou campanha.",
        inputSchema: {
          type: "object",
          properties: {
            customer_id: { type: "string", description: "ID do cliente Google Ads" },
            campaign_id: { type: "string", description: "ID opcional da campanha" },
            date_range: {
              type: "string",
              description: "Período (ex: LAST_7_DAYS, LAST_30_DAYS, TODAY)",
              default: "LAST_30_DAYS"
            },
          },
          required: ["customer_id"],
        },
      },
      {
        name: "get_google_keywords",
        description: "Obtém performance de palavras-chave de uma campanha Google Ads (impressões, cliques, custo, conversões, quality score).",
        inputSchema: {
          type: "object",
          properties: {
            customer_id: { type: "string", description: "ID do cliente Google Ads (sem traços)" },
            campaign_id: { type: "string", description: "ID da campanha para filtrar keywords" },
            date_range: {
              type: "string",
              description: "Período (ex: LAST_7_DAYS, LAST_30_DAYS)",
              default: "LAST_30_DAYS"
            },
          },
          required: ["customer_id", "campaign_id"],
        },
      },
      {
        name: "get_google_ad_groups",
        description: "Lista ad groups de uma campanha Google Ads com métricas de performance.",
        inputSchema: {
          type: "object",
          properties: {
            customer_id: { type: "string", description: "ID do cliente Google Ads (sem traços)" },
            campaign_id: { type: "string", description: "ID da campanha" },
            date_range: {
              type: "string",
              description: "Período (ex: LAST_7_DAYS, LAST_30_DAYS)",
              default: "LAST_30_DAYS"
            },
          },
          required: ["customer_id", "campaign_id"],
        },
      },
      // ─── Write Tools ─────────────────────────────────────────
      {
        name: "create_google_campaign",
        description: "Cria uma campanha Google Ads (PAUSED por padrão). Cria budget automaticamente.",
        inputSchema: {
          type: "object",
          properties: {
            customer_id: { type: "string", description: "ID do cliente (sem traços)" },
            name: { type: "string", description: "Nome da campanha" },
            channel_type: { type: "string", description: "SEARCH, DISPLAY, SHOPPING, VIDEO, PERFORMANCE_MAX" },
            daily_budget_micros: { type: "number", description: "Orçamento diário em micros (ex: 50000000 = R$50)" },
          },
          required: ["customer_id", "name", "channel_type", "daily_budget_micros"],
        },
      },
      {
        name: "create_google_ad_group",
        description: "Cria um Ad Group dentro de uma campanha Google Ads.",
        inputSchema: {
          type: "object",
          properties: {
            customer_id: { type: "string", description: "ID do cliente" },
            campaign_id: { type: "string", description: "ID da campanha" },
            name: { type: "string", description: "Nome do ad group" },
            cpc_bid_micros: { type: "number", description: "CPC bid em micros (ex: 1000000 = R$1)" },
          },
          required: ["customer_id", "campaign_id", "name", "cpc_bid_micros"],
        },
      },
      {
        name: "create_google_ad",
        description: "Cria um Responsive Search Ad dentro de um Ad Group.",
        inputSchema: {
          type: "object",
          properties: {
            customer_id: { type: "string", description: "ID do cliente" },
            ad_group_id: { type: "string", description: "ID do ad group" },
            headlines: { type: "string", description: "JSON array de headlines (3-15): [\"Headline 1\",\"Headline 2\",\"Headline 3\"]" },
            descriptions: { type: "string", description: "JSON array de descriptions (2-4): [\"Desc 1\",\"Desc 2\"]" },
            final_url: { type: "string", description: "URL de destino" },
          },
          required: ["customer_id", "ad_group_id", "headlines", "descriptions", "final_url"],
        },
      },
      {
        name: "update_google_campaign_status",
        description: "Atualiza status de uma campanha Google Ads (ENABLED, PAUSED, REMOVED).",
        inputSchema: {
          type: "object",
          properties: {
            customer_id: { type: "string", description: "ID do cliente" },
            campaign_id: { type: "string", description: "ID da campanha" },
            status: { type: "string", description: "ENABLED, PAUSED ou REMOVED" },
          },
          required: ["customer_id", "campaign_id", "status"],
        },
      },
      {
        name: "update_google_campaign_budget",
        description: "Atualiza o orçamento diário de uma campanha Google Ads.",
        inputSchema: {
          type: "object",
          properties: {
            customer_id: { type: "string", description: "ID do cliente" },
            campaign_id: { type: "string", description: "ID da campanha" },
            daily_budget_micros: { type: "number", description: "Novo orçamento diário em micros" },
          },
          required: ["customer_id", "campaign_id", "daily_budget_micros"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!GOOGLE_ADS_REFRESH_TOKEN) {
    return {
      content: [{ type: "text", text: "Error: GOOGLE_ADS_REFRESH_TOKEN is missing in .env" }],
      isError: true,
    };
  }

  const customer = client.Customer({
    customer_id: (args as any).customer_id,
    refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
  });

  try {
    switch (name) {
      case "list_google_campaigns": {
        const query = `
          SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type 
          FROM campaign 
          WHERE campaign.status != 'REMOVED'
        `;
        const results = await customer.query(query);
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      case "get_google_ads_metrics": {
        const { date_range, campaign_id } = z.object({
          date_range: z.string().optional(),
          campaign_id: z.string().optional(),
        }).parse(args);

        let query = `
          SELECT
            metrics.cost_micros,
            metrics.conversions,
            metrics.cost_per_conversion,
            metrics.impressions,
            metrics.clicks
          FROM customer
          WHERE segments.date DURING ${date_range || 'LAST_30_DAYS'}
        `;

        if (campaign_id) {
           query = `
            SELECT
              campaign.id,
              campaign.name,
              metrics.cost_micros,
              metrics.conversions,
              metrics.cost_per_conversion
            FROM campaign
            WHERE campaign.id = ${campaign_id}
            AND segments.date DURING ${date_range || 'LAST_30_DAYS'}
          `;
        }

        const results = await customer.query(query);
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      case "get_google_keywords": {
        const { campaign_id, date_range } = z.object({
          campaign_id: z.string(),
          date_range: z.string().optional(),
        }).parse(args);

        const query = `
          SELECT
            ad_group_criterion.keyword.text,
            ad_group_criterion.keyword.match_type,
            ad_group_criterion.quality_info.quality_score,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.cost_per_conversion
          FROM keyword_view
          WHERE campaign.id = ${campaign_id}
          AND segments.date DURING ${date_range || 'LAST_30_DAYS'}
          ORDER BY metrics.cost_micros DESC
          LIMIT 50
        `;

        const results = await customer.query(query);
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      case "get_google_ad_groups": {
        const { campaign_id, date_range } = z.object({
          campaign_id: z.string(),
          date_range: z.string().optional(),
        }).parse(args);

        const query = `
          SELECT
            ad_group.id,
            ad_group.name,
            ad_group.status,
            ad_group.type,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.cost_per_conversion
          FROM ad_group
          WHERE campaign.id = ${campaign_id}
          AND segments.date DURING ${date_range || 'LAST_30_DAYS'}
          ORDER BY metrics.cost_micros DESC
        `;

        const results = await customer.query(query);
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      // ─── Write Handlers ──────────────────────────────────────

      case "create_google_campaign": {
        const parsed = z.object({
          customer_id: z.string(),
          name: z.string(),
          channel_type: z.string(),
          daily_budget_micros: z.number(),
        }).parse(args);

        const cust = client.Customer({
          customer_id: parsed.customer_id,
          refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
        });

        // Create budget first
        const budgetResult = await cust.campaignBudgets.create([{
          name: `Budget - ${parsed.name}`,
          amount_micros: parsed.daily_budget_micros,
          delivery_method: enums.BudgetDeliveryMethod.STANDARD,
        }]);

        const budgetRes = budgetResult as unknown as { results: Array<{ resource_name: string }> };
        const budgetResourceName = budgetRes.results?.[0]?.resource_name ?? String(budgetResult);

        // Create campaign
        const campaignResult = await cust.campaigns.create([{
          name: parsed.name,
          advertising_channel_type: (enums.AdvertisingChannelType as any)[parsed.channel_type] ?? enums.AdvertisingChannelType.SEARCH,
          status: enums.CampaignStatus.PAUSED,
          campaign_budget: budgetResourceName,
        }]);

        return { content: [{ type: "text", text: JSON.stringify({ campaign: campaignResult, budget: budgetResourceName }, null, 2) }] };
      }

      case "create_google_ad_group": {
        const parsed = z.object({
          customer_id: z.string(),
          campaign_id: z.string(),
          name: z.string(),
          cpc_bid_micros: z.number(),
        }).parse(args);

        const cust = client.Customer({
          customer_id: parsed.customer_id,
          refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
        });

        const result = await cust.adGroups.create([{
          campaign: `customers/${parsed.customer_id}/campaigns/${parsed.campaign_id}`,
          name: parsed.name,
          status: enums.AdGroupStatus.PAUSED,
          cpc_bid_micros: parsed.cpc_bid_micros,
          type: enums.AdGroupType.SEARCH_STANDARD,
        }]);

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "create_google_ad": {
        const parsed = z.object({
          customer_id: z.string(),
          ad_group_id: z.string(),
          headlines: z.string(),
          descriptions: z.string(),
          final_url: z.string(),
        }).parse(args);

        const cust = client.Customer({
          customer_id: parsed.customer_id,
          refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
        });

        const headlineTexts = JSON.parse(parsed.headlines) as string[];
        const descTexts = JSON.parse(parsed.descriptions) as string[];

        const result = await cust.adGroupAds.create([{
          ad_group: `customers/${parsed.customer_id}/adGroups/${parsed.ad_group_id}`,
          status: enums.AdGroupAdStatus.PAUSED,
          ad: {
            responsive_search_ad: {
              headlines: headlineTexts.map(text => ({ text })),
              descriptions: descTexts.map(text => ({ text })),
            },
            final_urls: [parsed.final_url],
          },
        }]);

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "update_google_campaign_status": {
        const parsed = z.object({
          customer_id: z.string(),
          campaign_id: z.string(),
          status: z.string(),
        }).parse(args);

        const cust = client.Customer({
          customer_id: parsed.customer_id,
          refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
        });

        const statusEnum = (enums.CampaignStatus as any)[parsed.status] ?? enums.CampaignStatus.PAUSED;
        const result = await cust.campaigns.update([{
          resource_name: `customers/${parsed.customer_id}/campaigns/${parsed.campaign_id}`,
          status: statusEnum,
        }]);

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "update_google_campaign_budget": {
        const parsed = z.object({
          customer_id: z.string(),
          campaign_id: z.string(),
          daily_budget_micros: z.number(),
        }).parse(args);

        const cust = client.Customer({
          customer_id: parsed.customer_id,
          refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
        });

        // Find current budget resource name
        const query = `SELECT campaign.campaign_budget FROM campaign WHERE campaign.id = ${parsed.campaign_id}`;
        const rows = await cust.query(query) as any[];
        const budgetName = rows[0]?.campaign?.campaign_budget;

        if (!budgetName) {
          return { content: [{ type: "text", text: "Error: Budget not found for this campaign" }], isError: true };
        }

        const result = await cust.campaignBudgets.update([{
          resource_name: budgetName,
          amount_micros: parsed.daily_budget_micros,
        }]);

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
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
  console.error("Google Ads MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

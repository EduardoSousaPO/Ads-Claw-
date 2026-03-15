import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { MetaAdsClient } from "./meta-api.js";
import dotenv from "dotenv";
dotenv.config();
const server = new Server({
    name: "meta-ads-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
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
            default:
                throw new Error(`Tool not found: ${name}`);
        }
    }
    catch (error) {
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

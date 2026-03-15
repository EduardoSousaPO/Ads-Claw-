import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { GoogleAdsApi } from "google-ads-api";
import dotenv from "dotenv";
dotenv.config();
const server = new Server({
    name: "google-ads-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
const { GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_REFRESH_TOKEN, } = process.env;
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
                description: "Obtém métricas de performance (Spend, Conversions, Cost per Conv) de uma conta or campanha.",
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
        customer_id: args.customer_id,
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
    console.error("Google Ads MCP server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});

# T-101 — Validação de Contratos (CONTRACTS.md vs Implementação)

> Data: 2026-03-31
> Status: Aprovado

## HTTP API (Express :3001)

| Contrato | Implementação | Status |
|----------|--------------|--------|
| POST /api/chat `{message, clientId}` → `{reply, timestamp}` | HttpServer.ts:42 | ✅ Conforme |
| clientId validado como UUID | HttpServer.ts regex validation | ✅ Conforme |
| CORS habilitado | HttpServer.ts cors middleware | ✅ Conforme |
| HTTP_PORT configurável via env | env.ts + HttpServer constructor | ✅ Conforme |

## Agent Tool Contracts (27 FunctionDeclarations)

### Read Tools
| Tool | Contrato | Implementação | Status |
|------|----------|--------------|--------|
| get_client_rules | Retorna target_cpa, target_roas, daily_budget, brand_voice, sector | ToolRegistry.ts → Supabase client_rules | ✅ Conforme |
| list_clients | Retorna id, name, status, meta_ads_account_id | ToolRegistry.ts → Supabase clients | ✅ Conforme |
| meta_get_account_insights | ROAS, CPA, spend, impressions | MCP meta-ads → Graph API /insights | ✅ Conforme |
| meta_list_campaigns | name, status, objective, budget | MCP meta-ads → Graph API /campaigns | ✅ Conforme |
| meta_get_campaign_insights | Métricas por campanha | MCP meta-ads → Graph API | ✅ Conforme |
| google_get_performance | cost_micros, conversions, clicks | MCP google-ads → GAQL customer | ✅ Conforme |
| google_list_campaigns | id, name, status, channel_type | MCP google-ads → GAQL campaign | ✅ Conforme |
| google_get_keywords | keyword.text, quality_score, metrics | MCP google-ads → GAQL keyword_view | ✅ Conforme |
| google_get_ad_groups | ad_group.*, metrics.* | MCP google-ads → GAQL ad_group | ✅ Conforme |
| fetch_ad_benchmarks | sector, platform, avg_cpa/ctr/cpm | ToolRegistry.ts → Apify/cache/static | ✅ Conforme |
| generate_ad_copy | 3 variações {headline, body, cta} | ToolRegistry.ts → Gemini LLM | ✅ Conforme |
| generate_image | image_url | ToolRegistry.ts → inference.sh FLUX | ✅ Conforme (precisa CLI) |
| generate_video | video_url | ToolRegistry.ts → inference.sh Veo | ✅ Conforme (precisa CLI) |
| upload_asset | url, path | ToolRegistry.ts → Supabase Storage | ✅ Conforme |
| notify_manager | messages_sent | ToolRegistry.ts → TelegramNotifier | ✅ Conforme |
| ask_approval | approval_id, status | ToolRegistry.ts → TelegramNotifier + pending_approvals | ✅ Conforme |

### Write Tools (extensão pós-SPEC)
| Tool | API | Status |
|------|-----|--------|
| meta_create_campaign | POST /campaigns | ✅ Implementado |
| meta_create_adset | POST /adsets | ✅ Implementado |
| meta_create_creative | POST /adcreatives | ✅ Implementado |
| meta_create_ad | POST /ads | ✅ Implementado |
| meta_update_status | POST /{id} status= | ✅ Implementado |
| meta_upload_image | POST /adimages | ✅ Implementado |
| google_create_campaign | MutateCampaigns+Budgets | ✅ Implementado |
| google_create_ad_group | MutateAdGroups | ✅ Implementado |
| google_create_ad | MutateAdGroupAds | ✅ Implementado |
| google_update_status | MutateCampaigns status | ✅ Implementado |
| google_update_budget | MutateBudgets | ✅ Implementado |

## MCP Server Contracts (stdio)

| Contrato | Implementação | Status |
|----------|--------------|--------|
| JSON-RPC 2.0 via stdin/stdout | @modelcontextprotocol/sdk StdioServerTransport | ✅ Conforme |
| Meta Ads: 12 tools (6 read + 6 write) | mcp-servers/meta-ads/src/index.ts | ✅ Conforme |
| Google Ads: 9 tools (4 read + 5 write) | mcp-servers/google-ads/src/index.ts | ✅ Conforme |
| Erros: `{isError: true, content: [{text}]}` | Ambos MCP servers catch block | ✅ Conforme |

## Telegram Contracts

| Contrato | Implementação | Status |
|----------|--------------|--------|
| Whitelist via TELEGRAM_ALLOWED_USER_IDS | TelegramHandler.ts middleware | ✅ Conforme |
| Resolve clientId via telegram_chat_ids | TelegramHandler.ts resolveClientIdForTelegramChat | ✅ Conforme |
| Notificações com parse_mode Markdown | TelegramNotifier.ts sendMessage | ✅ Conforme |
| Inline keyboard Aprovar/Rejeitar | TelegramNotifier.ts InlineKeyboard | ✅ Conforme |
| Callback query handler | TelegramNotifier.ts setupApprovalCallbacks | ✅ Conforme |

## Resultado: 0 desvios de contrato encontrados

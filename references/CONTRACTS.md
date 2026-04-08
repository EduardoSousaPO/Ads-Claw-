# CONTRACTS — AdsClaw SWAS

> **Documento gerado via SDD Avancado**
> Data: 2026-03-26 | Status: Aprovado | Versao: 1.0
> Ultima revisao: 2026-03-26

---

## Indice

1. [Principios Gerais de Contrato](#1-principios-gerais-de-contrato)
2. [HTTP API Contracts (Express :3001)](#2-http-api-contracts-express-3001)
3. [Data Schemas (Source of Truth)](#3-data-schemas-source-of-truth)
4. [Agent Tool Contracts (Gemini Function Declarations)](#4-agent-tool-contracts-gemini-function-declarations)
5. [MCP Server Contracts (stdio protocol)](#5-mcp-server-contracts-stdio-protocol)
6. [Telegram Message Contracts](#6-telegram-message-contracts)
7. [Omnichannel Gateway Contracts (Formato Interno)](#7-omnichannel-gateway-contracts-formato-interno)
8. [Error Response Patterns](#8-error-response-patterns)
9. [Regras de Evolucao de Contrato](#9-regras-de-evolucao-de-contrato)

---

## 1. Principios Gerais de Contrato

### 1.1 Definicao

Cada contrato neste documento define uma **interface estavel** entre dois componentes do AdsClaw. Qualquer alteracao que viole o formato de entrada ou saida descrito aqui e considerada uma **breaking change** e deve seguir as regras de evolucao da Secao 9.

### 1.2 Convencoes

| Convencao | Descricao |
|---|---|
| **Formato de data** | ISO 8601 (`2026-03-26T14:30:00.000Z`). Sempre UTC no backend; formatacao local e responsabilidade do frontend. |
| **IDs** | UUID v4 (gerados pelo Supabase/PostgreSQL via `gen_random_uuid()`). |
| **Moeda** | Valores monetarios em `decimal` (nao float). Sem simbolo de moeda no payload — a interpretacao (BRL, USD) depende do contexto da conta de anuncios. |
| **Encoding** | UTF-8 em todos os payloads JSON. |
| **Null vs. Ausente** | Campo `null` significa "valor explicitamente vazio". Campo ausente no payload significa "usar valor default" (se houver) ou "nao aplicavel". |
| **Naming** | `snake_case` para campos de banco/API. `camelCase` apenas em interfaces TypeScript internas. |
| **Versionamento** | Prefixo `/api/` sem versao numerica no MVP. Quando houver breaking change, migrar para `/api/v2/`. |

### 1.3 Niveis de Obrigatoriedade

- **MUST** — Obrigatorio. Falha de validacao retorna erro.
- **SHOULD** — Recomendado. Ausencia nao causa erro mas pode limitar funcionalidade.
- **MAY** — Opcional. O sistema ignora se ausente.

---

## 2. HTTP API Contracts (Express :3001)

> **Arquivo fonte**: `agent/src/io/HttpServer.ts`
> **Porta**: configuravel via `HTTP_PORT` (default: `3001`)
> **CORS**: habilitado globalmente (permite requisicoes do Agency Cockpit)
> **Autenticacao**: nenhuma (rede interna apenas). Quando exposto via reverse-proxy, proteger com auth no proxy.

---

### 2.1 POST /api/chat

**Descricao**: Endpoint principal de conversacao. O Agency Cockpit (React SPA) envia mensagens do gestor e recebe a resposta do AgentLoop.

#### Request

```
POST /api/chat
Content-Type: application/json
```

| Campo | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `message` | `string` | MUST | Mensagem de texto do usuario. Min: 1 char. |
| `clientId` | `string` (UUID) | MAY | ID do cliente alvo. Se omitido, o agente opera em modo geral (sem escopo de cliente). |
| `sessionId` | `string` | MAY | Identificador da sessao web. Se omitido, assume `"web-user"`. |

**Exemplo de request**:

```json
{
  "message": "Qual o ROAS da conta da Loja Premium nos ultimos 7 dias?",
  "clientId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sessionId": "sess_abc123"
}
```

#### Response 200 (Sucesso)

```json
{
  "reply": "O ROAS da Loja Premium nos ultimos 7 dias foi de 4.2x, acima do target de 3.5x configurado nas regras do cliente.",
  "timestamp": "2026-03-26T14:30:00.000Z"
}
```

| Campo | Tipo | Sempre presente | Descricao |
|---|---|---|---|
| `reply` | `string` | Sim | Resposta textual do agente. Pode conter Markdown. |
| `timestamp` | `string` (ISO 8601) | Sim | Momento em que a resposta foi gerada. |

> **Nota de evolucao**: No futuro, o payload de resposta sera enriquecido para:
> ```json
> {
>   "data": {
>     "reply": "string",
>     "timestamp": "string",
>     "toolsUsed": ["get_client_rules", "meta_get_account_insights"]
>   }
> }
> ```
> Esta mudanca sera feita via wrapper nao-destrutivo (campos atuais permanecem).

#### Response 400 (Validacao)

Disparado quando `message` esta ausente ou nao e string.

```json
{
  "error": "Campo \"message\" e obrigatorio."
}
```

#### Response 500 (Erro Interno)

Disparado quando o AgentLoop lanca excecao nao-tratada.

```json
{
  "error": "Erro interno do Agente.",
  "detail": "Gemini API rate limit exceeded"
}
```

> **Contrato futuro padronizado**:
> ```json
> {
>   "error": {
>     "code": "AGENT_ERROR",
>     "message": "Descricao legivel do erro"
>   }
> }
> ```

---

### 2.2 GET /api/health

**Descricao**: Health check para monitoramento. Usado pelo PM2 e pelo Agency Cockpit para verificar se o agente esta online.

#### Response 200

```json
{
  "status": "online",
  "agent": "AdsClaw SWAS",
  "timestamp": "2026-03-26T14:30:00.000Z"
}
```

| Campo | Tipo | Descricao |
|---|---|---|
| `status` | `string` | Sempre `"online"` se o servidor responde. |
| `agent` | `string` | Identificador do sistema. Valor fixo: `"AdsClaw SWAS"`. |
| `timestamp` | `string` (ISO 8601) | Momento da resposta. |

> **Contrato futuro enriquecido**:
> ```json
> {
>   "status": "ok",
>   "uptime": 86400,
>   "version": "1.0.0",
>   "services": {
>     "gemini": "connected",
>     "supabase": "connected",
>     "telegram": "polling",
>     "mcp_meta": "connected",
>     "mcp_google": "connected"
>   }
> }
> ```

---

### 2.3 GET /api/clients (Planejado)

**Status**: Planejado para Fase 2. Sera consumido pelo Agency Cockpit para listar clientes no painel.

#### Response 200

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Loja Premium",
      "meta_ads_account_id": "act_123456789",
      "google_ads_account_id": "1234567890",
      "status": "active",
      "created_at": "2026-01-15T10:00:00.000Z",
      "updated_at": "2026-03-20T08:30:00.000Z"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

---

### 2.4 GET /api/clients/:id/rules (Planejado)

**Status**: Planejado para Fase 2.

#### Response 200

```json
{
  "data": {
    "id": "r1r2r3r4-r5r6-7890-abcd-ef1234567890",
    "client_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "target_cpa": 5.00,
    "target_roas": 4.0,
    "daily_budget": 150.00,
    "brand_voice": "Tom descontraido, jovem, usa girias de internet. Foco em urgencia e escassez.",
    "primary_offer": "Frete gratis acima de R$99",
    "creative_refresh_days": 7,
    "created_at": "2026-01-15T10:00:00.000Z",
    "updated_at": "2026-03-20T08:30:00.000Z"
  }
}
```

#### Response 404

```json
{
  "error": {
    "code": "CLIENT_NOT_FOUND",
    "message": "Cliente com ID 'xyz' nao encontrado."
  }
}
```

---

## 3. Data Schemas (Source of Truth)

> **Persistencia**: Supabase (PostgreSQL) com RLS. Project ID: `gbzepjbevvimijemnhcj`.
> **Arquivo Supabase client**: `agent/src/lib/supabase.ts`
> **Acesso**: Service Role Key (bypass RLS) preferido. Fallback para Anon Key.

Os schemas abaixo sao a **fonte de verdade** (source of truth) para validacao em toda a stack. Qualquer divergencia entre o codigo TypeScript e este documento e um bug.

---

### 3.1 clients

**Tabela Supabase**: `clients`

| Campo | Tipo | Restricoes | Descricao |
|---|---|---|---|
| `id` | `UUID` | PK, auto (`gen_random_uuid()`) | Identificador unico do cliente. |
| `name` | `string` | NOT NULL, min: 2, max: 100 | Nome do cliente/empresa. |
| `meta_ads_account_id` | `string \| null` | Formato: `act_XXXXXXXXX` | ID da conta Meta Ads. Null se cliente nao usa Meta. |
| `google_ads_account_id` | `string \| null` | Formato numerico (sem tracos) | ID da conta Google Ads. Null se cliente nao usa Google. |
| `status` | `enum` | `"active" \| "paused" \| "onboarding"`, default: `"active"` | Estado operacional do cliente na agencia. |
| `created_at` | `timestamptz` | auto (`now()`) | Data de criacao. |
| `updated_at` | `timestamptz` | auto (trigger on update) | Data da ultima atualizacao. |

**Regras de negocio**:
- Um cliente MUST ter pelo menos um dos campos `meta_ads_account_id` ou `google_ads_account_id` preenchido (validacao a nivel de aplicacao, nao de banco).
- O status `"paused"` exclui o cliente das auditorias proativas do Orchestrator.
- O status `"onboarding"` permite cadastro parcial sem contas de anuncio vinculadas.

**Validacao Zod (referencia)**:

```typescript
const ClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  meta_ads_account_id: z.string().regex(/^act_\d+$/).nullable(),
  google_ads_account_id: z.string().nullable(),
  status: z.enum(["active", "paused", "onboarding"]).default("active"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
```

---

### 3.2 client_rules

**Tabela Supabase**: `client_rules`
**Relacao**: 1:1 com `clients` (FK `client_id` UNIQUE)

| Campo | Tipo | Restricoes | Descricao |
|---|---|---|---|
| `id` | `UUID` | PK, auto | Identificador unico da regra. |
| `client_id` | `UUID` | FK -> `clients.id`, UNIQUE, NOT NULL | Cliente dono destas regras. Relacao 1:1. |
| `target_cpa` | `decimal` | NOT NULL, min: 0.01 | CPA maximo aceitavel. Acima deste valor, o Orchestrator dispara alerta. |
| `target_roas` | `decimal \| null` | min: 0.1 | ROAS minimo aceitavel. Null significa "sem meta de ROAS definida". |
| `daily_budget` | `decimal` | NOT NULL, min: 1.0 | Orcamento diario maximo em moeda da conta. |
| `brand_voice` | `text \| null` | max: 2000 | Descricao do tom de voz da marca. Usado pelo CreativeLab na geracao de copy. |
| `primary_offer` | `text \| null` | max: 500 | Oferta principal vigente (ex: "Frete gratis acima de R$99"). Injetada no prompt de copy. |
| `creative_refresh_days` | `integer` | min: 3, max: 30, default: 7 | Dias apos os quais um criativo e considerado "fadigado" e deve ser renovado. |
| `created_at` | `timestamptz` | auto | Data de criacao. |
| `updated_at` | `timestamptz` | auto | Data da ultima atualizacao. |

**Alias legado**: O Orchestrator atualmente referencia os campos como `max_cpa` e `fatigue_days` via query `.select('client_rules(max_cpa, target_roas, fatigue_days)')`. Estes sao aliases de `target_cpa` e `creative_refresh_days` respectivamente. A normalizacao dos nomes e planejada.

**Validacao Zod (referencia)**:

```typescript
const ClientRulesSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  target_cpa: z.number().min(0.01),
  target_roas: z.number().min(0.1).nullable(),
  daily_budget: z.number().min(1.0),
  brand_voice: z.string().max(2000).nullable(),
  primary_offer: z.string().max(500).nullable(),
  creative_refresh_days: z.number().int().min(3).max(30).default(7),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
```

---

### 3.3 chat_history

**Tabela Supabase**: `chat_history`
**Interface TypeScript**: `ChatMessage` em `agent/src/memory/MemoryManager.ts`

| Campo | Tipo | Restricoes | Descricao |
|---|---|---|---|
| `id` | `UUID` | PK, auto | Identificador unico da mensagem. |
| `client_id` | `UUID \| null` | FK -> `clients.id`, nullable | Cliente ao qual a conversa se refere. Null para chat geral (sem escopo de cliente). |
| `sender` | `enum` | `"user" \| "agent" \| "telegram" \| "system" \| "tool"` | Quem enviou a mensagem. |
| `message` | `text` | NOT NULL | Conteudo textual da mensagem. |
| `metadata` | `JSONB \| null` | — | Dados estruturados adicionais: tool calls executadas, outputs MCP, metricas retornadas, etc. |
| `created_at` | `timestamptz` | auto | Data de criacao. |

**Semantica do campo `sender`**:

| Valor | Significado |
|---|---|
| `"user"` | Mensagem enviada pelo gestor humano (via Cockpit web ou Telegram). |
| `"agent"` | Resposta gerada pelo AgentLoop (output do LLM apos ciclo ReAct). |
| `"telegram"` | Mensagem originada especificamente do canal Telegram (usado para diferenciar do web `"user"`). |
| `"system"` | Mensagem de sistema: alertas do Orchestrator, notificacoes de fadiga criativa, etc. |
| `"tool"` | Output de uma ferramenta (MCP tool call, Apify scraping, geracao de imagem/video). |

**Sliding Window**: O `MemoryManager` limita a janela de contexto a **30 mensagens** por cliente (`MEMORY_WINDOW_SIZE = 30`). Mensagens mais antigas permanecem persistidas no Supabase mas nao sao enviadas ao LLM.

**Validacao Zod (referencia)**:

```typescript
const ChatMessageSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().nullable(),
  sender: z.enum(["user", "agent", "telegram", "system", "tool"]),
  message: z.string().min(1),
  metadata: z.record(z.unknown()).nullable().optional(),
  created_at: z.string().datetime().optional(),
});
```

---

## 4. Agent Tool Contracts (Gemini Function Declarations)

> **Consumidor**: `AgentLoop` via Gemini Function Calling
> **Registro**: Declarados como `FunctionDeclaration[]` no system prompt / config do Gemini
> **Padrao de retorno**: Cada tool retorna um objeto JSON. Em caso de erro, retorna `{ error: string }`.

Estas sao as ferramentas que o agente pode invocar autonomamente durante o ciclo ReAct. O Gemini decide qual tool chamar com base no intent do usuario.

---

### 4.1 get_client_rules

**Descricao**: Obtem as regras e limites configurados para um cliente especifico.

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `client_id` | `string` (UUID) | MUST | ID do cliente no Supabase. |

**Retorno (sucesso)**: Objeto `ClientRules` conforme schema 3.2.

```json
{
  "id": "r1r2r3r4-...",
  "client_id": "a1b2c3d4-...",
  "target_cpa": 5.00,
  "target_roas": 4.0,
  "daily_budget": 150.00,
  "brand_voice": "Tom jovem e descontraido...",
  "primary_offer": "Frete gratis acima de R$99",
  "creative_refresh_days": 7
}
```

**Retorno (erro)**:

```json
{
  "error": "Cliente com ID 'xyz' nao encontrado."
}
```

---

### 4.2 list_clients

**Descricao**: Lista todos os clientes da agencia, opcionalmente filtrados por status.

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `status` | `string` | MAY | Filtro por status: `"active"`, `"paused"`, `"onboarding"`. Se omitido, retorna todos. |

**Retorno**: Array de objetos `Client` conforme schema 3.1.

```json
[
  {
    "id": "a1b2c3d4-...",
    "name": "Loja Premium",
    "meta_ads_account_id": "act_123456789",
    "google_ads_account_id": null,
    "status": "active"
  }
]
```

---

### 4.3 meta_get_account_insights

**Descricao**: Obtem metricas de performance (ROAS, CPA, Spend) de uma conta Meta Ads. Internamente, invoca o MCP Server `meta-ads` tool `get_account_insights`.

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `ad_account_id` | `string` | MUST | ID da conta Meta Ads (formato: `act_XXXXXXXXX`). |
| `date_preset` | `string` | MAY | Periodo pre-definido. Default: `"last_7d"`. Valores aceitos: `"today"`, `"yesterday"`, `"last_7d"`, `"last_30d"`, `"this_month"`, `"last_month"`. |

**Retorno (sucesso)**:

```json
{
  "spend": "1250.50",
  "impressions": "85000",
  "clicks": "3200",
  "ctr": "3.76",
  "cpc": "0.39",
  "cpm": "14.71",
  "conversions": "128",
  "cost_per_conversion": "9.77",
  "purchase_roas": [{ "action_type": "omni_purchase", "value": "4.2" }]
}
```

> **Nota**: Os valores da Meta Marketing API sao retornados como strings, nao numeros. A conversao para numero e responsabilidade do consumidor.

---

### 4.4 meta_list_campaigns

**Descricao**: Lista as campanhas de uma conta de anuncios Meta.

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `ad_account_id` | `string` | MUST | ID da conta Meta Ads. |

**Retorno**: Array de campanhas.

```json
{
  "data": [
    {
      "id": "23851234567890",
      "name": "Campanha Conversao - Frete Gratis",
      "status": "ACTIVE",
      "objective": "OUTCOME_SALES",
      "daily_budget": "15000",
      "budget_remaining": "8500"
    }
  ]
}
```

> **Nota**: `daily_budget` e `budget_remaining` estao em centavos (Meta API padrao). Dividir por 100 para valor real.

---

### 4.5 meta_get_campaign_insights

**Descricao**: Obtem metricas detalhadas de uma campanha especifica.

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `campaign_id` | `string` | MUST | ID da campanha Meta. |
| `date_preset` | `string` | MAY | Periodo. Default: `"last_7d"`. |

**Retorno**: Mesmo formato de `meta_get_account_insights`, mas com escopo da campanha.

---

### 4.6 google_get_performance

**Descricao**: Obtem metricas de performance de uma conta Google Ads. Internamente, invoca o MCP Server `google-ads` tool `get_google_ads_metrics`.

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `customer_id` | `string` | MUST | ID do cliente Google Ads (formato numerico sem tracos, ex: `"1234567890"`). |
| `date_range` | `string` | MAY | Periodo GAQL. Default: `"LAST_30_DAYS"`. Valores: `"TODAY"`, `"YESTERDAY"`, `"LAST_7_DAYS"`, `"LAST_30_DAYS"`, `"THIS_MONTH"`. |

**Retorno (sucesso)**:

```json
[
  {
    "metrics": {
      "cost_micros": "125050000",
      "conversions": "128",
      "cost_per_conversion": "976953.125",
      "impressions": "85000",
      "clicks": "3200"
    }
  }
]
```

> **Nota**: `cost_micros` esta em microunidades (dividir por 1.000.000 para valor real). `cost_per_conversion` tambem em micros.

---

### 4.7 google_list_campaigns

**Descricao**: Lista as campanhas de uma conta Google Ads.

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `customer_id` | `string` | MUST | ID do cliente Google Ads. |

**Retorno**:

```json
[
  {
    "campaign": {
      "id": "12345678901",
      "name": "Search - Marca",
      "status": "ENABLED",
      "advertising_channel_type": "SEARCH"
    }
  }
]
```

---

### 4.8 fetch_ad_benchmarks

**Descricao**: Busca benchmarks de anuncios concorrentes no nicho especificado via Apify Facebook Ads Scraper.

**Servico responsavel**: `CreativeLab.fetchBenchmarks()`

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `niche` | `string` | MUST | Nicho/keyword de busca (ex: `"suplementos whey protein"`). |
| `max_ads` | `number` | MAY | Quantidade maxima de anuncios a retornar. Default: `5`. |

**Retorno**: Array de `BenchmarkResult`.

```json
[
  {
    "title": "Whey Protein Isolado - 50% OFF",
    "body": "Compre agora e ganhe brinde exclusivo. Mais de 10.000 clientes satisfeitos.",
    "imageUrl": "https://scontent.xx.fbcdn.net/v/...",
    "videoUrl": null,
    "cta": "Shop Now",
    "platform": "Meta"
  }
]
```

**Interface TypeScript** (definida em `agent/src/services/CreativeLab.ts`):

```typescript
export interface BenchmarkResult {
  title: string;
  body: string;
  imageUrl?: string;
  videoUrl?: string;
  cta?: string;
  platform: string;
}
```

---

### 4.9 generate_ad_copy

**Descricao**: Gera variacoes de copy para anuncios usando o LLM. Consome benchmarks + regras do cliente para produzir copies contextualizadas.

**Servico responsavel**: `CreativeLab.analyzeAndGenerate()`

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `benchmarks` | `BenchmarkResult[]` | MUST | Array de benchmarks obtidos via `fetch_ad_benchmarks`. Min: 1 item. |
| `client_rules` | `string` | MUST | Texto descritivo das regras do cliente (brand_voice, primary_offer, target_cpa, etc). |
| `num_variations` | `number` | MAY | Quantidade de variacoes a gerar. Default: `3`. |

**Retorno**:

```json
{
  "analysis": "Os benchmarks mostram forte apelo a urgencia e prova social. O concorrente principal usa descontos agressivos...",
  "variations": [
    {
      "copy": "Seu treino merece o melhor. Whey Isolado com 90% de proteina...",
      "headline": "Whey Isolado Premium - Resultado Real",
      "cta": "Garanta o Seu",
      "visual_suggestion": "Foto lifestyle: atleta tomando shake pos-treino em academia moderna"
    },
    {
      "copy": "...",
      "headline": "...",
      "cta": "...",
      "visual_suggestion": "..."
    }
  ]
}
```

> **Tier LLM**: Este tool usa (ou usara) o tier `PREMIUM` conforme ADR-001, pois a qualidade criativa e critica.

---

### 4.10 generate_image

**Descricao**: Gera imagem para anuncio via FLUX-1-Schnell (inference.sh).

**Servico responsavel**: `CreativeLab.generateImage()`

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `prompt` | `string` | MUST | Prompt descritivo para geracao da imagem. Em ingles para melhor resultado. |
| `aspect_ratio` | `string` | MAY | Proporcao da imagem. Default: `"1:1"`. Valores: `"1:1"`, `"9:16"`, `"16:9"`, `"4:5"`. |

**Retorno (sucesso)**:

```json
{
  "image_url": "https://inference.sh/output/abc123.png",
  "model": "black-forest-labs/flux-1-schnell"
}
```

**Retorno (erro)**: String literal `"ERROR_GENERATING_IMAGE"`.

**CLI interno executado**:

```bash
infsh app run black-forest-labs/flux-1-schnell --input '{"prompt": "..."}' --json
```

---

### 4.11 generate_video

**Descricao**: Gera video para anuncio via Google Veo 3.1 (inference.sh).

**Servico responsavel**: `CreativeLab.generateVideo()`

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `prompt` | `string` | MUST | Prompt descritivo para geracao do video. |
| `duration` | `number` | MAY | Duracao em segundos. Default: `6`. |

**Retorno (sucesso)**:

```json
{
  "video_url": "https://inference.sh/output/xyz789.mp4",
  "model": "google/veo-3-1-fast"
}
```

**Retorno (erro)**: String literal `"ERROR_GENERATING_VIDEO"`.

**CLI interno executado**:

```bash
infsh app run google/veo-3-1-fast --input '{"prompt": "..."}' --json
```

---

### 4.12 upload_asset

**Descricao**: Faz upload de arquivo criativo para o Supabase Storage do cliente.

**Status**: Planejado para Fase 2.

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `client_id` | `string` (UUID) | MUST | ID do cliente dono do asset. |
| `file_url` | `string` (URL) | MUST | URL publica do arquivo a ser baixado e armazenado. |
| `file_type` | `enum` | MUST | Tipo do asset: `"image"`, `"video"`, `"copy"`. |
| `filename` | `string` | MAY | Nome do arquivo. Se omitido, gera automaticamente com timestamp. |

**Retorno (sucesso)**:

```json
{
  "storage_path": "clients/a1b2c3d4/assets/2026-03-26_creative_v1.png",
  "public_url": "https://gbzepjbevvimijemnhcj.supabase.co/storage/v1/object/public/assets/clients/a1b2c3d4/..."
}
```

---

### 4.13 notify_manager

**Descricao**: Envia notificacao para o gestor via Telegram. Usado pelo Orchestrator para alertas proativos.

**Servico responsavel**: `TelegramHandler.sendMessage()`

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `message` | `string` | MUST | Texto da notificacao. Suporta Markdown do Telegram. |
| `parse_mode` | `string` | MAY | Modo de parsing. Default: `"Markdown"`. Valores: `"Markdown"`, `"MarkdownV2"`, `"HTML"`. |

**Retorno (sucesso)**:

```json
{
  "sent": true,
  "message_id": 12345
}
```

**Retorno (falha)**:

```json
{
  "sent": false,
  "error": "Telegram API: chat not found"
}
```

**Restricao**: A mensagem e enviada exclusivamente para o `TELEGRAM_ALLOWED_USER_ID` configurado no `.env`.

---

### 4.14 ask_approval

**Descricao**: Solicita aprovacao do gestor via Telegram com botoes inline (InlineKeyboard). O agente pausa o ciclo ReAct ate receber a resposta.

**Status**: Planejado para Fase 2.

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `question` | `string` | MUST | Pergunta a ser exibida ao gestor. |
| `options` | `string[]` | MUST | Opcoes de resposta. Min: 2 itens. Serao renderizadas como botoes inline. |

**Retorno (sucesso)**:

```json
{
  "approved": true,
  "selected_option": "Sim, gerar novos criativos"
}
```

**Fluxo**:

1. Agente envia mensagem Telegram com `InlineKeyboardMarkup` contendo os botoes.
2. Gestor clica em um botao.
3. Callback query e capturada pelo Grammy handler.
4. Resultado e retornado ao AgentLoop para continuidade do ciclo ReAct.

---

## 5. MCP Server Contracts (stdio protocol)

> **Protocolo**: Model Context Protocol (MCP) via transporte `stdio`
> **SDK**: `@modelcontextprotocol/sdk` v1.27+
> **Comunicacao**: O `ToolRegistry` (agent) instancia `StdioClientTransport` que lanca o processo Node do MCP server e comunica via stdin/stdout com JSON-RPC.

### 5.1 Padrao de Comunicacao

```
[AgentLoop] --> [ToolRegistry] --> [MCP Client (SDK)] --> stdin --> [MCP Server Process] --> Meta/Google API
                                                       <-- stdout <--
```

**Request (JSON-RPC via stdio)**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_account_insights",
    "arguments": {
      "ad_account_id": "act_123456789",
      "date_preset": "last_7d"
    }
  }
}
```

**Response (sucesso)**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"data\": [{\"spend\": \"1250.50\", ...}]}"
      }
    ]
  }
}
```

**Response (erro)**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Error: Meta API Error: Invalid OAuth 2.0 Access Token"
      }
    ],
    "isError": true
  }
}
```

---

### 5.2 Meta Ads MCP Server

> **Arquivo fonte**: `mcp-servers/meta-ads/src/index.ts`
> **API client**: `mcp-servers/meta-ads/src/meta-api.ts` (`MetaAdsClient`)
> **API externa**: Meta Marketing API v19.0 (`graph.facebook.com/v19.0`)
> **Autenticacao**: `META_ACCESS_TOKEN` (OAuth 2.0 Long-Lived Token)

**Server metadata**:

```json
{
  "name": "meta-ads-mcp",
  "version": "1.0.0",
  "capabilities": { "tools": {} }
}
```

#### Tools expostas

| # | Tool | Descricao | Parametros | Campos retornados |
|---|---|---|---|---|
| 1 | `get_account_insights` | Metricas de performance de uma conta | `ad_account_id` (req), `date_preset` (opt) | spend, cpc, cpm, cpp, ctr, reach, impressions, conversions, purchase_roas, cost_per_conversion |
| 2 | `list_campaigns` | Lista campanhas de uma conta | `ad_account_id` (req) | name, status, objective, budget_remaining, daily_budget, lifetime_budget |
| 3 | `get_campaign_insights` | Metricas de uma campanha especifica | `campaign_id` (req), `date_preset` (opt) | spend, cpc, cpm, ctr, impressions, conversions, purchase_roas, cost_per_conversion |
| 4 | `get_ad_account_by_name` | Busca conta pelo nome (match parcial) | `name` (req) | name, account_id |
| 5 | `list_adsets` | Lista Ad Sets de uma campanha | `campaign_id` (req) | name, status, billing_event, bid_amount, daily_budget, lifetime_budget |
| 6 | `list_ads` | Lista anuncios de um Ad Set | `adset_id` (req) | name, status, creative{name, title, body, image_url, thumbnail_url} |

**Validacao de input**: Cada tool valida parametros com Zod antes de executar a chamada a Meta API.

**Tratamento de erros**: Erros da Meta Marketing API sao capturados e retornados como `{ isError: true, content: [{ type: "text", text: "Error: Meta API Error: <mensagem>" }] }`.

---

### 5.3 Google Ads MCP Server

> **Arquivo fonte**: `mcp-servers/google-ads/src/index.ts`
> **API client**: `google-ads-api` (npm)
> **API externa**: Google Ads API via GAQL (Google Ads Query Language)
> **Autenticacao**: OAuth 2.0 com `client_id`, `client_secret`, `developer_token`, `refresh_token`

**Server metadata**:

```json
{
  "name": "google-ads-mcp",
  "version": "1.0.0",
  "capabilities": { "tools": {} }
}
```

#### Tools expostas

| # | Tool | Descricao | Parametros | GAQL Query |
|---|---|---|---|---|
| 1 | `list_google_campaigns` | Lista campanhas de uma conta Google Ads | `customer_id` (req) | `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type FROM campaign WHERE campaign.status != 'REMOVED'` |
| 2 | `get_google_ads_metrics` | Metricas de performance de conta ou campanha | `customer_id` (req), `campaign_id` (opt), `date_range` (opt, default: `"LAST_30_DAYS"`) | Sem `campaign_id`: query na tabela `customer`. Com `campaign_id`: query na tabela `campaign` filtrada. |

**Campos retornados por `get_google_ads_metrics`**:

| Campo GAQL | Descricao | Conversao necessaria |
|---|---|---|
| `metrics.cost_micros` | Custo total em micro-unidades | Dividir por 1.000.000 |
| `metrics.conversions` | Total de conversoes | Ja numerico |
| `metrics.cost_per_conversion` | CPA em micro-unidades | Dividir por 1.000.000 |
| `metrics.impressions` | Total de impressoes | Ja numerico |
| `metrics.clicks` | Total de cliques | Ja numerico |

**Variaveis de ambiente necessarias**:

| Variavel | Descricao |
|---|---|
| `GOOGLE_ADS_CLIENT_ID` | Client ID do OAuth App |
| `GOOGLE_ADS_CLIENT_SECRET` | Client Secret do OAuth App |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Developer Token do Google Ads (MCC) |
| `GOOGLE_ADS_REFRESH_TOKEN` | Refresh Token do usuario autorizado |

**Tratamento de erros**: Se `GOOGLE_ADS_REFRESH_TOKEN` esta ausente, todas as tools retornam erro imediato sem tentar query. Erros de GAQL sao retornados como `{ isError: true }`.

---

### 5.4 Ciclo de Vida dos MCP Servers

```
[Startup do AgentController]
    |
    v
[ToolRegistry.loadMCPServers()]
    |
    +-- Resolve path: ../mcp-servers/meta-ads/dist/index.js
    +-- Resolve path: ../mcp-servers/google-ads/dist/index.js
    |
    +-- Se path nao existe: WARN + skip (nao bloqueia startup)
    +-- Se path existe:
        |
        +-- StdioClientTransport({ command: "node", args: [serverPath] })
        +-- client.connect(transport)
        +-- Registra no Map<string, Client>: mcpClients.set("meta-ads", client)
        |
    v
[MCP Clients prontos para uso via ToolRegistry.getMcpClients()]
```

**Contrato de build**: Antes de iniciar o agent, os MCP servers MUST estar compilados (`tsc` ou build equivalente) com output em `dist/index.js`. Build ausente nao e erro fatal, mas desabilita as tools correspondentes.

---

## 6. Telegram Message Contracts

> **Arquivo fonte**: `agent/src/io/TelegramHandler.ts`
> **Framework**: Grammy 1.41+
> **Modo**: Long-polling (nao webhook)
> **Seguranca**: Whitelist por `TELEGRAM_ALLOWED_USER_ID`

---

### 6.1 Seguranca (Middleware)

Todo update do Telegram passa por um middleware de whitelist:

- Se `ctx.from.id` !== `TELEGRAM_ALLOWED_USER_ID` -> **drop silencioso** (sem resposta, sem log de conteudo).
- Apenas o gestor autorizado recebe processamento.
- Nao ha mensagem de "acesso negado" para nao confirmar existencia do bot a usuarios nao-autorizados.

---

### 6.2 Mensagens Recebidas (Incoming)

#### 6.2.1 Texto (`message:text`)

**Formato padronizado** (apos normalizacao pelo TelegramHandler):

```typescript
{
  id: number,                    // message_id do Telegram
  source: "telegram",
  type: "text",
  content: string,               // ctx.message.text
  userId: string,                // ctx.from.id (convertido para string)
  chatId: number,                // ctx.chat.id (usado para resposta)
  timestamp: Date                // momento do recebimento
}
```

Este objeto e passado ao `OmnichannelGateway.processInput()` que repassa ao `AgentController.handleInput()`.

#### 6.2.2 Audio/Voz (`message:voice`, `message:audio`)

**Status**: Placeholder. Retorna mensagem fixa informando que STT nao esta ativo.

**Resposta fixa**: `"Modulo de Voz (Agent-STT) ainda nao esta ativado no NodeJS! Mande texto."`

#### 6.2.3 Documentos (`message:document`)

**Status**: Placeholder. Retorna mensagem fixa informando que o parser de documentos nao esta online.

---

### 6.3 Mensagens Enviadas (Outgoing)

#### 6.3.1 Resposta ao usuario (`sendResponse`)

```typescript
await bot.api.sendMessage(chatId, response.content, { parse_mode: 'Markdown' });
```

| Aspecto | Valor |
|---|---|
| **Parse mode** | `Markdown` (Telegram legacy Markdown, nao MarkdownV2) |
| **Limite de caracteres** | 4096 por mensagem (limite Telegram API) |
| **Chunking** | Planejado para Fase 2. Atualmente, mensagens que excedem 4096 chars sao truncadas pela API do Telegram. |
| **Formatacao** | O AgentLoop retorna texto com Markdown. Caracteres especiais (_, *, [, ]) devem ser usados conforme regras do Telegram Markdown. |

#### 6.3.2 Notificacao direta (`sendMessage`)

Usado pelo Orchestrator para alertas proativos (ex: fadiga criativa detectada).

```typescript
await bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
```

**Padrao de mensagem de alerta**:

```markdown
🚨 *ALERTA DE PERFORMANCE: <NomeCliente>*

Detectamos fadiga criativa. O CPA subiu para *R$ X.XX*.
O limite era R$ Y.YY.

🤖 *Acao Sugerida:* O AdsClaw ja analisou benchmarks e esta pronto para gerar novos videos de refresh.
Deseja iniciar a producao no Laboratorio Criativo?
```

#### 6.3.3 Aprovacao com botoes inline (Planejado Fase 2)

```typescript
await bot.api.sendMessage(chatId, question, {
  parse_mode: 'Markdown',
  reply_markup: {
    inline_keyboard: [
      [{ text: "Sim, aprovar", callback_data: "approve_<action_id>" }],
      [{ text: "Nao, rejeitar", callback_data: "reject_<action_id>" }]
    ]
  }
});
```

**Callback data format**: `<action>_<uuid>` onde action e `approve` ou `reject`.

---

## 7. Omnichannel Gateway Contracts (Formato Interno)

> **Arquivo fonte**: `agent/src/io/OmnichannelGateway.ts`

O Gateway normaliza inputs de diferentes canais para um formato padronizado e roteia respostas de volta ao canal de origem.

### 7.1 StandardizedInput (Input unificado)

```typescript
interface StandardizedInput {
  id?: number;                              // ID da mensagem original (Telegram)
  source: "telegram" | "web";               // Canal de origem
  type: "text";                             // Tipo de conteudo (expansivel)
  content: string;                          // Texto da mensagem
  userId: string;                           // ID do usuario
  chatId?: number;                          // ID do chat Telegram (ausente para web)
  clientId?: string;                        // ID do cliente AdsClaw (vindo do Cockpit)
  timestamp?: Date;                         // Momento do recebimento
}
```

### 7.2 AgentResponse (Output unificado)

```typescript
interface AgentResponse {
  content: string;                          // Texto da resposta do agente
}
```

### 7.3 Roteamento de saida

| `sourceInput.source` | Destino | Metodo |
|---|---|---|
| `"telegram"` | Telegram Bot API | `TelegramHandler.sendResponse()` |
| `"web"` | Log no console (HttpServer retorna diretamente via `res.json`) | Console log (placeholder) |

> **Nota**: O fluxo web nao usa o `sendOutput` do Gateway. O `HttpServer` aguarda o retorno sincrono do `AgentLoop.run()` e responde diretamente via Express `res.json()`. O `sendOutput` para source `"web"` e um placeholder para futuro WebSocket.

---

## 8. Error Response Patterns

### 8.1 Padrao unificado de erro (target)

Todos os endpoints HTTP e tools SHOULD adotar este formato padronizado:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Descricao legivel para humanos",
    "details": {}
  }
}
```

### 8.2 Codigos de erro

| Codigo | HTTP Status | Contexto | Descricao |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | HTTP API | Parametro obrigatorio ausente ou formato invalido. |
| `CLIENT_NOT_FOUND` | 404 | HTTP API, Agent Tools | Cliente com o ID fornecido nao existe no Supabase. |
| `AGENT_ERROR` | 500 | HTTP API | Erro nao-tratado no ciclo ReAct do AgentLoop. |
| `LLM_UNAVAILABLE` | 503 | HTTP API | LLM (Gemini) nao esta configurado ou retornou erro. |
| `MCP_CONNECTION_FAILED` | 500 | Agent Tools | Falha ao conectar com MCP Server (processo nao encontrado ou crash). |
| `META_API_ERROR` | 502 | MCP Meta Ads | Erro retornado pela Meta Marketing API (token expirado, rate limit, etc). |
| `GOOGLE_API_ERROR` | 502 | MCP Google Ads | Erro retornado pela Google Ads API (credenciais invalidas, GAQL syntax error, etc). |
| `APIFY_ERROR` | 502 | CreativeLab | Falha no scraping de benchmarks via Apify. |
| `MEDIA_GENERATION_ERROR` | 502 | CreativeLab | Falha na geracao de imagem/video via inference.sh. |
| `TELEGRAM_SEND_ERROR` | 502 | TelegramHandler | Falha ao enviar mensagem via Telegram Bot API. |
| `SUPABASE_ERROR` | 500 | MemoryManager, Orchestrator | Erro na query ao Supabase (conexao, permissao, etc). |

### 8.3 Estado atual vs. target

O codebase atual usa formatos heterogeneos de erro:

| Componente | Formato atual | Formato target |
|---|---|---|
| `HttpServer` (400) | `{ error: "Campo \"message\" e obrigatorio." }` | `{ error: { code: "VALIDATION_ERROR", message: "..." } }` |
| `HttpServer` (500) | `{ error: "Erro interno do Agente.", detail: "..." }` | `{ error: { code: "AGENT_ERROR", message: "...", details: { ... } } }` |
| `AgentLoop` (fallback) | String Markdown inline na resposta | Deve lancar excecao tipada para o HttpServer tratar |
| MCP Servers | `{ isError: true, content: [{ type: "text", text: "Error: ..." }] }` | Correto para o protocolo MCP. Nao alterar. |

A migracao para o formato unificado sera feita incrementalmente sem breaking changes (adicionando a estrutura `error.code` mantendo campos legados temporariamente).

---

## 9. Regras de Evolucao de Contrato

### 9.1 Principio fundamental

> **Contratos sao imutaveis dentro de uma versao.** Uma vez que um consumidor depende de um campo, ele nao pode ser removido ou ter seu tipo alterado sem bump de versao.

### 9.2 Tipos de mudanca

| Tipo | Descricao | Procedimento |
|---|---|---|
| **Aditiva (nao-destrutiva)** | Adicionar campo novo ao response, adicionar tool nova, adicionar valor a enum | Atualizar este CONTRACTS.md. Nenhum bump de versao necessario. Consumidores MUST ignorar campos desconhecidos. |
| **Destrutiva (breaking)** | Remover campo, renomear campo, alterar tipo de campo, alterar semantica de campo existente | Requer: (1) ADR documentando a decisao, (2) bump de versao da API, (3) periodo de deprecacao com ambos formatos, (4) atualizacao deste CONTRACTS.md. |
| **Correcao** | Ajustar descricao, corrigir typo em documentacao, adicionar exemplo | Atualizar este CONTRACTS.md diretamente. Sem ADR. |

### 9.3 Checklist para toda mudanca de contrato

- [ ] O campo adicionado/alterado esta documentado neste CONTRACTS.md?
- [ ] O schema Zod correspondente foi atualizado no codigo?
- [ ] Todos os consumidores do contrato foram identificados e notificados?
- [ ] Se breaking change: ADR foi escrita? Periodo de deprecacao foi definido?
- [ ] Testes de integracao cobrem o novo formato?

### 9.4 Regra de compatibilidade para consumidores

Todos os consumidores (Agency Cockpit, TelegramHandler, AgentLoop) MUST:

1. **Ignorar campos desconhecidos** no payload de resposta (nao falhar se um campo novo aparecer).
2. **Tratar campos opcionais como possivelmente ausentes** (usar optional chaining / default values).
3. **Nao depender da ordem dos campos** no JSON.

### 9.5 Variaveis de ambiente (contrato de configuracao)

| Variavel | Obrigatoria | Componente | Descricao |
|---|---|---|---|
| `GEMINI_API_KEY` | SHOULD | AgentLoop, CreativeLab | API key do Google Gemini. Ausencia ativa modo mock. |
| `SUPABASE_URL` | MUST | Supabase client | URL do projeto Supabase. |
| `SUPABASE_SERVICE_KEY` | SHOULD | Supabase client | Service Role Key (bypass RLS). Preferido sobre Anon Key. |
| `SUPABASE_ANON_KEY` | MAY | Supabase client | Fallback se Service Key ausente. Limitada ao RLS publico. |
| `TELEGRAM_BOT_TOKEN` | SHOULD | TelegramHandler | Token do bot Telegram. Ausencia desativa o canal Telegram. |
| `TELEGRAM_ALLOWED_USER_ID` | MUST (se Telegram ativo) | TelegramHandler | ID do usuario autorizado (whitelist). |
| `META_ACCESS_TOKEN` | MUST (se MCP Meta ativo) | MCP Meta Ads | Access Token da Meta Marketing API. |
| `GOOGLE_ADS_CLIENT_ID` | MUST (se MCP Google ativo) | MCP Google Ads | OAuth Client ID. |
| `GOOGLE_ADS_CLIENT_SECRET` | MUST (se MCP Google ativo) | MCP Google Ads | OAuth Client Secret. |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | MUST (se MCP Google ativo) | MCP Google Ads | Developer Token do MCC. |
| `GOOGLE_ADS_REFRESH_TOKEN` | MUST (se MCP Google ativo) | MCP Google Ads | Refresh Token do usuario. |
| `APIFY_TOKEN` | SHOULD | CreativeLab | Token do Apify. Ausencia desabilita scraping de benchmarks. |
| `HTTP_PORT` | MAY | HttpServer | Porta do servidor Express. Default: `3001`. |

### 9.6 Historico de versoes deste documento

| Versao | Data | Autor | Descricao |
|---|---|---|---|
| 1.0 | 2026-03-26 | Eduardo + Claude | Versao inicial. Documenta todos os contratos existentes e planejados do AdsClaw SWAS. |

---

## Anexo A: Mapa de Dependencia entre Contratos

```
Agency Cockpit (React)
    |
    +-- [HTTP] POST /api/chat ---------> HttpServer
    +-- [HTTP] GET /api/health --------> HttpServer
    +-- [HTTP] GET /api/clients -------> HttpServer (planejado)
    +-- [HTTP] GET /api/clients/:id/rules -> HttpServer (planejado)
    |
HttpServer
    |
    +-- [Internal] StandardizedInput --> AgentController --> AgentLoop
    |                                                           |
    |   +-------------------------------------------------------+
    |   |
    |   +-- [Gemini FC] get_client_rules -----> Supabase (client_rules)
    |   +-- [Gemini FC] list_clients ----------> Supabase (clients)
    |   +-- [Gemini FC] meta_* ----------------> MCP Meta Ads --> Meta Marketing API
    |   +-- [Gemini FC] google_* --------------> MCP Google Ads --> Google Ads API
    |   +-- [Gemini FC] fetch_ad_benchmarks ---> CreativeLab --> Apify
    |   +-- [Gemini FC] generate_ad_copy ------> CreativeLab --> LLM (Gemini/Premium)
    |   +-- [Gemini FC] generate_image --------> CreativeLab --> inference.sh (FLUX)
    |   +-- [Gemini FC] generate_video --------> CreativeLab --> inference.sh (Veo)
    |   +-- [Gemini FC] upload_asset ----------> Supabase Storage (planejado)
    |   +-- [Gemini FC] notify_manager --------> TelegramHandler
    |   +-- [Gemini FC] ask_approval ----------> TelegramHandler (planejado)
    |
Orchestrator (node-cron)
    |
    +-- [Supabase] SELECT clients + client_rules
    +-- [Telegram] notify_manager (alertas proativos)
    |
TelegramHandler (Grammy)
    |
    +-- [Telegram API] Long-polling (incoming)
    +-- [Internal] StandardizedInput --> OmnichannelGateway --> AgentController
    +-- [Telegram API] sendMessage (outgoing)
    |
MemoryManager
    |
    +-- [Supabase] chat_history (CRUD)
```

---

## Anexo B: Glossario de Termos

| Termo | Definicao |
|---|---|
| **SWAS** | Software With an Agent Soul. Modelo de negocio onde o software e o agente de IA operam internamente na agencia; o cliente final compra resultado, nao acesso ao software. |
| **AgentLoop** | Motor cognitivo central baseado no padrao ReAct (Reasoning + Acting). Executa ciclos iterativos de pensamento -> acao -> observacao. |
| **MCP** | Model Context Protocol. Protocolo aberto para conectar LLMs a fontes de dados externas via transporte stdio ou HTTP. |
| **Function Calling** | Capacidade do Gemini de invocar funcoes definidas pelo desenvolvedor durante a geracao de resposta. O LLM decide qual tool chamar com base no contexto. |
| **Tier LLM** | Nivel de custo/qualidade do provedor de LLM. CHEAP (routing), BALANCED (analise), PREMIUM (copy criativa). Conforme ADR-001. |
| **Sliding Window** | Estrategia de truncamento de contexto: manter apenas as N mensagens mais recentes para nao exceder o limite de tokens do LLM. |
| **CPA** | Cost Per Acquisition. Custo por conversao/aquisicao. Metrica central de performance. |
| **ROAS** | Return On Ad Spend. Receita gerada por real investido em anuncios. |
| **Fadiga Criativa** | Fenomeno onde um anuncio perde performance ao longo do tempo por superexposicao ao mesmo publico. |
| **GAQL** | Google Ads Query Language. Linguagem de consulta proprietaria do Google Ads, similar a SQL. |

# Spec Técnica: Telegram I/O
> Módulos: `agent/src/services/TelegramHandler.ts`, `agent/src/services/TelegramOutputFormatter.ts`
> Requisitos: RF-011, RF-012, RF-013
> Contratos: CONTRACTS.md §Telegram Input, §Telegram Output, §Telegram Approval Flow
> Versão: 1.0 — 2026-03-26

---

## Responsabilidade

O módulo Telegram I/O gerencia toda a comunicação entre o agente e o gestor via Telegram. É composto por:
- **TelegramHandler**: processa mensagens de entrada (texto, PDF, voz)
- **TelegramOutputFormatter**: formata e envia respostas (texto chunked, imagens, vídeos, inline keyboards)
- **ApprovalFlow**: gerencia o ciclo de aprovação humana via inline keyboard

---

## TelegramHandler (Input)

### Whitelist de chat_ids

```typescript
// Validação antes de processar qualquer mensagem
function isAuthorized(chatId: number): boolean {
  const whitelist = process.env.TELEGRAM_ALLOWED_CHAT_IDS
    ?.split(',')
    .map(id => parseInt(id.trim(), 10)) ?? [];

  return whitelist.includes(chatId);
}

// Se não autorizado: log + ignorar silenciosamente (não responder)
if (!isAuthorized(msg.chat.id)) {
  logger.warn({ chatId: msg.chat.id, event: 'unauthorized_message_discarded' });
  return; // NÃO responder — não confirmar que o bot existe
}
```

### Tipos de Mensagem Suportados

| Tipo | Como processar | Biblioteca |
|------|---------------|-----------|
| Texto | Direto: `msg.text` | — |
| PDF | Baixar arquivo → extrair texto via `pdfjs-dist` | `pdfjs-dist` |
| Áudio/Voz | Baixar arquivo → transcrever via Gemini (multimodal) | Gemini SDK |
| Foto | Baixar arquivo → passar como base64 para o LLM | — |
| Documento (não PDF) | Responder que o formato não é suportado | — |

### Processamento de PDF

```typescript
async function processPdfMessage(fileId: string): Promise<string> {
  // 1. Baixar arquivo do Telegram
  const fileUrl = await bot.getFileLink(fileId);
  const buffer = await downloadFile(fileUrl);

  // 2. Extrair texto com pdfjs
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    pages.push(textContent.items.map((item: any) => item.str).join(' '));
  }

  const fullText = pages.join('\n\n');

  // 3. Truncar se muito longo (proteção de tokens)
  const MAX_PDF_CHARS = 15_000;
  return fullText.length > MAX_PDF_CHARS
    ? fullText.slice(0, MAX_PDF_CHARS) + '\n[...documento truncado]'
    : fullText;
}
```

### Processamento de Áudio

```typescript
async function processVoiceMessage(fileId: string): Promise<string> {
  const fileUrl = await bot.getFileLink(fileId);
  const audioBuffer = await downloadFile(fileUrl);

  // Usar Gemini multimodal para transcrição (sem SDK externo separado)
  const provider = await providerFactory.forClient(clientId, 'tier1');
  return await provider.transcribeAudio(audioBuffer, 'audio/ogg');
}
```

---

## TelegramOutputFormatter (Output)

### Chunking de Mensagens

O Telegram tem limite de 4096 caracteres por mensagem. O formatter divide automaticamente:

```typescript
function chunkText(text: string, maxLength = 4000): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Tentar quebrar em parágrafo (\n\n)
    let breakPoint = remaining.lastIndexOf('\n\n', maxLength);

    // Se não encontrou parágrafo, tentar linha (\n)
    if (breakPoint === -1) {
      breakPoint = remaining.lastIndexOf('\n', maxLength);
    }

    // Se não encontrou linha, quebrar na última palavra
    if (breakPoint === -1) {
      breakPoint = remaining.lastIndexOf(' ', maxLength);
    }

    // Se tudo falhou, cortar no limite
    if (breakPoint === -1) breakPoint = maxLength;

    chunks.push(remaining.slice(0, breakPoint).trim());
    remaining = remaining.slice(breakPoint).trim();
  }

  return chunks;
}
```

### Envio de Assets

```typescript
async function sendAssets(chatId: number, assets: Asset[]): Promise<void> {
  for (const asset of assets) {
    switch (asset.type) {
      case 'image':
        await bot.sendPhoto(chatId, asset.url, { caption: asset.caption });
        break;
      case 'video':
        await bot.sendVideo(chatId, asset.url, { caption: asset.caption });
        break;
      case 'document':
        await bot.sendDocument(chatId, asset.url, { caption: asset.caption });
        break;
    }
  }
}
```

---

## ApprovalFlow (Human-in-the-Loop)

O flow de aprovação é usado quando o agente precisa executar uma ação irreversível (ajustar orçamento, pausar campanha, publicar criativo).

### Sequência

```
1. AgentLoop chama tool `ask_approval` com { action, payload, description }
   │
   ▼
2. TelegramOutputFormatter envia mensagem com InlineKeyboard:
   "O agente quer: [descrição da ação]
   [✅ Aprovar] [❌ Rejeitar]"
   │
   ▼
3. Agente ESPERA (não continua processando) — estado persistido no Supabase
   │
   ▼
4. Usuário clica em Aprovar ou Rejeitar
   │
   ├── APROVADO: executa a ação real, confirma ao usuário
   └── REJEITADO: cancela, registra motivo, informa ao agente
   │
   ▼
5. Se nenhuma resposta em 24h: aprovação cancelada automaticamente (PM2 cron)
```

### Schema da Tabela de Aprovações Pendentes

```sql
CREATE TABLE pending_approvals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id),
  chat_id      BIGINT NOT NULL,
  action       TEXT NOT NULL,          -- ex: "pause_campaign"
  payload      JSONB NOT NULL,         -- dados para executar a ação
  description  TEXT NOT NULL,          -- texto legível para o gestor
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  message_id   INTEGER,                -- ID da mensagem Telegram com o keyboard
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pending_approvals_client_status
  ON pending_approvals(client_id, status)
  WHERE status = 'pending';
```

### InlineKeyboard

```typescript
async function sendApprovalRequest(
  chatId: number,
  approvalId: string,
  description: string
): Promise<number> {  // retorna message_id
  const msg = await bot.sendMessage(chatId, description, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Aprovar', callback_data: `approve:${approvalId}` },
        { text: '❌ Rejeitar', callback_data: `reject:${approvalId}` }
      ]]
    }
  });
  return msg.message_id;
}

// Handler de callback
bot.on('callback_query', async (query) => {
  const [action, approvalId] = query.data!.split(':');

  if (action === 'approve') {
    await approvalService.approve(approvalId, query.from.id);
    await bot.answerCallbackQuery(query.id, { text: '✅ Aprovado!' });
  } else if (action === 'reject') {
    await approvalService.reject(approvalId, query.from.id);
    await bot.answerCallbackQuery(query.id, { text: '❌ Rejeitado.' });
  }
});
```

---

## Testes

```typescript
describe('TelegramHandler', () => {
  it('should discard messages from unauthorized chat_ids')
  it('should process text messages and pass to AgentLoop')
  it('should extract text from PDF messages')
  it('should transcribe voice messages')
  it('should return error message for unsupported file types')
})

describe('TelegramOutputFormatter', () => {
  it('should send short messages as single message')
  it('should chunk messages longer than 4000 chars')
  it('should break chunks at paragraph boundaries when possible')
  it('should send images as photos with caption')
  it('should send videos as video messages')
})

describe('ApprovalFlow', () => {
  it('should send inline keyboard for approval requests')
  it('should execute action after approval')
  it('should cancel action after rejection')
  it('should expire pending approvals after 24h')
  it('should not allow double-approval of same request')
})
```

---

## Notas de Segurança

- **Whitelist obrigatória**: qualquer mensagem de `chat_id` não listado em `TELEGRAM_ALLOWED_CHAT_IDS` é descartada sem resposta
- **Callback query validation**: o `callback_data` contém apenas o `approvalId` (UUID) — o payload completo fica no banco, não no botão
- **Timeout de aprovação**: ações críticas expiram em 24h — protege contra aprovações acidentais de solicitações antigas
- **Idempotência**: processar o mesmo `callback_query.id` duas vezes não executa a ação duas vezes (verificar status no banco antes de executar)

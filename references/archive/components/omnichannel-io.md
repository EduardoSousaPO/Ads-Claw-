# Component Spec: Omnichannel Gateway & Input Handlers

**Módulo Central:** Interface Conectora
**Responsabilidade:** Receber, validar, sanitizar e unificar o *Payload* provindo do Telegram API (grammy) e do Front-End Portal Web (React).

---

## 1. Resumo e Objetivo
O AdsClaw é acessado de duas maneiras: Pelo time no desktop através do portal gerencial e pelas interações "On-the-go" no Telegram (Gestão por exceção). O Gateway garante que ambas as frentes sejam absorvidas pelo mesmo "pipe" `AgentController` e gerem logs unificados de `chat_history`.

---

## 2. Fluxo: Portal Web (Dashboard)
- O Web Portal envia comandos por REST/Websockets para a mesma instância NodeJS.
- Como o usuário está autenticado no Front (via Supabase Auth - Agência), a rota validará a JWT do Session Token, confirmará a assinatura do Client ID e inserirá na Fila do Loop.

---

## 3. Fluxo: Telegram (Mobile e Desktop)
Baseado no handler do *SandeClaw*, o gateway intercepta a API de grammy.
- **Whitelist Strict (Hard-lock):** Só recebe de `TELEGRAM_ALLOWED_USER_ID`. Nenhuma sessão para *ghost IDs* é sequer alocada na RAM antes do drop.
- **Áudios e Voz:** Ao receber anexos `.ogg` ou mídias de voz, o Gateway atua com suporte para processamento local `Whisper` de ASR (Speech-to-Text), transformando a fala em prompt de texto. O AgentLoop trata tudo como `.text` internamente.
- **PDFs e Referências (.md):** Usando pacotes leves (ex: `pdf-parse`), o Gateway lê documentos anexados pelos gestores contendo Brand Guidelines ou planilhas dos clientes e converte para injeção de prompt no contexto da requisição atual.

---

## 4. Roteamento de Respostas (Output Handlers)
Respostas complexas geram "Artefatos" visuais no Front-End e no Telegram elas sofrem "Chunking".
- **Telegram Limit Chunking:** Se a "Final Answer" da API tiver 8000 bytes, o Gateway divide sequencialmente em bolhas de <4096 antes de responder ao telegram, com Promises aguardando delay por retry-after (429 Rate Limit) se necessário.
- **Artefatos e Geração de Áudio (TTS):** Se o usuário mandou o comando em Voice Note (Telegram), o handler identifica a flag e após a resposta ser finalizada, converte o texto usando `edge-tts` e retorna como um Voice/Aúdio de volta no chat. Arquivos gerados nas *Skills* (`.mp4`, `.png`) são postados na bolha como `Document` e logo em seguida seu binário descartado do `/tmp` do servidor.

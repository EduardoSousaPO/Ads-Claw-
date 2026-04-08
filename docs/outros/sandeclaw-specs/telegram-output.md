# Spec: Telegram Output Handler

**Versão:** 1.1
**Status:** Aprovada
**Autor:** SandecoClaw Agent
**Data:** 2026-03-09

---

## 1. Resumo

O módulo de Output atua como a boca do SandecoClaw. Ele capta o Output final da Pipeline (do Agent Loop ou das Skills) e define as estratégias adequadas de exibição — seja "Chunking" em mensagens grandes de texto, seja disparo de documentos em markdown, seja áudio TTS, ou aviso explícito de erro.

---

## 2. Contexto e Motivação

**Problema:**
LLMs geram outputs massivos de 10k-30k tokens. O Telegram tem hard limit de `4096` caracteres por mensagem. Um envio direto estoura a API (Erro HTTP 400).

---

## 3. Goals (Objetivos)

- [ ] G-01: Prover interface `TelegramOutputHandler` para separar preocupações de Output.
- [ ] G-02: Recortar strings > 4096 chars dinamicamente sem matar a sintaxe ou palavras ao meio.
- [ ] G-03: Detectar tags "ARQUIVO.MD" e enviar como `FileOutputStrategy` (attach de arquivo).
- [ ] G-04: Prover `AudioOutputStrategy` para sintetizar texto em voz (TTS) via Edge TTS quando flag de áudio for detectada.

---

## 6. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | TextOutputStrategy deve fatiar strings que ultrapassem limite. | Must | Strings de 9000 chars criam 3 bolhas limpas em ordem. |
| RF-02 | FileOutputStrategy intercepta flag de arquivo MD e faz upload via `replyWithDocument()`. | Must | Skill envia anexo com título formatado. |
| RF-03 | ErrorOutputStrategy formata em bloco emoji e dispara avisos. | Must | Erros disparam "⚠️ Erro: X" ao invés de quebra silenciosa. |
| RF-04 | AudioOutputStrategy sintetiza texto em `.ogg` e envia como Voice via `replyWithVoice()`. | Must | Recebimento de áudio no Telegram quando flag `isAudio` ativa. |

### Fluxo Principal (Audio Happy Path)

1. Pipeline AI retorna conteúdo com flag `isAudio: true`.
2. Output Handler aciona `AudioOutputStrategy`.
3. Sistema sinaliza `record_voice` no Telegram.
4. Texto é limpo de Markdown e enviado para `edge-tts-universal`.
5. Buffer de áudio salvo temporariamente no `./tmp/`.
6. Bot envia como Voice Note e deleta arquivo temporário.

---

## Non-Goals

- NG-01: Não implementaremos botões inline HTML/CSS no Telegram.
- NG-02: MarkdownV2 nativo super restritivo — usaremos texto formatado cru seguro de fallback.

---

## Edge Cases

| Cenário | Comportamento |
|---------|--------------|
| EC-01: Rate Limiting Telegram (429) | Sleep via `Retry-After` header e re-dispara em fila |
| EC-02: Path File corrompido no TMP | Fallback para texto em Chunk com alerta |
| EC-03: Bot bloqueado pelo user | Descarta resposta e loga "User bot-blocked" |

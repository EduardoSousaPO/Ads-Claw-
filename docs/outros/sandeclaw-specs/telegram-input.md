# Spec: Telegram Input Handler

**Versão:** 1.1
**Status:** Em Revisão
**Autor:** SandecoClaw Agent
**Data:** 2026-03-08

---

## 1. Resumo

O módulo Telegram Input recebe eventos brutos advindos das APIs do Telegram via biblioteca grammy (Long Polling), faz a filtragem de segurança por whitelist de ID, converte anexos (documentos PDF e mensagens de voz de áudio) em texto viável, e injeta na memória do ciclo de agente para resolução AI.

---

## 2. Contexto e Motivação

**Problema:**
LLMs consomem texto e mídias num array fixo de History. Eles não descompactam pacotes PDF ou áudios em texto nativamente. Frequentemente é mais prático para o usuário enviar um áudio no Telegram ao invés de digitar textos longos.

---

## 3. Goals (Objetivos)

- [ ] G-01: Receber mensagens puras de texto (`message:text`) dos usuários em whitelist.
- [ ] G-02: Receber envios de anexo (`message:document`) tipo `.pdf` ou `.md`, salvando temporariamente para leitura.
- [ ] G-03: Receber mensagens de voz (`message:voice`) e áudio (`message:audio`), baixar e transcrever via Whisper local (STT).
- [ ] G-04: Informar "Typing..." ou "Recording voice..." via API Telegram durante processamento.
- [ ] G-05: Injetar metadados quando input for áudio, sugerindo ao Output Handler responder em voz (TTS).

---

## 6. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Ouvir eventos `message:text` filtrados. | Must | Bot intercepta Msg ID válida em < 2s |
| RF-02 | Acionar extração local para PDFs e `.md`. | Must | Retorna conteúdo como texto |
| RF-03 | Excluir documentos baixados da `tmpDir` após parse. | Must | Sem memory leaks no FileSystem |
| RF-04 | Ouvir eventos de voz e áudio. | Must | Envia para Whisper |
| RF-05 | Usar Whisper Local para transcrever áudio. | Must | Log mostra "Transcript: xyz" |
| RF-06 | Sinalizar preferência por áudio (TTS) quando input for voz. | Must | Payload contém `requires_audio_reply: true` |

### Fluxo Principal (Happy Path)

1. Entrada: Voice Note no Telegram com "Cria um PRD pro meu novo app"
2. Bot Grammy valida user ID na Whitelist.
3. Evento classificado como Voz via `on(["message:voice", "message:audio"])`.
4. Bot Controller atualiza status: `sendChatAction('record_voice')`.
5. API stream do TG baixa chunks raw do áudio no `/tmp/`.
6. Arquivo enviado para módulo Whisper local (STT).
7. Texto transcrito + Flag `requires_audio_reply` seguem para o Agent Loop.
8. Arquivo temporário deletado na conclusão.

---

## Edge Cases

| Cenário | Comportamento |
|---------|--------------|
| EC-01: Anexo não suportado (DOCX, JPG) | Responde: "Só processo texto, áudio e PDF." |
| EC-02: OOM no Whisper | Timeout 60s e aviso ao usuário. |
| EC-03: Áudio vazio/mudo | Responde: "Áudio vazio captado. Reenvie." |
| EC-04: PDF massivo | Limite de bytes, catch e limpeza de TEMP. |
| EC-05: Timeout download Telegram | Aviso e limpeza de chunks. |

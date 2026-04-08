# 🧠 SundayClaw - Guia Completo de Construção de Agente Local com Antigravity

Baseado no processo demonstrado por Sandeco no vídeo.

---

## 🎯 OBJETIVO

Construir um agente de IA pessoal:

- Rodando localmente
- Integrado ao Telegram
- Extensível via Skills
- Capaz de processar texto, áudio e documentos
- Compatível com múltiplas LLMs

---

## 🧱 ARQUITETURA

Componentes:

- Specs (PRD, arquitetura, loop, skills)
- Antigravity
- Agent Loop
- Skills
- Telegram
- LLMs
- Whisper

---

## ⚙️ ETAPA 1 — PROJETO

Criar pasta:

SundayClaw/

Adicionar:

/specs
  - PRD.md
  - architecture.md
  - agent_loop.md
  - skill_user.md

---

## 🧠 ETAPA 2 — GERAÇÃO

No Antigravity:

Prompt:

"Leia os documentos e construa toda a aplicação do agente.
Crie também a pasta de skills."

---

## ⚙️ ETAPA 3 — SETUP

Antigravity instala:

- Node
- Dependências
- SQLite

---

## 🔐 ETAPA 4 — .env

Criar:

.env

Conteúdo:

TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_USER_IDS=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
OPENAI_API_KEY=

---

## 🤖 ETAPA 5 — TELEGRAM

- Acessar @BotFather
- /newbot
- Definir nome e username
- Copiar token

---

## 🔒 ETAPA 6 — SEGURANÇA

- Usar @get_id_bot
- Inserir ID no .env

---

## 🧠 ETAPA 7 — LLM

- Criar API key
- Inserir no .env

---

## 🚀 ETAPA 8 — EXECUÇÃO

npm run dev

---

## 📡 ETAPA 9 — TESTE

Enviar mensagem no Telegram

---

## 🧩 ETAPA 10 — SKILLS

Pasta:

/agents/skills/

Adicionar arquivos de skill

Reiniciar agente

---

## 🔁 ETAPA 11 — VALIDAR SKILLS

Prompt:

"Verifique se o sistema está carregando as skills."

---

## 📄 ETAPA 12 — INPUT AVANÇADO

Habilitar:

- PDF
- Markdown
- Áudio

---

## 🎤 ETAPA 13 — ÁUDIO

Fluxo:

1. Recebe áudio
2. Transcreve (Whisper)
3. Processa

---

## 🧠 ETAPA 14 — CORREÇÃO

Prompt:

"O sistema não está funcionando corretamente. Corrija."

---

## 🔄 LOOP FINAL

Usuário → Telegram → Agente → LLM → Skill → Resposta

---

## ⚡ RESUMO

1. Criar specs
2. Gerar sistema
3. Configurar
4. Rodar
5. Testar
6. Evoluir

---

## 💡 PRINCÍPIO

Você não programa.

Você escreve specs.

---

## 🚀 INSIGHT

Spec Driven Development com IA.

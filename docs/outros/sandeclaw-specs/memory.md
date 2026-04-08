# Spec: Memory Module (SQLite Persistence)

**Versão:** 1.0
**Status:** Aprovada
**Autor:** SandecoClaw Agent
**Data:** 2026-03-06

---

## 1. Resumo

O módulo de persistência de estado do SandecoClaw gerencia tanto as conversas de longo prazo em banco de dados SQLite (`better-sqlite3`) quanto atua como manager da janela de contexto para impedir que o limite maximo do envelope de tokens da IA (Context Window) estoure.

---

## 2. Contexto e Motivação

**Problema:**
LLMs são stateless - eles esquecem tudo que foi dito na interação anterior de uma API REST call. Sem armazenamento persistente, o robô perde a utilidade primária de um "Agente Pessoal".

**Evidências:**
Tentativas de armazenar arrays in-memory no Node.js funcionam apenas até o app ser encerrado/reiniciado. O histórico vaporizava.

**Por que agora:**
A adoção do SQLite é veloz, serverless (um arquivo físico único), suporta chamadas síncronas rápidas e não consome infra adicional.

---

## 3. Goals (Objetivos)

- [ ] G-01: Prover Storage fixo e rápido de mensagens do Telegram para recriar as conversas ativas.
- [ ] G-02: Possuir um `MemoryManager` central (Facade) que decide automaticamente quando as mensagens velhas deverão ser ignoradas (Truncamento nativo) sem apagar sua versão persistente histórica.
- [ ] G-03: Ranquear requisições de SQLite usando Repository Pattern, desacoplando SQL views puro do Agent Loop principal.

**Métricas de sucesso:**
| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Tempo de Write Sync | N/A | < 10ms | Constante |
| Limite de Arquivo DB | 0.0 MB | Manter sob 500 MB | 1 Ano |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: Não criará banco distribuído de Grafos ou Chroma Vector Database. Memória conversacional direta, sem Semantic Search.
- NG-02: ORMs como Prisma, TypeORM etc. Usaremos SQL nativo `better-sqlite3` por leveza e clareza.

---

## 5. Usuários e Personas

**Módulos primários:**
- O arquivo `DocumentHandler` (grava input principal).
- A Classe `TelegramBot` via `AgentLoop` (lê e grava answers).
- A Ferramenta Genérica de Sistema (apenas lê seu próprio histórico pra sumarização futura).

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O Singleton de DB deve criar a tabela de histórico (`conversations` e `messages`) sozinho no startup se não existirem. | Must | Excluir db antigo; reiniciar app; arquivo data/ db.sqlite reaparece limpo. |
| RF-02 | O Storage deve usar WAL (Write-Ahead Logging) ativo pra manter leitura sem block | Must | Múltiplas msgs via Telegram não congelam o bot por locks do sqlite3 nativo. |
| RF-03 | A classe abstrata repassará ao Agent Loop somente o número `MEMORY_WINDOW_SIZE` de mensagens recentes. | Must | Uma chamada REST pro Gemini não falhará por estouro de token via histórico inchado. |

### 6.2 Fluxo Principal (Happy Path)

1. Usuário envia "Oi agente".
2. `ConversationRepository` localiza UUID conversacional ativo do User_ID.
3. `MessageRepository` persiste a nova mensagem `role="user"` com texto associado ao ID.
4. `MemoryManager` extrai da DB as últimas "N" conversas usando LIMIT.
5. Devolve array `[]` filtrado para AgentLoop atuar.
6. A resposta do bot com `role="assistant"` ou `role="tool"` é persistida analogamente pelas mesmas classes.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Transações Seguras | Auto-commit nativo | WAL ativo resolve concorrencia Single thread node. |

---

## 8-14. (Demais seções)

- Design: Pura estrutura sem interface visual.
- Modelo: `conversations` + `messages`. Sem foreign keys restritas.
- Dependências: `better-sqlite3` (obrigatória), Filesystem (`fs`).
- Edge Cases: Lock file corrupto, Null Bytes, Memória enorme de resposta.
- Segurança: DB jamais vai pro Git. Sem senhas no prompt persistido.
- Rollout: Instantâneo para DB Version 1.

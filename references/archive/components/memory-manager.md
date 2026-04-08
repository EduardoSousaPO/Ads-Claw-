# Component Spec: Memory Manager (Supabase State)

**Módulo Central:** Banco de Dados & Histórico Rastreável
**Responsabilidade:** Substituto do SQLite, este módulo opera a persistência da fila FIFO de conversas por inquilino/cliente gerenciado no Supabase.

---

## 1. Resumo e Objetivo
O agente não guarda mensagens do Google Ads e Meta Ads internamente no Node. 
A arquitetura do AdsClaw tem dois recortes isolados para "memórias":
- **Configurações Determinísticas (`client_rules`):** Dados vitais (budget, tom de marca, CPA alvo) read-only durante a operação, alterados raramente, via CRUD pelo painel.
- **Estado Epifenomenal (`chat_history`):** A esteira de logs da conversa (Role Assistant VS Role User VS Tool Calls) entre a agência e o Agente focado em um único escopo de projeto.

---

## 2. A Janela de Contexto (Context Window Manager)
- O Gemini possui altíssimo token count (2M+ tokens no flash/pro 1.5). No entanto, injetar tabelas de histórico inteiras de anos a cada iteração causará picos exponenciais de tarifação, além de desatenção semântica nos endpoints do agente.
- **Truncamento Nativo:** O Memory Manager vai realizar SELECTs com LIMIT explícito e *sliding window algorithm* para extrair do Supabase as últimas `N=30` (variável configurável `MEMORY_WINDOW_SIZE`) rodadas da sessão em curso limitando ao teto do TokenBudget estipulado internamente na codebase.

---

## 3. Segurança no Armazenamento (RLS em Produção)
Quando o gateway Web requisitar histórico, o Memory Manager efetuará chamadas à API com o Bearer token do usuário que chamou (delegando a segurança a nível de DB), evitando expor históricos de faturas do "Cliente X" no painel da gestora que tem premissão pro "Cliente Y" (caso a agência escale os acessores).
O robô server-side utilizará a key primária (`SERVICE_ROLE`) e, portanto, será o único ser blindado que transitará globalmente pelo `chat_history`.

---

## 4. O que é "Armazenado"?
A engine `chat_history` terá em seu Payload JSON as estruturas exatas necessárias para reconstrução do Array de Diálogo da classe respectiva do provedor.
Ex: role: `model` | role: `user` | content: `...` | tool_call: `uuid`
O AgentLoop lê do manager, formata para o SDK da vez e dispacha na inferência.

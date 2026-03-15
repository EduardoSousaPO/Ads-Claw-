# Plano Técnico (PLAN) - AdsClaw

## 1. Tecnologias Utilizadas (Stack)
- **Frontend (Agency Cockpit):** React / Vite com estilização TailwindCSS para design modular, rápido, responsivo e visuais premium em dashboards.
- **Backend (Orquestração e Integração):** Node.js / Python conectando ao ecossistema local do Cursor/Gemini com suporte a Servidores MCP (Model Context Protocol).
- **Banco de Dados (Estado e Configuração):** Modelagem e persistência via **Supabase** (PostgreSQL na nuvem ou auto-hospedado), fornecendo garantias ACID, Storage de arquivos estáticos, e Webhooks/Edge Functions.
- **Serviços Cognitivos e Conexões Autônomas:** Gemini 1.5 Pro e Flash, Google Veo, serviços OpenAI (fallback) e conexões nativas de API via skills (Google Ads e Meta Marketing API).

## 2. Arquitetura Funcional
- **Supabase (Backend-as-a-Service):**
  - PostgreSQL para persistência.
  - Project ID Fixo: `gbzepjbevvimijemnhcj`.
  - Row-Level Security (RLS) para isolamento total de dados entre clientes.
  - Storage Buckets para criativos (vídeos/imagens).
  - Uso do PostgreSQL para isolar dados, mantendo os tokens de clientes, orçamentos, status de campanhas e histórico de interações (chat). O agente consome da API do Supabase no momento da execução para recuperar os parâmetros atualizados do cliente.
- **Motor Cognitivo (Core ReAct):** Implementação baseada em POO replicando o _SandeClaw_.
  - `AgentController`: Roteia comandos entre Telegram e portal Web (Omnichannel).
  - `AgentLoop`: Padrão Thought-Action-Observation garantindo que o LLM não alucine antes de receber respostas reais das *Tools*. Máximo de iterações controladas.
  - `ToolRegistry`: Gerencia skills ativas (apify, ai-video) localmente, formatando-as no JSON Schema esperado pelo provedor do modelo (Gemini).
  - `MemoryManager`: Substituto do SQLite, injetando logs do chat recuperados do banco PostgreSQL, servindo como a "memória" histórica contínua de um cliente específico.
- **Abstração por Servidores MCP:** Ações como criação e pausas de anúncios na Meta e Google serão abstraídas. O agente faz tool calls para servidores MCP, garantindo padronização e escalabilidade para adicionar novas fontes de Ads futuramente.
- **Motor CLI Proativo Background:** Rotinas ou verificações que leem os relatórios das próprias APIs (meta/google) e sinalizam alertas imediatos na interface (Fadiga de campanha).

## 3. Integração e APIs Principais
| Serviço / MCP | Finalidade | Descrição |
|-----------|-----------|------------------|
| `mcp-meta-ads`| Meta Marketing API | MCP nativo sendo construído para recuperar métricas, publicar criativos, e monitorar budget na Meta |
| `paid-ads (skill)`| Google Ads API | Facilita a gestão integral de campanhas do ecossistema Google |
| `apify` | Market Research | Busca e scrape de referências visuais de concorrentes e cópias em mídias (Facebook, TikTok, Instagram) |
| `ai-video-generation`| Produção Audiovisual| Renderização centralizada de mídias de vídeo e interações para compor o "Laboratório Criativo" |

## 4. Modelagem de Dados (Supabase Relacional)
**Estrutura Lógica do Banco:**
- `clients`: Tabela com identificadores da conta Google/Meta, status, nome corporativo.
- `client_rules`: Tabela de configuração isolada de Target CPA, Orçamento Diário, Oferta Principal.
- `chat_history`: Tabela p/ salvar fila de comandos (Telegram + Interface Dashboard).
- **Supabase Storage:**
  - `buckets/client_[id]/assets`: Repositório de imagens, vídeos e copies validadas.
  - `buckets/client_[id]/reports`: Relatórios e screenshots renderizados.

## 5. Segurança e Autenticação
- **Cockpit Interno:** Proteção no acesso via rotas internas locais, mantida e operada exclusiva e intencionalmente pela agência nas premissas AWS ou máquina local com acessos estritos.
- **Gestão de Chaves de Autenticação:** Qualquer secret de Meta, Google, ou outras APIs devem imperativamente possuir um `.env` listado via `.gitignore` e blindando os tokens de pushs da base de código.

## 6. Estratégia de Testes
- Validações modulares garantindo a extração do parsing de parâmetros através do SDK do Supabase e mocks do cliente de banco, testando constraints.
- Para o desenvolvimento do *Meta Ads MCP*, serão usados mocks baseados em respostas json padrões da Sandbox API da Meta para prevenir bloqueio em endpoints vivos.

## 7. Riscos Técnicos e Mitigação
- **Risco:** Bloqueios de API por esgotamento de Rate Limit no tráfego cruzado entre múltiplos clientes.
  **Mitigação:** Fazer cache de estatísticas de campanha a cada X horas, em vez de consultar agressivamente a API da Meta toda hora; os dados vitais poderão ser listados nas views da ferramenta sem real time punitivo.
- **Risco:** "Vazamento" ou cruzamento por confusão do contexto da IA de informações da Marca A na Campanha da Marca B.
  **Mitigação:** Regras estritas nos gatilhos dos scripts MCP, forçando validação rigorosa via leitura de caminho absoluto.

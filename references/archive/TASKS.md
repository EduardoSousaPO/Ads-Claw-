# Execução e Tarefas (TASKS) - AdsClaw

Abaixo listam-se os passos rastreáveis para guiar a implementação orientada pelas especificações previamente planejadas.

- [x] **Fase 1: Configuração Base e Banco Supabase (Setup do Motor)**
  - [x] `Task 1.1`: Criar projeto e banco de dados central no Supabase (ID: `gbzepjbevvimijemnhcj`).
  - [x] `Task 1.2`: Desenvolver e rodar as Migrations em SQL pra criação das tabelas `clients` e `client_rules`.
  - [ ] `Task 1.3`: Estruturar a classe client/singleton `SupabaseClient` no código Typescript base para lidar com operações seguras do banco.

- [x] **Fase 2: Motor Cognitivo (ReAct & Omnichannel Gateway)**
  - [x] `Task 2.1`: Implementar classe `AgentController` e handlers para Telegram (`grammy`) preparando-o para receber o input Web futuramente.
  - [x] `Task 2.2`: Portar e construir lógica principal do `AgentLoop` executando iterações `Thought+Action` usando LLMs primordiais (Gemini).
  - [x] `Task 2.3`: Desenvolver o `MemoryManager` conectado à tabela `chat_history` do Supabase injetando contexto restrito do cliente na chamada da IA.
  - [x] `Task 2.4`: Incorporar `ToolRegistry` base pra ler dinamicamente `.agents/skills` transformando para JSON Schema Functions (ex: Gemini SDK).

- [x] **Fase 3: Agency Cockpit (Frontend Portal)**
  - [x] `Task 3.1`: Scaffold e inicialização do projeto Frontend (Ex: React/Vite/Tailwind) no sub-diretório ou raiz designada baseando-se por exigências modernas web.
  - [x] `Task 3.2`: Construir e rotear componentes internos do painel listando todas as contas vindas da tabela `clients` do Supabase via fetching.
  - [x] `Task 3.3`: Desenvolver views modulares para visualização ágil das métricas chave por interface (Dashboard).

- [x] **Fase 4: Infraestrutura, Integrações e Construção de MCPs (Pilar do SWAS)**
  - [x] `Task 4.1`: Utilizando a documentação e skill nativa de `mcp-builder`, inicializar a modelagem fundamental do Meta Ads MCP (em Python ou Node).
  - [x] `Task 4.2`: Implementar as tools essenciais do MCP focadas na "Leitura de Métricas" ROAS/CPA, listando ativas Ads e Campanhas na API da Meta.
  - [x] `Task 4.3`: Configurar os acessos nativos, autenticações e hooks operacionais usando o skill `paid-ads` para Google Ads.

- [x] **Fase 5: Motor do "Laboratório Criativo" & IA Generativa**
  - [x] `Task 5.1`: Elaborar módulo de integração utilizando e conectando a skill `apify` para captura de benchmarks e inspiração visual concorrente no nicho respectivo de um cliente.
  - [x] `Task 5.2`: Construir fluxo de Prompting (Gemini Pro/Flash) focado e enraizado na "Desconstrução Visual" (análise de estrutura de campanhas competitivas) rumo à geração de múltiplas variações de "Copies".
  - [x] `Task 5.3`: Testar e integrar localmente disparos automáticos chamando a base técnica da skill `ai-video-generation` e DALL-E, gerando arquivos tangíveis no drive da conta do cliente.

- [x] **Fase 6: Automação Inteligente e Motor de Alertas (Orquestração)**
  - [x] `Task 6.1`: Realizar codificação de um cron job no Node.js agindo por trás do projeto que lê a tabela `client_rules` do ativo contra os resultados online para disparar o "Creative Dilemma".
  - [x] `Task 6.2`: Estabelecer condição final técnica para detecção da "Fadiga de Criativo" - Ex: Validar "dias ativos >= janela informada e CPA excedido". Notificar o usuário adequadamente.

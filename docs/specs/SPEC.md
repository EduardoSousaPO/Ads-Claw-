# Especificação do Sistema (SPEC) - AdsClaw

## 1. Visão Geral do Comportamento
O AdsClaw é um motor autônomo e proativo de inteligência artificial de uma agência de performance (modelo SWAS - SaaS without Software). Ele atua como Gestor de Campanhas e Gerador de Criativos 24/7. O sistema opera de forma invisível para o cliente final, sendo orquestrado por gestores internos (Agency Cockpit) para entregar resultados em contas de Google Ads e Meta Ads, baseando-se em diretrizes estritas de isolamento por cliente e orçamentos gerenciadas via banco de dados Supabase (PostgreSQL) com forte uso de Row-Level Security (RLS).

## 2. Requisitos Funcionais
- [ ] O sistema deve realizar monitoramento proativo de contas de anúncios cruzando com os limites de orçamentos e CPAs definidos em regras específicas de cada cliente.
- [ ] O sistema deve prover um "Agency Cockpit" (Web Portal) para que a equipe interna possa visualizar clientes e orquestrar campanhas.
- [ ] O sistema deve implementar isolamento multi-inquilino seguro via Supabase RLS, carregando as regras (tom de voz, target CPA) do registro do cliente antes de qualquer ação.
- [ ] O sistema deve perguntar ao gestor se deseja subir criativos manuais ou gerar novos pelo "Laboratório Criativo" (Dilema do Criativo).
- [ ] O sistema deve permitir integração direta com Google Ads via API (skill `paid-ads`).
- [ ] O sistema deve permitir integração direta com Meta Ads via um servidor MCP customizado.
- [ ] O sistema deve detectar "Fadiga de Criativo" (queda de performance em 7-14 dias) e sugerir atualizações.
- [ ] O sistema deve capturar auditorias visuais diárias ou ao atingir o resultado usando a skill `agent-browser`.
- [ ] O motor interno deve operar sob a estrutura (ReAct - AgentLoop) com `ToolRegistry` baseada no framework SandeClaw, prevenindo que iterações estrapolem o limite de raciocínio.
- [ ] O sistema deve prover um `Unified Input Handler` que escuta simultaneamente via webhook/HTTP o portal Web e o grammy (Telegram), convergindo num unificado "AgentController".
- [ ] O sistema deve possuir um `MemoryManager` que injeta logs anteriores das sessões do banco na chamada primária pro Gemini.

## 3. Requisitos Não Funcionais
- [ ] Segurança (Isolamento de Cliente): O cruzamento de dados de clientes diferentes na geração de respostas e campanhas é estritamente proibido. O banco de dados do Supabase assegurará através de RLS que cada transação contemple apenas os dados autorizados.
- [ ] Conectividade: O sistema usa abstração por MCP (Model Context Protocol) para conectar em fontes externas como Meta Ads.
- [ ] UX Premium: O Agency Cockpit deve prover uma experiência premium focada em produtividade (Gestão por exceção).

## 4. Casos de Uso e Fluxos Principais
**Fluxo 1: Auditoria Proativa e Raciocínio (Agent Loop)**
1. O agente varre resultados da campanha atual no Google/Meta Ads.
2. O AgentLoop inicia o ciclo *Thought -> Action (Fetch SQL) -> Observation*.
3. O agente cruza os dados obtidos com as métricas definidas na tabela de regras do cliente no Supabase (`client_rules`).
4. Se detectada ausência de performance ou fadiga, o agente gera notificação via `OmnichannelGateway` para o Telegram do gestor com a sugestão de reinício de testes.

**Fluxo 2: Laboratório Criativo (Internal Production Line)**
1. O gestor aciona o Laboratório Criativo para um cliente.
2. O agente utiliza a skill `apify` para captura de benchmarks do mercado no nicho do cliente.
3. O agente utiliza Gemini 1.5 Pro para desconstrução de anúncios e Gemini 1.5 Flash para geração de dezenas de copies.
4. O agente aciona a skill `ai-video-generation` para produção do conteúdo audiovisual ou DALL-E para criar assets em imagem.
5. Criativos gerados são armazenados com segurança nos buckets do Supabase Storage associados ao ID do respectivo cliente.

## 5. Critérios de Aceite
- [ ] A política de segurança multi-inquilinos (Supabase RLS) é respeitada em toda geração de prompt ou tool call. Nenhuma conta é manipulada sem injeção dos parâmetros dinâmicos do banco.
- [ ] A conexão de postagem/leitura via MCP Meta Ads funciona para as operações básicas de relatórios e criação.
- [ ] A execução do fluxo do Laboratório Criativo envia os arquivos lógicos e físicos (.mp4, .png, .txt) gerados para os buckets de armazenamento no Supabase Storage.

## 6. Casos de Borda (Edge Cases)
- [ ] E se a API do Google ou MetaAds estiver indisponível ou retornar erro de cota? O sistema deve registrar em log de exceções no Supabase e notificar o gestor.
- [ ] E se o cliente não tiver suas regras configuradas no Supabase? O sistema deve recuar imediatamente e solicitar a criação via interface do Cockpit ou prompt no telegram.
- [ ] E se a geração audiovisual via Veo falhar? Acionar fallback para imagem simples ou notificação para entrada manual do gestor.

## 7. Restrições e Limitações
- [ ] Toda a base de configuração e regras deverá estar centralizada no Supabase e não em arquivos isolados soltos na máquina ou bancos SQLite puramente locais.
- [ ] O produto não tem interface voltada pro cliente final, apenas para os operadores da agência interagirem e atestarem do serviço prestado (Resultado Entregue).

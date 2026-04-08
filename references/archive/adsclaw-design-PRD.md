# PRD: AdsClaw - SWAS Delivery Engine & Strategic Campaign Manager

## 1. Visão Geral (Conceito SWAS)
O **AdsClaw** é o motor de inteligência artificial de uma agência de performance operando sob o modelo **SWAS (SaaS without Software)**. 
- **O Produto:** O cliente final não compra acesso a uma plataforma (SaaS); ele compra o **resultado** (ROI, campanhas otimizadas, criativos que convertem).
- **A Operação:** O AdsClaw é utilizado exclusivamente pela equipe interna da agência (e opera de forma autônoma 24/7) para entregar este serviço escalável ao cliente final, agindo nos papéis de **Gestor de Campanhas** e **Gerador de Criativos**.

## 2. Pilares da Arquitetura

### 2.1 Interface Interna (Agency Cockpit)
- **Foco:** Produtividade da agência.
- **MVP:** Web Portal (Dashboard) centralizado que funciona como o painel de controle administrativo onde o gestor sênior orquestra múltiplos clientes.
- **Backlog:** Telegram Bot para notificações e aprovações rápidas da equipe interna "on-the-go" (gestão por exceção).

### 2.2 Isolamento Multi-Cliente (Supabase Row-Level Security)
- **Estrutura de Banco e Storage:** O banco de dados PostgreSQL no **Supabase** armazenará todos os metadados dos clientes. Os arquivos pesados (vídeos/imagens) residirão no Supabase Storage.
- **Tabela de Regras (`client_rules`):** Cada cliente possui um registro restrito na base de dados que dita tom de voz, orçamentos, CPAs esperados e diretrizes da marca.
- **Isolamento e Segurança:** Aplicação de Row-Level Security (RLS) nativa do Supabase. O agente deve obter os dados restritos via API/SDK do Supabase pelo ID do cliente específico antes de qualquer ação. 

### 2.3 Conectividade (The Bridge)
Para entregar o serviço diretamente nas contas do cliente de forma invisível e robusta, a arquitetura utiliza:
- **Google Ads:** Integração nativa via skill `paid-ads` e servidor MCP.
- **Meta Ads:** Desenvolvimento de um MCP Server customizado utilizando a skill `mcp-builder` para conectar de forma profissional com a Marketing API da Meta.

### 2.4 Motor Cognitivo (Agent Loop & ReAct)
- **O Cérebro:** O raciocínio do AdsClaw operará em um ciclo de *Agent Loop* (ReAct: Thought -> Action -> Observation) em NodeJS. Essa técnica baseada na arquitetura do *SandeClaw* garante que as decisões e gerações de criativos não sejam alucinações de único prompt, mas sim iterações seguras baseadas em retornos reais de ferramentas de sistema.
- **Memory Manager (Contexto Persistente):** O histórico de chat será mantido fortemente no banco Supabase (`chat_history`). Isso elimina falhas de esquecimento do agente entre sessões.

### 2.5 Omnichannel Gateway (Multi-Input)
Apesar do agente focar fortemente no Telegram para interações urgentes, ele possuirá um handler (controlador) unificado:
- Comandos enviados pelo Web Portal (Agency Cockpit) e requisições via Telegram caem na mesma fila de processamento do Agent Loop, unificando a experiência da agência.

## 3. Fluxo de Trabalho do Agente (Outcome-Based)

### Fase 1: Diagnose & Rules (Inteligência Proativa)
1. O agente monitora as contas e cruza com os limites estabelecidos no banco de dados Supabase (`client_rules`). Ele age de forma proativa para garantir o resultado do modelo SWAS (Maximizar Lucro por Dólar Especial - LTV/ROAS).
2. Ao detectar necessidade de nova campanha ou oportunidade de otimização, o agente pergunta ao gestor interno: **"Deseja subir criativos manuais ou abrir o Laboratório Criativo para novas gerações?"** (O Dilema do Criativo).

### 3.4 Laboratório Criativo (IA Generativa)
- **Desconstrução Visual:** O agente utiliza o **Gemini 1.5 Pro/Flash** para analisar criativos de alta performance capturados via **Apify Skills**.
- **Motor Audiovisual:** Integrado ao ecossistema **skills.sh (inference.sh)**.
- **Geração de Imagens:** Foco no modelo **FLUX-1-Schnell/Dev** para criativos com texto legível e fotorrealismo de alta conversão.
- **Geração de Vídeos:** Uso proativo de **Google Veo 3.1** e **Seedance** para anúncios dinâmicos.
- **Omnichannel Delivery:** Os arquivos são gerados e organizados por conta de cliente, prontos para subir via MCP.

### Fase 3: Execução e Otimização
1. Criação e estruturação da campanha nas APIs (Google/Meta), seguindo a taxonomia e orçamentos do cliente.
2. Monitoramento de performance e auditorias de concorrência contínuas.
3. **Fadiga de Criativo:** O agente detecta queda de performance (Creative Refresh cycle) a cada 7-14 dias e sugere o reinício do ciclo de testes.
4. O ciclo se encerra quando o "Serviço" (O resultado) é atingido na conta do cliente, e evidências visuais podem ser registradas usando o `agent-browser`.

## 4. Stack de Skills Integradas
1. `brainstorming`: Para refinamento de ideias estruturais na agência.
2. `paid-ads`: Core de gestão de campanhas (Google Ads).
3. `mcp-builder`: Para construir a ponte customizada com o Meta Ads (Marketing API).
4. `ai-video-generation`: Para operação da linha de produção industrial audiovisual (Veo/Gemini/etc).
5. `apify`: Monitoramento de mercado e concorrência para garantir diferencial no serviço.
6. `agent-browser`: Auditoria visual do serviço entregue (persistência de estado do painel de anúncios).

---

## 5. Próximos Passos (Pipeline de Implementação)
- [ ] Configurar o projeto no Supabase, criar as tabelas base de clientes e aplicar as policies de segurança (RLS).
- [ ] Estruturar o `Agency Cockpit` (Interface Web MVP) para orquestração da operação.
- [ ] Iniciar o scaffold e desenvolvimento do MCP Server para a Meta Ads API.
- [ ] Definir protocolo de relatórios automatizados para os clientes finais que demonstram o "Resultado Entregue".

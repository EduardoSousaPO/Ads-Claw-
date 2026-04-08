# PRD — AdsClaw SWAS (Software With an Agent Soul)

> **Versao:** 2.0
> **Data:** 2026-04-08 | **Status:** Em revisao
> **Revisao anterior:** v1.0 (2026-03-26) — aprovado, foco tecnico
> **O que mudou na v2.0:** Cobertura completa de negocio, operacao, onboarding, reportes, skills operacionais (inspiradas no Google Ads Toolkit de Austin Lau), modelo financeiro, estrategia de aquisicao, roadmap de validacao

---

## 1. Resumo Executivo

O **AdsClaw** e um motor de IA autonomo que opera como o cerebro de uma agencia de performance digital sob o modelo **SWAS (Software With an Agent Soul)**. O cliente da agencia compra resultados — nao software. O AdsClaw executa internamente toda a cadeia de gestao de trafego pago: criacao de campanhas, producao de criativos, monitoramento 24/7, otimizacao de budget, mineracao de termos de busca, e reportes — tudo com aprovacao humana obrigatoria.

**Numeros-chave:**
- Fee fixo: R$ 1.697/mes por cliente
- Ticket-alvo de midia: R$ 7k-15k/mes (minimo R$ 3k)
- Capacidade solo: ate 20 clientes (receita teto: ~R$ 34k/mes)
- Custo de infra: ~R$ 60-200/mes (margem bruta >95%)
- Fase atual: pre-deploy, codigo 90% completo, validacao interna pendente

---

## 2. Contexto e Background

### 2.1 O que e o AdsClaw

O AdsClaw e o motor de inteligencia artificial autonomo de uma **agencia de performance digital** operando sob o modelo **SWAS**. Diferentemente de um SaaS tradicional, o AdsClaw **nao e vendido como produto de software**. O cliente final da agencia compra **resultados** — ROI mensuravel, campanhas otimizadas, criativos que convertem — e jamais interage diretamente com a plataforma.

O AdsClaw nao e apenas um monitor de metricas. Ele e um **gestor de trafego completo** que executa autonomamente toda a cadeia operacional:
- **Criacao** de campanhas, ad sets, e anuncios
- **Producao** de criativos (imagem, video, copy) com IA
- **Monitoramento** 24/7 de performance com deteccao proativa de problemas
- **Otimizacao** de budgets, termos de busca, e estrutura de conta
- **Reportes** automaticos para o operador e para o cliente final
- **Encerramento** de campanhas que nao performam

Todas as acoes passam por aprovacao humana antes de execucao.

### 2.2 Modelo de Negocio SWAS

| Aspecto | SaaS Tradicional | SWAS (AdsClaw) |
|---|---|---|
| O que o cliente compra | Acesso a software | Resultado (ROI, ROAS, conversoes) |
| Quem usa a plataforma | Cliente final | Operador interno (Eduardo) |
| Interacao do cliente | Direta (login, dashboards) | Zero (recebe relatorios de resultado) |
| Escalabilidade | Mais clientes = mais licencas | Mais clientes = mesmo agente IA |
| Diferencial | Features do software | Performance entregue |
| Precificacao | Por assento/uso | Fee fixo mensal por resultado |

### 2.3 Linha do Tempo do Projeto

| Data | Marco |
|------|-------|
| Mar 2026 | Inicio do desenvolvimento |
| 2026-03-26 | PRD v1.0 + SDD completo aprovados |
| Mar-Abr 2026 | Implementacao dos Blocos 0-8, 10 (52/58 tasks) |
| 2026-04-08 | PRD v2.0 (este documento) — refinamento de negocio |
| Abr 2026 | Deploy VPS (Bloco 9) |
| Mai 2026 | Piloto interno (empresas proprias) |
| Jun 2026 | Primeiro cliente externo |

---

## 3. Declaracao do Problema

### 3.1 O Problema da Agencia Tradicional

Uma agencia de performance tradicional enfrenta gargalos criticos de escalabilidade:

1. **Monitoramento reativo**: gestores so percebem queda de performance quando ja houve desperdicio de verba significativo
2. **Fadiga criativa nao-detectada**: criativos perdem performance apos 7-14 dias, mas a renovacao depende de processos manuais lentos
3. **Custo operacional linear**: para cada 3-5 clientes novos, e necessario contratar mais um gestor de trafego (salario R$ 3-5k/mes)
4. **Inconsistencia de qualidade**: a qualidade da gestao depende da experiencia individual de cada gestor
5. **Ausencia de metodologia codificada**: cada gestor opera com seu proprio metodo, sem padronizacao

### 3.2 O que Muda com o AdsClaw

O AdsClaw transforma a operacao em uma **maquina autonoma supervisionada** com metodologia codificada:
- Um unico operador senior orquestra ate 20 contas
- A IA segue workflows estruturados (skills operacionais) com criterios explicitos
- Cada decisao e rastreavel com justificativa documentada
- Monitoramento 24/7 com deteccao proativa em minutos, nao horas
- Custo marginal por cliente novo tende a zero (mesma infra)

---

## 4. Publico-Alvo e Personas

### 4.1 Persona Primaria: Operador do AdsClaw (Eduardo)

| Atributo | Detalhe |
|---|---|
| Papel | Operador unico do AdsClaw, gestor senior de performance, tomador de decisao |
| Canais de interacao | Telegram (primario, on-the-go, aprovacoes) + Agency Cockpit (analise profunda, reportes) |
| Necessidades | Visao consolidada de todos os clientes, aprovacao rapida de acoes, reportes automaticos |
| Comportamento | Gestao por excecao — so intervem quando o agente sinaliza ou quando ha decisao estrategica |
| Dor principal | Tempo gasto em tarefas operacionais repetitivas |
| Meta | Gerenciar 20 clientes com qualidade, sem contratar equipe |
| Tempo diario no AdsClaw | ~45 minutos (aprovacoes + reviews) |

### 4.2 Persona Secundaria: Cliente da Agencia

| Atributo | Detalhe |
|---|---|
| Papel | Empresario/gestor que contrata a agencia para resultados de trafego |
| Interacao com AdsClaw | **ZERO** — nao sabe que a IA existe (ou sabe, mas nao interage) |
| O que recebe | Resumo semanal no WhatsApp + relatorio mensal PDF + ate 2 calls/mes |
| O que espera | ROI no investimento em midia, transparencia nos resultados |
| Investimento em midia | R$ 7k-15k/mes (minimo R$ 3k) |

### 4.3 Anti-Persona: Quem NAO e Cliente

- Quem nao pode pagar R$ 1.697/mes de fee
- Quem investe menos de R$ 3k/mes em midia paga
- Quem quer acesso direto a ferramenta (viola SWAS)
- Quem espera garantia contratual de resultado

---

## 5. Proposta de Valor

### 5.1 Para o Cliente da Agencia

> *"Sua empresa tera uma equipe de IA especializada em trafego pago trabalhando 24 horas por dia, 7 dias por semana. Enquanto agencias tradicionais dependem de gestores humanos com limite de atencao e horario comercial, nossa tecnologia monitora, analisa e age sobre suas campanhas em tempo real — com capacidade de processar mais dados, identificar padroes mais rapido e reagir a mudancas de performance antes que virem prejuizo."*

### 5.2 Diferenciais Concretos vs. Agencia Tradicional

| Aspecto | Agencia Tradicional | AdsClaw |
|---|---|---|
| Monitoramento | Horario comercial (8h/dia) | 24/7 automatico |
| Tempo de reacao a problema | Horas a dias | Minutos |
| Analise de dados | Manual, parcial, subjetiva | Automatizada, completa, com metodologia |
| Producao de criativos | Designer + copywriter (dias) | IA gera em minutos, humano aprova |
| Mineracao de termos de busca | Semanal/mensal (quando lembram) | Automatica com avaliacao por relevancia |
| Otimizacao de budget | Feeling do gestor | Dados de impression share + proposta fundamentada |
| Custo para o cliente | R$ 2-5k/mes (agencias tradicionais) | R$ 1.697/mes |
| Rastreabilidade | Pouca ou nenhuma | Cada decisao documentada com reasoning |

### 5.3 Mensagem Central (Pitch)

**Para o cliente:** "Voce tera resultados melhores a um custo menor, porque nossa operacao combina inteligencia artificial com supervisao humana senior — 24 horas por dia, com metodologia e rastreabilidade que nenhum time humano consegue manter."

**Para parceiros/investidores:** "O AdsClaw permite que um unico operador gerencie 20 contas de trafego pago com margem bruta de 95%, usando IA para executar e humano para aprovar."

---

## 6. Objetivos e Metricas de Sucesso

### 6.1 Metricas de Produto

| ID | Metrica | Meta | Como Medir |
|---|---|---|---|
| MP-001 | Deteccao de anomalia | < 30 min apos threshold breach | Delta entre violacao e alerta |
| MP-002 | Clientes gerenciados por operador | Ate 20 simultaneos | Contagem de `clients` ativos |
| MP-003 | Tempo de geracao de copy | < 30 segundos | Latencia do CreativeLab |
| MP-004 | Tempo de consulta MCP | < 5 segundos | Latencia das tool calls |
| MP-005 | Uptime do agente | 99% | PM2 health check |
| MP-006 | Acuracia de search term mining | > 85% dos negativos sao relevantes | Amostragem manual mensal |
| MP-007 | Tempo medio de aprovacao | < 5 min apos notificacao | Delta entre alerta e resposta no Telegram |

### 6.2 Metricas de Negocio

| ID | Metrica | Meta | Prazo |
|---|---|---|---|
| MN-001 | Clientes ativos | 5 | 3 meses pos-lancamento |
| MN-002 | Clientes ativos | 15 | 6 meses pos-lancamento |
| MN-003 | Receita mensal recorrente (MRR) | R$ 8.485 | 3 meses |
| MN-004 | Receita mensal recorrente (MRR) | R$ 25.455 | 6 meses |
| MN-005 | Churn mensal | < 10% | Continuo |
| MN-006 | Reducao de horas operacionais vs manual | >= 60% | Validar no piloto |
| MN-007 | NPS dos clientes | >= 8 | A partir do 3o mes |

### 6.3 Metricas de Validacao (Piloto Interno)

| ID | Metrica | Meta |
|---|---|---|
| MV-001 | AdsClaw conecta e le dados reais Meta/Google | Sim/Nao |
| MV-002 | Campanha criada end-to-end (briefing → campanha PAUSED → aprovacao → ativa) | Sim/Nao |
| MV-003 | Criativo gerado com qualidade aprovavel | > 70% dos gerados |
| MV-004 | Weekly review automatico util e acionavel | Sim/Nao |
| MV-005 | Operador consegue gerenciar 4 contas piloto sem gargalo | Sim/Nao |

---

## 7. Escopo do MVP (v1)

### 7.1 In Scope

**Gestao Completa de Trafego (com aprovacao):**
- Criacao de campanhas, ad sets, anuncios (Meta + Google)
- Producao de criativos: imagem (FLUX), video (Veo), copy (Gemini)
- Upload manual de criativos do cliente OU geracao por IA
- Monitoramento proativo 24/7 com alertas
- Otimizacao de budget com proposta fundamentada
- Mineracao de search terms negativos (Google)
- Pausar/reativar/encerrar campanhas
- Alteracao de orcamento diario

**Skills Operacionais (metodologias codificadas):**
- Search term mining com avaliacao por relevancia
- Budget optimization com dados de impression share
- Weekly review estruturada
- Campaign investigation (deep-dive)
- Creative audit (criativos existentes vs benchmarks)
- Ad copy audit (copy ativa vs brand voice)
- Account health check
- Onboarding setup (briefing → estrategia → campanhas)

**Comunicacao:**
- Telegram (canal primario de aprovacao e alertas)
- Agency Cockpit (dashboard + gestao de clientes + chat)
- WhatsApp (reporte semanal ao cliente — manual v1, automatico v2)

**Reportes:**
- Resumo semanal automatico (3 linhas: spend, ROAS, acoes)
- Relatorio mensal PDF semi-automatico (AdsClaw gera, operador revisa)

**Infra:**
- VPS Hostinger + PM2
- Supabase (PostgreSQL + RLS + Storage)
- MCP Servers (Meta + Google)

### 7.2 Out of Scope (v1)

| Item | Motivo | Versao Planejada |
|---|---|---|
| Interface para cliente final | Viola modelo SWAS | Nunca |
| Automacao sem aprovacao (acoes autonomas) | Risco alto sem validacao matura | v3 |
| Otimizacao de bidding em tempo real | Complexidade excessiva para MVP | v3+ |
| A/B testing automatizado | Requer volume de dados significativo | v2 |
| WhatsApp Business como canal do operador | Custo de API + aprovacao Meta | v2 |
| Autenticacao multi-usuario no Cockpit | Operador unico no MVP | v2 |
| Relatorios PDF 100% automatizados | Operador deve revisar antes de enviar | v2 |
| Dashboard white-label para clientes | Viola SWAS no v1, possivel v3 | v3 |
| Prospecção ativa automatizada (growth engine) | Separar do produto core | v2 |
| Suporte a voz/audio no Telegram | Integracao STT complexa | v2 |

---

## 8. Requisitos Funcionais

### RF-001: Gestao Completa de Campanhas (com aprovacao)

O AdsClaw executa toda a cadeia de gestao de trafego, sempre com aprovacao humana:

| Acao | Autonomia | Fluxo |
|---|---|---|
| Criar campanha nova | Com aprovacao | AdsClaw propoe → Telegram → operador aprova → executa |
| Criar ad sets / grupos | Com aprovacao | Idem |
| Gerar copy para anuncios | Com aprovacao | AdsClaw gera 3 variacoes → operador escolhe |
| Gerar criativos (imagem/video) | Com aprovacao | AdsClaw produz → envia preview → operador aprova |
| Subir criativos manuais | Manual + assistido | Operador faz upload OU pede ao AdsClaw via briefing |
| Pausar campanha com CPA alto | Com aprovacao | AdsClaw detecta + notifica → operador confirma |
| Reativar campanha pausada | Com aprovacao | Idem |
| Alterar orcamento diario | Com aprovacao | AdsClaw propoe com dados → operador confirma |
| Encerrar campanha | Com aprovacao | Idem |
| Gerar relatorio mensal | Semi-automatico | AdsClaw gera → operador revisa → envia ao cliente |

**Regra critica:** Campanhas criadas sao SEMPRE status PAUSED ate aprovacao explicita.

### RF-002: Skills Operacionais — Metodologias Codificadas

Inspirado no Google Ads Toolkit de Austin Lau, o AdsClaw opera com **skills compostas** — workflows estruturados com passos explicitos, criterios de avaliacao, e outputs padronizados. Cada skill e uma metodologia documentada que o agente segue, nao uma decisao arbitraria da IA.

#### SK-001: Search Term Mining

**Objetivo:** Identificar termos de busca negativos no Google Ads com avaliacao baseada em relevancia (nao apenas conversoes).

**Passos:**
1. Puxar search terms via MCP Google Ads (GAQL) — filtrar status=NONE (nao acionados), ordenar por spend desc
2. Para cada termo, avaliar com cross-reference triplo:
   - O **search term** em si (o que o usuario digitou)
   - A **keyword** que acionou (o que estamos segmentando)
   - O **tema da campanha + ad group** (o contexto)
3. Classificar como **Negar** ou **Manter** — um termo off-theme, com intent errado, ou irrelevante e candidato a negacao, mesmo que tenha conversoes
4. Gerar CSV com colunas: Campaign, Ad Group, Keyword, Search Term, Match Type, Cost, Clicks, Impressions, CPC, CTR, Conversions, **Reasoning**
5. Apresentar ao operador por lote (agrupado por campanha), aguardar "sim" explicito para cada lote
6. Executar adicao de negativos via MCP (campaign level para evitar shift entre ad groups)

**Auditabilidade:** Cada negacao tem coluna "Reasoning" explicando a decisao.

#### SK-002: Budget Optimization

**Objetivo:** Analisar dados de impression share e propor ajustes de budget fundamentados.

**Passos:**
1. Puxar impression share por dia (ultimos 7 dias) via MCP
2. Identificar "Lost to Budget" como constraint dominante vs "Lost to Rank"
3. Calcular % de impressoes perdidas por orcamento
4. Se Lost to Budget > 40% consistentemente → propor aumento com % especifico
5. Apresentar: dados diarios + diagnostico + proposta concreta ("Aumentar de R$ X para R$ Y/dia")
6. Aguardar aprovacao antes de aplicar

#### SK-003: Weekly Review

**Objetivo:** Revisao semanal estruturada de cada conta com relatorio formatado.

**Output:** Para cada cliente:
- KPIs da semana vs semana anterior (spend, ROAS, CPA, CTR, conversoes)
- Top 3 campanhas (melhor performance)
- Bottom 3 campanhas (pior performance, candidatas a pausa/ajuste)
- Alertas da semana (fadiga criativa, anomalias, budget constraints)
- Acoes tomadas na semana (com resultado)
- Recomendacoes para proxima semana

**Cadencia:** Automatica toda segunda-feira, enviada via Telegram ao operador.

#### SK-004: Campaign Investigation

**Objetivo:** Deep-dive em campanha especifica com dados detalhados e recomendacao.

**Trigger:** Operador pede "investigue campanha X" ou detectado anomalia.

**Passos:**
1. Puxar metricas da campanha (7d, 14d, 30d)
2. Comparar com benchmarks do nicho
3. Analisar ad sets: distribuicao de budget, performance por segmento
4. Analisar anuncios: CTR, conversoes, frequencia (fadiga?)
5. Diagnosticar causa raiz
6. Propor 2-3 acoes concretas com justificativa

#### SK-005: Creative Audit

**Objetivo:** Auditar criativos existentes contra benchmarks e principios.

**Passos:**
1. Listar anuncios ativos via MCP com metricas de performance
2. Buscar benchmarks do nicho via Apify (Facebook Ads Library)
3. Comparar: CTR, engagement, frequencia acumulada
4. Identificar criativos com fadiga (alta frequencia + queda de CTR)
5. Para cada criativo fadigado, propor: pausar, renovar, ou substituir
6. Se substituir → iniciar pipeline CreativeLab

#### SK-006: Ad Copy Audit

**Objetivo:** Auditar copies ativas contra brand voice do cliente e principios de conversao.

**Passos:**
1. Listar copies ativas de todos os anuncios do cliente
2. Verificar alinhamento com `brand_voice` e `primary_offer` em client_rules
3. Avaliar contra principios: CTA claro, beneficio antes de feature, urgencia, proof
4. Classificar cada copy como: OK, Melhorar, Substituir
5. Para copies "Substituir" → gerar 3 variacoes alternativas

#### SK-007: Account Health Check

**Objetivo:** Checagem de saude geral da conta (estrutura, naming, budget distribution).

**O que verifica:**
- Naming conventions consistentes (campanha, ad set, ad)
- Distribuicao de budget entre campanhas (muito concentrado?)
- Campanhas ativas sem conversoes nos ultimos 14 dias
- Ad sets com overlap de audiencia
- Criativos com frequencia > 3.0
- Budget total vs limites em client_rules

#### SK-008: Onboarding Setup

**Objetivo:** Workflow de configuracao de novo cliente no AdsClaw.

**Passos:**
1. Operador fornece briefing (PDF/MD gerado apos call com cliente)
2. AdsClaw extrai: nicho, publico, oferta principal, brand voice, budget, objetivos
3. AdsClaw propoe estrategia: quantidade de campanhas, estrutura, segmentacao, budget split
4. Operador aprova estrategia
5. AdsClaw cria campanhas (PAUSED) com estrutura aprovada
6. AdsClaw gera criativos iniciais (ou operador faz upload dos que o cliente ja tem)
7. Operador revisa e aprova tudo
8. Ativa campanhas

**Regra:** Todas as campanhas iniciais sao criadas PAUSED e so ativam apos revisao completa.

### RF-003: Monitoramento Proativo

O Orchestrator monitora automaticamente todas as contas em intervalos regulares:

- Cron a cada 6 horas (configuravel)
- Para cada cliente: busca client_rules + metricas via MCP
- Compara metricas contra limites definidos
- Detecta fadiga criativa: `daysActive >= creative_refresh_days AND CPA > target_cpa`
- Gera alerta inteligente com dados contextualizados
- Notifica operador via Telegram com opcoes de acao

### RF-004: Pipeline CreativeLab

Pipeline end-to-end de producao criativa:

1. **Benchmark** — Apify scrape de anuncios ativos no nicho (Facebook Ads Library)
2. **Desconstrucao + Copy** — Gemini analisa benchmarks e gera 3 variacoes respeitando brand_voice
3. **Imagem** — FLUX-1-Schnell (via inference.sh) gera imagens
4. **Video** — Veo 3.1 (via inference.sh) gera videos
5. **Upload** — Supabase Storage, associado ao client_id
6. **Aprovacao** — Operador recebe preview, aprova ou pede ajustes

**Modo dual de criativos:**
- **Automatico:** Operador pede via briefing/prompt → AdsClaw produz → envia para aprovar
- **Manual:** Cliente ja tem criativos → operador faz upload → AdsClaw associa a campanha

### RF-005: Leitura e Escrita via MCP

**Leitura (Meta):** get_account_insights, list_campaigns, get_campaign_insights, get_ad_account_by_name, list_adsets, list_ads

**Escrita (Meta):** create_campaign, create_adset, create_ad_creative, create_ad, update_status, upload_image

**Leitura (Google):** get_google_ads_metrics, list_google_campaigns, get_google_keywords, get_google_ad_groups

**Escrita (Google):** create_campaign, create_ad_group, create_ad, update_status, update_budget

**Regra:** Todas as write tools criam recursos PAUSED e notificam operador.

### RF-006: Chat Omnichannel

- Telegram (primario): texto, aprovacoes inline, alertas
- Cockpit web (POST /api/chat): chat integrado no dashboard
- Respostas roteadas ao canal de origem
- Historico persistido em chat_history (Supabase)

### RF-007: Human-in-the-Loop

Toda acao que afeta campanhas ou orcamentos exige aprovacao:

- InlineKeyboard no Telegram: Aprovar/Rejeitar
- Registro em `pending_approvals` no Supabase
- Expiracao automatica apos 24h
- Batch approval: acoes agrupadas por campanha, aprovadas por lote
- Web: pagina de Aprovacoes no Cockpit como alternativa

### RF-008: Reportes ao Cliente

**Semanal (automatico):**
- 3 linhas: spend da semana, ROAS, principais acoes tomadas
- Enviado via WhatsApp pelo operador (v1 manual, v2 automatico)

**Mensal (semi-automatico):**
- AdsClaw gera relatorio PDF com:
  - KPIs do mes (spend, ROAS, CPA, conversoes, CTR)
  - Comparativo com mes anterior
  - Acoes realizadas no mes
  - Proximos passos recomendados
- Operador revisa e ajusta antes de enviar ao cliente

**Calls:** Maximo 2 por mes por cliente, sob demanda.

### RF-009: Agency Cockpit

Dashboard interno com:
- **Dashboard:** KPIs consolidados, alertas ativos, aprovacoes pendentes
- **Clientes:** CRUD com criacao automatica de client_rules
- **Alertas:** Lista de alertas com severity badges
- **Aprovacoes:** Pagina de aprovacoes pendentes (alternativa ao Telegram)
- **Conversas:** Historico de chat do agente por cliente
- **Chat flutuante:** Comunicacao com o AgentLoop em todas as paginas

### RF-010: Onboarding de Novo Cliente

**Prazo:** 3-5 dias uteis do fechamento ate primeira campanha ativa.

**Fluxo:**
1. Cliente assina contrato (mensal, sem fidelidade)
2. Call de briefing com o cliente (gravada, transcricao alimenta o AdsClaw)
3. Operador gera briefing PDF/MD a partir da call
4. Operador configura contas Meta/Google:
   - Pedir acesso ao BM do cliente (Business Manager Meta)
   - Obter meta_access_token e ad_account_id
   - Configurar Google Ads: client_id, client_secret, developer_token, refresh_token
5. Cadastrar cliente no Cockpit (nome, nicho, IDs das contas)
6. Definir client_rules: target_cpa, daily_budget, brand_voice, primary_offer, creative_refresh_days
7. Executar skill SK-008 (Onboarding Setup) — AdsClaw propoe estrategia
8. Operador aprova → campanhas criadas (PAUSED) → revisao → ativacao

### RF-011: Offboarding de Cliente

**Trigger:** Aviso previo de 30 dias.

**Fluxo:**
1. Pausar todas as campanhas ativas do cliente
2. Gerar relatorio final de performance
3. Exportar dados do cliente (metricas, historico, criativos)
4. Remover credenciais encriptadas do Supabase
5. Marcar cliente como `status: inactive`
6. Dados mantidos por 90 dias apos inativacao, depois purgados

---

## 9. Requisitos Nao-Funcionais

### RNF-001: Isolamento Multi-Tenant
- Toda query scoped por client_id
- RLS ativo em todas as tabelas
- MemoryManager carrega apenas contexto do cliente ativo
- O agente NUNCA mistura dados entre clientes

### RNF-002: Performance

| Metrica | SLA |
|---|---|
| Deteccao de anomalia | < 30 minutos apos threshold breach |
| Geracao de copy | < 30 segundos |
| Consulta MCP | < 5 segundos |
| Resposta do AgentLoop | < 15 segundos |
| Boot do agente | < 10 segundos |

### RNF-003: Disponibilidade
- 99% uptime na VPS Hostinger
- PM2 com auto-restart em crash
- Health check HTTP em /api/health
- Modo degradado quando APIs externas estao offline

### RNF-004: Seguranca
- Secrets em .env (gitignored)
- Telegram whitelist por user ID
- AES-256-GCM para tokens de clientes no Supabase
- Service Role Key no agent (bypass RLS), Anon Key no Cockpit
- MCP tokens por variavel de ambiente

### RNF-005: Auditabilidade
- Cada decisao de skill operacional gera output com coluna "Reasoning"
- Actions do agente registradas em chat_history.metadata (JSONB)
- Search term mining gera CSV auditavel
- Weekly review gera relatorio estruturado
- Todas as aprovacoes/rejeicoes registradas com timestamp e motivo

### RNF-006: Escalabilidade
- Ate 20 clientes simultaneos com um operador
- ToolRegistry suporta adicao de novos MCP Servers
- OmnichannelGateway extensivel para novos canais
- Evolucao para autonomia progressiva em v3

---

## 10. Regras de Negocio

### RN-001: Aprovacao Obrigatoria
Toda acao que cria, modifica, pausa, reativa ou encerra campanhas/ad sets/anuncios/orcamentos exige aprovacao explicita do operador.

### RN-002: Campanhas PAUSED por Padrao
Qualquer campanha criada pelo AdsClaw nasce com status PAUSED. So ativa apos aprovacao.

### RN-003: Batch Approval
Acoes de mesmo tipo devem ser agrupadas por campanha e apresentadas como lote. Operador aprova/rejeita o lote inteiro.

### RN-004: Isolamento de Dados
Cruzamento de dados entre clientes e estritamente proibido. O agente carrega client_id e client_rules antes de qualquer acao.

### RN-005: Metodologia antes de Acao
O agente segue a skill operacional relevante para a tarefa. Nao toma decisoes arbitrarias — segue passos documentados com criterios explicitos.

### RN-006: Reasoning Documentado
Decisoes criticas (negacao de termos, pausa de campanha, proposta de budget) devem incluir justificativa escrita ("Reasoning").

### RN-007: Limites de Iteracao
AgentLoop limitado a MAX_ITERATIONS=5 por request. Previne loops infinitos e custos descontrolados.

### RN-008: Briefing como Input
Novas campanhas so sao criadas a partir de briefing formal (PDF/MD) fornecido pelo operador. O AdsClaw nao inventa estrategia do nada.

### RN-009: Cadencia de Reportes
- Semanal: toda segunda-feira, automatico
- Mensal: ate o dia 5 do mes seguinte, semi-automatico

### RN-010: Contrato e Faturamento
- Fee fixo: R$ 1.697/mes por cliente
- Contrato mensal, renovacao automatica a cada 30 dias
- Aviso previo de 30 dias para cancelamento
- Sem multa de rescisao
- Sem garantia contratual de resultado
- Custo de midia e 100% do cliente

---

## 11. Fluxos e Jornadas do Usuario

### Fluxo 1: Onboarding de Novo Cliente

```
[Cliente fecha contrato]
    |
    v
[Call de briefing] → gravacao → transcricao
    |
    v
[Operador gera briefing PDF/MD]
    |
    v
[Operador configura contas Meta/Google]
[Cadastra cliente no Cockpit]
[Define client_rules na call]
    |
    v
[SK-008: Onboarding Setup]
    |-- AdsClaw le briefing
    |-- Propoe estrategia (campanhas, estrutura, budget split)
    |
    v
[Operador aprova estrategia]
    |
    v
[AdsClaw cria campanhas PAUSED]
[Gera ou recebe criativos]
    |
    v
[Operador revisa e aprova tudo]
    |
    v
[Campanhas ativadas — cliente rodando]
```

### Fluxo 2: Operacao Diaria (Dia Tipico)

```
[08:00] Operador abre Telegram
    |
    v
[AdsClaw ja enviou]
    |-- Alertas da madrugada (se houver)
    |-- Aprovacoes pendentes
    |
    v
[Operador aprova/rejeita em ~2min cada]
    |
    v
[AdsClaw executa acoes aprovadas]
    |
    v
[Ao longo do dia]
    |-- Orchestrator monitora a cada 6h
    |-- Se detecta problema → notifica
    |-- Operador aprova acao corretiva
    |
    v
[Final do dia: ~15-30min de interacao total]
```

### Fluxo 3: Weekly Review (Segunda-feira)

```
[SK-003 dispara automaticamente]
    |
    v
[Para cada cliente:]
    |-- KPIs da semana vs anterior
    |-- Top/bottom campanhas
    |-- Alertas + acoes da semana
    |-- Recomendacoes
    |
    v
[Envia ao operador via Telegram]
    |
    v
[Operador revisa]
    |-- Aprova recomendacoes que fazem sentido
    |-- Ajusta o que precisa
    |
    v
[Gera resumo semanal para cada cliente]
    |
    v
[Operador envia ao cliente via WhatsApp]
```

### Fluxo 4: Search Term Mining

```
[SK-001 triggered (manual ou weekly)]
    |
    v
[MCP Google Ads: get_search_terms]
    |-- date_range=LAST_30_DAYS
    |-- min_clicks=1
    |-- order_by=cost desc
    |
    v
[Para cada termo, avaliar:]
    |-- Search term vs Keyword vs Tema do ad group
    |-- Off-theme? Intent errado? Irrelevante?
    |
    v
[Gerar CSV com Reasoning]
    |
    v
[Apresentar por lote (agrupado por campanha)]
    |
    v
[Operador: "sim" para cada lote]
    |
    v
[MCP: adicionar negativos em campaign level]
```

### Fluxo 5: Pipeline Criativo

```
[Trigger: fadiga detectada OU operador pede]
    |
    v
[Operador escolhe:]
    |-- "Tenho criativos" → upload manual
    |-- "AdsClaw, produza" → vai para CreativeLab
    |
    v
[CreativeLab]
    |-- 1. Benchmark (Apify)
    |-- 2. Copy (Gemini: 3 variacoes)
    |-- 3. Imagem (FLUX-1-Schnell)
    |-- 4. Video (Veo 3.1)
    |
    v
[Preview enviado ao operador]
    |
    v
[Aprovacao] → Upload Supabase → Associar a campanha
```

---

## 12. Integracoes e Dependencias

| Servico | Uso | Criticidade | Fallback |
|---|---|---|---|
| Google Gemini API | LLM primario (raciocinio + copy + skills) | Critica | Modo demo/mock |
| Supabase | Banco + storage + auth | Critica | Nenhum (SPOF) |
| Meta Marketing API v19.0 | Leitura + escrita de campanhas Meta | Alta | Dados cacheados |
| Google Ads API (GAQL) | Leitura + escrita de campanhas Google | Alta | Dados cacheados |
| Apify | Scraping de benchmarks (Facebook Ads Library) | Media | Fallback estatico por setor |
| inference.sh (FLUX) | Geracao de imagens | Media | Upload manual |
| inference.sh (Veo) | Geracao de videos | Media | Fallback para imagem |
| Telegram Bot API | Canal primario de comunicacao + aprovacao | Alta | Chat Web (Cockpit) |
| VPS Hostinger | Hospedagem do agente | Critica | Migracao para outro VPS |

---

## 13. Restricoes

### Tecnicas
- VPS Hostinger: recursos limitados ao plano contratado (R$ 60/mes)
- Gemini API: cotas de rate limiting por minuto
- Meta/Google APIs: rate limits por conta
- Apify: plano gratuito com creditos limitados
- inference.sh: creditos pre-pagos (finitos)

### Operacionais
- Operador unico (Eduardo) — gargalo de aprovacao
- Sem equipe de suporte
- Sem designer humano (depende de IA ou upload do cliente)

### Financeiras
- Custo mensal de infra: ~R$ 60-200 (VPS + APIs)
- Sem investimento externo — bootstrapped
- Receita comeca em zero (sem clientes)

### Regulatorias
- LGPD: dados de clientes das empresas gerenciadas
- Termos Meta/Google: uso de IA para gerir contas de terceiros (area cinza, monitorar)
- Empresa em abertura (Simples Nacional)

---

## 14. Riscos e Hipoteses

### Riscos

| ID | Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|---|
| R-001 | Nao conseguir clientes | Alta | Critico | Piloto interno primeiro, growth engine depois |
| R-002 | Integracao Meta/Google falha em producao | Media | Alto | Testes end-to-end no piloto, graceful degradation |
| R-003 | IA toma decisao errada que custa dinheiro | Media | Alto | Aprovacao obrigatoria em tudo, reasoning documentado |
| R-004 | Rate limiting de APIs com multiplos clientes | Alta | Alto | Cache de metricas, cron espacado, retry com backoff |
| R-005 | Vazamento de contexto entre clientes | Media | Critico | RLS + scope por client_id + validacao antes de tool call |
| R-006 | APIs externas ficam offline | Media | Medio | Modo degradado, cache, notificacao ao operador |
| R-007 | Custos de API escalam demais | Media | Medio | MAX_ITERATIONS=5, limites por skill, monitoramento mensal |
| R-008 | Gargalo de aprovacao com 20 clientes | Media | Medio | Batch approval, autonomia progressiva em v3 |
| R-009 | Qualidade de criativos IA insuficiente | Media | Medio | Modo dual (manual + IA), benchmark antes de gerar |
| R-010 | Meta/Google mudam API e quebram MCPs | Baixa | Alto | Monitorar changelogs, MCP como camada de abstracao |

### Hipoteses (aceitas como premissas do MVP)

| # | Hipotese |
|---|----------|
| H-001 | Clientes aceitam pagar R$ 1.697/mes sem ver a ferramenta |
| H-002 | O AdsClaw gera criativos com qualidade suficiente para producao |
| H-003 | Um operador consegue gerenciar 20 contas via aprovacao no Telegram |
| H-004 | O modelo de tudo-com-aprovacao nao gera gargalo operacional critico |
| H-005 | Clientes que investem 7k-15k/mes estao dispostos a trocar de agencia |
| H-006 | Skills operacionais codificadas produzem resultados superiores a gestao ad-hoc |

---

## 15. Priorizacao (MoSCoW)

### Must Have (v1 — MVP)
- Gestao completa com aprovacao (RF-001)
- Skills operacionais core: search term mining, weekly review, onboarding (RF-002: SK-001, SK-003, SK-008)
- Monitoramento proativo (RF-003)
- Pipeline CreativeLab (RF-004)
- MCP leitura + escrita Meta e Google (RF-005)
- Telegram com human-in-the-loop (RF-006, RF-007)
- Agency Cockpit basico (RF-009)
- Deploy VPS (Bloco 9)

### Should Have (v1, se der tempo)
- Budget optimization skill (SK-002)
- Creative audit skill (SK-005)
- Campaign investigation skill (SK-004)
- Reporte semanal automatico (RF-008)
- Reporte mensal PDF (RF-008)

### Could Have (v2)
- Ad copy audit skill (SK-006)
- Account health check skill (SK-007)
- WhatsApp como canal
- Autenticacao multi-usuario no Cockpit
- A/B testing automatizado
- Growth engine (prospecção ativa para vender o servico)

### Won't Have (v1)
- Autonomia sem aprovacao
- Dashboard white-label para clientes
- Otimizacao de bidding em tempo real
- Interface para cliente final

---

## 16. Duvidas Pendentes

| # | Duvida | Impacto | Quando resolver |
|---|--------|---------|----------------|
| DP-001 | Como obter meta_access_token do cliente de forma segura e sustentavel? Token de longa duracao ou System User? | Alto — sem isso nao conecta Meta | Antes do piloto |
| DP-002 | Google Ads refresh_token: fluxo OAuth2 para contas de terceiros — como operacionalizar? | Alto — sem isso nao conecta Google | Antes do piloto |
| DP-003 | Custo real de Gemini API por cliente/mes — precisa de benchmark | Medio — impacta margem | Durante piloto |
| DP-004 | Limites do plano gratuito Apify — suficiente para quantos scrapes/mes? | Baixo — tem fallback | Durante piloto |
| DP-005 | Contrato juridico de prestacao de servico — modelo | Baixo (nao e prioridade) | Antes do 1o cliente externo |
| DP-006 | LGPD — precisa de DPO ou politica formal? | Medio | Antes de escalar |
| DP-007 | Termos Meta/Google sobre uso de IA para gerir contas — risco legal? | Medio | Pesquisar antes do lancamento |

---

## 17. Proximos Passos

### Roadmap de Validacao e Lancamento

| # | Marco | Descricao | Prazo estimado |
|---|-------|-----------|---------------|
| 1 | **Deploy funcional** | AdsClaw rodando na VPS, Telegram, Supabase | Abr 2026 |
| 2 | **Integracao real** | MCP servers conectados com contas reais Meta + Google | Abr 2026 |
| 3 | **Piloto interno** | Rodar nas 4 empresas proprias (investimentos, SaaS, software house, psicoterapia) | Mai 2026 |
| 4 | **Validacao criativos** | Pipeline CreativeLab com campanhas reais | Mai 2026 |
| 5 | **Primeiro cliente externo** | Onboarding de parceiro/indicacao | Jun 2026 |
| 6 | **Prospecção ativa** | Growth engine para aquisicao de clientes | Jul 2026+ |

### Pilotos Internos Planejados

| Empresa | Nicho | O que validar |
|---------|-------|---------------|
| Consultoria de investimentos (CVM) | Financeiro | Lead gen Google Ads + Meta Ads |
| SaaS (pronto para lancar) | Tech | Aquisicao de assinantes |
| Software house (CTO) | B2B | Aquisicao de clientes |
| Psicoterapia online (esposa) | Saude | Aquisicao de pacientes |

### Estrategia de Aquisicao de Clientes (v2 — separada do core)

**IMPORTANTE:** A estrategia de growth da agencia e um contexto **separado** do AdsClaw operacional. O AdsClaw pode ser usado para rodar campanhas que vendem o proprio servico, mas os dados e campanhas de growth nao se misturam com os dados dos clientes.

**Canais planejados:**
- Prospecção ativa: agente/skill para obter contatos de empresas potenciais
- Campanhas de email e WhatsApp ativo
- Meta Ads e Google Ads (usando o proprio AdsClaw)
- Conteudo e autoridade: resultados, cases, bastidores da IA
- Rede de contatos e indicacoes

### Nichos-Alvo (generalista no inicio)

| Nicho | Por que | Ticket de midia tipico |
|-------|---------|----------------------|
| E-commerce (moda, beleza, suplementos) | 100% dependente de trafego, alta rotacao criativa | R$ 5k-30k |
| Clinicas de estetica/odonto/medicas | Servico local, Meta Ads como canal principal | R$ 3k-10k |
| Escritorios de investimentos | Lead gen puro, Google + Meta | R$ 5k-15k |
| Infoprodutores/lancamentos | Trafego e o motor, ciclos intensos | R$ 5k-50k+ |
| Imobiliarias/incorporadoras | Lead gen, ciclo longo, alto ticket | R$ 7k-20k |
| Escolas/cursos presenciais | Matriculas dependem de campanha | R$ 3k-15k |
| Psicologos/terapeutas | Servico de saude, busca ativa | R$ 3k-8k |

---

## 18. Glossario

| Termo | Definicao |
|---|---|
| **SWAS** | Software With an Agent Soul — modelo onde o software opera internamente para entregar servico ao cliente final |
| **Skill Operacional** | Workflow estruturado com passos explicitos que o agente segue para uma tarefa especifica (ex: search term mining). Inspirado no conceito de Skills do Claude Cowork |
| **AgentLoop** | Motor cognitivo baseado no padrao ReAct (Thought → Action → Observation) |
| **MCP** | Model Context Protocol — padrao aberto para conectar LLMs a fontes de dados externas |
| **Tool** | Funcao executavel que o agente invoca em runtime via Function Calling |
| **Reasoning** | Justificativa documentada para cada decisao do agente (auditabilidade) |
| **Batch Approval** | Agrupamento de acoes por campanha para aprovacao em lote |
| **Human-in-the-Loop** | Modelo onde toda acao critica requer aprovacao humana explicita |
| **RLS** | Row-Level Security — mecanismo do PostgreSQL que restringe acesso por politica |
| **Fadiga Criativa** | Queda de performance de anuncios apos periodo prolongado de veiculacao |
| **CreativeLab** | Pipeline de producao criativa: benchmark → analise → copy → assets visuais |
| **Orchestrator** | Servico proativo baseado em cron que monitora contas automaticamente |
| **Agency Cockpit** | Dashboard web interno da agencia (nao exposto ao cliente) |
| **ProviderFactory** | Abstracao para swap entre LLMs (Gemini, Claude, GPT, DeepSeek) |
| **Impression Share** | Porcentagem de impressoes que seus anuncios receberam vs total disponivel |
| **Lost to Budget** | Impressoes perdidas porque o orcamento diario se esgotou |

---

## 19. Historico de Revisoes

| Versao | Data | Autor | Mudancas |
|---|---|---|---|
| 1.0 | 2026-03-26 | SDD Avancado | PRD inicial com foco tecnico (arquitetura, stack, RFs, modelagem de dados) |
| 2.0 | 2026-04-08 | Consultor PRD (discovery completo) | Adicionados: Resumo Executivo, modelo financeiro (R$ 1.697/cliente), proposta de valor, 8 skills operacionais (inspiradas no Google Ads Toolkit de Austin Lau), fluxo de onboarding/offboarding, cadencia de reportes, estrategia de aquisicao, nichos-alvo, pilotos internos, roadmap de validacao, priorizacao MoSCoW, hipoteses, duvidas pendentes. Reescrita completa dos RFs com foco em gestao completa (nao apenas monitoramento). Adicionada auditabilidade como requisito nao-funcional |

---

## Apendice A: Stack Tecnologica

| Camada | Tecnologia | Versao |
|---|---|---|
| Agent Backend | Node.js + TypeScript (tsx) | Node 20+ / TS 5.3+ |
| LLM Primario | Google Gemini (via @google/generative-ai) | gemini-2.5-flash |
| Frontend (Cockpit) | React 19 + Vite 8 + Tailwind 4 | SPA |
| Banco de Dados | Supabase (PostgreSQL + RLS + Storage) | Cloud managed |
| MCP Servers | Meta Ads MCP + Google Ads MCP (TypeScript, stdio) | MCP SDK 1.27+ |
| Telegram | grammy 1.41+ | Long-polling |
| Scraping | Apify Client 2.22+ | Facebook Ads Library |
| Media IA | inference.sh (FLUX-1-Schnell, Veo 3.1) | CLI infsh |
| Cron | node-cron 4.2+ | Auditoria periodica |
| Criptografia | AES-256-GCM | Tokens de clientes |
| Deploy | VPS Hostinger + PM2 | Debian/Ubuntu |

## Apendice B: Modelagem de Dados

### Tabelas Principais

**clients:** id, name, meta_ads_account_id, google_ads_account_id, status, telegram_chat_ids, created_at, updated_at

**client_rules:** id, client_id (FK), target_cpa, target_roas, daily_budget, brand_voice, primary_offer, sector, creative_refresh_days, encrypted_meta_token, encrypted_google_refresh_token, created_at, updated_at

**chat_history:** id, client_id (FK), sender, message, metadata (JSONB), created_at

**alerts:** id, client_id (FK), type, severity, message, metadata (JSONB), status, created_at

**pending_approvals:** id, client_id (FK), action_type, payload (JSONB), status, resolved_by, expires_at, created_at

**performance_snapshots:** id, client_id (FK), platform, snapshot_date, metrics (JSONB), created_at

**ad_creatives:** id, client_id (FK), type, prompt, url, status, created_at

**benchmark_cache:** id, sector, data (JSONB), expires_at, created_at

### Storage Buckets

| Bucket | Publico | Uso |
|---|---|---|
| creatives | Sim | Imagens, videos, copies por cliente |

### Seguranca

- RLS ativo em todas as tabelas
- Agent Backend: SERVICE_ROLE KEY (bypass RLS)
- Cockpit Frontend: ANON KEY + autenticacao
- Tokens de clientes encriptados com AES-256-GCM

## Apendice C: Variaveis de Ambiente

| Variavel | Obrigatoria | Descricao |
|---|---|---|
| SUPABASE_URL | Sim | URL do projeto Supabase |
| SUPABASE_SERVICE_KEY | Sim | Service Role Key |
| SUPABASE_ANON_KEY | Fallback | Anon Key |
| GEMINI_API_KEY | Sim | Chave Google Gemini |
| TELEGRAM_BOT_TOKEN | Sim | Token do Bot |
| TELEGRAM_ALLOWED_USER_IDS | Sim | IDs autorizados (whitelist) |
| TELEGRAM_DEFAULT_CLIENT_ID | Sim | Client ID padrao |
| META_ACCESS_TOKEN | Sim (Meta) | Token Meta Marketing API |
| GOOGLE_ADS_CLIENT_ID | Sim (Google) | OAuth2 Client ID |
| GOOGLE_ADS_CLIENT_SECRET | Sim (Google) | OAuth2 Client Secret |
| GOOGLE_ADS_DEVELOPER_TOKEN | Sim (Google) | Developer Token |
| GOOGLE_ADS_REFRESH_TOKEN | Sim (Google) | OAuth2 Refresh Token |
| CREDENTIALS_ENCRYPTION_KEY | Sim (prod) | Chave AES-256 para tokens |
| APIFY_TOKEN | Sim (CreativeLab) | Token Apify |
| HTTP_PORT | Nao | Porta HTTP (padrao: 3001) |
| VITE_AGENT_API_URL | Nao | URL do agent para Cockpit |

## Apendice D: ADRs Vigentes

| ADR | Decisao |
|---|---|
| ADR-001 | Multi-LLM via ProviderFactory (Gemini padrao, extensivel) |
| ADR-002 | Supabase como unico backend (nao SQLite) |
| ADR-003 | inference.sh para geracao de midia (nao SDK direto) |

---

> **Nota:** Este PRD v2.0 incorpora todo o contexto tecnico do v1.0 mais as camadas de negocio, operacao e estrategia coletadas no discovery de Abril 2026. As skills operacionais (SK-001 a SK-008) sao inspiradas no Google Ads Toolkit de Austin Lau (@helloitsaustin), adaptadas para a arquitetura e contexto do AdsClaw.

# Regras do Projeto (RULES) - AdsClaw

Estas regras funcionam de maneira complementar ao seu funcionamento padrão:

1. **Precedência e Imutabilidade SDD:** Componentes conceituados e listados em `SPEC.md` e `PLAN.md` têm precedência absoluta de design. Modificações ou expansões significativas demandam, por princípio, a alteração dos referidos guias de especificação antes do código.

2. **Isolamento Inviolável via Supabase RLS:** NUNCA inicie scripts que operem, conectem ou publiquem nas APIs (Meta Ads/Google Ads) sem primeiro buscar e injetar de forma segura as permissões e parâmetros oriundos da tabela `client_rules` do Supabase via um query autenticada.

## 1. Regras de Desenvolvimento (SDD)
- Toda alteração deve seguir o fluxo: Identificar Tarefa (TASKS) -> Codar -> Validar.
- O Banco de Dados oficial de desenvolvimento e produção é o Supabase Project ID: `gbzepjbevvimijemnhcj`.
- Jamais realizar operações destrutivas em produção sem backup prévio.

3. **Human-in-the-Loop na Criação Final:** Alterações destrutivas ou de escalonamento elevado de orçamento (budget boost) devem idealmente emitir o clássico alerta do "Dilema do Criativo" ou prompt interno pedindo aprovação interativa do gestor humano, protegendo a segurança financeira do escopo gerido pelas ferramentas.

4. **Padrão de Criação de Servidores MCP:** Todo MCP customizado desenhado pela equipe (como o Meta Ads MCP no pipeline) obriga por design uma documentação interna (README) expondo visivelmente todas as tools disponíveis nele para manutenção simplificada.

5. **Interface Premium:** Estilos do painel seguem premissas de UX premium e "Agency Cockpit Analytics". Dashboards e interfaces não devem ser apenas despejos cruzes de banco de dados, sendo valorizados por designs Dark-mode ou High-Tech corporativo.

- **Supabase (Backend-as-a-Service):**
  - PostgreSQL para persistência.
  - Project ID Fixo: `gbzepjbevvimijemnhcj`.
  - Row-Level Security (RLS) para isolamento total de dados entre clientes.
  - Storage Buckets para criativos (vídeos/imagens).

6. **Responsabilidades Desacopladas nas Skills:** É diretriz primária do projeto testar e priorizar os fluxos suportados nativamente pelas skills instaladas no ambiente em `.agents/skills` (ex: `apify` pro Research, `ai-video-generation` pro audiovisual e `agent-browser` para capturas da entrega) antes de programar dependências adicionais externas similares a mão.

- [x] **Fase 1: Configuração Base e Banco Supabase (Setup do Motor)**
  - [x] `Task 1.1`: Criar projeto e banco de dados central no Supabase (ID: `gbzepjbevvimijemnhcj`).
  - [x] `Task 1.2`: Desenvolver e rodar as Migrations em SQL pra criação das tabelas `clients` e `client_rules`.
  - [ ] `Task 1.3`: Estruturar a classe client/singleton `SupabaseClient` no código Typescript base para lidar com operações seguras do banco.

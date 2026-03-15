# Spec-Driven Development (SDD)

## O que é

**Spec-Driven Development (SDD)** é uma abordagem de desenvolvimento de software em que a **especificação** deixa de ser apenas um documento auxiliar e passa a orientar de forma central o processo de construção do sistema. Em vez de começar pelo código e ir ajustando depois, o time primeiro define com clareza **o que deve ser construído, por que aquilo existe, quais restrições precisam ser respeitadas e como o sistema deve se comportar**. Só então a implementação é conduzida com base nessa estrutura. Fontes atuais descrevem essa ideia como um fluxo em que a especificação passa a ser o eixo do trabalho com IA e agentes de software, em vez de o código ser o único artefato dominante no início do processo. [GitHub Spec Kit](https://github.github.com/spec-kit/) · [Microsoft for Developers](https://developer.microsoft.com/blog/spec-driven-development-spec-kit)

## Em linguagem simples

Pense assim:

- no fluxo improvisado: **ideia -> prompt -> código -> correções -> retrabalho**
- no SDD: **ideia -> especificação -> plano técnico -> tarefas -> implementação -> validação**

A diferença prática é que a IA ou o desenvolvedor não recebem apenas um pedido genérico como “crie um dashboard com login”. Em SDD, eles recebem contexto estruturado: objetivo, fluxos, regras de negócio, critérios de aceite, arquitetura, contratos de dados, restrições e etapas de execução. Esse tipo de contexto reduz ambiguidade e tende a melhorar bastante a qualidade do resultado. [GitHub Spec Kit](https://github.github.com/spec-kit/) · [InfoQ](https://www.infoq.com/articles/spec-driven-development/)

## Ideia central

A essência do SDD é organizar o trabalho em três camadas:

### 1. O que deve ser construído
Aqui entram:
- problema a resolver
- objetivo da funcionalidade
- comportamento esperado
- regras de negócio
- critérios de aceite
- limitações do escopo

### 2. Como deve ser construído
Aqui entram:
- stack escolhida
- arquitetura
- banco de dados
- APIs
- autenticação
- integrações
- estratégia de testes
- segurança
- deploy

### 3. Como isso será executado
Aqui entram:
- quebra em tarefas pequenas
- ordem de implementação
- dependências
- checkpoints de revisão
- validações contra a spec

Esse fluxo aparece de forma bem clara nas abordagens públicas mais conhecidas de SDD, especialmente no Spec Kit, que organiza o trabalho em **specify**, **plan** e **tasks**. [Microsoft for Developers](https://developer.microsoft.com/blog/spec-driven-development-spec-kit) · [GitHub Spec Kit Quick Start](https://github.github.com/spec-kit/quickstart.html)

## Como o processo normalmente funciona

## 1) Intenção inicial
Tudo começa com uma descrição clara da feature, produto ou melhoria:

- qual problema será resolvido
- para quem
- por que isso importa
- o que deve acontecer
- o que não deve acontecer

Nessa fase, o foco é no **quê** e no **porquê**, não nos detalhes de implementação. [Microsoft for Developers](https://developer.microsoft.com/blog/spec-driven-development-spec-kit)

## 2) Criação da especificação
Depois, essa intenção vira uma **spec estruturada**. Uma boa spec normalmente inclui:

- objetivo
- escopo
- requisitos funcionais
- requisitos não funcionais
- fluxos principais
- critérios de aceite
- casos de borda
- restrições técnicas
- comportamento esperado do sistema

A Thoughtworks destaca que uma spec relevante não é só uma lista de desejos do produto; ela descreve o comportamento do software com mais precisão, muitas vezes usando cenários, linguagem de domínio e critérios testáveis. [Thoughtworks](https://www.thoughtworks.com/en-br/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)

## 3) Plano técnico
Com a spec aprovada, entra o plano técnico, respondendo:

- quais tecnologias serão usadas
- como o banco será estruturado
- quais endpoints ou serviços existirão
- como a autenticação funcionará
- quais validações serão aplicadas
- quais riscos técnicos existem

No ecossistema do Spec Kit, isso corresponde ao momento de **plan**, que gera plano técnico, pesquisa de suporte, contratos e materiais de quickstart para implementação. [Microsoft for Developers](https://developer.microsoft.com/blog/spec-driven-development-spec-kit)

## 4) Quebra em tarefas
Depois, o plano é transformado em tarefas pequenas e executáveis, por exemplo:

- criar tabela de perfis
- configurar autenticação Google
- criar endpoint de callback
- montar tela de onboarding
- adicionar testes do fluxo de login
- revisar mensagens de erro

Essa etapa é importante porque ajuda a IA a trabalhar em blocos menores, com menos chance de inventar coisas fora do escopo. [Microsoft for Developers](https://developer.microsoft.com/blog/spec-driven-development-spec-kit)

## 5) Implementação guiada
Só então o código é escrito. A diferença é que a implementação não nasce do improviso; ela nasce de uma trilha já definida por spec, plano e tarefas.

## 6) Validação contra a spec
No final, não basta verificar se “o código roda”. É preciso verificar se ele **faz o que a spec mandava fazer**. Em textos recentes sobre SDD, isso aparece como preocupação com **drift**, isto é, desvio entre a intenção declarada e o comportamento real do software. [InfoQ](https://www.infoq.com/articles/spec-driven-development/) · [InfoQ Enterprise Scale](https://www.infoq.com/articles/enterprise-spec-driven-development/)

## Por que isso ficou tão importante agora

O SDD ganhou força porque ferramentas de IA aceleraram muito a geração de código, mas também aumentaram o risco de:

- implementação inconsistente
- arquitetura improvisada
- features que quebram coisas antigas
- decisões técnicas pouco pensadas
- documentação inexistente

A Thoughtworks descreve o SDD como uma resposta ao desenvolvimento impulsivo ou desordenado associado ao chamado *vibe coding*, buscando recolocar especificação, contexto e governança no centro do processo. [Thoughtworks](https://www.thoughtworks.com/en-br/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)

## O que é uma boa spec

Uma boa spec costuma ser:

- clara
- específica
- verificável
- curta o suficiente para ser útil
- detalhada o suficiente para evitar ambiguidade
- alinhada à linguagem do domínio do negócio

Muitas abordagens recomendam usar cenários no estilo **Given / When / Then** ou critérios de aceite que possam ser validados depois, sem transformar a spec em um documento gigante e difícil de manter. [Thoughtworks](https://www.thoughtworks.com/en-br/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)

## Diferença entre SDD e outros conceitos

## SDD x PRD

O **PRD** geralmente descreve o produto e a necessidade de negócio.

O **SDD** vai além: ele transforma a intenção em uma especificação mais operacional para engenharia e IA, incorporando comportamento esperado, restrições, plano técnico e execução. [Thoughtworks](https://www.thoughtworks.com/en-br/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)

## SDD x TDD

O **TDD** gira em torno de escrever testes antes do código.

O **SDD** gira em torno de escrever a especificação antes da implementação.

Os dois podem coexistir. Você pode usar SDD para orientar arquitetura e fluxo da feature, e TDD para garantir que partes críticas funcionem corretamente. [Thoughtworks](https://www.thoughtworks.com/en-br/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)

## SDD x BDD

O **BDD** aproxima negócio e engenharia por meio de cenários de comportamento.

O **SDD** pode aproveitar isso, mas normalmente inclui mais do que cenários: inclui arquitetura, contratos, restrições técnicas, tarefas e integração com IA. [Thoughtworks](https://www.thoughtworks.com/en-br/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)

## SDD x Waterfall

SDD não é simplesmente waterfall com outro nome. Nas fontes recentes, ele aparece como um processo **iterativo**, em que a spec é refinada e atualizada, não congelada por meses. O objetivo não é burocratizar; é dar contexto certo antes de acelerar com IA. [Microsoft for Developers](https://developer.microsoft.com/blog/spec-driven-development-spec-kit)

## Benefícios do SDD

### Menos ambiguidade
Todo mundo entende melhor o que será construído. [Microsoft for Developers](https://developer.microsoft.com/blog/spec-driven-development-spec-kit)

### Menos retrabalho
Erros de entendimento são corrigidos antes de virar código espalhado pelo sistema. [Microsoft for Developers](https://developer.microsoft.com/blog/spec-driven-development-spec-kit)

### Melhor uso de IA
Modelos tendem a responder melhor quando recebem contexto progressivo e estruturado. [GitHub Spec Kit](https://github.github.com/spec-kit/)

### Mais consistência arquitetural
A spec e as regras do projeto ajudam a manter frontend, backend e banco alinhados. [InfoQ](https://www.infoq.com/articles/spec-driven-development/)

### Menos drift
Fica mais fácil detectar quando a implementação se afastou da intenção original. [InfoQ](https://www.infoq.com/articles/spec-driven-development/)

## Limitações e cuidados

### 1. Spec ruim gera resultado ruim
Se a spec estiver vaga, a IA vai produzir algo vago ou incoerente.

### 2. É uma prática ainda emergente
Não existe um único padrão universal e fechado para SDD. A própria Thoughtworks trata o tema como uma prática ainda em formação e evolução. [Thoughtworks](https://www.thoughtworks.com/en-br/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)

### 3. Pode virar burocracia
Se você criar documentação enorme para tarefas simples, perde velocidade e utilidade.

### 4. Não substitui supervisão humana
A responsabilidade humana continua alta: decidir escopo, validar riscos, revisar arquitetura e confirmar aderência da implementação. [InfoQ](https://www.infoq.com/articles/spec-driven-development/)

## Exemplo simples

Sem SDD, um pedido poderia ser:

```text
Crie login com Google no meu app Next.js com Supabase.
```

Com SDD, você teria algo mais próximo disto:

```md
# Feature: Login com Google

## Objetivo
Permitir autenticação rápida e segura com Google.

## Requisitos funcionais
- O usuário pode clicar em "Entrar com Google".
- Se for o primeiro acesso, criar perfil básico.
- Se já existir conta com o mesmo e-mail, vincular login.
- Após login, redirecionar para /dashboard.

## Critérios de aceite
- Login deve funcionar em desktop e mobile.
- Sessão deve persistir após refresh.
- Usuário sem perfil completo deve ir para onboarding.
- Erros devem exibir mensagem amigável.

## Restrições técnicas
- Usar Supabase Auth.
- Não usar outro provedor de autenticação.
- Não criar tabela duplicada de usuários.
- Seguir RLS existente.

## Casos de borda
- E-mail já cadastrado por senha.
- Cancelamento no popup do Google.
- Token inválido.
```

Depois disso, você faria o plano técnico e quebraria em tarefas. A implementação fica muito mais previsível.

## Artefatos comuns em SDD

Em fluxos modernos, é comum ver algo assim:

- `PRD.md` -> contexto do produto e objetivo
- `SPEC.md` -> comportamento, requisitos e critérios de aceite
- `PLAN.md` -> arquitetura, banco, APIs, decisões técnicas
- `TASKS.md` -> tarefas pequenas e ordem de execução
- `RULES.md` ou `CONSTITUTION.md` -> princípios fixos do projeto

Esse tipo de organização aparece de forma consistente no ecossistema do Spec Kit. [GitHub Spec Kit](https://github.github.com/spec-kit/) · [GitHub Spec Kit Quick Start](https://github.github.com/spec-kit/quickstart.html)

## Quando vale a pena usar

SDD tende a valer muito a pena quando:

- o projeto tem várias features
- há banco de dados, autenticação ou integrações
- há mais de um desenvolvedor ou agente trabalhando
- você quer usar IA para codar com menos desvios
- o sistema precisa manter consistência ao longo do tempo

Para protótipos extremamente simples, pode ser usado de forma leve. Para SaaS reais, aplicações com regras de negócio e ambientes com IA, tende a ser especialmente útil. [Thoughtworks](https://www.thoughtworks.com/en-br/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices) · [InfoQ Enterprise Scale](https://www.infoq.com/articles/enterprise-spec-driven-development/)

## Definição prática

Uma definição prática e direta seria:

> **Spec-Driven Development é um jeito de desenvolver software em que você transforma a ideia em uma especificação clara antes de implementar, usa essa especificação para orientar pessoas e agentes de IA, e depois valida se o sistema ficou fiel ao que foi definido.**

## Como aplicar no dia a dia

Um fluxo simples e muito útil é:

1. escrever a intenção da feature
2. criar a spec funcional
3. definir o plano técnico
4. quebrar em tarefas pequenas
5. implementar uma tarefa por vez
6. revisar se o código está fiel à spec
7. atualizar a spec quando houver mudança real de escopo

## Referências

- GitHub Spec Kit: https://github.github.com/spec-kit/
- GitHub Spec Kit Quick Start: https://github.github.com/spec-kit/quickstart.html
- Microsoft for Developers — Diving Into Spec-Driven Development With GitHub Spec Kit: https://developer.microsoft.com/blog/spec-driven-development-spec-kit
- Thoughtworks — Spec-driven development: Unpacking one of 2025's key new AI-assisted engineering practices: https://www.thoughtworks.com/en-br/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices
- InfoQ — Spec Driven Development: When Architecture Becomes Executable: https://www.infoq.com/articles/spec-driven-development/
- InfoQ — Spec-Driven Development – Adoption at Enterprise Scale: https://www.infoq.com/articles/enterprise-spec-driven-development/

# Component Spec: Agent Loop (Reasoning Engine c/ MCP)

**Módulo Central:** Motor Cognitivo AdsClaw
**Responsabilidade:** Implementar o padrão ReAct adaptado para orquestração de APIs (Google/Meta), MCP Servers locais/remotos e chamadas assíncronas de longauração (ex: Geração de Vídeo).

---

## 1. Resumo e Objetivo
Baseado na abstração original do SandeClaw, o **AgentLoop** do modelo SWAS deve gerenciar a inferência do LLM intercalando com chamadas obrigatórias de *Tools*. Como o AdsClaw vai interagir primariamente com painéis (Meta Ads) rodando limites de conta (Target CPA/Budget do Supabase), **jamais** poderá alucinar um comando criativo sem realizar a verificação de budget na tabela.

---

## 2. Abordagem do Raciocínio (ReAct)

O processo itera em `MAX_ITERATIONS` (padrão: 5). Caso atinja o limite sem uma "Final Answer", retorna um throw nativo pro usuário para evitar torrar billing no Gemini API.

**Ciclo (Loop):**
1. O Contexto do Cliente e o Prompt da "Intenção" entram no sistema.
2. O Gemini infere (`Thought`).
3. O LLM escolhe acionar um MCP ou Tool (`Action: call_mcp_meta_ads_get_roas`).
4. O Node aguarda a Promise do MCP/Skill local. Retorna erro de HTTP 400 em formato JSON limpo pra LLM saber que falhou.
5. Injeta o JSON como `Observation`. Volte pro passo 2 até o LLM concluir (`Final Answer: "As métricas são..."`).

---

## 3. Integração Específica (Context Window SWAS)
Diferente de um bote pessoal (SandeClaw), no AdsClaw o `SystemPrompt` do Agent Loop será dinâmico por *Client Session*. Antes de iniciar a API do provedor (Gemini SDK), os registros daquele respectivo cliente serão extraidos de `client_rules` via Supabase e fixados como preâmbulo do Loop para blindar vazamento in-context entre inquilinos (clientes).

---

## 4. Error Handling e Fallbacks
- **Timeouts MCP:** Serviços de scraping (`Apify`) e Mídias Demoradas (`Google Veo`) bloqueiam o loop. O AgentLoop deve possuir timeout limite em cada `Observation` de *3 minutos*. Falhando, o loop desiste de continuar o ReAct e alerta: "A geração falhou, erro de timeout!".
- **JSON malformado do LLM:** Se o Gemini não devolver os tool_calls num padrão do SDK que o Node consiga instanciar nas Skills, haverá retry explícito, passando o erro sintático de volta pro modelo interpretar no próximo loop (`"Invalid schema argument"`).

---

## 5. Critérios de Conclusão Técnica
- [ ] O `AgentLoop` executa um array contínuo limpo e devolve uma classe encapsulada de `FinalResponse`.
- [ ] A execução do pipeline impede iterações infinitas (`MAX_ITER` strict block).
- [ ] Erros capturados em Tools não travam a API do Node; eles viram inputs para o ciclo seguinte lidar com as consequências.

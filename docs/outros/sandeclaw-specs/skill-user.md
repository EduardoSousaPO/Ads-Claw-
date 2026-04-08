# Spec: Skill Management System (Hot-Reload)

**Versão:** 1.0
**Status:** Aprovada
**Autor:** SandeClaw Agent
**Data:** 2026-03-06

---

## 1. Resumo

A arquitetura de injeção de habilidades (`Skills`) possibilita que novas capacidades, prompts engessados ou guias instrucionais complexos se integrem dinamicamente ao agente sem requerer nenhuma reinicialização (deploy zero). Através deste sistema (Loader -> Router -> Executor), cada subpasta vira uma Action especializada reconhecida por um LLM.

---

## 2. Contexto e Motivação

**Problema:**
Adicionar habilidades num chatbot em nível de código causa quebras de estabilidade, misturas no "Core" Principal e requer reboot do backend Node a cada alteração pequena na string de inteligência.

**Evidências:**
Se o LLM receber instruções enormes fixas no seu Master Prompt, além de "queimar dinheiro" com a Context Window cheia em conversas bobas (ex: "Oi"), ele sofre de perda de atenção nas diretivas essenciais.

**Por que agora:**
A separação num formato plugin (pasta .agents) modulariza tudo e deixa o Router LLM usar um prompt barato para dizer "Sim, devo focar a Skill de Github" só quando o usuário pedir pra ver repositórios.

---

## 3. Goals (Objetivos)

- [ ] G-01: Ler na raiz do projeto o diretório `.agents/skills` mapeando seus `SKILL.md`. O agente deve carregar todas as skills desta pasta.
- [ ] G-02: Executar um Router inicial ("Passo Zero") apenas passando descritivos básicos das Skills + Intenção do usuário, recebendo a string correspondente de qual plugin instanciar ou nulo.
- [ ] G-03: Inserir a documentação detalhada da Skill no Master Context apenas durante a iteração daquele comando isolado (Runtime Injection).

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: Chamar múltiplas Skills distintas como resposta a uma única requisição. Uma requisição = Uma intenção master / skill principal.

---

## 5-6. Fluxo Principal

1. Entrada: "Crie a spec de auth do projeto React".
2. Loader lê Skills de metadado (PrdManager, GitManager, CodeAnalyzer).
3. SkillRouter instancia request HTTP leve e barata pro LLM só validando com os metadados.
4. O Router retorna `{"skillName": "prd-manager"}`.
5. Executor: lê instrução profunda de `/prd-manager/SKILL.md`.
6. Repassa no AgentLoop via param `skillContent` (joga no System Role puro).
7. Bot devolve resultado e descarta a string gigante. Limpo o ambiente pro proximo call.

**Nenhum Casamento (N/A Intent):** Se perguntou "Como tá a rua?" o router dirá null; fallback cai pro agente raiz responder livre.

---

## Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | `SkillLoader` deve carregar **todas** as skills presentes em `.agents/skills` | Must | Retorna Array contendo objetos do YAML frontmatter. |
| RF-02 | O Prompt de `SkillRouter` deve retornar `{"skillName": "xyz" \| null}` | Must | Parse error tratada igual a nulo (Fallback a chatbot casual). |
| RF-03 | A Observação "availableSkills" com resumos enxutos deve ir sempre pro loop subsequente. | Must | AgentLoop sabe das ferramentas disponíveis. |

---

## Edge Cases

| Cenário | Comportamento |
|---------|--------------|
| EC-01: Skill Duplicada | First Match via overwrite no Array |
| EC-02: `SKILL.md` Ausente na subpasta | Loader pula, sem crash |
| EC-03: Frontmatter Malformado | Rejeita load pontual, prossegue pros demais |

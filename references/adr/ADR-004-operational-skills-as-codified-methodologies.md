# ADR-004: Skills Operacionais como Metodologias Codificadas

> Data: 2026-04-08
> Status: Aceito
> Referencia: PRD v2.0, PLAN v2.0 §13

## Contexto

O AdsClaw v1.0 foi projetado como monitor + alertas com ações pontuais. O PRD v2.0 redefine o escopo para **gestor de tráfego completo com metodologia codificada**. A questão é: como o agente executa tarefas complexas multi-step (mineração de termos, otimização de budget, reviews semanais) de forma previsível, auditável e consistente?

## Inspiração

O Google Ads Toolkit de Austin Lau (@helloitsaustin) demonstra que skills compostas — workflows estruturados com passos explícitos, critérios de avaliação e outputs padronizados — produzem resultados superiores a instruções genéricas. Cada skill codifica uma metodologia que o agente segue, não uma decisão arbitrária da IA.

## Decisão

Implementar **8 Skills Operacionais (SK-001 a SK-008)** como prompts estruturados que o AgentLoop executa via sequência de tool calls. Cada skill:

1. Tem objetivo, passos, critérios e output definidos em arquivo Markdown
2. É ativada pelo SkillRouter quando o operador solicita a tarefa correspondente
3. Gera output com coluna/campo "Reasoning" para auditabilidade
4. Requer aprovação humana antes de executar ações destrutivas
5. Pode compor outras skills (referência no system prompt)

## Alternativas Consideradas

| Opção | Prós | Contras |
|-------|------|---------|
| **A) Skills como system prompts (escolhida)** | Simples, usa infraestrutura existente (SkillRouter), flexível | Depende da qualidade do prompt |
| B) Skills como código TypeScript (hardcoded) | Mais previsível, testável | Menos flexível, mais código para manter |
| C) Skills como agentes separados | Isolamento completo | Overhead de comunicação, complexidade |

## Consequências

**Positivas:**
- Comportamento previsível e documentado
- Auditabilidade total (cada decisão tem Reasoning)
- Fácil de ajustar (editar Markdown vs reescrever código)
- Reutilizável entre clientes

**Negativas:**
- Qualidade depende da capacidade do LLM de seguir instruções longas
- Prompts complexos podem ultrapassar context window
- Testes são mais difíceis (output probabilístico)

## Mitigação

- Manter prompts de skills focados e concisos (<2000 tokens cada)
- Testar com exemplos reais durante piloto interno
- Iterar rapidamente: ajustar prompt → testar → refinar

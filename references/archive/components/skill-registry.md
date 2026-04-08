# Component Spec: Dynamic Skill Registry (Plugin System)

**Módulo Central:** Engine de Habilidades
**Responsabilidade:** Carregar ferramentas nativas de código (Scripts) e as documentações fixas (SKILL.md) como "Agentes Adicionais" ao prompt global sem demandar hardcode extenso na master principal.

---

## 1. O Conceito Zero-Config (Hot Reloading)
Agentes escaláveis demandam facilidade para acoplar ferramentas. O Registry escaneia `fs` de diretórios (ex: `.agents/skills/[skill-name]/`) buscando sua intenção através do FrontMatter no topo do Markdown e construtores de classe de script. Se você amanhã quiser adicionar uma skill focada no _TikTok Ads_, basta criar a nova pasta sem reiniciar a base principal em si.

---

## 2. Integração híbrida MCP e Local Functions
O Registry no projeto AdsClaw adquire uma complexidade adicional comparado ao paradigma puro SandeClaw:
- **Server MCPs Remotos/Virtuais:** (Ex: `mcp-builder` Meta Marketing, Supabase MCP). O SkillRegistry possuirá wrappers que conectam no protocolo SSE ou STDIO do Standard MCP para buscar os JSON Schemas dinamicamente do Meta/Google e os injetar em RAM.
- **Skills Locais Isoladas:** Rotinas de código JS cru (ex: Scraping Web via biblioteca `Apify` local) operando ferramentas autônomas não modeladas via MCP diretamente, rodando sob processos irmãos (Node exec).

---

## 3. Acelerador Base (O "Router")
Para evitar preencher a context_window do LLM com dezenas de MCP tools do Meta, do Google, e todas as descrições da skill de Apify de uma vez em solicitações comuns (ex: "Bom dia, AdsClaw"), o sistema usa a premissa de um *Lightweight Router* ("Passo Zero").
- Uma pequena inferência dedutiva (um modelo de custo baratíssimo ou Regex de intencoes) avalia o Prompt entrante, analisa os títulos das Tools e MCPs ativos e seleciona um grupo filtrado de pacotes exigidos ativamente para o loop a seguir da engine pesada (Ex: Router infere: `"Intenção Metricas" -> carrega mcp-meta-ads e paid-ads para a Context Window profunda`).

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
/**
 * Registry de Ferramentas (Skills e MCPs).
 *
 * Implementa a filosofia de Hot-Reload (não exige reestart do Node)
 * para a injeção contínua de "Agentes". Cada subpasta com um SKILL.md
 * vira uma "ferramenta" passível de escolha pelo Roteador/AgentLoop.
 */
class ToolRegistry {
    skillsPath;
    cachedSkills = [];
    constructor() {
        // Assume que o script Node parte da pasta /agent/
        // O diretório oculto está na raiz do AdsClaw
        this.skillsPath = path_1.default.resolve(process.cwd(), '../.agents/skills');
    }
    /**
     * Varre síncronamente o FileSystem na raiz do projeto (Hot-Reloading Oculto)
     * e cataloga todas as ferramentas do ".agents/skills"
     */
    loadLocalSkills() {
        console.log(`🧰 [ToolRegistry] Escaneando plugins locais em: ${this.skillsPath}`);
        this.cachedSkills = [];
        try {
            if (!fs_1.default.existsSync(this.skillsPath)) {
                console.warn(`⚠️ [ToolRegistry] Diretório de skills não encontrado. Nenhuma skill local carregada.`);
                return [];
            }
            const folders = fs_1.default.readdirSync(this.skillsPath, { withFileTypes: true });
            for (const folder of folders) {
                if (folder.isDirectory()) {
                    const skillMdPath = path_1.default.join(this.skillsPath, folder.name, 'SKILL.md');
                    if (fs_1.default.existsSync(skillMdPath)) {
                        const parsedSkill = this.parseSkillFrontmatter(skillMdPath);
                        if (parsedSkill) {
                            this.cachedSkills.push(parsedSkill);
                        }
                    }
                    else {
                        console.warn(`⚠️ [ToolRegistry] Pasta ghost identificada: '${folder.name}' (Sem SKILL.md)`);
                    }
                }
            }
            console.log(`✅ [ToolRegistry] ${this.cachedSkills.length} SKILLS registradas com sucesso prontas p/ Injeção.`);
            return this.cachedSkills;
        }
        catch (ex) {
            console.error('💥 [ToolRegistry] Erro massivo de I/O na varredura de Skills:', ex);
            return [];
        }
    }
    /**
     * Lê o Frontmatter do arquivo Markdown e separa metadata (Nome/Desc)
     * do conteúdo bruto. (Parser Baseado na SPEC 11 "Edge Cases e Erros").
     */
    parseSkillFrontmatter(filePath) {
        try {
            const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
            // Regex para extrair entre --- e --- no topo do arquivo YAML
            const match = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
            if (match) {
                const yamlBlock = match[1];
                const markdownBody = match[2];
                const metadata = js_yaml_1.default.load(yamlBlock);
                if (!metadata || !metadata.description) {
                    return null;
                }
                // Fallback do nome para o basename do arquivo/folder se não houver hardcoded
                const fallbackName = path_1.default.basename(path_1.default.dirname(filePath));
                return {
                    name: metadata.name || fallbackName,
                    description: metadata.description,
                    content: markdownBody.trim()
                };
            }
            return null; // Arquivos sem a TAG "---" no topo falham graciosamente
        }
        catch (error) {
            console.error(`⚠️ [ToolRegistry] Falha de Parse (YAML/Regex) no arrimo: ${filePath}`);
            return null;
        }
    }
    /**
     * Mock para o Futuro: Aqui a classe plugará com os MCP Servers
     * (Model Context Protocol), lendo os schemas diretamente via STDIO/WS
     * do Meta API e Google API.
     */
    async loadMCPServers() {
        // TODO (Fase 4): Inicializar as pontes de comunicação do MCP Meta Ads
        console.log(`🔌 [ToolRegistry] Ponte de Servidores Remotos (MCP) pendente para Fase 4.`);
    }
    getSkills() {
        return this.cachedSkills;
    }
}
exports.ToolRegistry = ToolRegistry;

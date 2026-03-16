import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface BaseSkill {
    name: string;
    description: string;
    content: string; // The raw or formatted markdown body of the Skill
}

/**
 * Registry de Ferramentas (Skills e MCPs).
 */
export class ToolRegistry {
    private skillsPath: string;
    private cachedSkills: BaseSkill[] = [];
    private mcpClients: Map<string, Client> = new Map();

    constructor() {
        this.skillsPath = path.resolve(process.cwd(), '../.agents/skills');
    }

    public loadLocalSkills(): BaseSkill[] {
        console.log(`🧰 [ToolRegistry] Escaneando plugins locais em: ${this.skillsPath}`);
        this.cachedSkills = [];

        try {
            if (!fs.existsSync(this.skillsPath)) {
                console.warn(`⚠️ [ToolRegistry] Diretório de skills não encontrado. Nenhuma skill local carregada.`);
                return [];
            }

            const folders = fs.readdirSync(this.skillsPath, { withFileTypes: true });

            for (const folder of folders) {
                if (folder.isDirectory()) {
                    const skillMdPath = path.join(this.skillsPath, folder.name, 'SKILL.md');
                    
                    if (fs.existsSync(skillMdPath)) {
                        const parsedSkill = this.parseSkillFrontmatter(skillMdPath);
                        if (parsedSkill) {
                            this.cachedSkills.push(parsedSkill);
                        }
                    }
                }
            }

            console.log(`✅ [ToolRegistry] ${this.cachedSkills.length} SKILLS registradas.`);
            return this.cachedSkills;
        } catch (ex) {
            console.error('💥 [ToolRegistry] Erro ao carregar Skills:', ex);
            return [];
        }
    }

    private parseSkillFrontmatter(filePath: string): BaseSkill | null {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const match = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

            if (match) {
                const yamlBlock = match[1];
                const markdownBody = match[2];
                const metadata = yaml.load(yamlBlock) as any;

                if (!metadata || !metadata.description) return null;

                const fallbackName = path.basename(path.dirname(filePath));
                return {
                    name: metadata.name || fallbackName,
                    description: metadata.description,
                    content: markdownBody.trim()
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Inicializa as pontes de comunicação com os MCP Servers locais.
     */
    public async loadMCPServers() {
        console.log(`🔌 [ToolRegistry] Inicializando Servidores MCP (Meta & Google Ads)...`);
        
        const servers = [
            { name: 'meta-ads', path: '../mcp-servers/meta-ads/dist/index.js' },
            { name: 'google-ads', path: '../mcp-servers/google-ads/dist/index.js' }
        ];

        for (const serverInfo of servers) {
            try {
                const serverPath = path.resolve(process.cwd(), serverInfo.path);
                
                if (!fs.existsSync(serverPath)) {
                    console.warn(`⚠️ [ToolRegistry] Servidor MCP '${serverInfo.name}' não encontrado em: ${serverPath}. Pule o build?`);
                    continue;
                }

                const transport = new StdioClientTransport({
                    command: "node",
                    args: [serverPath],
                });

                const client = new Client(
                    { name: "adsclaw-agent", version: "1.0.0" },
                    { capabilities: {} }
                );

                await client.connect(transport);
                this.mcpClients.set(serverInfo.name, client);
                
                console.log(`✅ [ToolRegistry] MCP '${serverInfo.name}' conectado e operacional.`);
            } catch (err) {
                console.error(`❌ [ToolRegistry] Falha ao conectar MCP '${serverInfo.name}':`, err);
            }
        }
    }

    public getSkills(): BaseSkill[] {
        return this.cachedSkills;
    }

    public getMcpClients(): Map<string, Client> {
        return this.mcpClients;
    }
}

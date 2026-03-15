"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreativeLab = void 0;
const apify_client_1 = require("apify-client");
const generative_ai_1 = require("@google/generative-ai");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class CreativeLab {
    apify;
    genAI;
    constructor() {
        this.apify = new apify_client_1.ApifyClient({
            token: process.env.APIFY_TOKEN || 'MISSING_TOKEN',
        });
        this.genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');
    }
    /**
     * Task 5.1: Captura de benchmarks via Apify.
     */
    async fetchBenchmarks(niche) {
        console.log(`🧪 [CreativeLab] Buscando benchmarks para o nicho: ${niche}`);
        try {
            const run = await this.apify.actor('apify/facebook-ads-scraper').call({
                searchQuery: niche,
                maxAds: 5,
                viewOnlyActive: true,
            });
            const { items } = await this.apify.dataset(run.defaultDatasetId).listItems();
            return items.map(item => ({
                title: item.adTitle || 'Sem título',
                body: item.adBody || '',
                imageUrl: item.imageUrls?.[0],
                videoUrl: item.videoUrls?.[0],
                cta: item.ctaText,
                platform: 'Meta'
            }));
        }
        catch (error) {
            console.error('❌ Erro ao buscar benchmarks no Apify:', error);
            return [];
        }
    }
    /**
     * Task 5.2: Desconstrução Visual e Produção de Copy.
     */
    async analyzeAndGenerate(benchmarks, clientRules) {
        console.log('🧠 [CreativeLab] Iniciando desconstrução e geração de copy...');
        const modelFlash = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
            Você é um copywriter sênior de alta performance focado em anúncios diretos (SWAS).
            CONTEXTO DO CLIENTE:
            ${clientRules}

            BENCHMARKS ENCONTRADOS NO MERCADO:
            ${JSON.stringify(benchmarks, null, 2)}

            OBJETIVO:
            Gere 3 variações de anúncios (Copy + Headline + CTA) seguindo as regras do cliente.
            Responda APENAS o JSON estruturado: {"analysis": "...", "variations": [{"copy": "...", "headline": "...", "cta": "...", "visual_suggestion": "..."}]}.
        `;
        const result = await modelFlash.generateContent(prompt);
        return result.response.text();
    }
    /**
     * Task 5.3: Produção Audiovisual (Vídeo/Imagens via inference.sh).
     */
    async generateVideo(prompt) {
        console.log(`🎬 [CreativeLab] Gerando vídeo com Veo: ${prompt}`);
        try {
            const cmd = `infsh app run google/veo-3-1-fast --input "{\\"prompt\\": \\"${prompt}\\"}" --json`;
            const { stdout } = await execAsync(cmd);
            const result = JSON.parse(stdout);
            return result.output_url || result.file_url || 'URL_NOT_FOUND';
        }
        catch (error) {
            console.error('❌ Erro ao gerar vídeo via infsh:', error);
            return 'ERROR_GENERATING_VIDEO';
        }
    }
    async generateImage(prompt) {
        console.log(`🖼️ [CreativeLab] Gerando imagem: ${prompt}`);
        try {
            // Usando FLUX via infsh como fallback premium
            const cmd = `infsh app run black-forest-labs/flux-1-schnell --input "{\\"prompt\\": \\"${prompt}\\"}" --json`;
            const { stdout } = await execAsync(cmd);
            const result = JSON.parse(stdout);
            return result.output_url || result.file_url || 'URL_NOT_FOUND';
        }
        catch (error) {
            console.error('❌ Erro ao gerar imagem via infsh:', error);
            return 'ERROR_GENERATING_IMAGE';
        }
    }
}
exports.CreativeLab = CreativeLab;

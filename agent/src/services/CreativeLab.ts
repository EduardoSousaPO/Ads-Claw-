import { ApifyClient } from 'apify-client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BenchmarkResult {
    title: string;
    body: string;
    imageUrl?: string;
    videoUrl?: string;
    cta?: string;
    platform: string;
}

export class CreativeLab {
    private apify: ApifyClient;
    private genAI: GoogleGenerativeAI;

    constructor() {
        this.apify = new ApifyClient({
            token: process.env.APIFY_TOKEN || 'MISSING_TOKEN',
        });
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');
    }

    /**
     * Task 5.1: Captura de benchmarks via Apify.
     */
    async fetchBenchmarks(niche: string): Promise<BenchmarkResult[]> {
        console.log(`🧪 [CreativeLab] Buscando benchmarks para o nicho: ${niche}`);
        
        try {
            const run = await this.apify.actor('apify/facebook-ads-scraper').call({
                searchQuery: niche,
                maxAds: 5,
                viewOnlyActive: true,
            });

            const { items } = await this.apify.dataset(run.defaultDatasetId).listItems();
            
            return (items as any[]).map(item => ({
                title: item.adTitle || 'Sem título',
                body: item.adBody || '',
                imageUrl: item.imageUrls?.[0],
                videoUrl: item.videoUrls?.[0],
                cta: item.ctaText,
                platform: 'Meta'
            }));
        } catch (error) {
            console.error('❌ Erro ao buscar benchmarks no Apify:', error);
            return [];
        }
    }

    /**
     * Task 5.2: Desconstrução Visual e Produção de Copy.
     */
    async analyzeAndGenerate(benchmarks: BenchmarkResult[], clientRules: string) {
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
    async generateVideo(prompt: string): Promise<string> {
        console.log(`🎬 [CreativeLab] Gerando vídeo com Veo: ${prompt}`);
        try {
            const cmd = `infsh app run google/veo-3-1-fast --input "{\\"prompt\\": \\"${prompt}\\"}" --json`;
            const { stdout } = await execAsync(cmd);
            const result = JSON.parse(stdout);
            return result.output_url || result.file_url || 'URL_NOT_FOUND';
        } catch (error) {
            console.error('❌ Erro ao gerar vídeo via infsh:', error);
            return 'ERROR_GENERATING_VIDEO';
        }
    }

    async generateImage(prompt: string): Promise<string> {
        console.log(`🖼️ [CreativeLab] Gerando imagem Premium com FLUX: ${prompt}`);
        try {
            // FLUX-1-Schnell é o modelo de escolha para anúncios com texto e realismo
            const cmd = `infsh app run black-forest-labs/flux-1-schnell --input "{\\"prompt\\": \\"${prompt}\\"}" --json`;
            const { stdout } = await execAsync(cmd);
            const result = JSON.parse(stdout);
            
            // O inference.sh pode retornar URLs em diferentes campos dependendo da App
            const imageUrl = result.output_url || result.file_url || (result.images && result.images[0]);
            
            if (!imageUrl) throw new Error('Campo de imagem não encontrado no JSON de resposta do infsh');
            
            return imageUrl;
        } catch (error) {
            console.error('❌ Erro ao gerar imagem via FLUX (infsh):', error);
            return 'ERROR_GENERATING_IMAGE';
        }
    }
}


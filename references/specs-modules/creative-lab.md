# Spec Técnica: CreativeLab
> Módulo: `agent/src/services/CreativeLab.ts`
> Requisitos: RF-009, RF-014
> Contratos: CONTRACTS.md §Agent Tools — generate_ad_copy, generate_image, generate_video, fetch_ad_benchmarks, upload_asset
> ADR: ADR-003
> Versão: 1.0 — 2026-03-26

---

## Responsabilidade

O `CreativeLab` é o serviço de geração de criativos de advertising. Ele orquestra:
1. **Benchmarks**: busca dados do setor via Apify para contextualizar geração
2. **Copy**: gera variações de texto para anúncios via LLM (Tier 2)
3. **Imagens**: gera imagens publicitárias via FLUX-1-Schnell (inference.sh CLI)
4. **Vídeos**: gera vídeos curtos via Veo 3.1 (inference.sh CLI)
5. **Storage**: salva assets gerados no Supabase Storage

---

## Interface Pública

```typescript
// agent/src/services/CreativeLab.ts

interface AdCopyRequest {
  clientId: string;
  objective: 'awareness' | 'traffic' | 'conversions' | 'engagement';
  platform: 'meta' | 'google' | 'instagram';
  tone?: string;           // do client_rules.tone se não especificado
  productDescription?: string;
  targetAudience?: string;
  variations?: number;     // default: 3
}

interface AdCopyResult {
  variations: Array<{
    headline: string;       // max 40 chars
    primaryText: string;    // max 125 chars
    description?: string;   // max 30 chars
    callToAction: string;
  }>;
  benchmarkContext: BenchmarkData;
}

interface ImageRequest {
  clientId: string;
  prompt: string;
  width: 512 | 1024 | 1080;
  height: 512 | 1024 | 1080 | 1920;
  style?: 'photorealistic' | 'illustration' | 'minimalist';
}

interface VideoRequest {
  clientId: string;
  prompt: string;
  duration: 6 | 10 | 15;    // segundos
  aspectRatio: '1:1' | '9:16' | '16:9';
}

class CreativeLab {
  async fetchBenchmarks(sector: string, platform: string): Promise<BenchmarkData>;
  async generateAdCopy(request: AdCopyRequest): Promise<AdCopyResult>;
  async generateImage(request: ImageRequest): Promise<string>;   // retorna URL Supabase
  async generateVideo(request: VideoRequest): Promise<string>;   // retorna URL Supabase
  async uploadAsset(clientId: string, filePath: string, assetType: string): Promise<string>;
}
```

---

## Benchmarks via Apify

```typescript
interface BenchmarkData {
  sector: string;
  platform: string;
  averageCtr: number;          // ex: 0.025 (2.5%)
  averageCpa: number;          // ex: 45.00 (R$ 45)
  averageCpm: number;          // ex: 18.50 (R$ 18.50)
  topAdFormats: string[];      // ex: ['carousel', 'video', 'single_image']
  bestPerformingTones: string[]; // ex: ['urgency', 'social_proof']
  fetchedAt: Date;
}

async fetchBenchmarks(sector: string, platform: string): Promise<BenchmarkData> {
  // 1. Verificar cache no Supabase (TTL: 24 horas)
  const cached = await this.getCachedBenchmarks(sector, platform);
  if (cached && isWithin24Hours(cached.fetchedAt)) {
    return cached;
  }

  // 2. Buscar via Apify
  try {
    const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
    const run = await client.actor('apify/ads-benchmark-scraper').call({
      sector,
      platform,
      country: 'BR'
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const benchmarks = parseBenchmarkData(items[0]);

    // 3. Cachear no Supabase
    await this.cacheBenchmarks(sector, platform, benchmarks);
    return benchmarks;

  } catch (error) {
    logger.warn({ error, sector, platform }, 'Apify unavailable, using fallback');

    // 4. Fallback com dados estáticos por setor
    return this.getStaticFallbackBenchmarks(sector, platform);
  }
}
```

### Dados Estáticos de Fallback por Setor

| Setor | CTR Médio | CPA Médio (BRL) | CPM Médio |
|-------|-----------|-----------------|-----------|
| E-commerce | 2.8% | R$ 38 | R$ 15 |
| SaaS | 1.9% | R$ 85 | R$ 22 |
| Educação | 2.2% | R$ 42 | R$ 18 |
| Saúde/Beleza | 3.1% | R$ 35 | R$ 12 |
| Imobiliário | 1.5% | R$ 120 | R$ 28 |

---

## Geração de Copy via LLM

```typescript
async generateAdCopy(request: AdCopyRequest): Promise<AdCopyResult> {
  // 1. Buscar regras do cliente
  const clientRules = await getClientRules(request.clientId);

  // 2. Buscar benchmarks
  const benchmarks = await this.fetchBenchmarks(clientRules.sector, request.platform);

  // 3. Construir prompt contextualizado
  const prompt = buildCopyPrompt({
    objective: request.objective,
    platform: request.platform,
    tone: request.tone ?? clientRules.tone,
    benchmarks,
    variations: request.variations ?? 3
  });

  // 4. Chamar LLM Tier 2 (mais capaz para geração criativa)
  const provider = await this.providerFactory.forClient(request.clientId, 'tier2');
  const response = await provider.generateContent({
    systemInstruction: CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  // 5. Parsear e validar resposta
  const variations = parseCopyResponse(response.text);

  return { variations, benchmarkContext: benchmarks };
}
```

---

## Geração de Imagem (inference.sh + FLUX-1-Schnell)

```typescript
async generateImage(request: ImageRequest): Promise<string> {
  const outputPath = `/tmp/creative_${request.clientId}_${Date.now()}.png`;

  // 1. Chamar inference.sh CLI
  try {
    await execFileAsync('inference', [
      'run',
      '--model', 'black-forest-labs/FLUX.1-schnell',
      '--prompt', request.prompt,
      '--width', String(request.width),
      '--height', String(request.height),
      '--output', outputPath
    ], {
      timeout: 30_000,  // 30s — se passar, é erro
      env: {
        ...process.env,
        INFERENCE_API_KEY: process.env.INFERENCE_API_KEY
      }
    });
  } catch (error) {
    // Limpar arquivo temporário se existir
    await fs.unlink(outputPath).catch(() => {});
    throw new CreativeGenerationError(`Image generation failed: ${error.message}`);
  }

  // 2. Upload para Supabase Storage
  const publicUrl = await this.uploadAsset(request.clientId, outputPath, 'image');

  // 3. Limpar arquivo temporário
  await fs.unlink(outputPath).catch(() => {});

  return publicUrl;
}
```

---

## Geração de Vídeo (inference.sh + Veo 3.1)

```typescript
async generateVideo(request: VideoRequest): Promise<string> {
  const outputPath = `/tmp/creative_${request.clientId}_${Date.now()}.mp4`;

  // Vídeo leva mais tempo — timeout maior (60s)
  await execFileAsync('inference', [
    'run',
    '--model', 'google/veo-3.1',
    '--prompt', request.prompt,
    '--duration', String(request.duration),
    '--aspect-ratio', request.aspectRatio,
    '--output', outputPath
  ], {
    timeout: 60_000,
    env: { ...process.env, INFERENCE_API_KEY: process.env.INFERENCE_API_KEY }
  });

  const publicUrl = await this.uploadAsset(request.clientId, outputPath, 'video');
  await fs.unlink(outputPath).catch(() => {});

  return publicUrl;
}
```

---

## Upload para Supabase Storage

```typescript
async uploadAsset(clientId: string, filePath: string, assetType: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const extension = path.extname(filePath);
  const fileName = `${clientId}/${Date.now()}${extension}`;
  const bucket = 'creatives';

  const { error } = await this.supabase.storage
    .from(bucket)
    .upload(fileName, fileBuffer, {
      contentType: assetType === 'image' ? 'image/png' : 'video/mp4',
      upsert: false
    });

  if (error) throw new StorageError(`Upload failed: ${error.message}`);

  const { data } = this.supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  // Registrar na tabela ad_creatives
  await this.registerCreative(clientId, data.publicUrl, assetType);

  return data.publicUrl;
}
```

---

## Cache de Benchmarks (tabela no Supabase)

```sql
CREATE TABLE benchmark_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector      TEXT NOT NULL,
  platform    TEXT NOT NULL,
  data        JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sector, platform)
);
```

---

## Testes

```typescript
describe('CreativeLab', () => {
  describe('fetchBenchmarks', () => {
    it('should return cached benchmarks if within 24h')
    it('should fetch from Apify when cache expired')
    it('should return static fallback when Apify fails')
    it('should cache Apify response in Supabase')
  })

  describe('generateAdCopy', () => {
    it('should include benchmark context in prompt')
    it('should respect client tone from client_rules')
    it('should return 3 variations by default')
    it('should use Tier 2 provider')
  })

  describe('generateImage', () => {
    it('should call inference.sh with correct parameters')
    it('should upload to Supabase Storage')
    it('should clean up temp file after upload')
    it('should throw CreativeGenerationError on CLI failure')
    it('should respect 30s timeout')
  })

  describe('generateVideo', () => {
    it('should call inference.sh with video model')
    it('should respect 60s timeout')
  })
})
```

---

## Arquivo de Referência (código existente)

- `agent/src/services/CreativeLab.ts` — **Já existe parcialmente** (T-070 valida e adapta)
  - `fetchBenchmarks()` — implementado com Apify ✓
  - `analyzeAndGenerate()` — lógica diferente da spec, adaptar
  - `generateImage()` — implementado com inference.sh ✓
  - `generateVideo()` — implementado com inference.sh ✓
  - Não está registrado como tool no ToolRegistry — adicionar (T-030)

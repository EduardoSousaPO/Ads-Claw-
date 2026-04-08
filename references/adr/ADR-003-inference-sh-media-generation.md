# ADR-003 — Geração de Mídia: inference.sh CLI
> Data: 2026-03-26
> Status: Aceito
> Projeto: AdsClaw

---

## Contexto

O AdsClaw precisa gerar imagens e vídeos para criativos de campanhas de ads. Os requisitos são:
- **Imagens**: proporções variadas (1:1, 4:5, 9:16, 16:9), alta qualidade, orientadas a ads
- **Vídeos**: curtos (6-15s), formato Reels/Stories, animação de produto
- **Custo**: modelo de custo previsível para o SWAS (agência cobra por ROI, não por token)
- **Controle**: sem CDN de terceiro obrigatório, output direto para Supabase Storage
- **Integração**: deve funcionar a partir de um processo Node.js na VPS

## Opções Consideradas

### Opção A: inference.sh CLI (FLUX-1-Schnell + Veo 3.1)
- CLI executável via `child_process.execFile()` do Node.js
- FLUX-1-Schnell para imagens: velocidade alta, qualidade adequada para ads
- Veo 3.1 para vídeos: Google's model, qualidade comercial
- Output como arquivo local → upload para Supabase Storage
- Custo por geração (créditos inference.sh)
- Sem SDK TypeScript — integração via CLI/shell

### Opção B: Stability AI SDK (SDXL / SD3)
- SDK oficial TypeScript disponível
- SDXL: qualidade alta para imagens estáticas
- Sem geração de vídeo nativo
- Custo: $0.065/imagem (SDXL Turbo)
- Requer API key e gestão de billing por cliente

### Opção C: Replicate API
- Acesso a centenas de modelos (FLUX, SDXL, AnimateDiff)
- SDK TypeScript oficial
- Modelo de vídeo: AnimateDiff ou Wan-2.1
- Custo: por segundo de GPU ($0.0023/s para NVIDIA A40)
- Latência variável (cold start de modelos)
- Vendor lock-in leve (mas modelos são open-source)

### Opção D: Google Vertex AI (Imagen 3 + Veo)
- Imagen 3 para imagens de alta qualidade
- Veo para vídeos (mesmo modelo que Veo 3.1 da inference.sh)
- SDK Google Cloud disponível
- Custo mais alto: $0.02/imagem Imagen 3
- Requer GCP project + billing + IAM — overhead de infra
- Já tem Gemini no projeto — adicionaria complexidade de billing separada

### Opção E: OpenAI DALL-E 3 + Sora (quando disponível)
- DALL-E 3: qualidade alta, integração simples
- Sora: não disponível via API ainda (Q1 2026)
- Custo DALL-E 3: $0.04-$0.08/imagem
- Sem vídeo via API ainda

## Decisão

**Opção A: inference.sh CLI** é adotado para o MVP.

## Justificativa

1. **Veo 3.1 para vídeo** — é o modelo de melhor qualidade disponível para geração de vídeo comercial no momento (Q1 2026). Não há SDK TypeScript que ofereça acesso equivalente de forma simples.

2. **FLUX-1-Schnell** — velocidade superior a SDXL Turbo com qualidade adequada para ads. Tempo de geração < 4s para 512×512.

3. **Integração via CLI mantém o CreativeLab isolado** — a lógica do agente não precisa conhecer o SDK de geração de mídia. `execFile()` do Node.js é suficiente e mantém o código limpo.

4. **Output local → Supabase Storage** é o fluxo mais simples: inference.sh salva arquivo, CreativeLab faz upload, retorna URL pública. Sem streaming de bytes entre serviços.

5. **Custo gerenciável**: créditos inference.sh são pagos antecipadamente e previsíveis — adequado para o modelo SWAS onde a agência controla os custos operacionais.

## Implementação

```typescript
// CreativeLab.ts — padrão de execução
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

async function generateImage(prompt: string, options: ImageOptions): Promise<string> {
  const outputPath = `/tmp/creative_${Date.now()}.png`;

  await execFileAsync('inference', [
    'run',
    '--model', 'flux-1-schnell',
    '--prompt', prompt,
    '--width', String(options.width),
    '--height', String(options.height),
    '--output', outputPath
  ], {
    timeout: 30_000, // 30s timeout
    env: { ...process.env, INFERENCE_API_KEY: process.env.INFERENCE_API_KEY }
  });

  // Upload to Supabase Storage
  const publicUrl = await uploadToStorage(outputPath, `creatives/${options.clientId}/`);
  return publicUrl;
}
```

## Consequências

### Positivas
- Acesso a Veo 3.1 (melhor geração de vídeo disponível)
- FLUX-1-Schnell rápido e barato para iterações de criativo
- CLI isola o agente de dependências de SDK de mídia
- Fácil de trocar o modelo passando parâmetro diferente ao CLI

### Negativas / Riscos
- **Sem SDK TypeScript** — integração menos ergonômica que SDKs nativos; mitigação: wrapper thin no CreativeLab abstrai os detalhes
- **Dependência de binário externo** — inference.sh deve estar instalado na VPS; mitigação: adicionado ao script de deploy `deploy_vps.ps1` e checado no health check
- **Timeout de geração**: vídeo pode levar até 60s — o agente deve notificar o usuário que "está gerando" antes de chamar a ferramenta
- **Sem retry nativo no CLI** — implementar retry com backoff no wrapper do CreativeLab
- **Custo de créditos não por cliente** — monitorar uso por `clientId` para rateio correto (logar custo estimado conforme RULES.md §13)

## Migração Futura

Se inference.sh se tornar insuficiente ou descontinuado:
- Substituir `CreativeLab.generateImage()` por Stability AI SDK (Opção B) para imagens
- Substituir `CreativeLab.generateVideo()` por Replicate (Opção C) com Wan-2.1 para vídeos
- A interface do `ICreativeLab` não muda — apenas a implementação interna

## Referências

- CreativeLab spec: `references/specs-modules/creative-lab.md`
- CONTRACTS.md §Agent Tools — `generate_image`, `generate_video`
- RULES.md §7 — Criativo e Media

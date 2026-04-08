# Spec Técnica: Web Cockpit (Dashboard)
> Módulo: `cockpit/`
> Requisitos: RF-016, RF-017, RF-018, RF-013 (aprovação web)
> Contratos: CONTRACTS.md §HTTP API
> Versão: 1.0 — 2026-03-26

---

## Responsabilidade

O Web Cockpit é o painel de controle web para gestores e admins da agência. Permite:
- Visualizar performance de campanhas de todos os clientes
- Aprovar/rejeitar criativos gerados pelo agente
- Gerenciar clientes e suas configurações
- Visualizar histórico de conversas do agente
- Configurar alertas e thresholds

---

## Stack

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Framework | Next.js 14 (App Router) | SSR, routes, API routes integradas |
| UI Components | shadcn/ui (exclusivo, conforme RULES §13) | Consistência visual, acessibilidade |
| Auth | Supabase Auth + next-auth | Sessão server-side |
| State | Zustand (client state) + React Query (server state) | Simplicidade |
| Charts | Recharts | Leve, compatível com shadcn |
| Deploy | Vercel (preferencialmente) | CI/CD automático, edge |

---

## Estrutura de Pastas

```
cockpit/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── logout/route.ts
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          → sidebar + header
│   │   │   ├── page.tsx            → overview geral
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx        → lista de clientes
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    → dashboard do cliente
│   │   │   │       └── settings/page.tsx
│   │   │   ├── creatives/
│   │   │   │   └── page.tsx        → aprovação de criativos
│   │   │   ├── conversations/
│   │   │   │   └── page.tsx        → histórico do agente
│   │   │   └── alerts/
│   │   │       └── page.tsx        → configuração de alertas
│   │   └── api/
│   │       └── v1/                 → API routes (proxy para Supabase)
│   ├── components/
│   │   ├── ui/                     → shadcn/ui (auto-gerado)
│   │   ├── charts/                 → PerformanceChart, CpaChart, etc.
│   │   ├── clients/                → ClientCard, ClientForm
│   │   ├── creatives/              → CreativePreview, ApprovalCard
│   │   └── layout/                 → Sidebar, Header, BreadCrumb
│   ├── lib/
│   │   ├── supabase.ts             → cliente Supabase (anon key)
│   │   └── auth.ts                 → helpers de auth
│   └── types/                      → tipos compartilhados (do shared/)
```

---

## Páginas Principais

### 1. Dashboard Overview (`/`)

Mostra um resumo de todos os clientes:
- Total de clientes ativos
- Total de spend (semana atual)
- Número de criativos pendentes de aprovação
- Alertas ativos (CPA acima do threshold, etc.)
- Gráfico de spend consolidado (últimos 30 dias)

### 2. Dashboard do Cliente (`/clients/[id]`)

Métricas do cliente específico:
- KPIs: CPA, CTR, ROAS, Spend (com comparativo semana anterior)
- Gráfico de performance por plataforma (Meta vs Google)
- Status de campanhas ativas
- Últimas ações do agente (últimas 5 interações)
- Botão "Ver histórico completo"

### 3. Aprovação de Criativos (`/creatives`)

Lista de criativos gerados pelo agente aguardando aprovação:

```typescript
// Componente CreativeApprovalCard
interface CreativeApprovalCardProps {
  approval: {
    id: string;
    clientName: string;
    action: string;
    description: string;
    asset?: {
      type: 'image' | 'video';
      url: string;
    };
    adCopy?: {
      headline: string;
      primaryText: string;
      cta: string;
    };
    expiresAt: Date;
  };
  onApprove: (id: string, comment?: string) => Promise<void>;
  onReject: (id: string, comment: string) => Promise<void>;
}
```

### 4. Histórico de Conversas (`/conversations`)

Visualizador de interações do agente por cliente:
- Filtros: cliente, data, tipo de ação
- Thread de mensagens: user → agent → tool calls → response
- Modo debug: mostra tool calls e observations (só para admin)

### 5. Gerenciamento de Clientes (`/clients`)

CRUD de clientes:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Nome | string | Nome da empresa |
| Setor | select | E-commerce, SaaS, Educação, etc. |
| Tom de voz | text | Como o agente deve escrever para este cliente |
| Plataformas aprovadas | multiselect | Meta, Google, Instagram |
| Budget máximo/dia | number | Limite de gasto diário |
| Creative refresh | number | Dias antes de renovar criativos |
| Telegram chat_ids | list | IDs autorizados a falar com o agente |
| LLM provider | select | Gemini, DeepSeek, etc. (opcional) |

---

## Auth e Roles

```typescript
// Roles no Supabase Auth
type UserRole = 'admin' | 'manager';

// admin: vê todos os clientes, pode criar/deletar clientes
// manager: vê apenas os clientes atribuídos a ele/ela
```

### Middleware de Auth (Next.js)

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  // Verificar sessão para todas as rotas /dashboard e /api/v1
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verificar role para rotas admin
  if (request.nextUrl.pathname.startsWith('/clients/new')) {
    const role = session.user.user_metadata.role;
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
}
```

---

## API Routes (Next.js)

O cockpit tem suas próprias API routes que servem como proxy para o Supabase, adicionando validação e controle de acesso:

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/v1/dashboard/performance` | manager | Métricas consolidadas |
| GET | `/api/v1/clients` | manager | Lista clientes do usuário |
| POST | `/api/v1/clients` | admin | Criar cliente |
| GET | `/api/v1/clients/[id]` | manager (own) | Detalhes do cliente |
| PATCH | `/api/v1/clients/[id]` | admin | Atualizar cliente |
| DELETE | `/api/v1/clients/[id]` | admin | Desativar cliente (soft delete) |
| GET | `/api/v1/approvals` | manager | Aprovações pendentes |
| POST | `/api/v1/approvals/[id]/approve` | manager | Aprovar ação |
| POST | `/api/v1/approvals/[id]/reject` | manager | Rejeitar ação |
| GET | `/api/v1/conversations` | manager | Histórico do agente |

---

## Componentes Visuais Principais

### PerformanceChart

```typescript
// Gráfico de linha para CPA/CTR/ROAS ao longo do tempo
// Usa Recharts + dados de performance_snapshots
<PerformanceChart
  clientId={clientId}
  metric="cpa"
  dateRange={dateRange}
  platform="all" // | "meta" | "google"
/>
```

### MetricCard

```typescript
// Card simples com valor atual + comparativo (↑ ou ↓)
<MetricCard
  label="CPA"
  value="R$ 42,50"
  change={-8.3}  // porcentagem, negativo = melhora para CPA
  trend="down"   // "down" é bom para CPA
/>
```

---

## Testes E2E (Playwright)

```typescript
test('manager can view client dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'manager@agencia.com');
  await page.fill('[name=password]', 'senha');
  await page.click('[type=submit]');

  await page.goto('/clients');
  await expect(page.locator('[data-testid=client-list]')).toBeVisible();

  await page.click('[data-testid=client-card]:first-child');
  await expect(page.locator('[data-testid=performance-chart]')).toBeVisible();
  await expect(page.locator('[data-testid=kpi-cpa]')).toBeVisible();
});

test('manager can approve creative', async ({ page }) => {
  await loginAsManager(page);
  await page.goto('/creatives');

  const firstApproval = page.locator('[data-testid=approval-card]:first-child');
  await firstApproval.locator('[data-testid=preview-image]').toBeVisible();
  await firstApproval.locator('[data-testid=approve-button]').click();

  await expect(page.locator('[data-testid=success-toast]')).toBeVisible();
  await expect(firstApproval).not.toBeVisible(); // removido da lista
});
```

---

## Notas de Implementação

- **shadcn/ui exclusivo**: NENHUMA outra lib de UI. Se precisar de componente não existente no shadcn, construir manualmente ou solicitar via ADR.
- **Dados em tempo real**: usar `supabase.channel()` para escutar novos criativos pendentes de aprovação (badge de notificação atualiza em tempo real).
- **Multi-tenant**: manager vê APENAS seus clientes. A query deve sempre usar o `user_id` da sessão para filtrar os clientes permitidos.

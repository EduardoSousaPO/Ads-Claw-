// agent/src/core/Orchestrator.ts
// Motor de automação proativa — detecta fadiga criativa e gera alertas
// Referência: references/specs-modules/mcp-bridges.md, TASKS.md Bloco 5
// Usa: view clients_needing_refresh (Supabase), tabela alerts, TelegramNotifier

import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { telegramNotifier } from '../io/TelegramNotifier';
import { mcpBridge } from '../services/McpBridge';

interface ClientNeedingRefresh {
  id: string;
  name: string;
  status: string;
  target_cpa: number | null;
  creative_refresh_days: number | null;
  last_creative_refresh: string | null;
  days_since_refresh: number;
}

export class Orchestrator {
  /**
   * Inicia o monitoramento proativo.
   * Roda a cada 6 horas em produção, a cada 5 minutos em dev.
   */
  start() {
    console.log('🚀 [Orchestrator] Motor de automação proativa iniciado.');

    const isDev = process.env['NODE_ENV'] !== 'production';
    const schedule = isDev ? '*/5 * * * *' : '0 */6 * * *';

    cron.schedule(schedule, async () => {
      console.log('⏳ [Orchestrator] Executando verificação de rotina nas contas...');
      await this.checkCreativeFatigue();
      await this.expireOldApprovals();
      await this.savePerformanceSnapshots();
    });
  }

  /**
   * Usa a view clients_needing_refresh para detectar clientes
   * cujos criativos estão atrasados para refresh.
   */
  private async checkCreativeFatigue() {
    try {
      const { data: clients, error } = await supabase
        .from('clients_needing_refresh')
        .select('*');

      if (error) {
        console.error('❌ [Orchestrator] Erro ao consultar clients_needing_refresh:', error.message);
        return;
      }

      if (!clients || clients.length === 0) return;

      for (const client of clients as ClientNeedingRefresh[]) {
        // Verificar se já existe alerta pending/sent para este cliente (evitar spam)
        const { data: existing } = await supabase
          .from('alerts')
          .select('id')
          .eq('client_id', client.id)
          .eq('alert_type', 'creative_fatigue')
          .in('status', ['pending', 'sent'])
          .limit(1);

        if (existing && existing.length > 0) continue;

        await this.createFatigueAlert(client);
      }
    } catch (err) {
      console.error('❌ [Orchestrator] Erro no ciclo de fadiga criativa:', err);
    }
  }

  /**
   * Cria alerta de fadiga criativa no Supabase e notifica via Telegram.
   */
  private async createFatigueAlert(client: ClientNeedingRefresh) {
    const title = `Fadiga Criativa: ${client.name}`;
    const message =
      `🎨 *ALERTA: Refresh de Criativos Necessário*\n\n` +
      `**Cliente:** ${client.name}\n` +
      `**Dias desde último refresh:** ${client.days_since_refresh}\n` +
      `**Limite configurado:** ${client.creative_refresh_days ?? 7} dias\n` +
      `**CPA alvo:** R$ ${client.target_cpa?.toFixed(2) ?? 'N/A'}\n\n` +
      `_Os criativos deste cliente precisam ser atualizados. ` +
      `Use o comando "gerar novos criativos para ${client.name}" para iniciar._`;

    // 1. Inserir alerta no banco
    const { error: alertError } = await supabase
      .from('alerts')
      .insert({
        client_id: client.id,
        alert_type: 'creative_fatigue',
        severity: 'warning',
        title,
        message,
        status: 'pending',
        metadata: {
          days_since_refresh: client.days_since_refresh,
          creative_refresh_days: client.creative_refresh_days,
          target_cpa: client.target_cpa,
        },
      });

    if (alertError) {
      console.error(`❌ [Orchestrator] Erro ao criar alerta para ${client.name}:`, alertError.message);
      return;
    }

    console.warn(`⚠️ [Orchestrator] Fadiga detectada: ${client.name} (${client.days_since_refresh} dias)`);

    // 2. Notificar via Telegram
    const sent = await telegramNotifier.notifyClient(client.id, message);
    if (sent > 0) {
      // Marcar alerta como enviado
      await supabase
        .from('alerts')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('client_id', client.id)
        .eq('alert_type', 'creative_fatigue')
        .eq('status', 'pending');
    }
  }

  /**
   * Salva snapshots de performance diários para cada cliente ativo.
   * Tenta buscar dados do MCP (Meta/Google Ads) se disponível.
   * Se MCP não conectado, salva snapshot vazio (zeros) para manter histórico.
   * Roda no máximo 1x por dia por cliente (UNIQUE constraint no DB).
   */
  private async savePerformanceSnapshots() {
    try {
      const { data: activeClients } = await supabase
        .from('clients')
        .select('id, name, meta_ads_account_id, google_ads_account_id')
        .eq('status', 'active');

      if (!activeClients || activeClients.length === 0) return;

      const today = new Date().toISOString().split('T')[0]!;

      for (const client of activeClients) {
        // Meta Ads snapshot
        if (client.meta_ads_account_id && mcpBridge.isServerReady('meta-ads')) {
          await this.saveMetaSnapshot(client.id, client.meta_ads_account_id, today);
        }

        // Google Ads snapshot
        if (client.google_ads_account_id && mcpBridge.isServerReady('google-ads')) {
          await this.saveGoogleSnapshot(client.id, client.google_ads_account_id, today);
        }
      }
    } catch (err) {
      console.error('❌ [Orchestrator] Erro ao salvar performance snapshots:', err);
    }
  }

  private async saveMetaSnapshot(clientId: string, accountId: string, date: string) {
    try {
      const data = await mcpBridge.callTool('get_account_insights', {
        ad_account_id: accountId,
        date_preset: 'today',
      }) as Record<string, unknown>;

      const metrics = Array.isArray(data?.['data']) ? (data['data'] as Record<string, string>[])[0] : null;

      await supabase.from('performance_snapshots').upsert({
        client_id: clientId,
        platform: 'meta',
        snapshot_date: date,
        impressions: parseInt(metrics?.['impressions'] ?? '0', 10),
        clicks: parseInt(metrics?.['clicks'] ?? '0', 10),
        spend: parseFloat(metrics?.['spend'] ?? '0'),
        conversions: parseInt(metrics?.['conversions'] ?? '0', 10),
        ctr: parseFloat(metrics?.['ctr'] ?? '0'),
        cpc: parseFloat(metrics?.['cpc'] ?? '0'),
        cpa: parseFloat(metrics?.['cost_per_conversion'] ?? '0'),
        roas: parseFloat(
          Array.isArray(metrics?.['purchase_roas'])
            ? String((metrics['purchase_roas'] as Array<{ value: string }>)[0]?.value ?? '0')
            : '0'
        ),
        raw_data: metrics,
      }, { onConflict: 'client_id,platform,snapshot_date' });
    } catch {
      // MCP chamada falhou — ok, tenta no próximo ciclo
    }
  }

  private async saveGoogleSnapshot(clientId: string, customerId: string, date: string) {
    try {
      const data = await mcpBridge.callTool('get_google_ads_metrics', {
        customer_id: customerId,
        date_range: 'TODAY',
      }) as Record<string, unknown>[];

      const row = Array.isArray(data) ? data[0] : null;
      const metrics = (row?.['metrics'] ?? row) as Record<string, string> | null;

      const costMicros = parseInt(metrics?.['cost_micros'] ?? '0', 10);

      await supabase.from('performance_snapshots').upsert({
        client_id: clientId,
        platform: 'google',
        snapshot_date: date,
        impressions: parseInt(metrics?.['impressions'] ?? '0', 10),
        clicks: parseInt(metrics?.['clicks'] ?? '0', 10),
        spend: costMicros / 1_000_000,
        conversions: parseInt(metrics?.['conversions'] ?? '0', 10),
        cpa: parseFloat(metrics?.['cost_per_conversion'] ?? '0'),
        raw_data: metrics,
      }, { onConflict: 'client_id,platform,snapshot_date' });
    } catch {
      // MCP chamada falhou — ok
    }
  }

  /**
   * Expira aprovações pendentes que passaram do prazo (24h padrão).
   */
  private async expireOldApprovals() {
    try {
      const { data, error } = await supabase
        .from('pending_approvals')
        .update({ status: 'expired', resolved_at: new Date().toISOString() })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('❌ [Orchestrator] Erro ao expirar aprovações:', error.message);
        return;
      }

      if (data && data.length > 0) {
        console.log(`🕐 [Orchestrator] ${data.length} aprovação(ões) expirada(s).`);
      }
    } catch (err) {
      console.error('❌ [Orchestrator] Erro no ciclo de expiração:', err);
    }
  }
}

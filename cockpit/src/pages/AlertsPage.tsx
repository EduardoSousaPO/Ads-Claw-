import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Bell, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Alert {
  id: string;
  client_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  sent_at: string | null;
  resolved_at: string | null;
  clients: { name: string } | null;
}

const AlertsPage = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    const { data, error } = await supabase
      .from('alerts')
      .select('*, clients(name)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) setAlerts(data as Alert[]);
    setLoading(false);
  }

  async function markResolved(alertId: string) {
    await supabase
      .from('alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', alertId);
    loadAlerts();
  }

  async function markAcknowledged(alertId: string) {
    await supabase
      .from('alerts')
      .update({ status: 'acknowledged' })
      .eq('id', alertId);
    loadAlerts();
  }

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.status === filter);

  function severityBadge(severity: string) {
    if (severity === 'critical') return 'bg-red-400/10 text-red-400 border-red-400/20';
    if (severity === 'warning') return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
    return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
  }

  function statusBadge(status: string) {
    if (status === 'resolved') return 'bg-emerald-400/20 text-emerald-400';
    if (status === 'sent') return 'bg-blue-400/20 text-blue-400';
    if (status === 'acknowledged') return 'bg-slate-400/20 text-slate-400';
    return 'bg-amber-400/20 text-amber-400';
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Alertas</h2>
          <p className="text-slate-500 mt-1">Alertas gerados pelo Orchestrator de monitoramento proativo.</p>
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'sent', 'acknowledged', 'resolved'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass p-6 rounded-2xl border border-slate-800 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-1/3 mb-3"></div>
              <div className="h-3 bg-slate-800 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass p-16 rounded-3xl border border-slate-800 text-center">
          <CheckCircle size={48} className="text-emerald-400/30 mx-auto mb-4" />
          <p className="text-slate-400 font-medium text-lg">Nenhum alerta {filter !== 'all' ? `com status "${filter}"` : ''}</p>
          <p className="text-slate-600 text-sm mt-1">O Orchestrator monitora suas contas a cada 5 minutos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((alert) => (
            <div key={alert.id} className="glass p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl ${severityBadge(alert.severity)}`}>
                  {alert.severity === 'critical' ? <AlertTriangle size={20} /> : <Bell size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-bold text-white">{alert.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${severityBadge(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge(alert.status)}`}>
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{alert.clients?.name ?? 'Cliente desconhecido'}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{alert.title}</p>

                  {alert.metadata && (
                    <div className="flex gap-4 mt-3">
                      {Object.entries(alert.metadata).map(([key, value]) => (
                        <span key={key} className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-4">
                    <span className="text-[10px] text-slate-600">
                      {new Date(alert.created_at).toLocaleString('pt-BR')}
                    </span>
                    {alert.status !== 'resolved' && (
                      <div className="flex gap-2">
                        {alert.status !== 'acknowledged' && (
                          <button
                            onClick={() => markAcknowledged(alert.id)}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all"
                          >
                            <Eye size={12} />
                            Reconhecer
                          </button>
                        )}
                        <button
                          onClick={() => markResolved(alert.id)}
                          className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/20 px-3 py-1.5 rounded-lg transition-all"
                        >
                          <CheckCircle size={12} />
                          Resolver
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Approval {
  id: string;
  client_id: string;
  action: string;
  description: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  expires_at: string;
  resolved_at: string | null;
  resolved_by: number | null;
  created_at: string;
  clients: { name: string } | null;
}

const ApprovalsPage = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadApprovals();
  }, []);

  async function loadApprovals() {
    const { data, error } = await supabase
      .from('pending_approvals')
      .select('*, clients(name)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) setApprovals(data as Approval[]);
    setLoading(false);
  }

  async function handleApprove(id: string) {
    await supabase
      .from('pending_approvals')
      .update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('id', id);
    loadApprovals();
  }

  async function handleReject(id: string) {
    await supabase
      .from('pending_approvals')
      .update({ status: 'rejected', resolved_at: new Date().toISOString() })
      .eq('id', id);
    loadApprovals();
  }

  const filtered = filter === 'all' ? approvals : approvals.filter(a => a.status === filter);
  const pendingCount = approvals.filter(a => a.status === 'pending').length;

  function statusConfig(status: string) {
    switch (status) {
      case 'approved': return { color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle, label: 'Aprovado' };
      case 'rejected': return { color: 'text-red-400', bg: 'bg-red-400/10', icon: XCircle, label: 'Rejeitado' };
      case 'expired': return { color: 'text-slate-400', bg: 'bg-slate-400/10', icon: Clock, label: 'Expirado' };
      default: return { color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock, label: 'Pendente' };
    }
  }

  function timeRemaining(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expirado';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}min restantes`;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Aprovações</h2>
          <p className="text-slate-500 mt-1">
            {pendingCount > 0
              ? `${pendingCount} ação(ões) aguardando sua decisão.`
              : 'Nenhuma aprovação pendente no momento.'}
          </p>
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected', 'expired'].map(f => (
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
              {f === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full text-[10px]">
                  {pendingCount}
                </span>
              )}
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
          <Shield size={48} className="text-emerald-400/30 mx-auto mb-4" />
          <p className="text-slate-400 font-medium text-lg">
            {filter === 'pending' ? 'Nenhuma aprovação pendente' : 'Nenhum registro encontrado'}
          </p>
          <p className="text-slate-600 text-sm mt-1">
            O agente solicita aprovação antes de ações irreversíveis (RULES §3).
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((approval) => {
            const cfg = statusConfig(approval.status);
            const StatusIcon = cfg.icon;

            return (
              <div key={approval.id} className={`glass p-6 rounded-2xl border transition-all ${
                approval.status === 'pending' ? 'border-amber-400/30 hover:border-amber-400/50' : 'border-slate-800 hover:border-slate-700'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl ${cfg.bg} ${cfg.color}`}>
                    <StatusIcon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-bold text-white">{approval.description}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">{approval.clients?.name ?? 'Cliente'} · Ação: <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">{approval.action}</code></p>

                    {approval.payload && Object.keys(approval.payload).length > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Payload</p>
                        <pre className="text-[11px] text-slate-400 font-mono overflow-x-auto">
                          {JSON.stringify(approval.payload, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-4 text-[10px] text-slate-600">
                        <span>{new Date(approval.created_at).toLocaleString('pt-BR')}</span>
                        {approval.status === 'pending' && (
                          <span className="text-amber-400 font-medium">{timeRemaining(approval.expires_at)}</span>
                        )}
                        {approval.resolved_at && (
                          <span>Resolvido: {new Date(approval.resolved_at).toLocaleString('pt-BR')}</span>
                        )}
                      </div>

                      {approval.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(approval.id)}
                            className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-4 py-2 rounded-xl transition-all"
                          >
                            <XCircle size={14} />
                            Rejeitar
                          </button>
                          <button
                            onClick={() => handleApprove(approval.id)}
                            className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/20 px-4 py-2 rounded-xl transition-all"
                          >
                            <CheckCircle size={14} />
                            Aprovar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalsPage;

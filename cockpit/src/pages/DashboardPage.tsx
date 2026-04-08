import { useState, useEffect } from 'react';
import { TrendingUp, Users, AlertTriangle, CheckCircle, Bell, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Alert {
  id: string;
  client_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  created_at: string;
}

interface PendingApproval {
  id: string;
  action: string;
  description: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface ClientWithRules {
  id: string;
  name: string;
  status: string;
  client_rules:
    | { target_cpa: number | null; daily_budget: number | null; sector: string | null }
    | { target_cpa: number | null; daily_budget: number | null; sector: string | null }[]
    | null;
}

const DashboardPage = () => {
  const [activeClients, setActiveClients] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [clients, setClients] = useState<ClientWithRules[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    // Carregar em paralelo
    const [clientsRes, alertsRes, approvalsRes] = await Promise.all([
      supabase
        .from('clients')
        .select('id, name, status, client_rules(target_cpa, daily_budget, sector)')
        .order('name'),
      supabase
        .from('alerts')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('pending_approvals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (clientsRes.data) {
      const all = clientsRes.data as ClientWithRules[];
      setClients(all);
      setTotalClients(all.length);
      const active = all.filter(c => c.status === 'active');
      setActiveClients(active.length);
      const budget = active.reduce((sum, c) => {
        const rules = Array.isArray(c.client_rules) ? c.client_rules?.[0] : c.client_rules;
        return sum + (rules?.daily_budget ?? 0);
      }, 0);
      setTotalBudget(budget);
    }

    if (alertsRes.data) setAlerts(alertsRes.data as Alert[]);
    if (approvalsRes.data) setApprovals(approvalsRes.data as PendingApproval[]);
  }

  const pendingAlerts = alerts.filter(a => a.status === 'pending' || a.status === 'sent').length;

  const stats = [
    { label: 'Clientes Ativos', value: String(activeClients), sub: `${totalClients} total`, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Orçamento Diário', value: `R$ ${totalBudget.toLocaleString('pt-BR')}`, sub: 'Soma dos clientes', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Alertas Ativos', value: String(pendingAlerts), sub: `${alerts.length} total`, icon: AlertTriangle, color: pendingAlerts > 0 ? 'text-amber-400' : 'text-slate-400', bg: pendingAlerts > 0 ? 'bg-amber-400/10' : 'bg-slate-400/10' },
    { label: 'Aprovações Pendentes', value: String(approvals.length), sub: 'Aguardando gestor', icon: Clock, color: approvals.length > 0 ? 'text-purple-400' : 'text-slate-400', bg: approvals.length > 0 ? 'bg-purple-400/10' : 'bg-slate-400/10' },
  ];

  function severityColor(severity: string) {
    if (severity === 'critical') return 'text-red-400 bg-red-400/10 border-red-400/20';
    if (severity === 'warning') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)}d atrás`;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Dashboard</h2>
          <p className="text-slate-500 mt-1">Visão consolidada de todas as contas gerenciadas pela IA.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass p-6 rounded-2xl border border-slate-800 hover-glow transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
                  <Icon size={24} />
                </div>
                <span className="text-[11px] font-medium text-slate-500">{stat.sub}</span>
              </div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Alertas Recentes */}
        <div className="lg:col-span-2 glass p-8 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell size={20} className="text-amber-400" />
              Alertas Recentes
            </h3>
            <Link to="/alerts" className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Ver todos →
            </Link>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle size={40} className="text-emerald-400/40 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhum alerta no momento.</p>
              <p className="text-slate-600 text-sm mt-1">O Orchestrator monitora as contas automaticamente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className={`p-4 rounded-xl border ${severityColor(alert.severity)} flex items-start gap-3`}>
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold truncate">{alert.title}</h4>
                      <span className="text-[10px] text-slate-500 shrink-0">{timeAgo(alert.created_at)}</span>
                    </div>
                    <p className="text-xs mt-1 opacity-70 line-clamp-2">{alert.title}</p>
                    <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      alert.status === 'sent' ? 'bg-emerald-400/20 text-emerald-400' :
                      alert.status === 'pending' ? 'bg-amber-400/20 text-amber-400' :
                      'bg-slate-400/20 text-slate-400'
                    }`}>
                      {alert.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clientes & Aprovações */}
        <div className="glass p-8 rounded-3xl border border-slate-800 flex flex-col">
          <h3 className="text-xl font-bold text-white mb-6">Clientes</h3>
          <div className="space-y-3 flex-1">
            {clients.filter(c => c.status === 'active').map((client) => {
              const rules = Array.isArray(client.client_rules) ? client.client_rules?.[0] : client.client_rules;
              return (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600/30 to-purple-600/30 rounded-lg flex items-center justify-center text-xs font-bold text-white border border-slate-700">
                      {client.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white">{client.name}</span>
                      <p className="text-[10px] text-slate-500">{rules?.sector ?? 'Geral'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-400">R$ {rules?.daily_budget ?? 0}/dia</p>
                    <p className="text-[10px] text-slate-500">CPA: R$ {rules?.target_cpa ?? '-'}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {approvals.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                  <Clock size={14} />
                  Aprovações Pendentes
                </h4>
                <Link to="/approvals" className="text-[10px] text-blue-400 hover:text-blue-300 font-medium">
                  Ver →
                </Link>
              </div>
              {approvals.slice(0, 3).map((a) => (
                <div key={a.id} className="p-2 rounded-lg bg-purple-400/5 border border-purple-400/10 mb-2">
                  <p className="text-xs font-medium text-white truncate">{a.description}</p>
                  <p className="text-[10px] text-slate-500">{a.action} · {timeAgo(a.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

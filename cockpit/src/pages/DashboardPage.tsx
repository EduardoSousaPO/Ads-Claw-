import { useState, useEffect } from 'react';
import { TrendingUp, Users, Target, MousePointer2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DashboardPage = () => {
  const [clientCount, setClientCount] = useState(0);

  useEffect(() => {
    supabase.from('clients').select('id', { count: 'exact' }).then(({ count }) => {
      setClientCount(count || 0);
    });
  }, []);

  const stats = [
    { label: 'ROAS Médio', value: '4.2x', trend: '+12%', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Clientes Ativos', value: clientCount === 0 ? '0' : String(clientCount), trend: 'Base Supabase', icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Investimento Total', value: 'R$ 45.200', trend: '+5%', icon: Target, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'CPC Global', value: 'R$ 0,42', trend: '-8%', icon: MousePointer2, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Dashboard Geral</h2>
          <p className="text-slate-500 mt-1">Visão consolidada de todas as contas gerenciadas pela IA.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 active:scale-95">
          Gerar Relatório IA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass p-6 rounded-2xl border border-slate-800 hover-glow transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
                  <Icon size={24} />
                </div>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'}`}>
                  {stat.trend}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass p-8 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white">Performance Criativa</h3>
            <select className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm outline-none text-slate-400 focus:border-blue-500/50 transition-colors">
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
            </select>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {[40, 65, 45, 90, 55, 75, 50, 85, 95, 60, 45, 80].map((h, i) => (
              <div key={i} className="flex-1 group relative cursor-pointer">
                <div 
                  className="bg-blue-600/40 group-hover:bg-blue-500/80 rounded-t-lg transition-all duration-500 w-full" 
                  style={{ height: `${h}%` }}
                ></div>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                   {h}%
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-12 gap-2 mt-4">
             {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map(m => (
               <span key={m} className="col-span-1 text-center text-[10px] font-bold text-slate-600">{m}</span>
             ))}
          </div>
        </div>

        <div className="glass p-8 rounded-3xl border border-slate-800 flex flex-col">
          <h3 className="text-xl font-bold text-white mb-6">Estado do Agente</h3>
          <div className="flex-1 space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-600/5 border border-blue-500/20">
              <AlertCircle size={20} className="text-blue-400 mt-1 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-blue-100">Otimização Ativa</h4>
                <p className="text-xs text-blue-300/70 mt-1leading-relaxed">O Agent Loop está analisando as campanhas do cliente Meta Ads.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Iterações Ativas</span>
                <span className="text-xs font-bold text-blue-400">4 / 5</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 w-[80%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logs de Ação</h4>
              {[
                'Pensando: Analisando CPA alvo...',
                'Ação: Buscando métricas Meta MCP',
                'Observação: CPA atual R$ 4,50 (limite R$ 5,00)',
              ].map((log, i) => (
                <div key={i} className="flex gap-3 text-[11px] font-mono">
                  <span className="text-blue-500/50">[{i+1}]</span>
                  <span className="text-slate-400">{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

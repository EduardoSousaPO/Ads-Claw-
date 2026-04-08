import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, MoreHorizontal, ExternalLink, Shield } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  niche: string;
  created_at: string;
}

const ClientsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientNiche, setNewClientNiche] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newClientName) return;

    try {
      // 1. Inserir cliente
      const { data, error: clientError } = await supabase
        .from('clients')
        .insert([{ name: newClientName, niche: newClientNiche }])
        .select()
        .single();

      if (clientError) throw clientError;
      
      // 2. Criar regras padrão para o Orquestrador/Agent
      if (data) {
        const { error: rulesError } = await supabase
          .from('client_rules')
          .insert([{
            client_id: data.id,
            target_cpa: 5.0,
            target_roas: 3.0,
            daily_budget: 100,
            creative_refresh_days: 7,
            sector: newClientNiche || 'geral',
            brand_voice: 'Profissional e direto.',
          }]);

        if (rulesError) console.error('Erro ao criar regras iniciais:', rulesError);
      }

      setNewClientName('');
      setNewClientNiche('');
      setIsModalOpen(false);
      fetchClients();
    } catch (err) {
      console.error('Erro ao adicionar cliente:', err);
      alert('Erro ao adicionar cliente. Verifique o console.');
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Gestão de Clientes</h2>
          <p className="text-slate-500 mt-1">Configure permissões, orçamentos e regras por conta.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-white hover:bg-slate-100 text-slate-950 px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 active:scale-95 shadow-xl shadow-white/5"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-white mb-6">Cadastrar Novo Cliente</h3>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nome da Empresa</label>
                <input 
                  autoFocus
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: AdsClaw SaaS"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nicho / Segmento</label>
                <input 
                  value={newClientNiche}
                  onChange={(e) => setNewClientNiche(e.target.value)}
                  placeholder="Ex: Infoprodutos, E-commerce"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="glass rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/40">
              <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Nome do Cliente</th>
              <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Nicho / Vertical</th>
              <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status RLS</th>
              <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Criado em</th>
              <th className="px-8 py-5 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-8 py-6">
                    <div className="h-4 bg-slate-800 rounded-lg w-1/3"></div>
                  </td>
                </tr>
              ))
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center">
                  <p className="text-slate-500 font-medium">Nenhum cliente encontrado. Adicione o primeiro para começar.</p>
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center font-bold text-white border border-slate-700 group-hover:border-blue-500/30 group-hover:from-blue-600/20 transition-all">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm text-slate-400 font-medium">{client.niche || 'Geral'}</td>
                  <td className="px-8 py-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-400 text-[10px] font-bold border border-emerald-400/20">
                      <Shield size={12} />
                      Active
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm text-slate-500">
                    {new Date(client.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-500 hover:text-white transition-colors"><ExternalLink size={18} /></button>
                      <button className="p-2 text-slate-500 hover:text-white transition-colors"><MoreHorizontal size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientsPage;

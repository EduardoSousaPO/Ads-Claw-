import { useState, useEffect } from 'react';
import { MessageSquare, Bot, User, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ChatMessage {
  id: string;
  client_id: string;
  sender: 'user' | 'agent';
  message: string;
  created_at: string;
}

interface ClientSummary {
  id: string;
  name: string;
  lastMessage: string;
  lastDate: string;
  messageCount: number;
}

const ConversationsPage = () => {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientSummaries();
  }, []);

  useEffect(() => {
    if (selectedClientId) loadMessages(selectedClientId);
  }, [selectedClientId]);

  async function loadClientSummaries() {
    // Buscar clientes que têm mensagens
    const { data: allClients } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');

    if (!allClients) { setLoading(false); return; }

    const summaries: ClientSummary[] = [];
    for (const client of allClients) {
      const { data: msgs, count } = await supabase
        .from('chat_history')
        .select('message, created_at', { count: 'exact' })
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (count && count > 0 && msgs && msgs.length > 0) {
        summaries.push({
          id: client.id,
          name: client.name,
          lastMessage: msgs[0]!.message.substring(0, 80) + (msgs[0]!.message.length > 80 ? '...' : ''),
          lastDate: msgs[0]!.created_at,
          messageCount: count,
        });
      }
    }

    setClients(summaries);
    if (summaries.length > 0 && !selectedClientId) {
      setSelectedClientId(summaries[0]!.id);
    }
    setLoading(false);
  }

  async function loadMessages(clientId: string) {
    const { data } = await supabase
      .from('chat_history')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
      .limit(100);

    setMessages((data as ChatMessage[]) ?? []);
  }

  const selectedClient = clients.find(c => c.id === selectedClientId);

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Conversas</h2>
        <p className="text-slate-500 mt-1">Histórico de conversas do agente com os clientes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)]">
        {/* Lista de clientes */}
        <div className="lg:col-span-4 glass rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Clientes com conversas</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-pulse text-slate-600">Carregando...</div>
              </div>
            ) : clients.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare size={32} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Nenhuma conversa ainda.</p>
                <p className="text-slate-600 text-xs mt-1">Use o chat ou Telegram para iniciar.</p>
              </div>
            ) : (
              clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`w-full text-left p-4 border-b border-slate-800/50 transition-all flex items-center gap-3 group ${
                    selectedClientId === client.id
                      ? 'bg-blue-600/10 border-l-2 border-l-blue-500'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600/30 to-purple-600/30 rounded-xl flex items-center justify-center text-xs font-bold text-white border border-slate-700 shrink-0">
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white truncate">{client.name}</span>
                      <span className="text-[10px] text-slate-500 shrink-0">{formatDate(client.lastDate)}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{client.lastMessage}</p>
                    <span className="text-[10px] text-slate-600">{client.messageCount} mensagens</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat messages */}
        <div className="lg:col-span-8 glass rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
          {selectedClient ? (
            <>
              <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600/30 to-purple-600/30 rounded-lg flex items-center justify-center text-xs font-bold text-white border border-slate-700">
                  {selectedClient.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedClient.name}</h3>
                  <p className="text-[10px] text-slate-500">{selectedClient.messageCount} mensagens</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.sender === 'agent' ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      msg.sender === 'agent'
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {msg.sender === 'agent' ? <Bot size={14} /> : <User size={14} />}
                    </div>
                    <div className={`max-w-[75%] ${
                      msg.sender === 'agent'
                        ? 'bg-slate-800/60 border border-slate-700/50'
                        : 'bg-blue-600/10 border border-blue-500/20'
                    } rounded-xl px-4 py-2.5`}>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                      <span className="text-[10px] text-slate-600 mt-1 block">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare size={48} className="text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">Selecione um cliente para ver as conversas.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationsPage;

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Zap } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:3001';

const AgentChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'agent',
      content: 'Olá! Sou o **AdsClaw AI**. Posso te ajudar a configurar campanhas, analisar métricas, ou gerar criativos. O que você precisa hoje?',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Checa se o agente está online ao abrir o chat
  useEffect(() => {
    if (isOpen && isOnline === null) {
      fetch(`${AGENT_API_URL}/api/health`)
        .then(r => r.json())
        .then(() => setIsOnline(true))
        .catch(() => setIsOnline(false));
    }
  }, [isOpen]);

  async function sendMessage() {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${AGENT_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, sessionId: 'web-cockpit' }),
      });
      const data = await res.json();

      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: data.reply || 'Entendido! Estou processando sua solicitação.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: '⚠️ Não consegui me conectar ao Agente. Certifique-se de que o Backend está rodando na VPS e a variável `VITE_AGENT_API_URL` está correta.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-2xl shadow-blue-600/40 flex items-center justify-center transition-all active:scale-95 hover:scale-105"
        title="Falar com o AdsClaw AI"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
        )}
      </button>

      {/* Janela de Chat */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[600px] flex flex-col glass border border-slate-800 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
            <div className="relative">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${isOnline ? 'bg-emerald-400' : isOnline === false ? 'bg-red-500' : 'bg-amber-400 animate-pulse'}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">AdsClaw AI</p>
              <p className="text-[11px] text-slate-500">{isOnline ? 'Online · Pronto para operar' : isOnline === false ? 'Offline · Backend desconectado' : 'Verificando conexão...'}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'agent' && (
                  <div className="w-7 h-7 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={14} className="text-blue-400" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/50'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 bg-slate-700 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <User size={14} className="text-slate-300" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-blue-400" />
                </div>
                <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1.5">
                  <Loader2 size={14} className="text-blue-400 animate-spin" />
                  <span className="text-xs text-slate-400">AdsClaw está pensando...</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto shrink-0 no-scrollbar">
            {['Crie uma campanha', 'Verifique o ROAS', 'Gere um criativo'].map((prompt) => (
              <button
                key={prompt}
                onClick={() => { setInput(prompt); }}
                className="shrink-0 text-[11px] font-bold text-blue-400 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-2 shrink-0 border-t border-slate-800">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 focus-within:border-blue-500/50 transition-colors">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Fale com o Agente..."
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="w-8 h-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all active:scale-90"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AgentChat;

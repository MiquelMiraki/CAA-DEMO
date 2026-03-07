import { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { Send, RotateCcw, Sparkles, Database, Clock, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  queries?: number;
  elapsed?: number;
  timestamp: Date;
}

const SUGGESTIONS = [
  '¿Cómo ha ido marzo vs febrero en todos los canales?',
  '¿Qué campañas debería pausar y cuáles escalar?',
  '¿Cuál es el canal más eficiente por ROAS?',
  'Analiza el rendimiento por dispositivo',
  '¿Qué keywords están convirtiendo mejor?',
  'Si aumento el budget un 20%, ¿qué espero?',
  '¿Qué creativos de Meta funcionan mejor?',
  '¿Cómo va el funnel de conversión por canal?',
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const result = await api.chat(msg);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(), role: 'assistant', content: result.response,
        queries: result.queriesExecuted, elapsed: result.elapsed, timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant', content: `Error: ${(err as Error).message}`, timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const resetChat = async () => {
    await api.resetChat();
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">AI Analyst</h2>
            <p className="text-white/40 text-xs">Consulta tus datos en lenguaje natural</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={resetChat} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/40 hover:text-white/70 text-xs transition-all">
            <RotateCcw className="w-3.5 h-3.5" /> Nueva conversación
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-white/80 text-lg font-medium mb-2">¿Qué quieres analizar?</h3>
            <p className="text-white/30 text-sm max-w-md mb-8">
              Pregúntame sobre rendimiento de campañas, tendencias, comparativas, forecasts o cualquier dato de tu plataforma de marketing.
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)}
                  className="text-left px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 text-white/50 hover:text-white/70 text-xs transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 text-indigo-500/50 group-hover:text-indigo-400 transition-colors" />
                    {s}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-white/30 text-[11px]">AI Analyst</span>
                  {msg.queries != null && (
                    <span className="flex items-center gap-1 text-indigo-400/50 text-[10px]">
                      <Database className="w-3 h-3" />{msg.queries} queries
                    </span>
                  )}
                  {msg.elapsed != null && (
                    <span className="flex items-center gap-1 text-white/20 text-[10px]">
                      <Clock className="w-3 h-3" />{msg.elapsed}s
                    </span>
                  )}
                </div>
              )}
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-[#111827] border border-white/5 text-white/80 rounded-tl-md'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white/90 prose-strong:text-white prose-li:text-white/70 prose-p:text-white/70">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <span className="text-white/30 text-[11px]">Analizando datos...</span>
              </div>
              <div className="bg-[#111827] border border-white/5 rounded-2xl rounded-tl-md px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-white/30 text-xs">Consultando Snowflake y analizando resultados...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 relative">
        <div className="bg-[#111827] border border-white/10 rounded-2xl overflow-hidden focus-within:border-indigo-500/50 transition-all shadow-lg">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta sobre tus datos de marketing..."
            className="w-full bg-transparent text-white text-sm px-5 pt-4 pb-2 resize-none outline-none placeholder:text-white/20"
            rows={2}
            disabled={loading}
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <span className="text-white/15 text-[10px]">Enter para enviar · Shift+Enter para nueva línea</span>
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-white/20 text-white flex items-center justify-center transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

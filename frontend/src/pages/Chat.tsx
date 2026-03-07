import { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { Send, RotateCcw, Database, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import ChartTooltip from '../components/ChartTooltip';

interface SqlQuery {
  sql: string;
  purpose: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  queries?: number;
  elapsed?: number;
  sqlQueries?: SqlQuery[];
  timestamp: Date;
}

interface ChartSpec {
  type: 'line' | 'bar' | 'area' | 'pie';
  title?: string;
  xKey?: string;
  series?: { key: string; name: string; color: string }[];
  data: any[];
}

const SUGGESTIONS = [
  'Compare Google vs Meta ROAS',
  'Which campaigns should I pause?',
  'Top performing keywords',
  "What's driving conversion changes?",
  'Spend breakdown by device',
  'Forecast next month at +20% budget',
];

/** Split message content into text and chart segments */
function parseContent(content: string): { type: 'text' | 'chart'; value: string }[] {
  const segments: { type: 'text' | 'chart'; value: string }[] = [];
  const chartRegex = /```chart\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = chartRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'chart', value: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return segments;
}

function InlineChart({ json }: { json: string }) {
  let spec: ChartSpec;
  try {
    spec = JSON.parse(json);
  } catch {
    return <pre className="text-red-400 text-xs">Invalid chart JSON</pre>;
  }

  const { type, title, xKey, series, data } = spec;

  return (
    <div className="my-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4">
      {title && <p className="text-white text-sm font-medium mb-3">{title}</p>}
      <ResponsiveContainer width="100%" height={260}>
        {type === 'pie' ? (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              nameKey="key"
              label={({ key, percent }: any) => `${key} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#4A4A4A' }}
            >
              {data.map((d: any, i: number) => (
                <Cell key={i} fill={d.color || '#C8A84E'} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        ) : type === 'bar' ? (
          <BarChart data={data}>
            <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            {series?.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        ) : type === 'area' ? (
          <AreaChart data={data}>
            <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            {series?.map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} fill={s.color} fillOpacity={0.15} strokeWidth={2} />
            ))}
          </AreaChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid stroke="#1A1A1A" strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#4A4A4A', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            {series?.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

const PROSE_CLASSES = "prose prose-invert prose-sm max-w-none prose-headings:text-white prose-strong:text-white prose-p:text-white/80 prose-li:text-white/80 prose-code:bg-[#1A1A1A] prose-code:text-[#C8A84E] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#0A0A0A] prose-pre:border prose-pre:border-[#1A1A1A] prose-table:border-collapse prose-th:border prose-th:border-[#1A1A1A] prose-th:px-3 prose-th:py-2 prose-th:bg-[#1A1A1A] prose-th:text-white prose-td:border prose-td:border-[#1A1A1A] prose-td:px-3 prose-td:py-2 prose-td:text-white/70";

function AssistantContent({ content }: { content: string }) {
  const segments = parseContent(content);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'chart' ? (
          <InlineChart key={i} json={seg.value} />
        ) : (
          <div key={i} className={PROSE_CLASSES}>
            <ReactMarkdown>{seg.value}</ReactMarkdown>
          </div>
        )
      )}
    </>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const result = await api.chat(msg);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        queries: result.queriesExecuted,
        elapsed: result.elapsed,
        sqlQueries: result.sqlQueries,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${(err as Error).message}`,
          timestamp: new Date(),
        },
      ]);
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="relative mb-10">
              <img
                src="/miraki-logo.png"
                alt="Miraki"
                className="w-32 h-32 object-contain"
                style={{ opacity: 0.05 }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-xl w-full">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="text-left px-4 py-3 rounded-lg border border-[#1A1A1A] hover:border-[#C8A84E]/30 text-[#808080] hover:text-[#C8A84E] text-sm transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-[80%]">
              <div
                className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#0A0A0A] border border-[#1A1A1A] text-white'
                    : 'bg-[#0A0A0A] border-l-2 border-[#C8A84E] text-white/90'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <AssistantContent content={msg.content} />
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>

              {/* Metadata row for AI messages */}
              {msg.role === 'assistant' && (msg.queries != null || msg.elapsed != null) && (
                <div className="mt-2 ml-1">
                  <div className="flex items-center gap-4">
                    {msg.queries != null && msg.queries > 0 && (
                      <button
                        onClick={() => {
                          setExpandedQueries((prev) => {
                            const next = new Set(prev);
                            next.has(msg.id) ? next.delete(msg.id) : next.add(msg.id);
                            return next;
                          });
                        }}
                        className="flex items-center gap-1 text-[#4A4A4A] hover:text-[#C8A84E] text-xs transition-colors cursor-pointer"
                      >
                        <Database className="w-3 h-3" />
                        {msg.queries} {msg.queries === 1 ? 'query' : 'queries'}
                        {expandedQueries.has(msg.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                    )}
                    {msg.elapsed != null && (
                      <span className="flex items-center gap-1 text-[#4A4A4A] text-xs">
                        <Clock className="w-3 h-3" />
                        {msg.elapsed}s
                      </span>
                    )}
                  </div>
                  {expandedQueries.has(msg.id) && (
                    <div className="mt-2 space-y-2">
                      {msg.sqlQueries && msg.sqlQueries.length > 0 ? (
                        msg.sqlQueries.map((q, i) => (
                          <div key={i} className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-3">
                            {q.purpose && (
                              <p className="text-[#808080] text-[11px] mb-1.5">{q.purpose}</p>
                            )}
                            <pre className="text-[#C8A84E] text-xs font-mono whitespace-pre-wrap break-all leading-relaxed">{q.sql}</pre>
                          </div>
                        ))
                      ) : (
                        <p className="text-[#4A4A4A] text-xs italic">Query details not available for this message.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#0A0A0A] border-l-2 border-[#C8A84E] rounded-lg px-4 py-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#C8A84E] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#C8A84E] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#C8A84E] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[#1A1A1A] bg-black px-4 py-4">
        <div className="relative max-w-4xl mx-auto">
          {messages.length > 0 && (
            <button
              onClick={resetChat}
              className="absolute -top-2 right-0 flex items-center gap-1.5 text-[#4A4A4A] hover:text-[#808080] text-xs transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}

          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg overflow-hidden focus-within:border-[#C8A84E]/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your marketing data..."
              className="w-full bg-transparent text-white text-sm px-4 pt-3 pb-2 resize-none outline-none placeholder:text-[#4A4A4A]"
              rows={2}
              disabled={loading}
            />
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="text-[#4A4A4A] text-[11px]">Shift+Enter for new line</span>
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="px-4 py-2 rounded-lg bg-[#C8A84E] text-black text-sm font-medium flex items-center gap-2 disabled:opacity-30 transition-opacity hover:opacity-90"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

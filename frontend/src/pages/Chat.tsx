import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import {
  Send, RotateCcw, Database, Clock, ChevronDown, ChevronRight,
  Copy, Check, FileDown, Download, Upload, Paperclip, X,
  Plus, Trash2, MessageSquare, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import ChartTooltip from '../components/ChartTooltip';
import { useClient } from '../contexts/ClientContext';

/* ── Types ───────────────────────────────────────────────── */
interface SqlQuery { sql: string; purpose: string; }

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  queries?: number;
  elapsed?: number;
  sqlQueries?: SqlQuery[];
  timestamp: Date;
  attachments?: FileAttachment[];
}

interface FileAttachment {
  name: string;
  type: string;
  size: number;
  content: string; // text content or base64
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface ChartSpec {
  type: 'line' | 'bar' | 'area' | 'pie';
  title?: string;
  xKey?: string;
  series?: { key: string; name: string; color: string }[];
  data: any[];
}

/* ── Constants ───────────────────────────────────────────── */
const SUGGESTIONS = [
  'Compare Google vs Meta ROAS',
  'Which campaigns should I pause?',
  'Top performing keywords',
  "What's driving conversion changes?",
  'Spend breakdown by device',
  'Forecast next month at +20% budget',
];

const STORAGE_KEY_PREFIX = 'caa_chat_';

/* ── Helpers ─────────────────────────────────────────────── */
function getStorageKey(clientId: string) {
  return `${STORAGE_KEY_PREFIX}${clientId}`;
}

function loadConversations(clientId: string): Conversation[] {
  try {
    const raw = localStorage.getItem(getStorageKey(clientId));
    if (!raw) return [];
    const convos: Conversation[] = JSON.parse(raw);
    return convos.map(c => ({
      ...c,
      messages: c.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
    }));
  } catch { return []; }
}

function saveConversations(clientId: string, convos: Conversation[]) {
  localStorage.setItem(getStorageKey(clientId), JSON.stringify(convos));
}

function generateTitle(messages: Message[]): string {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return 'New Chat';
  const text = firstUser.content.slice(0, 50);
  return text.length < firstUser.content.length ? text + '...' : text;
}

function formatDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  if (diffH < 48) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    if (file.type.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.json') || file.name.endsWith('.tsv') || file.name.endsWith('.sql')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  });
}

/* ── Chart parsing ───────────────────────────────────────── */
function parseContent(content: string): { type: 'text' | 'chart'; value: string }[] {
  const segments: { type: 'text' | 'chart'; value: string }[] = [];
  const chartRegex = /```chart\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = chartRegex.exec(content)) !== null) {
    if (match.index > lastIndex) segments.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    segments.push({ type: 'chart', value: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) segments.push({ type: 'text', value: content.slice(lastIndex) });
  return segments;
}

/* ── Copy Button ─────────────────────────────────────────── */
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-gold)] text-xs transition-colors">
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {label && <span>{copied ? 'Copied' : label}</span>}
    </button>
  );
}

/* ── Inline Chart with Export ────────────────────────────── */
function InlineChart({ json }: { json: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  let spec: ChartSpec;
  try { spec = JSON.parse(json); } catch { return <pre className="text-red-400 text-xs">Invalid chart JSON</pre>; }

  const { type, title, xKey, series, data } = spec;

  const exportChart = () => {
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // Add white background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', '#0A0A0A');
    clone.insertBefore(bg, clone.firstChild);
    const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'chart').replace(/\s+/g, '_')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportData = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map((r: any) => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'chart_data').replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        {title && <p className="text-[var(--color-text)] text-sm font-medium">{title}</p>}
        <div className="flex items-center gap-2">
          <button onClick={exportData} className="flex items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-gold)] text-xs transition-colors" title="Export data as CSV">
            <FileDown className="w-3 h-3" /> CSV
          </button>
          <button onClick={exportChart} className="flex items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-gold)] text-xs transition-colors" title="Export chart as SVG">
            <Download className="w-3 h-3" /> SVG
          </button>
        </div>
      </div>
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={260}>
          {type === 'pie' ? (
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="key"
                label={({ key, percent }: any) => `${key} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: '#4A4A4A' }}>
                {data.map((d: any, i: number) => <Cell key={i} fill={d.color || '#C8A84E'} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          ) : type === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey={xKey} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              {series?.map(s => <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} />)}
            </BarChart>
          ) : type === 'area' ? (
            <AreaChart data={data}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey={xKey} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              {series?.map(s => <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} fill={s.color} fillOpacity={0.15} strokeWidth={2} />)}
            </AreaChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey={xKey} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              {series?.map(s => <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />)}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Prose Classes ───────────────────────────────────────── */
const PROSE_CLASSES = "prose prose-invert prose-sm max-w-none prose-headings:text-[var(--color-text)] prose-strong:text-[var(--color-text)] prose-p:text-[var(--color-text)]/80 prose-li:text-[var(--color-text)]/80 prose-code:bg-[var(--color-border)] prose-code:text-[var(--color-gold)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[var(--color-surface)] prose-pre:border prose-pre:border-[var(--color-border)] prose-table:border-collapse prose-th:border prose-th:border-[var(--color-border)] prose-th:px-3 prose-th:py-2 prose-th:bg-[var(--color-border)] prose-th:text-[var(--color-text)] prose-td:border prose-td:border-[var(--color-border)] prose-td:px-3 prose-td:py-2 prose-td:text-[var(--color-text)]/70";

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

/* ── Export full conversation as PDF ──────────────────────── */
async function exportConversationPdf(messages: Message[], title: string) {
  const { exportPagePdf } = await import('../utils/exportPdf');
  // Build a temporary container with all messages formatted for print
  const container = document.createElement('div');
  container.id = 'chat-export-container';
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;padding:40px;background:white;color:black;font-family:system-ui;font-size:14px;';

  const h1 = document.createElement('h1');
  h1.textContent = title;
  h1.style.cssText = 'font-size:20px;margin-bottom:8px;';
  container.appendChild(h1);

  const subtitle = document.createElement('p');
  subtitle.textContent = `Exported ${new Date().toLocaleString()} · ${messages.length} messages`;
  subtitle.style.cssText = 'color:#666;margin-bottom:24px;font-size:12px;';
  container.appendChild(subtitle);

  messages.forEach(msg => {
    const div = document.createElement('div');
    div.style.cssText = `margin-bottom:16px;padding:12px;border-radius:8px;${
      msg.role === 'user' ? 'background:#f0f0f0;' : 'background:#fff;border-left:3px solid #C8A84E;'
    }`;
    const label = document.createElement('p');
    label.textContent = msg.role === 'user' ? 'You' : 'AI Analyst';
    label.style.cssText = 'font-weight:600;font-size:11px;text-transform:uppercase;color:#888;margin-bottom:6px;';
    div.appendChild(label);

    // Strip chart blocks for PDF, keep text
    const textOnly = msg.content.replace(/```chart\s*\n[\s\S]*?```/g, '[Chart]');
    const p = document.createElement('div');
    p.textContent = textOnly;
    p.style.cssText = 'white-space:pre-wrap;line-height:1.6;';
    div.appendChild(p);

    if (msg.sqlQueries?.length) {
      msg.sqlQueries.forEach(q => {
        const sqlDiv = document.createElement('div');
        sqlDiv.style.cssText = 'margin-top:8px;padding:8px;background:#f5f5f5;border-radius:4px;font-family:monospace;font-size:11px;white-space:pre-wrap;';
        sqlDiv.textContent = q.sql;
        div.appendChild(sqlDiv);
      });
    }
    container.appendChild(div);
  });

  document.body.appendChild(container);

  try {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW - 20;
    const imgH = (canvas.height * imgW) / canvas.width;

    let y = 10;
    let remaining = imgH;
    const pageContentH = pageH - 20;

    // First page
    pdf.addImage(imgData, 'PNG', 10, y, imgW, imgH);

    // Additional pages if content overflows
    while (remaining > pageContentH) {
      remaining -= pageContentH;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, y - (imgH - remaining), imgW, imgH);
    }

    pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

/* ── Conversation Sidebar ────────────────────────────────── */
function ConversationList({
  conversations, activeId, onSelect, onNew, onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-gold)]/30 text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {conversations.length === 0 && (
          <p className="text-[var(--color-text-muted)] text-xs text-center py-8">No conversations yet</p>
        )}
        {conversations.map(c => (
          <div
            key={c.id}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
              c.id === activeId
                ? 'bg-[var(--color-gold-dim)] text-[var(--color-gold)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-text)]/[0.03]'
            }`}
            onClick={() => onSelect(c.id)}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{c.title}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                {c.messages.length} msgs · {formatDate(c.updatedAt)}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onDelete(c.id); }}
              className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Chat Component ─────────────────────────────────── */
export default function Chat() {
  const { client } = useClient();
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations(client.id));
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist conversations
  useEffect(() => {
    saveConversations(client.id, conversations);
  }, [conversations, client.id]);

  // Reload conversations when client changes
  useEffect(() => {
    const loaded = loadConversations(client.id);
    setConversations(loaded);
    setActiveConvoId(null);
    setMessages([]);
  }, [client.id]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Save messages to active conversation
  const persistMessages = useCallback((msgs: Message[]) => {
    if (msgs.length === 0) return;
    setConversations(prev => {
      if (activeConvoId) {
        return prev.map(c => c.id === activeConvoId ? { ...c, messages: msgs, title: generateTitle(msgs), updatedAt: new Date().toISOString() } : c);
      }
      // Create new conversation
      const newConvo: Conversation = {
        id: Date.now().toString(),
        title: generateTitle(msgs),
        messages: msgs,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setActiveConvoId(newConvo.id);
      return [newConvo, ...prev];
    });
  }, [activeConvoId]);

  // Handle file attachment
  const handleFiles = async (files: FileList | File[]) => {
    const newAttachments: FileAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) continue; // 5MB limit
      try {
        const content = await readFileAsText(file);
        newAttachments.push({ name: file.name, type: file.type, size: file.size, content });
      } catch { /* skip unreadable files */ }
    }
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  // Drag & drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  // Send message
  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    // Build message content with file context
    let fullContent = msg;
    if (attachments.length > 0) {
      fullContent += '\n\n--- Attached Files ---';
      attachments.forEach(a => {
        fullContent += `\n\n[File: ${a.name} (${(a.size / 1024).toFixed(1)} KB)]\n${a.content.slice(0, 10000)}`;
      });
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setAttachments([]);
    setLoading(true);

    try {
      const result = await api.chat(fullContent);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        queries: result.queriesExecuted,
        elapsed: result.elapsed,
        sqlQueries: result.sqlQueries,
        timestamp: new Date(),
      };
      const updatedMsgs = [...newMsgs, assistantMsg];
      setMessages(updatedMsgs);
      persistMessages(updatedMsgs);
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${(err as Error).message}`,
        timestamp: new Date(),
      };
      const updatedMsgs = [...newMsgs, errorMsg];
      setMessages(updatedMsgs);
      persistMessages(updatedMsgs);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Conversation actions
  const selectConversation = (id: string) => {
    const convo = conversations.find(c => c.id === id);
    if (!convo) return;
    setActiveConvoId(id);
    setMessages(convo.messages);
    // Reset backend session
    api.resetChat();
  };

  const newConversation = () => {
    setActiveConvoId(null);
    setMessages([]);
    setAttachments([]);
    api.resetChat();
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvoId === id) {
      setActiveConvoId(null);
      setMessages([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen" style={{ background: 'var(--color-bg)' }}
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-[var(--color-gold)] rounded-2xl p-12 text-center">
            <Upload className="w-12 h-12 text-[var(--color-gold)] mx-auto mb-3" />
            <p className="text-[var(--color-gold)] text-lg font-medium">Drop files here</p>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">CSV, JSON, TXT, SQL files up to 5MB</p>
          </div>
        </div>
      )}

      {/* Conversation sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r border-[var(--color-border)] flex flex-col shrink-0" style={{ background: 'var(--color-surface)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Conversations</span>
            <button onClick={() => setSidebarOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          <ConversationList
            conversations={conversations}
            activeId={activeConvoId}
            onSelect={selectConversation}
            onNew={newConversation}
            onDelete={deleteConversation}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)]">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
          <span className="text-sm font-medium text-[var(--color-text-secondary)] flex-1">
            {activeConvoId ? conversations.find(c => c.id === activeConvoId)?.title || 'Chat' : 'New Chat'}
          </span>
          {messages.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportConversationPdf(messages, activeConvoId ? conversations.find(c => c.id === activeConvoId)?.title || 'Chat' : 'Chat Report')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)]/30 hover:text-[var(--color-gold)] text-xs transition-all"
              >
                <FileDown className="w-3 h-3" /> Export PDF
              </button>
              <button
                onClick={newConversation}
                className="flex items-center gap-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] text-xs transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> New Chat
              </button>
            </div>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin">
          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="relative mb-10">
                <img src="/miraki-logo.png" alt="Miraki" className="w-32 h-32 object-contain" style={{ opacity: 0.05 }} />
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-xl w-full">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="text-left px-4 py-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-gold)]/30 text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] text-sm transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%]">
                <div className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]'
                    : 'bg-[var(--color-surface)] border-l-2 border-[var(--color-gold)] text-[var(--color-text)]/90'
                }`}>
                  {msg.role === 'assistant' ? (
                    <AssistantContent content={msg.content} />
                  ) : (
                    <>
                      <p>{msg.content}</p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.attachments.map((a, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-[var(--color-gold-dim)] text-[var(--color-gold)]">
                              <Paperclip className="w-3 h-3" /> {a.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Metadata for AI messages */}
                {msg.role === 'assistant' && (msg.queries != null || msg.elapsed != null) && (
                  <div className="mt-2 ml-1">
                    <div className="flex items-center gap-4">
                      {msg.queries != null && msg.queries > 0 && (
                        <button
                          onClick={() => setExpandedQueries(prev => {
                            const next = new Set(prev);
                            next.has(msg.id) ? next.delete(msg.id) : next.add(msg.id);
                            return next;
                          })}
                          className="flex items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-gold)] text-xs transition-colors cursor-pointer"
                        >
                          <Database className="w-3 h-3" />
                          {msg.queries} {msg.queries === 1 ? 'query' : 'queries'}
                          {expandedQueries.has(msg.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                      )}
                      {msg.elapsed != null && (
                        <span className="flex items-center gap-1 text-[var(--color-text-muted)] text-xs">
                          <Clock className="w-3 h-3" /> {msg.elapsed}s
                        </span>
                      )}
                      <CopyButton text={msg.content.replace(/```chart\s*\n[\s\S]*?```/g, '')} label="Copy" />
                    </div>

                    {/* Expanded SQL queries */}
                    {expandedQueries.has(msg.id) && (
                      <div className="mt-2 space-y-2">
                        {msg.sqlQueries && msg.sqlQueries.length > 0 ? (
                          msg.sqlQueries.map((q, i) => (
                            <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                {q.purpose && <p className="text-[var(--color-text-secondary)] text-[11px]">{q.purpose}</p>}
                                <CopyButton text={q.sql} label="Copy SQL" />
                              </div>
                              <pre className="text-[var(--color-gold)] text-xs font-mono whitespace-pre-wrap break-all leading-relaxed">{q.sql}</pre>
                            </div>
                          ))
                        ) : (
                          <p className="text-[var(--color-text-muted)] text-xs italic">Query details not available.</p>
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
              <div className="bg-[var(--color-surface)] border-l-2 border-[var(--color-gold)] rounded-lg px-4 py-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-gold)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--color-gold)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--color-gold)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-[var(--color-border)] px-4 py-4" style={{ background: 'var(--color-bg)' }}>
          <div className="max-w-4xl mx-auto">
            {/* Attachment preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
                    <Paperclip className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{a.name}</span>
                    <span className="text-[var(--color-text-muted)]">({(a.size / 1024).toFixed(1)}KB)</span>
                    <button onClick={() => removeAttachment(i)} className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden focus-within:border-[var(--color-gold)]/50 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your marketing data..."
                className="w-full bg-transparent text-[var(--color-text)] text-sm px-4 pt-3 pb-2 resize-none outline-none placeholder:text-[var(--color-text-muted)]"
                rows={2}
                disabled={loading}
              />
              <div className="flex items-center justify-between px-4 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--color-text-muted)] text-[11px]">Shift+Enter for new line</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".csv,.json,.txt,.tsv,.sql,.xlsx"
                    className="hidden"
                    onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-gold)] text-xs transition-colors"
                    title="Attach file (CSV, JSON, TXT)"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || (!input.trim() && attachments.length === 0)}
                  className="px-4 py-2 rounded-lg bg-[var(--color-gold)] text-black text-sm font-medium flex items-center gap-2 disabled:opacity-30 transition-opacity hover:opacity-90"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

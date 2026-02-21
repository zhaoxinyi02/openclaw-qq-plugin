import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Loader2, Bot, Settings, ChevronDown, Minimize2, Trash2, GripHorizontal, Maximize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  time: number;
}

const MIN_W = 380, MIN_H = 420, DEFAULT_W = 480, DEFAULT_H = 620;

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [providerId, setProviderId] = useState('');
  const [modelId, setModelId] = useState('');
  const [providers, setProviders] = useState<Record<string, any>>({});
  const [primaryModel, setPrimaryModel] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const savedPosSize = useRef({ x: 0, y: 0, w: DEFAULT_W, h: DEFAULT_H });

  // Position & size state
  const [pos, setPos] = useState({ x: -1, y: -1 }); // -1 = not initialized
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Initialize position to bottom-right
  useEffect(() => {
    if (open && pos.x === -1) {
      setPos({ x: window.innerWidth - size.w - 24, y: window.innerHeight - size.h - 24 });
    }
  }, [open]);

  // Load model config
  useEffect(() => {
    if (open) {
      api.getOpenClawConfig().then(r => {
        if (r.ok) {
          setProviders(r.config?.models?.providers || {});
          setPrimaryModel(r.config?.agents?.defaults?.model?.primary || '');
        }
      }).catch(() => {});
    }
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Drag handlers
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, select, input, textarea, a')) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  // Resize handlers
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    resizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    e.preventDefault();
    e.stopPropagation();
  }, [size]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) {
        const nx = Math.max(0, Math.min(window.innerWidth - size.w, e.clientX - dragOffset.current.x));
        const ny = Math.max(0, Math.min(window.innerHeight - size.h, e.clientY - dragOffset.current.y));
        setPos({ x: nx, y: ny });
      }
      if (resizing.current) {
        const dw = e.clientX - resizeStart.current.x;
        const dh = e.clientY - resizeStart.current.y;
        setSize({
          w: Math.max(MIN_W, resizeStart.current.w + dw),
          h: Math.max(MIN_H, resizeStart.current.h + dh),
        });
      }
    };
    const onUp = () => { dragging.current = false; resizing.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [size]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: text, time: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const chatHistory = [...messages, userMsg].slice(-20).map(m => ({ role: m.role, content: m.content }));
      const r = await api.aiChat(chatHistory, providerId || undefined, modelId || undefined);
      if (r.ok && r.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: r.reply, time: Date.now() }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${r.error || '请求失败，请检查模型配置'}`, time: Date.now() }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ 网络错误: ${err.message || '请稍后重试'}`, time: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // All available models for dropdown
  const allModels: { pid: string; mid: string; label: string }[] = [];
  for (const [pid, prov] of Object.entries(providers) as [string, any][]) {
    for (const m of (prov.models || [])) {
      const mid = typeof m === 'string' ? m : m.id;
      allModels.push({ pid, mid, label: `${pid}/${mid}` });
    }
  }

  const currentModel = providerId && modelId ? `${providerId}/${modelId}` : primaryModel || '未配置';

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-300/40 dark:shadow-violet-900/40 hover:shadow-xl hover:shadow-violet-300/50 dark:hover:shadow-violet-900/50 hover:scale-110 transition-all duration-300 flex items-center justify-center group"
          title="AI 助手">
          <Bot size={24} className="group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
        </button>
      )}

      {/* Chat panel — draggable & resizable */}
      {open && (
        <div ref={panelRef}
          className="fixed z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-gray-300/50 dark:shadow-black/50 border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
          style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>

          {/* Header — drag handle */}
          <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between shrink-0 cursor-move select-none"
            onMouseDown={onDragStart}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">AI 助手 <GripHorizontal size={12} className="opacity-50" /></h3>
                <p className="text-[10px] text-white/70 truncate" style={{ maxWidth: size.w - 200 }}>模型: {currentModel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="设置">
                <Settings size={14} />
              </button>
              <button onClick={() => setMessages([])} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="清空对话">
                <Trash2 size={14} />
              </button>
              <button onClick={() => {
                if (isMaximized) {
                  setPos({ x: savedPosSize.current.x, y: savedPosSize.current.y });
                  setSize({ w: savedPosSize.current.w, h: savedPosSize.current.h });
                  setIsMaximized(false);
                } else {
                  savedPosSize.current = { x: pos.x, y: pos.y, w: size.w, h: size.h };
                  const maxW = Math.min(900, window.innerWidth - 32);
                  const maxH = Math.min(900, window.innerHeight - 32);
                  setSize({ w: maxW, h: maxH });
                  setPos({ x: (window.innerWidth - maxW) / 2, y: (window.innerHeight - maxH) / 2 });
                  setIsMaximized(true);
                }
              }} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title={isMaximized ? '还原大小' : '最大化'}>
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="收起">
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 space-y-2 shrink-0">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">模型选择</label>
              <div className="relative">
                <select value={providerId && modelId ? `${providerId}/${modelId}` : ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (!val) { setProviderId(''); setModelId(''); return; }
                    const parts = val.split('/');
                    setProviderId(parts[0]);
                    setModelId(parts.slice(1).join('/'));
                  }}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 appearance-none cursor-pointer">
                  <option value="">使用主模型 ({primaryModel || '未配置'})</option>
                  {allModels.map(m => <option key={m.label} value={m.label}>{m.label}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <p className="text-[10px] text-gray-400">在「设置 → 模型配置」中添加更多模型</p>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <div className="w-16 h-16 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                  <Bot size={28} className="text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">你好！我是 ClawPanel AI 助手</p>
                  <p className="text-xs text-gray-400 mt-1">有任何关于管理后台的问题都可以问我</p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                  {['如何配置模型？', '技能怎么启用？', '怎么添加QQ通道？', '你使用的是什么模型？'].map(q => (
                    <button key={q} onClick={() => { setInput(q); }}
                      className="px-2.5 py-1.5 text-[10px] rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors border border-violet-100 dark:border-violet-800/30">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                  {msg.role === 'user' ? <MessageCircle size={14} /> : <Bot size={14} />}
                </div>
                {msg.role === 'user' ? (
                  <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-violet-600 text-white text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-700 ai-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
                        h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-2.5 first:mt-0">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
                        ul: ({ children }) => <ul className="list-disc list-inside text-sm space-y-0.5 mb-2 ml-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside text-sm space-y-0.5 mb-2 ml-1">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        code: ({ className, children, ...props }) => {
                          const isBlock = className?.includes('language-');
                          return isBlock ? (
                            <pre className="bg-gray-900 dark:bg-black text-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono leading-relaxed"><code>{children}</code></pre>
                          ) : (
                            <code className="bg-gray-200 dark:bg-gray-700 text-violet-600 dark:text-violet-300 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
                          );
                        },
                        pre: ({ children }) => <>{children}</>,
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 underline hover:text-violet-700">{children}</a>,
                        blockquote: ({ children }) => <blockquote className="border-l-3 border-violet-300 dark:border-violet-700 pl-3 my-2 text-sm text-gray-500 dark:text-gray-400 italic">{children}</blockquote>,
                        table: ({ children }) => <div className="overflow-x-auto my-2"><table className="text-xs border-collapse w-full">{children}</table></div>,
                        th: ({ children }) => <th className="border border-gray-200 dark:border-gray-700 px-2 py-1 bg-gray-50 dark:bg-gray-800 font-semibold text-left">{children}</th>,
                        td: ({ children }) => <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">{children}</td>,
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        hr: () => <hr className="border-gray-200 dark:border-gray-700 my-3" />,
                      }}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-gray-500">
                  <Bot size={14} />
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-3.5 py-2.5 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-violet-500" />
                    <span className="text-sm text-gray-400">思考中...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
            <div className="flex items-end gap-2">
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="输入问题... (Enter 发送, Shift+Enter 换行)"
                rows={1}
                className="flex-1 px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none max-h-24 leading-relaxed"
                style={{ minHeight: '40px' }} />
              <button onClick={sendMessage} disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md shrink-0">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>

          {/* Resize handle — bottom-right corner */}
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10 group" onMouseDown={onResizeStart}>
            <svg viewBox="0 0 16 16" className="w-full h-full text-gray-300 dark:text-gray-600 group-hover:text-violet-400 transition-colors">
              <path d="M14 14L14 8M14 14L8 14M10 14L14 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}
    </>
  );
}

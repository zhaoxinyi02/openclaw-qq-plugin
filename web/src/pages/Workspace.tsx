import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import {
  FolderOpen, File, Trash2, Upload, FolderPlus, RefreshCw,
  ChevronRight, Home, Settings2, Clock, HardDrive, AlertTriangle, Check, X,
  FileText, FileImage, FileVideo, FileAudio, FileArchive, FileCode, Download,
  Eye, Edit3, ArrowUpDown, ChevronUp, ChevronDown, MessageSquare,
} from 'lucide-react';

interface WsFile {
  name: string; path: string; size: number; sizeHuman: string;
  isDirectory: boolean; modifiedAt: string; extension: string; ageDays: number;
}
interface WsConfig { autoCleanEnabled: boolean; autoCleanDays: number; excludePatterns: string[]; }
interface WsStats { totalFiles: number; totalSize: number; totalSizeHuman: string; oldFiles: number; }

type SortKey = 'name' | 'size' | 'modifiedAt' | 'ageDays';
type SortDir = 'asc' | 'desc';

const IMG = ['.jpg','.jpeg','.png','.gif','.webp','.bmp','.svg','.ico'];
const VID = ['.mp4','.avi','.mov','.mkv','.webm'];
const AUD = ['.mp3','.wav','.ogg','.flac','.amr','.silk'];
const ARC = ['.zip','.tar','.gz','.rar','.7z','.tgz'];
const CODE = ['.ts','.js','.py','.sh','.json','.yaml','.yml','.xml','.html','.css'];
const TXT = ['.md','.txt','.log','.jsonl'];
const PREVIEWABLE_IMG = IMG;
const PREVIEWABLE_TXT = ['.txt','.md','.log','.json','.jsonl','.js','.ts','.py','.sh','.yaml','.yml','.xml','.html','.css','.csv','.ini','.conf','.toml','.env'];

function FIcon({ f }: { f: WsFile }) {
  if (f.isDirectory) return <FolderOpen size={18} className="text-amber-500" />;
  const e = f.extension;
  if (IMG.includes(e)) return <FileImage size={18} className="text-pink-500" />;
  if (VID.includes(e)) return <FileVideo size={18} className="text-purple-500" />;
  if (AUD.includes(e)) return <FileAudio size={18} className="text-green-500" />;
  if (ARC.includes(e)) return <FileArchive size={18} className="text-orange-500" />;
  if (CODE.includes(e)) return <FileCode size={18} className="text-blue-500" />;
  if (TXT.includes(e)) return <FileText size={18} className="text-gray-500" />;
  return <File size={18} className="text-gray-400" />;
}

function relTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  if (diff < 2592000000) return Math.floor(diff / 86400000) + ' 天前';
  return d.toLocaleDateString();
}

function canPreview(ext: string) {
  return PREVIEWABLE_IMG.includes(ext) || PREVIEWABLE_TXT.includes(ext);
}

function simpleMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Headers
    .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
    .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
    .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-indigo-600 hover:underline">$1</a>')
    // Horizontal rule
    .replace(/^---+$/gm, '<hr class="my-4 border-gray-200 dark:border-gray-700" />')
    // Unordered list items
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    // Ordered list items
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Blockquote
    .replace(/^&gt;\s+(.+)$/gm, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-3 text-gray-600 dark:text-gray-400 italic">$1</blockquote>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="list-disc pl-5 space-y-1">$1</ul>');
  // Paragraphs: wrap lines that aren't already HTML tags
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (/^<(h[1-6]|ul|ol|li|blockquote|hr|pre|code|div|table)/.test(trimmed)) return line;
    return '<p>' + line + '</p>';
  }).join('\n');
  // Code blocks (```...```)
  html = html.replace(/<p>```(\w*)<\/p>\n([\s\S]*?)\n<p>```<\/p>/g,
    '<pre class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-xs font-mono overflow-x-auto my-2"><code>$2</code></pre>');
  return html;
}

export default function Workspace() {
  const [files, setFiles] = useState<WsFile[]>([]);
  const [curPath, setCurPath] = useState('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [stats, setStats] = useState<WsStats | null>(null);
  const [config, setConfig] = useState<WsConfig | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCfg, setShowCfg] = useState(false);
  const [showMk, setShowMk] = useState(false);
  const [mkName, setMkName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [preview, setPreview] = useState<{ path: string; type: 'image' | 'text'; content?: string } | null>(null);
  const [mdRender, setMdRender] = useState(true);
  const fRef = useRef<HTMLInputElement>(null);

  const flash = (t: string, ok = true) => { setToast({ t, ok }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async (p?: string) => {
    setLoading(true); setSel(new Set());
    try { const r = await api.workspaceFiles(p || ''); if (r.ok) { setFiles(r.files); setCurPath(r.currentPath); setParentPath(r.parentPath); } } catch {}
    setLoading(false);
  }, []);

  const loadStats = useCallback(async () => { try { const r = await api.workspaceStats(); if (r.ok) setStats(r); } catch {} }, []);
  const loadCfg = useCallback(async () => { try { const r = await api.workspaceConfig(); if (r.ok) setConfig(r.config); } catch {} }, []);
  const loadNotes = useCallback(async () => { try { const r = await api.workspaceNotes(); if (r.ok) setNotes(r.notes || {}); } catch {} }, []);

  useEffect(() => { load(); loadStats(); loadCfg(); loadNotes(); }, [load, loadStats, loadCfg, loadNotes]);

  const nav = (p: string) => { load(p); setPreview(null); };

  const toggle = (p: string) => setSel(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  const selAll = () => setSel(prev => prev.size === sortedFiles.length ? new Set() : new Set(sortedFiles.map(f => f.path)));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
  };

  const sortedFiles = [...files].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    let cmp = 0;
    switch (sortKey) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'size': cmp = a.size - b.size; break;
      case 'modifiedAt': cmp = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime(); break;
      case 'ageDays': cmp = a.ageDays - b.ageDays; break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown size={12} className="text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-indigo-500" /> : <ChevronDown size={12} className="text-indigo-500" />;
  };

  const handleDel = async () => {
    if (sel.size === 0) return;
    if (!confirm(`确定删除 ${sel.size} 个文件/文件夹？不可恢复。`)) return;
    const r = await api.workspaceDelete(Array.from(sel));
    if (r.ok) { flash(`已删除 ${r.deleted.length} 个文件`); load(curPath); loadStats(); }
    else flash(r.error || '删除失败', false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files; if (!fl || fl.length === 0) return;
    setUploading(true);
    try {
      const r = await api.workspaceUpload(Array.from(fl), curPath || undefined);
      if (r.ok) { flash(`已上传 ${r.files.length} 个文件`); load(curPath); loadStats(); }
      else flash(r.error || '上传失败', false);
    } catch (err) { flash('上传失败', false); }
    setUploading(false);
    if (fRef.current) fRef.current.value = '';
  };

  const handleMk = async () => {
    if (!mkName.trim()) return;
    const r = await api.workspaceMkdir(mkName.trim(), curPath || undefined);
    if (r.ok) { flash(`已创建: ${mkName}`); setMkName(''); setShowMk(false); load(curPath); }
    else flash(r.error || '创建失败', false);
  };

  const handleClean = async () => {
    if (!confirm('确定立即清理过期文件？不可恢复。')) return;
    const r = await api.workspaceClean();
    if (r.ok) { flash(`已清理 ${r.deleted.length} 个过期文件`); load(curPath); loadStats(); }
    else flash(r.error || '清理失败', false);
  };

  const saveCfg = async () => {
    if (!config) return;
    const r = await api.workspaceUpdateConfig(config);
    if (r.ok) { setConfig(r.config); flash('配置已保存'); loadStats(); }
    else flash(r.error || '保存失败', false);
  };

  const saveNote = async (filePath: string) => {
    await api.workspaceSetNote(filePath, noteText);
    setNotes(prev => {
      const n = { ...prev };
      if (noteText) n[filePath] = noteText; else delete n[filePath];
      return n;
    });
    setEditingNote(null);
    flash('备注已保存');
  };

  const openPreview = async (f: WsFile) => {
    if (f.isDirectory) return;
    const ext = f.extension;
    if (PREVIEWABLE_IMG.includes(ext)) {
      setPreview({ path: f.path, type: 'image' });
    } else if (PREVIEWABLE_TXT.includes(ext)) {
      try {
        const r = await api.workspacePreview(f.path);
        if (r.ok && r.type === 'text') {
          setPreview({ path: f.path, type: 'text', content: r.content });
          setMdRender(ext === '.md');
        } else {
          flash(r.error || '无法预览', false);
        }
      } catch { flash('预览失败', false); }
    }
  };

  const crumbs = () => {
    const parts = curPath ? curPath.split('/').filter(Boolean) : [];
    const c: { l: string; p: string }[] = [{ l: '工作区', p: '' }];
    let acc = '';
    for (const x of parts) { acc = acc ? acc + '/' + x : x; c.push({ l: x, p: acc }); }
    return c;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">工作区文件管理</h1>
        <button onClick={() => setShowCfg(!showCfg)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
          <Settings2 size={15} /> 设置
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${toast.ok ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'}`}>
          {toast.ok ? <Check size={15} /> : <AlertTriangle size={15} />} {toast.t}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <HardDrive size={13} />, label: '总大小', val: stats.totalSizeHuman },
            { icon: <File size={13} />, label: '文件数', val: String(stats.totalFiles) },
            { icon: <Clock size={13} />, label: '过期文件', val: String(stats.oldFiles) },
            { icon: <AlertTriangle size={13} />, label: '自动清理', val: config?.autoCleanEnabled ? `${config.autoCleanDays} 天` : '关闭' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">{s.icon} {s.label}</div>
              <div className="text-lg font-semibold mt-0.5">{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Config panel */}
      {showCfg && config && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <h3 className="font-semibold text-sm">自动清理配置</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={config.autoCleanEnabled} onChange={e => setConfig({ ...config, autoCleanEnabled: e.target.checked })} className="rounded" />
            启用自动清理
          </label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-20">过期天数</span>
            <input type="number" min={1} max={365} value={config.autoCleanDays} onChange={e => setConfig({ ...config, autoCleanDays: parseInt(e.target.value) || 30 })}
              className="w-24 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" />
            <span className="text-xs text-gray-500">天</span>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">排除文件（每行一个模式）</span>
            <textarea value={config.excludePatterns.join('\n')} onChange={e => setConfig({ ...config, excludePatterns: e.target.value.split('\n').filter(Boolean) })}
              rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent font-mono" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveCfg} className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">保存配置</button>
            <button onClick={handleClean} className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">立即清理过期文件</button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-x-auto">
          {crumbs().map((c, i, a) => (
            <span key={c.p + i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight size={13} className="text-gray-400" />}
              <button onClick={() => nav(c.p)} className={`hover:text-indigo-600 dark:hover:text-indigo-400 ${i === a.length - 1 ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                {i === 0 ? <Home size={15} /> : c.l}
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { load(curPath); loadStats(); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="刷新">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowMk(true)} className="flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
            <FolderPlus size={15} /> 新建
          </button>
          <label className={`flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload size={15} /> {uploading ? '上传中...' : '上传'}
            <input ref={fRef} type="file" multiple className="hidden" onChange={handleUpload} />
          </label>
          {sel.size > 0 && (
            <button onClick={handleDel} className="flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">
              <Trash2 size={15} /> 删除 ({sel.size})
            </button>
          )}
        </div>
      </div>

      {/* Mkdir */}
      {showMk && (
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
          <FolderPlus size={16} className="text-gray-400 shrink-0" />
          <input autoFocus value={mkName} onChange={e => setMkName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleMk(); if (e.key === 'Escape') { setShowMk(false); setMkName(''); } }}
            placeholder="文件夹名称" className="flex-1 px-2 py-1 text-sm bg-transparent border-b border-gray-200 dark:border-gray-700 outline-none" />
          <button onClick={handleMk} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded"><Check size={16} /></button>
          <button onClick={() => { setShowMk(false); setMkName(''); }} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X size={16} /></button>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <span className="text-sm font-medium truncate">{preview.path.split('/').pop()}</span>
              <div className="flex items-center gap-2">
                {preview.type === 'text' && preview.path.endsWith('.md') && (
                  <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button onClick={() => setMdRender(true)}
                      className={`px-2.5 py-1 text-xs ${mdRender ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                      <Eye size={12} className="inline mr-1" />渲染
                    </button>
                    <button onClick={() => setMdRender(false)}
                      className={`px-2.5 py-1 text-xs ${!mdRender ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                      <FileCode size={12} className="inline mr-1" />源码
                    </button>
                  </div>
                )}
                <a href={api.workspaceDownloadUrl(preview.path)} className="text-xs text-indigo-600 hover:underline">下载</a>
                <button onClick={() => setPreview(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X size={16} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {preview.type === 'image' ? (
                <img src={api.workspacePreviewUrl(preview.path)} alt={preview.path} className="max-w-full mx-auto rounded" />
              ) : preview.path.endsWith('.md') && mdRender ? (
                <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: simpleMarkdown(preview.content || '') }} />
              ) : (
                <pre className="text-xs font-mono whitespace-pre-wrap break-all text-gray-700 dark:text-gray-300">{preview.content}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[32px_1fr_minmax(120px,1.5fr)_80px_100px_80px] gap-2 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
          <div><input type="checkbox" checked={sortedFiles.length > 0 && sel.size === sortedFiles.length} onChange={selAll} className="rounded" /></div>
          <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 text-left">名称 <SortIcon k="name" /></button>
          <div className="flex items-center gap-1"><MessageSquare size={12} /> 备注</div>
          <button onClick={() => handleSort('size')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">大小 <SortIcon k="size" /></button>
          <button onClick={() => handleSort('modifiedAt')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">修改时间 <SortIcon k="modifiedAt" /></button>
          <div>操作</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400"><RefreshCw size={20} className="animate-spin mx-auto mb-2" /> 加载中...</div>
        ) : sortedFiles.length === 0 ? (
          <div className="p-8 text-center text-gray-400"><FolderOpen size={24} className="mx-auto mb-2 opacity-50" /> 空文件夹</div>
        ) : (
          sortedFiles.map(f => (
            <div key={f.path}
              className={`grid grid-cols-[32px_1fr_minmax(120px,1.5fr)_80px_100px_80px] gap-2 px-4 py-2 items-center text-sm border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${sel.has(f.path) ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''}`}>
              <div><input type="checkbox" checked={sel.has(f.path)} onChange={() => toggle(f.path)} className="rounded" /></div>
              <div className="flex items-center gap-2 min-w-0">
                <FIcon f={f} />
                {f.isDirectory ? (
                  <button onClick={() => nav(f.path)} className="truncate text-left hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">{f.name}</button>
                ) : (
                  <button onClick={() => canPreview(f.extension) ? openPreview(f) : undefined}
                    className={`truncate text-left ${canPreview(f.extension) ? 'hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer' : ''}`}>{f.name}</button>
                )}
              </div>
              <div className="min-w-0">
                {editingNote === f.path ? (
                  <div className="flex items-center gap-1">
                    <input autoFocus value={noteText} onChange={e => setNoteText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveNote(f.path); if (e.key === 'Escape') setEditingNote(null); }}
                      className="flex-1 px-1.5 py-0.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-transparent min-w-0" placeholder="添加备注..." />
                    <button onClick={() => saveNote(f.path)} className="text-emerald-500 hover:text-emerald-600"><Check size={13} /></button>
                    <button onClick={() => setEditingNote(null)} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingNote(f.path); setNoteText(notes[f.path] || ''); }}
                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 truncate block max-w-full text-left"
                    title={notes[f.path] || '点击添加备注'}>
                    {notes[f.path] || <span className="opacity-0 group-hover:opacity-50">—</span>}
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{f.isDirectory ? '-' : f.sizeHuman}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{relTime(f.modifiedAt)}</div>
              <div className="flex items-center gap-0.5">
                {!f.isDirectory && canPreview(f.extension) && (
                  <button onClick={() => openPreview(f)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="预览">
                    <Eye size={14} className="text-gray-400" />
                  </button>
                )}
                {!f.isDirectory && (
                  <a href={api.workspaceDownloadUrl(f.path)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 inline-block" title="下载">
                    <Download size={14} className="text-gray-400" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  Save, RefreshCw, ChevronDown, ChevronRight,
  Brain, MessageSquare, Globe, Terminal, Webhook,
  Users, Eye, Key, Plus, Trash2,
  Monitor, HardDrive, FileText, Archive, RotateCcw,
  CheckCircle, AlertTriangle, Package,
} from 'lucide-react';

const KNOWN_PROVIDERS: { id: string; name: string; baseUrl: string; models: string[] }[] = [
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini', 'o3-mini'] },
  { id: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', models: ['claude-sonnet-4-5', 'claude-haiku-3-5', 'claude-3-opus'] },
  { id: 'google', name: 'Google', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro'] },
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'nvidia', name: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1', models: ['minimaxai/minimax-m2.1', 'meta/llama-3.1-405b-instruct'] },
  { id: 'groq', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'] },
  { id: 'together', name: 'Together AI', baseUrl: 'https://api.together.xyz/v1', models: ['meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'] },
  { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', models: ['anthropic/claude-sonnet-4-5', 'openai/gpt-4o'] },
];

type ConfigTab = 'models' | 'identity' | 'general' | 'version' | 'env' | 'docs';

export default function SystemConfig() {
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<ConfigTab>('models');
  const [versionInfo, setVersionInfo] = useState<any>({});
  const [backups, setBackups] = useState<any[]>([]);
  const [backingUp, setBackingUp] = useState(false);
  const [envInfo, setEnvInfo] = useState<any>({});
  const [envLoading, setEnvLoading] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [docContent, setDocContent] = useState('');
  const [docSaving, setDocSaving] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try { const r = await api.getOpenClawConfig(); if (r.ok) setConfig(r.config || {}); }
    catch {} finally { setLoading(false); }
  };

  const loadVersion = async () => {
    const [v, b] = await Promise.all([api.getSystemVersion(), api.getBackups()]);
    if (v.ok) setVersionInfo(v);
    if (b.ok) setBackups(b.backups || []);
  };

  const loadEnv = async () => {
    setEnvLoading(true);
    try { const r = await api.getSystemEnv(); if (r.ok) setEnvInfo(r); }
    catch {} finally { setEnvLoading(false); }
  };

  const loadDocs = async () => {
    const r = await api.getDocs();
    if (r.ok) setDocs(r.docs || []);
  };

  useEffect(() => {
    if (tab === 'version') loadVersion();
    if (tab === 'env') loadEnv();
    if (tab === 'docs') loadDocs();
  }, [tab]);

  const getVal = (path: string): any => path.split('.').reduce((o: any, k: string) => o?.[k], config);
  const setVal = (path: string, value: any) => {
    setConfig((prev: any) => {
      const clone = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let cur = clone;
      for (let i = 0; i < keys.length - 1; i++) { if (!cur[keys[i]]) cur[keys[i]] = {}; cur = cur[keys[i]]; }
      cur[keys[keys.length - 1]] = value;
      return clone;
    });
  };

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await api.updateOpenClawConfig(config);
      setMsg('配置已保存，部分配置需要重启 OpenClaw 生效');
      setTimeout(() => setMsg(''), 4000);
    } catch (err) { setMsg('保存失败: ' + String(err)); }
    finally { setSaving(false); }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try { const r = await api.createBackup(); if (r.ok) { setMsg('备份成功'); loadVersion(); } }
    catch (err) { setMsg('备份失败: ' + String(err)); }
    finally { setBackingUp(false); setTimeout(() => setMsg(''), 3000); }
  };

  const handleRestore = async (name: string) => {
    if (!confirm(`确定要恢复备份 ${name}？当前配置将自动备份。`)) return;
    try {
      const r = await api.restoreBackup(name);
      if (r.ok) { setMsg('恢复成功，请重启 OpenClaw'); loadConfig(); loadVersion(); }
    } catch (err) { setMsg('恢复失败: ' + String(err)); }
    setTimeout(() => setMsg(''), 4000);
  };

  const handleSaveDoc = async () => {
    if (!selectedDoc) return;
    setDocSaving(true);
    try { await api.saveDoc(selectedDoc.path, docContent); setMsg('文档已保存'); loadDocs(); }
    catch (err) { setMsg('保存失败: ' + String(err)); }
    finally { setDocSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  if (loading) return <div className="text-center py-12 text-gray-400 text-xs">加载配置中...</div>;

  const providers = config?.models?.providers || {};
  const primaryModel = config?.agents?.defaults?.model?.primary || '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">系统配置</h2>
          <p className="text-xs text-gray-500 mt-0.5">OpenClaw 深度配置 — 模型、版本、环境、文档等</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadConfig} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
            <RefreshCw size={13} />重新加载
          </button>
          {(tab === 'models' || tab === 'general' || tab === 'identity') && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
              <Save size={13} />{saving ? '保存中...' : '保存配置'}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`px-3 py-2 rounded-lg text-xs ${msg.includes('失败') ? 'bg-red-50 dark:bg-red-950 text-red-600' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'}`}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {([
          { id: 'models' as ConfigTab, label: '模型配置', icon: Brain },
          { id: 'identity' as ConfigTab, label: '身份 & 消息', icon: Users },
          { id: 'general' as ConfigTab, label: '通用配置', icon: Terminal },
          { id: 'version' as ConfigTab, label: '版本管理', icon: Package },
          { id: 'env' as ConfigTab, label: '环境检测', icon: Monitor },
          { id: 'docs' as ConfigTab, label: '文档管理', icon: FileText },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={13} />{t.label}
          </button>
        ))}
      </div>

      {/* === Models Tab === */}
      {tab === 'models' && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-2">当前主模型</h3>
            <input value={primaryModel} onChange={e => setVal('agents.defaults.model.primary', e.target.value)}
              placeholder="provider-id/model-name" className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent font-mono" />
            <p className="text-[10px] text-gray-400 mt-1">格式: provider-id/model-name，如 openai/gpt-4o</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">模型提供商</h3>
              <button onClick={() => {
                const id = `provider-${Date.now()}`;
                setVal(`models.providers.${id}`, { baseUrl: '', apiKey: '', api: 'openai-completions', models: [] });
              }} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-lg bg-violet-600 text-white hover:bg-violet-700">
                <Plus size={12} />添加提供商
              </button>
            </div>

            {Object.entries(providers).map(([pid, prov]: [string, any]) => (
              <div key={pid} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain size={14} className="text-violet-500" />
                    <span className="text-xs font-semibold">{pid}</span>
                    {prov.models?.length > 0 && <span className="text-[10px] text-gray-400">{prov.models.length} 个模型</span>}
                  </div>
                  <button onClick={() => {
                    const clone = JSON.parse(JSON.stringify(config));
                    delete clone.models.providers[pid];
                    setConfig(clone);
                  }} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                </div>

                <div className="flex gap-1 flex-wrap">
                  {KNOWN_PROVIDERS.map(kp => (
                    <button key={kp.id} onClick={() => {
                      setVal(`models.providers.${pid}.baseUrl`, kp.baseUrl);
                      setVal(`models.providers.${pid}.api`, 'openai-completions');
                    }} className="px-2 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                      {kp.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Base URL</label>
                    <input value={prov.baseUrl || ''} onChange={e => setVal(`models.providers.${pid}.baseUrl`, e.target.value)}
                      placeholder="https://api.openai.com/v1" className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">API Key</label>
                    <input type="password" value={prov.apiKey || ''} onChange={e => setVal(`models.providers.${pid}.apiKey`, e.target.value)}
                      placeholder="sk-..." className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">API 类型</label>
                    <select value={prov.api || 'openai-completions'} onChange={e => setVal(`models.providers.${pid}.api`, e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent">
                      <option value="openai-completions">OpenAI Completions</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google-genai">Google GenAI</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">模型列表</label>
                  {(prov.models || []).map((m: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 mb-1">
                      <input value={typeof m === 'string' ? m : m.id || m.name || ''} onChange={e => {
                        const clone = JSON.parse(JSON.stringify(config));
                        const models = clone.models.providers[pid].models || [];
                        if (typeof models[idx] === 'string') models[idx] = e.target.value;
                        else models[idx] = { ...models[idx], id: e.target.value, name: e.target.value };
                        clone.models.providers[pid].models = models;
                        setConfig(clone);
                      }} className="flex-1 px-2 py-1 text-[11px] border border-gray-200 dark:border-gray-700 rounded bg-transparent font-mono" />
                      <button onClick={() => {
                        const clone = JSON.parse(JSON.stringify(config));
                        clone.models.providers[pid].models.splice(idx, 1);
                        setConfig(clone);
                      }} className="text-red-400 hover:text-red-600"><Trash2 size={11} /></button>
                    </div>
                  ))}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <button onClick={() => {
                      const clone = JSON.parse(JSON.stringify(config));
                      if (!clone.models.providers[pid].models) clone.models.providers[pid].models = [];
                      clone.models.providers[pid].models.push({ id: '', name: '', contextWindow: 128000, maxTokens: 8192 });
                      setConfig(clone);
                    }} className="px-2 py-0.5 text-[10px] rounded bg-violet-100 dark:bg-violet-900 text-violet-600 hover:bg-violet-200">
                      + 自定义模型
                    </button>
                    {KNOWN_PROVIDERS.filter(kp => prov.baseUrl?.includes(kp.baseUrl.replace('https://', '').split('/')[0])).flatMap(kp =>
                      kp.models.filter(m => !(prov.models || []).find((pm: any) => (typeof pm === 'string' ? pm : pm.id) === m)).slice(0, 4).map(m => (
                        <button key={m} onClick={() => {
                          const clone = JSON.parse(JSON.stringify(config));
                          if (!clone.models.providers[pid].models) clone.models.providers[pid].models = [];
                          clone.models.providers[pid].models.push({ id: m, name: m, contextWindow: 128000, maxTokens: 8192 });
                          setConfig(clone);
                        }} className="px-2 py-0.5 text-[10px] rounded bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100">
                          + {m}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === Identity & Messages Tab === */}
      {tab === 'identity' && (
        <div className="space-y-3">
          <CfgSection title="身份设置" icon={Users} fields={[
            { path: 'ui.assistant.name', label: '助手名称', type: 'text' as const, placeholder: 'OpenClaw' },
            { path: 'ui.assistant.avatar', label: '助手头像', type: 'text' as const, placeholder: 'emoji或URL' },
            { path: 'ui.seamColor', label: '主题色', type: 'text' as const, placeholder: '#7c3aed' },
          ]} getVal={getVal} setVal={setVal} />
          <CfgSection title="消息配置" icon={MessageSquare} fields={[
            { path: 'messages.systemPrompt', label: '系统提示词', type: 'textarea' as const, placeholder: '你是一个有帮助的AI助手...' },
            { path: 'messages.maxHistoryMessages', label: '最大历史消息数', type: 'number' as const, placeholder: '50' },
            { path: 'messages.ackReactionScope', label: '确认反应范围', type: 'select' as const, options: ['all', 'group-mentions', 'none'] },
          ]} getVal={getVal} setVal={setVal} />
          <CfgSection title="Agent 默认设置" icon={Brain} fields={[
            { path: 'agents.defaults.model.contextTokens', label: '上下文Token数', type: 'number' as const, placeholder: '200000' },
            { path: 'agents.defaults.model.maxTokens', label: '最大输出Token', type: 'number' as const, placeholder: '8192' },
            { path: 'agents.defaults.maxConcurrent', label: '最大并发', type: 'number' as const, placeholder: '4' },
            { path: 'agents.defaults.compaction.mode', label: '压缩模式', type: 'select' as const, options: ['default', 'aggressive', 'off'] },
            { path: 'agents.defaults.compaction.maxHistoryShare', label: '历史占比上限', type: 'number' as const, placeholder: '0.5' },
          ]} getVal={getVal} setVal={setVal} />
        </div>
      )}

      {/* === General Config Tab === */}
      {tab === 'general' && (
        <div className="space-y-3">
          <CfgSection title="网关配置" icon={Globe} fields={[
            { path: 'gateway.port', label: '端口', type: 'number' as const, placeholder: '18789' },
            { path: 'gateway.mode', label: '模式', type: 'select' as const, options: ['local', 'remote'] },
            { path: 'gateway.bind', label: '绑定', type: 'select' as const, options: ['lan', 'localhost', 'all'] },
            { path: 'gateway.auth.mode', label: '认证模式', type: 'select' as const, options: ['token', 'password'] },
            { path: 'gateway.auth.token', label: '认证Token', type: 'password' as const },
          ]} getVal={getVal} setVal={setVal} />
          <CfgSection title="工具配置" icon={Terminal} fields={[
            { path: 'tools.mediaUnderstanding.enabled', label: '媒体理解', type: 'toggle' as const },
            { path: 'tools.webSearch.enabled', label: '网页搜索', type: 'toggle' as const },
            { path: 'tools.webSearch.provider', label: '搜索引擎', type: 'select' as const, options: ['google', 'bing', 'duckduckgo', 'brave'] },
          ]} getVal={getVal} setVal={setVal} />
          <CfgSection title="Hooks" icon={Webhook} fields={[
            { path: 'hooks.enabled', label: '启用Hooks', type: 'toggle' as const },
            { path: 'hooks.basePath', label: '基础路径', type: 'text' as const, placeholder: '/hooks' },
            { path: 'hooks.secret', label: 'Webhook密钥', type: 'password' as const },
          ]} getVal={getVal} setVal={setVal} />
          <CfgSection title="会话配置" icon={Eye} fields={[
            { path: 'session.compaction.enabled', label: '自动压缩', type: 'toggle' as const },
            { path: 'session.compaction.threshold', label: '压缩阈值(tokens)', type: 'number' as const, placeholder: '100000' },
            { path: 'session.pruning.enabled', label: '自动修剪', type: 'toggle' as const },
          ]} getVal={getVal} setVal={setVal} />
          <CfgSection title="认证密钥" icon={Key} fields={[
            { path: 'env.vars.ANTHROPIC_API_KEY', label: 'Anthropic API Key', type: 'password' as const },
            { path: 'env.vars.OPENAI_API_KEY', label: 'OpenAI API Key', type: 'password' as const },
            { path: 'env.vars.GOOGLE_API_KEY', label: 'Google API Key', type: 'password' as const },
          ]} getVal={getVal} setVal={setVal} />
          <details className="card">
            <summary className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">查看原始配置 (JSON)</summary>
            <pre className="px-4 pb-4 text-[11px] text-gray-600 dark:text-gray-400 overflow-x-auto max-h-96 overflow-y-auto font-mono">{JSON.stringify(config, null, 2)}</pre>
          </details>
        </div>
      )}

      {/* === Version Management Tab === */}
      {tab === 'version' && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3">OpenClaw 版本</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                  <Package size={18} className="text-violet-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">当前版本</p>
                  <p className="text-sm font-bold">{versionInfo.currentVersion || '加载中...'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${versionInfo.updateAvailable ? 'bg-amber-50 dark:bg-amber-950' : 'bg-emerald-50 dark:bg-emerald-950'}`}>
                  {versionInfo.updateAvailable ? <AlertTriangle size={18} className="text-amber-500" /> : <CheckCircle size={18} className="text-emerald-500" />}
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">最新版本</p>
                  <p className="text-sm font-bold">{versionInfo.latestVersion || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                  <RefreshCw size={18} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">上次检查</p>
                  <p className="text-xs text-gray-600">{versionInfo.lastCheckedAt ? new Date(versionInfo.lastCheckedAt).toLocaleString('zh-CN') : '-'}</p>
                </div>
              </div>
            </div>
            {versionInfo.updateAvailable && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-xs text-amber-700 dark:text-amber-300">
                有新版本可用！请在终端运行: <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">openclaw update</code>
              </div>
            )}
          </div>
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">备份与恢复</h3>
              <button onClick={handleBackup} disabled={backingUp}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                <Archive size={13} />{backingUp ? '备份中...' : '立即备份'}
              </button>
            </div>
            <p className="text-[11px] text-gray-500">备份包含 openclaw.json 配置和定时任务。恢复前会自动备份当前配置。</p>
            {backups.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">暂无备份</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {backups.map((b: any) => (
                  <div key={b.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-xs">
                    <Archive size={13} className="text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[11px] truncate">{b.name}</p>
                      <p className="text-[10px] text-gray-400">{new Date(b.time).toLocaleString('zh-CN')} · {(b.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={() => handleRestore(b.name)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100 shrink-0">
                      <RotateCcw size={10} />恢复
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === Environment Detection Tab === */}
      {tab === 'env' && (
        <div className="space-y-4">
          {envLoading ? (
            <div className="text-center py-12 text-gray-400 text-xs">检测环境中...</div>
          ) : (
            <>
              <div className="card p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Monitor size={14} className="text-violet-500" />操作系统</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ['平台', envInfo.os?.platform], ['架构', envInfo.os?.arch],
                    ['内核', envInfo.os?.release], ['主机名', envInfo.os?.hostname],
                    ['CPU 核心', envInfo.os?.cpus ? `${envInfo.os.cpus} 核` : '-'],
                    ['总内存', envInfo.os?.totalMemMB ? `${envInfo.os.totalMemMB} MB` : '-'],
                    ['可用内存', envInfo.os?.freeMemMB ? `${envInfo.os.freeMemMB} MB` : '-'],
                  ].map(([label, value]) => (
                    <div key={label as string}><p className="text-[10px] text-gray-500">{label}</p><p className="text-xs font-medium truncate">{(value as string) || '-'}</p></div>
                  ))}
                </div>
              </div>
              <div className="card p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><HardDrive size={14} className="text-violet-500" />软件环境</h3>
                <div className="space-y-2">
                  {[
                    { name: 'Node.js', value: envInfo.software?.node, required: true },
                    { name: 'Docker', value: envInfo.software?.docker, required: true },
                    { name: 'Git', value: envInfo.software?.git, required: true },
                    { name: 'OpenClaw', value: envInfo.software?.openclaw, required: true },
                    { name: 'npm', value: envInfo.software?.npm, required: false },
                  ].map(sw => {
                    const installed = sw.value && !sw.value.includes('not installed') && !sw.value.includes('not found');
                    return (
                      <div key={sw.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${installed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-xs font-medium w-24">{sw.name}</span>
                        <span className="text-[11px] text-gray-600 dark:text-gray-400 font-mono flex-1 truncate">{sw.value || '未检测'}</span>
                        {sw.required && <span className="text-[10px] text-gray-400 shrink-0">{installed ? '✓ 已安装' : '✗ 需要安装'}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-semibold mb-2">快速安装指南</h3>
                <div className="space-y-2 text-[11px] text-gray-600 dark:text-gray-400">
                  <p><strong>Docker:</strong> <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">curl -fsSL https://get.docker.com | sh</code></p>
                  <p><strong>OpenClaw:</strong> <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">curl -fsSL https://get.openclaw.ai | bash</code></p>
                  <p><strong>Node.js:</strong> <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs</code></p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* === Docs Management Tab === */}
      {tab === 'docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="card p-3 space-y-1 max-h-[70vh] overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-500 mb-2 px-1">OpenClaw 文档</h3>
            {docs.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">暂无 MD 文档</p>
            ) : docs.map((doc: any) => (
              <button key={doc.name} onClick={() => { setSelectedDoc(doc); setDocContent(doc.content); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                  selectedDoc?.name === doc.name
                    ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                <FileText size={13} />
                <div className="min-w-0">
                  <div className="truncate">{doc.name}</div>
                  <div className="text-[10px] text-gray-400">{(doc.size / 1024).toFixed(1)} KB</div>
                </div>
              </button>
            ))}
          </div>
          <div className="lg:col-span-3 card p-4">
            {selectedDoc ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{selectedDoc.name}</h3>
                  <button onClick={handleSaveDoc} disabled={docSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                    <Save size={13} />{docSaving ? '保存中...' : '保存'}
                  </button>
                </div>
                <textarea value={docContent} onChange={e => setDocContent(e.target.value)}
                  className="w-full h-[60vh] px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent resize-none font-mono leading-relaxed" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-xs text-gray-400">选择左侧文档进行查看和编辑</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CfgSection({ title, icon: Icon, fields, getVal, setVal }: {
  title: string; icon: any;
  fields: { path: string; label: string; type: 'text' | 'password' | 'number' | 'toggle' | 'textarea' | 'select'; options?: string[]; placeholder?: string }[];
  getVal: (p: string) => any; setVal: (p: string, v: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        <Icon size={16} className="text-violet-500 shrink-0" />
        <span className="text-sm font-medium flex-1">{title}</span>
        <span className="text-[10px] text-gray-400">{fields.length} 项</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800 space-y-3">
          {fields.map(field => (
            <div key={field.path}>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
              {field.type === 'toggle' ? (
                <button onClick={() => setVal(field.path, !getVal(field.path))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${getVal(field.path) ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${getVal(field.path) ? 'translate-x-5' : ''}`} />
                </button>
              ) : field.type === 'textarea' ? (
                <textarea value={getVal(field.path) || ''} onChange={e => setVal(field.path, e.target.value)}
                  placeholder={field.placeholder} rows={4}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent resize-none font-mono" />
              ) : field.type === 'select' ? (
                <select value={getVal(field.path) || ''} onChange={e => setVal(field.path, e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent">
                  <option value="">选择...</option>
                  {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                  value={getVal(field.path) ?? ''} onChange={e => setVal(field.path, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" />
              )}
              <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{field.path}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  Save, RefreshCw, ChevronDown, ChevronRight,
  Brain, MessageSquare, Globe, Terminal, Webhook,
  Users, Eye, EyeOff, Key, Plus, Trash2,
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

type ConfigTab = 'models' | 'identity' | 'general' | 'version' | 'env';

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
  const [identityDocs, setIdentityDocs] = useState<any[]>([]);
  const [selectedIdentityDoc, setSelectedIdentityDoc] = useState<any>(null);
  const [identityContent, setIdentityContent] = useState('');
  const [identitySaving, setIdentitySaving] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState<string[]>([]);
  const [updateStatus, setUpdateStatus] = useState('idle');

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

  const loadIdentityDocs = async () => {
    const r = await api.getIdentityDocs();
    if (r.ok) {
      setIdentityDocs(r.docs || []);
      if (!selectedIdentityDoc && r.docs?.length > 0) {
        setSelectedIdentityDoc(r.docs[0]);
        setIdentityContent(r.docs[0].content || '');
      }
    }
  };

  const loadAdminToken = async () => {
    const r = await api.getAdminToken();
    if (r.ok) setAdminToken(r.token || '');
  };

  useEffect(() => {
    if (tab === 'version') loadVersion();
    if (tab === 'env') loadEnv();
    if (tab === 'identity') { loadIdentityDocs(); loadAdminToken(); }
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
          { id: 'identity' as ConfigTab, label: '身份 & 文档', icon: Users },
          { id: 'general' as ConfigTab, label: '通用配置', icon: Terminal },
          { id: 'version' as ConfigTab, label: '版本管理', icon: Package },
          { id: 'env' as ConfigTab, label: '环境检测', icon: Monitor },
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
                    <input value={pid} onChange={e => {
                      const newId = e.target.value;
                      if (!newId || newId === pid) return;
                      const clone = JSON.parse(JSON.stringify(config));
                      clone.models.providers[newId] = clone.models.providers[pid];
                      delete clone.models.providers[pid];
                      // Update primary model reference if it uses this provider
                      const primary = clone.agents?.defaults?.model?.primary || '';
                      if (primary.startsWith(pid + '/')) {
                        clone.agents.defaults.model.primary = newId + primary.slice(pid.length);
                      }
                      setConfig(clone);
                    }} className="text-xs font-semibold bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:border-violet-500 outline-none px-1 py-0.5 w-40" title="点击编辑 Provider ID" />
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
                  {(prov.models || []).map((m: any, idx: number) => {
                    const mObj = typeof m === 'string' ? { id: m, name: m } : m;
                    const updateModel = (key: string, val: any) => {
                      const clone = JSON.parse(JSON.stringify(config));
                      const models = clone.models.providers[pid].models || [];
                      if (typeof models[idx] === 'string') models[idx] = { id: models[idx], name: models[idx] };
                      models[idx] = { ...models[idx], [key]: val };
                      if (key === 'id') models[idx].name = val;
                      clone.models.providers[pid].models = models;
                      setConfig(clone);
                    };
                    return (
                    <div key={idx} className="mb-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input value={mObj.id || ''} onChange={e => updateModel('id', e.target.value)}
                          placeholder="模型ID" className="flex-1 px-2 py-1 text-[11px] border border-gray-200 dark:border-gray-700 rounded bg-transparent font-mono" />
                        <button onClick={() => {
                          const clone = JSON.parse(JSON.stringify(config));
                          clone.models.providers[pid].models.splice(idx, 1);
                          setConfig(clone);
                        }} className="text-red-400 hover:text-red-600"><Trash2 size={11} /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="text-[9px] text-gray-400">contextWindow</label>
                          <input type="number" value={mObj.contextWindow ?? ''} onChange={e => updateModel('contextWindow', e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="128000" className="w-full px-1.5 py-0.5 text-[10px] border border-gray-200 dark:border-gray-700 rounded bg-transparent font-mono" />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-400">maxTokens</label>
                          <input type="number" value={mObj.maxTokens ?? ''} onChange={e => updateModel('maxTokens', e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="8192" className="w-full px-1.5 py-0.5 text-[10px] border border-gray-200 dark:border-gray-700 rounded bg-transparent font-mono" />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-400">reasoning</label>
                          <button onClick={() => updateModel('reasoning', !mObj.reasoning)}
                            className={`w-full px-1.5 py-0.5 text-[10px] rounded border ${mObj.reasoning ? 'bg-violet-100 dark:bg-violet-900 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                            {mObj.reasoning ? '✓ 是' : '✗ 否'}
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
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
          {/* Login password display */}
          <div className="card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Key size={14} className="text-violet-500" />
              <h3 className="text-sm font-semibold">管理后台登录密码</h3>
            </div>
            <AdminPasswordField token={adminToken} onCopy={() => { setMsg('密码已复制'); setTimeout(() => setMsg(''), 2000); }} />
            <p className="text-[10px] text-gray-400">此密码在 .env 文件中的 ADMIN_TOKEN 配置</p>
          </div>

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

          {/* Identity MD files editor */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800">
              <FileText size={14} className="text-violet-500" />
              <h3 className="text-sm font-semibold">身份文档 (Markdown)</h3>
              <span className="text-[10px] text-gray-400">AGENTS.md / BOOTSTRAP.md / HEARTBEAT.md / IDENTITY.md / SOUL.md / TOOLS.md / USER.md</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4">
              <div className="p-2 space-y-0.5 border-r border-gray-100 dark:border-gray-800 max-h-[50vh] overflow-y-auto">
                {identityDocs.map((doc: any) => (
                  <button key={doc.name} onClick={() => { setSelectedIdentityDoc(doc); setIdentityContent(doc.content || ''); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                      selectedIdentityDoc?.name === doc.name
                        ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}>
                    <FileText size={12} />
                    <div className="min-w-0">
                      <div className="truncate">{doc.name}</div>
                      <div className="text-[10px] text-gray-400">{doc.exists === false ? '未创建' : `${(doc.size / 1024).toFixed(1)} KB`}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="lg:col-span-3 p-3">
                {selectedIdentityDoc ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold">{selectedIdentityDoc.name}</h4>
                      <button onClick={async () => {
                        setIdentitySaving(true);
                        try {
                          await api.saveIdentityDoc(selectedIdentityDoc.path, identityContent);
                          setMsg('文档已保存');
                          loadIdentityDocs();
                        } catch (err) { setMsg('保存失败: ' + String(err)); }
                        finally { setIdentitySaving(false); setTimeout(() => setMsg(''), 3000); }
                      }} disabled={identitySaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                        <Save size={12} />{identitySaving ? '保存中...' : '保存'}
                      </button>
                    </div>
                    <textarea value={identityContent} onChange={e => setIdentityContent(e.target.value)}
                      className="w-full h-[40vh] px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent resize-none font-mono leading-relaxed" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-xs text-gray-400">选择左侧文档进行编辑</div>
                )}
              </div>
            </div>
          </div>
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
          <CfgSection title="Hooks" icon={Webhook} fields={[
            { path: 'hooks.enabled', label: '启用Hooks', type: 'toggle' as const },
            { path: 'hooks.basePath', label: '基础路径', type: 'text' as const, placeholder: '/hooks' },
            { path: 'hooks.secret', label: 'Webhook密钥', type: 'password' as const },
          ]} getVal={getVal} setVal={setVal} />
          <CfgSection title="命令配置" icon={Terminal} fields={[
            { path: 'commands.native', label: '原生命令', type: 'select' as const, options: ['auto', 'on', 'off'] },
            { path: 'commands.nativeSkills', label: '原生技能', type: 'select' as const, options: ['auto', 'on', 'off'] },
            { path: 'commands.restart', label: '允许重启', type: 'toggle' as const },
          ]} getVal={getVal} setVal={setVal} />
          <CfgSection title="认证密钥" icon={Key} fields={[
            { path: 'env.vars.ANTHROPIC_API_KEY', label: 'Anthropic API Key', type: 'password' as const },
            { path: 'env.vars.OPENAI_API_KEY', label: 'OpenAI API Key', type: 'password' as const },
            { path: 'env.vars.GOOGLE_API_KEY', label: 'Google API Key', type: 'password' as const },
          ]} getVal={getVal} setVal={setVal} />
          <SudoPasswordSection />
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
                  <p className="text-xs text-gray-600">{versionInfo.lastCheckedAt ? new Date(versionInfo.lastCheckedAt).toLocaleString('zh-CN') : versionInfo.checkedAt ? new Date(versionInfo.checkedAt).toLocaleString('zh-CN') : '-'}</p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={async () => {
                setChecking(true);
                try {
                  const r = await api.checkUpdate();
                  if (r.ok) {
                    setVersionInfo({ ...versionInfo, ...r, lastCheckedAt: r.checkedAt || new Date().toISOString() });
                    setMsg(r.updateAvailable ? `发现新版本: ${r.latestVersion}` : '已是最新版本');
                  } else { setMsg('检查更新失败'); }
                } catch { setMsg('检查更新失败'); }
                finally { setChecking(false); setTimeout(() => setMsg(''), 3000); }
              }} disabled={checking || updating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
                {checking ? '检查中...' : '检查更新'}
              </button>
              {versionInfo.updateAvailable && !updating && updateStatus !== 'running' && (
                <button onClick={async () => {
                  if (!confirm('确定要更新 OpenClaw？更新过程中服务可能短暂中断。')) return;
                  setUpdating(true); setUpdateLog([]); setUpdateStatus('running');
                  try {
                    const r = await api.doUpdate();
                    if (!r.ok) { setMsg(r.error || '启动更新失败'); setUpdating(false); setUpdateStatus('failed'); return; }
                  } catch { setMsg('启动更新失败'); setUpdating(false); setUpdateStatus('failed'); return; }
                  // Poll update status
                  const poll = setInterval(async () => {
                    try {
                      const s = await api.getUpdateStatus();
                      if (s.ok) {
                        setUpdateLog(s.log || []);
                        setUpdateStatus(s.status);
                        if (s.status === 'success') {
                          clearInterval(poll);
                          setUpdating(false);
                          setMsg('更新完成！正在刷新...');
                          setTimeout(() => { loadVersion(); }, 2000);
                        } else if (s.status === 'failed') {
                          clearInterval(poll);
                          setUpdating(false);
                          setMsg('更新失败，请查看日志');
                        }
                      }
                    } catch { /* server might restart during update */ }
                  }, 2000);
                }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700">
                  <Package size={13} />立即更新
                </button>
              )}
            </div>
            {versionInfo.updateAvailable && !updating && updateStatus !== 'running' && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-xs text-amber-700 dark:text-amber-300">
                有新版本可用！点击「立即更新」一键升级，或在终端运行: <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">openclaw update</code>
              </div>
            )}
            {/* Update progress */}
            {(updating || updateStatus === 'running' || updateLog.length > 0) && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  {updateStatus === 'running' && <RefreshCw size={13} className="animate-spin text-blue-500" />}
                  {updateStatus === 'success' && <CheckCircle size={13} className="text-emerald-500" />}
                  {updateStatus === 'failed' && <AlertTriangle size={13} className="text-red-500" />}
                  <span className="text-xs font-medium">
                    {updateStatus === 'running' ? '正在更新...' : updateStatus === 'success' ? '更新完成' : updateStatus === 'failed' ? '更新失败' : ''}
                  </span>
                </div>
                <div className="bg-gray-900 dark:bg-black rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-[11px] text-gray-300 space-y-0.5">
                  {updateLog.map((line, i) => <div key={i}>{line}</div>)}
                  {updateStatus === 'running' && <div className="animate-pulse text-blue-400">▌</div>}
                </div>
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
                    ['发行版', envInfo.os?.distro], ['内核', envInfo.os?.release],
                    ['主机名', envInfo.os?.hostname], ['用户', envInfo.os?.userInfo],
                    ['CPU 核心', envInfo.os?.cpus ? `${envInfo.os.cpus} 核` : '-'],
                    ['CPU 型号', envInfo.os?.cpuModel],
                    ['总内存', envInfo.os?.totalMemMB ? `${(envInfo.os.totalMemMB / 1024).toFixed(1)} GB (${envInfo.os.totalMemMB} MB)` : '-'],
                    ['可用内存', envInfo.os?.freeMemMB ? `${(envInfo.os.freeMemMB / 1024).toFixed(1)} GB (${envInfo.os.freeMemMB} MB)` : '-'],
                    ['系统运行', envInfo.os?.uptime ? formatEnvUptime(envInfo.os.uptime) : '-'],
                    ['负载均值', envInfo.os?.loadAvg],
                  ].map(([label, value]) => (
                    <div key={label as string}><p className="text-[10px] text-gray-500">{label}</p><p className="text-xs font-medium truncate" title={String(value || '')}>{(value as string) || '-'}</p></div>
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
                    { name: 'Bun', value: envInfo.software?.bun, required: false },
                    { name: 'Python', value: envInfo.software?.python, required: false },
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

      {/* Docs tab removed — merged into Identity & 文档 tab */}
    </div>
  );
}

function AdminPasswordField({ token, onCopy }: { token: string; onCopy: () => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input type={visible ? 'text' : 'password'} readOnly value={token}
          className="w-full px-3 py-2 pr-9 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 font-mono" />
        <button onClick={() => setVisible(!visible)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      <button onClick={() => { navigator.clipboard.writeText(token); onCopy(); }}
        className="px-3 py-2 text-xs rounded-lg bg-violet-100 dark:bg-violet-900 text-violet-600 hover:bg-violet-200 shrink-0">复制</button>
    </div>
  );
}

function formatEnvUptime(s: number) {
  if (s < 60) return `${s}秒`;
  if (s < 3600) return `${Math.floor(s / 60)}分${s % 60}秒`;
  if (s < 86400) return `${Math.floor(s / 3600)}时${Math.floor((s % 3600) / 60)}分`;
  return `${Math.floor(s / 86400)}天${Math.floor((s % 86400) / 3600)}时${Math.floor((s % 3600) / 60)}分`;
}

function SudoPasswordSection() {
  const [pwd, setPwd] = useState('');
  const [configured, setConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getSudoPassword().then(r => { if (r.ok) setConfigured(r.configured); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await api.setSudoPassword(pwd);
      if (r.ok) { setMsg('已保存'); setConfigured(true); setPwd(''); }
      else setMsg('保存失败');
    } catch { setMsg('保存失败'); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2">
        <Key size={14} className="text-amber-500" />
        <h3 className="text-sm font-semibold">Sudo 密码</h3>
        {configured && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600">已配置</span>}
        {!configured && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">未配置</span>}
      </div>
      <div className="px-4 pb-3 space-y-2">
        <p className="text-[10px] text-gray-400">用于系统更新等需要 sudo 权限的操作</p>
        <div className="flex items-center gap-2">
          <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder={configured ? '••••••（已配置，留空不修改）' : '输入 sudo 密码'}
            className="flex-1 px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" />
          <button onClick={handleSave} disabled={saving || !pwd}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
        {msg && <p className="text-[10px] text-emerald-600">{msg}</p>}
      </div>
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

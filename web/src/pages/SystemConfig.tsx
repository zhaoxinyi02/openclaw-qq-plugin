import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import {
  Save, RefreshCw, ChevronDown, ChevronRight,
  Brain, MessageSquare, Globe, Terminal, Webhook,
  Users, Eye, EyeOff, Key, Plus, Trash2,
  Monitor, HardDrive, FileText, Archive, RotateCcw,
  CheckCircle, AlertTriangle, Package, Box, Shield, Command
} from 'lucide-react';
import { useI18n } from '../i18n';

const KNOWN_PROVIDERS: { id: string; name: string; nameZh?: string; baseUrl: string; apiType?: string; apiKeyUrl: string; models: string[]; category: 'cn' | 'intl' | 'agg' }[] = [
  // === 国内主流 ===
  { id: 'volcengine', name: 'Volcengine Ark', nameZh: '火山方舟（字节）', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', apiKeyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey', models: ['doubao-pro-256k', 'doubao-lite-128k', 'deepseek-v3', 'deepseek-r1'], category: 'cn' },
  { id: 'deepseek', name: 'DeepSeek', nameZh: '深度求索', baseUrl: 'https://api.deepseek.com/v1', apiKeyUrl: 'https://platform.deepseek.com/api_keys', models: ['deepseek-chat', 'deepseek-reasoner'], category: 'cn' },
  { id: 'siliconflow', name: 'SiliconFlow', nameZh: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', apiKeyUrl: 'https://cloud.siliconflow.cn/account/ak', models: ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen2.5-72B-Instruct', 'THUDM/glm-4-9b-chat'], category: 'cn' },
  { id: 'dashscope', name: 'DashScope', nameZh: '通义千问（阿里）', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey', models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-vl-max', 'qwen-coder-plus'], category: 'cn' },
  { id: 'ernie', name: 'Wenxin', nameZh: '文心一言（百度）', baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat', apiKeyUrl: 'https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application', models: ['ernie-4.0-8k', 'ernie-3.5-8k', 'ernie-speed-128k', 'ernie-lite-8k'], category: 'cn' },
  { id: 'hunyuan', name: 'Hunyuan', nameZh: '混元（腾讯）', baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1', apiKeyUrl: 'https://console.cloud.tencent.com/cam/capi', models: ['hunyuan-pro', 'hunyuan-standard', 'hunyuan-lite', 'hunyuan-vision'], category: 'cn' },
  { id: 'zhipu', name: 'Zhipu AI', nameZh: '智谱清言（GLM）', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys', models: ['glm-4-plus', 'glm-4', 'glm-4-flash', 'glm-4v-plus'], category: 'cn' },
  { id: 'yi', name: 'Yi / Lingyiwanwu', nameZh: '零一万物', baseUrl: 'https://api.lingyiwanwu.com/v1', apiKeyUrl: 'https://platform.lingyiwanwu.com/apikeys', models: ['yi-large', 'yi-medium', 'yi-small', 'yi-vision'], category: 'cn' },
  { id: 'minimax', name: 'MiniMax', nameZh: 'MiniMax', baseUrl: 'https://api.minimax.chat/v1', apiKeyUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key', models: ['MiniMax-Text-01', 'abab6.5s-chat', 'abab5.5-chat'], category: 'cn' },
  { id: 'spark', name: 'Spark', nameZh: '星火（讯飞）', baseUrl: 'https://spark-api-open.xf-yun.com/v1', apiKeyUrl: 'https://console.xfyun.cn/services/bm35', models: ['spark-pro-128k', 'spark-lite', 'spark-max'], category: 'cn' },
  // === 国际主流 ===
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKeyUrl: 'https://platform.openai.com/api-keys', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini', 'o3-mini'], category: 'intl' },
  { id: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', apiType: 'anthropic', apiKeyUrl: 'https://console.anthropic.com/settings/keys', models: ['claude-sonnet-4-5', 'claude-haiku-3-5', 'claude-3-opus'], category: 'intl' },
  { id: 'google', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiType: 'google-genai', apiKeyUrl: 'https://aistudio.google.com/app/apikey', models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'], category: 'intl' },
  { id: 'xai', name: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1', apiKeyUrl: 'https://console.x.ai/', models: ['grok-3', 'grok-3-mini', 'grok-2'], category: 'intl' },
  { id: 'groq', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', apiKeyUrl: 'https://console.groq.com/keys', models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'], category: 'intl' },
  // === 聚合平台 ===
  { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', apiKeyUrl: 'https://openrouter.ai/keys', models: ['anthropic/claude-sonnet-4-5', 'openai/gpt-4o', 'google/gemini-2.5-pro', 'deepseek/deepseek-r1'], category: 'agg' },
  { id: 'together', name: 'Together AI', baseUrl: 'https://api.together.xyz/v1', apiKeyUrl: 'https://api.together.xyz/settings/api-keys', models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Qwen/Qwen2.5-72B-Instruct-Turbo'], category: 'agg' },
  { id: 'nvidia', name: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1', apiKeyUrl: 'https://build.nvidia.com/models', models: ['meta/llama-3.1-405b-instruct', 'minimaxai/minimax-m2.1'], category: 'agg' },
];

type ConfigTab = 'models' | 'identity' | 'general' | 'version' | 'env';

export default function SystemConfig() {
  const { t: i18n } = useI18n();
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
  const [showRestartPrompt, setShowRestartPrompt] = useState(false);
  const [restarting, setRestarting] = useState(false);

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
      setMsg(i18n.sysConfig.saveSuccess);
      // If on models tab, prompt to restart gateway
      if (tab === 'models') {
        setMsg('✅ 配置已保存！模型配置变更需要重启 OpenClaw 网关才能生效。');
        setShowRestartPrompt(true);
      }
      setTimeout(() => setMsg(''), 6000);
    } catch (err) { setMsg(i18n.sysConfig.saveFailed + ': ' + String(err)); }
    finally { setSaving(false); }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try { const r = await api.createBackup(); if (r.ok) { setMsg(i18n.sysConfig.backupConfig + ' ' + i18n.common.success); loadVersion(); } }
    catch (err) { setMsg(i18n.common.failed + ': ' + String(err)); }
    finally { setBackingUp(false); setTimeout(() => setMsg(''), 3000); }
  };

  const handleRestore = async (name: string) => {
    if (!confirm(i18n.sysConfig.restoreConfirm)) return;
    try {
      const r = await api.restoreBackup(name);
      if (r.ok) { setMsg(i18n.common.success); loadConfig(); loadVersion(); }
    } catch (err) { setMsg(i18n.common.failed + ': ' + String(err)); }
    setTimeout(() => setMsg(''), 4000);
  };

  const handleSaveDoc = async () => {
    if (!selectedDoc) return;
    setDocSaving(true);
    try { await api.saveDoc(selectedDoc.path, docContent); setMsg(i18n.common.success); loadDocs(); }
    catch (err) { setMsg(i18n.sysConfig.saveFailed + ': ' + String(err)); }
    finally { setDocSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  if (loading) return <div className="text-center py-12 text-gray-400 text-xs">{i18n.common.loading}</div>;

  const providers = config?.models?.providers || {};
  const primaryModel = config?.agents?.defaults?.model?.primary || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{i18n.sysConfig.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{i18n.sysConfig.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadConfig} className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors shadow-sm">
            <RefreshCw size={14} />{i18n.common.refresh}
          </button>
          {(tab === 'models' || tab === 'general' || tab === 'identity') && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-200 dark:shadow-none transition-all hover:shadow-md hover:shadow-violet-200 dark:hover:shadow-none disabled:opacity-50">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? i18n.sysConfig.savingConfig : i18n.sysConfig.saveAll}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${msg.includes('失败') ? 'bg-red-50 dark:bg-red-900/30 text-red-600' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'}`}>
          {msg.includes('失败') ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800 overflow-x-auto pb-px">
        {([
          { id: 'models' as ConfigTab, label: i18n.sysConfig.tabModels, icon: Brain },
          { id: 'identity' as ConfigTab, label: i18n.sysConfig.tabIdentity, icon: Users },
          { id: 'general' as ConfigTab, label: i18n.sysConfig.tabGeneral, icon: Terminal },
          { id: 'version' as ConfigTab, label: i18n.sysConfig.tabVersion, icon: Package },
          { id: 'env' as ConfigTab, label: i18n.sysConfig.tabEnv, icon: Monitor },
        ]).map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${tab === tb.id ? 'border-violet-600 text-violet-700 dark:text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <tb.icon size={16} />{tb.label}
          </button>
        ))}
      </div>

      {/* === Models Tab === */}
      {tab === 'models' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-200">
          {showRestartPrompt && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>模型配置已保存。OpenClaw 需要<strong>重启网关</strong>才能使用新模型。</span>
                </div>
                <button onClick={async () => {
                  setRestarting(true);
                  try {
                    await api.restartGateway();
                    setMsg('✅ 网关重启请求已发送，请等待几秒钟');
                    setShowRestartPrompt(false);
                  } catch { setMsg('❌ 重启失败'); }
                  finally { setRestarting(false); setTimeout(() => setMsg(''), 4000); }
                }} disabled={restarting}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 shadow-sm transition-all whitespace-nowrap shrink-0">
                  <RefreshCw size={12} className={restarting ? 'animate-spin' : ''} />
                  {restarting ? '重启中...' : '重启网关'}
                </button>
              </div>
              <div className="px-4 pb-3 text-[11px] text-amber-600/80 dark:text-amber-400/70 leading-relaxed">
                💡 重启后如果 OpenClaw 回复「Message ordering conflict」，请发送 <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded font-mono">/new</code> 开始新会话即可。这是 OpenClaw 切换模型后的正常现象。
              </div>
            </div>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Brain size={16} className="text-violet-500" /> {i18n.sysConfig.primaryModel}
            </h3>
            <div className="relative">
              <select value={primaryModel} onChange={e => setVal('agents.defaults.model.primary', e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-mono appearance-none cursor-pointer">
                <option value="">选择主模型...</option>
                {Object.entries(providers).map(([pid, prov]: [string, any]) => {
                  const hasKey = !!(prov as any).apiKey;
                  return (prov.models || []).map((m: any) => {
                    const mid = typeof m === 'string' ? m : m.id;
                    const val = `${pid}/${mid}`;
                    return <option key={val} value={val} disabled={!hasKey} style={!hasKey ? { color: '#9ca3af' } : {}}>{val}{!hasKey ? ' (未配置 API Key)' : ''}</option>;
                  });
                })}
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {primaryModel && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                当前: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-violet-600 dark:text-violet-400 font-mono">{primaryModel}</code>
              </p>
            )}
          </div>

          {/* Quick add provider from presets */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Plus size={16} className="text-violet-500" /> 快速添加模型服务商
            </h3>
            <p className="text-xs text-gray-500">点击服务商名称一键添加，填入 API Key 即可使用</p>
            <div className="space-y-2">
              {[
                { label: '国内主流', cat: 'cn' as const, color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/30 hover:bg-red-100 dark:hover:bg-red-900/40' },
                { label: '国际主流', cat: 'intl' as const, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-900/40' },
                { label: '聚合平台', cat: 'agg' as const, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-900/40' },
              ].map(({ label, cat, color }) => (
                <div key={cat} className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider w-12 shrink-0">{label}</span>
                  {KNOWN_PROVIDERS.filter(kp => kp.category === cat).map(kp => {
                    const alreadyAdded = Object.keys(providers).includes(kp.id);
                    return (
                      <button key={kp.id} disabled={alreadyAdded} onClick={() => {
                        const clone = JSON.parse(JSON.stringify(config));
                        if (!clone.models) clone.models = {};
                        if (!clone.models.providers) clone.models.providers = {};
                        clone.models.providers[kp.id] = {
                          baseUrl: kp.baseUrl,
                          apiKey: '',
                          api: kp.apiType || 'openai-completions',
                          models: kp.models.map(m => ({ id: m, name: m, contextWindow: 128000, maxTokens: 8192 })),
                        };
                        setConfig(clone);
                      }} className={`px-2 py-0.5 text-[10px] font-medium rounded-md border transition-colors ${alreadyAdded ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700' : color}`}
                        title={alreadyAdded ? '已添加' : `点击添加 ${kp.nameZh || kp.name}`}>
                        {kp.nameZh || kp.name}{alreadyAdded ? ' ✓' : ''}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{i18n.sysConfig.modelProviders} ({Object.keys(providers).length})</h3>
              <button onClick={() => {
                const id = `provider-${Date.now()}`;
                setVal(`models.providers.${id}`, { baseUrl: '', apiKey: '', api: 'openai-completions', models: [] });
              }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors">
                <Plus size={14} />{i18n.sysConfig.addProvider}
              </button>
            </div>

            {Object.entries(providers).map(([pid, prov]: [string, any]) => (
              <div key={pid} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden transition-all hover:shadow-md">
                <div className="p-5 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 text-violet-600 dark:text-violet-400">
                        <Brain size={18} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <input value={pid} onChange={e => {
                          const newId = e.target.value;
                          if (!newId || newId === pid) return;
                          const clone = JSON.parse(JSON.stringify(config));
                          clone.models.providers[newId] = clone.models.providers[pid];
                          delete clone.models.providers[pid];
                          const primary = clone.agents?.defaults?.model?.primary || '';
                          if (primary.startsWith(pid + '/')) {
                            clone.agents.defaults.model.primary = newId + primary.slice(pid.length);
                          }
                          setConfig(clone);
                        }} className="text-base font-bold bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:border-violet-500 outline-none px-1 py-0.5 min-w-[120px] transition-colors text-gray-900 dark:text-white" title="点击编辑 Provider ID" />
                        {prov.models?.length > 0 && <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-50 dark:bg-gray-800 rounded-full">{prov.models.length} 模型</span>}
                      </div>
                    </div>
                    <button onClick={() => {
                      const clone = JSON.parse(JSON.stringify(config));
                      delete clone.models.providers[pid];
                      setConfig(clone);
                    }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                  </div>

                  <div className="space-y-2 pb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mr-1">国内</span>
                      {KNOWN_PROVIDERS.filter(kp => kp.category === 'cn').map(kp => (
                        <button key={kp.id} onClick={() => {
                          const clone = JSON.parse(JSON.stringify(config));
                          if (!clone.models) clone.models = {};
                          if (!clone.models.providers) clone.models.providers = {};
                          clone.models.providers[pid] = { ...clone.models.providers[pid], baseUrl: kp.baseUrl, api: kp.apiType || 'openai-completions' };
                          setConfig(clone);
                        }} className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-100 dark:border-red-800/30" title={kp.nameZh}>
                          {kp.nameZh || kp.name}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mr-1">国际</span>
                      {KNOWN_PROVIDERS.filter(kp => kp.category === 'intl').map(kp => (
                        <button key={kp.id} onClick={() => {
                          const clone = JSON.parse(JSON.stringify(config));
                          if (!clone.models) clone.models = {};
                          if (!clone.models.providers) clone.models.providers = {};
                          clone.models.providers[pid] = { ...clone.models.providers[pid], baseUrl: kp.baseUrl, api: kp.apiType || 'openai-completions' };
                          setConfig(clone);
                        }} className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-100 dark:border-blue-800/30">
                          {kp.name}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mr-1">聚合</span>
                      {KNOWN_PROVIDERS.filter(kp => kp.category === 'agg').map(kp => (
                        <button key={kp.id} onClick={() => {
                          const clone = JSON.parse(JSON.stringify(config));
                          if (!clone.models) clone.models = {};
                          if (!clone.models.providers) clone.models.providers = {};
                          clone.models.providers[pid] = { ...clone.models.providers[pid], baseUrl: kp.baseUrl, api: kp.apiType || 'openai-completions' };
                          setConfig(clone);
                        }} className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors border border-amber-100 dark:border-amber-800/30">
                          {kp.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Base URL</label>
                      <input value={prov.baseUrl || ''} onChange={e => setVal(`models.providers.${pid}.baseUrl`, e.target.value)}
                        placeholder="https://api.openai.com/v1" className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-mono" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">API Key</label>
                        {(() => {
                          const matched = KNOWN_PROVIDERS.find(kp => prov.baseUrl?.includes(kp.baseUrl.replace('https://', '').split('/')[0]));
                          return matched ? (
                            <a href={matched.apiKeyUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1 hover:underline">
                              <Key size={10} /> 获取 API Key
                            </a>
                          ) : null;
                        })()}
                      </div>
                      <div className="relative group">
                        <input type="password" value={prov.apiKey || ''} onChange={e => setVal(`models.providers.${pid}.apiKey`, e.target.value)}
                          placeholder="sk-..." className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-mono tracking-wider" />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Key size={14} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">API 类型</label>
                      <div className="relative">
                        <select value={prov.api || 'openai-completions'} onChange={e => setVal(`models.providers.${pid}.api`, e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 appearance-none cursor-pointer">
                          <option value="openai-completions">OpenAI Completions (通用)</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="google-genai">Google GenAI</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">备注 (可选)</label>
                      <input value={prov._note || ''} onChange={e => setVal(`models.providers.${pid}._note`, e.target.value)}
                        placeholder="例: 公司账号 / 个人测试" className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all" />
                    </div>
                  </div>
                  <ProviderHealthCheck pid={pid} prov={prov} />

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">模型列表</label>
                    <div className="space-y-2">
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
                        <div key={idx} className="p-3 rounded-lg bg-gray-50/80 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 space-y-3 group hover:border-violet-200 dark:hover:border-violet-800 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded bg-white dark:bg-gray-800 shadow-sm text-violet-500">
                              <Box size={14} />
                            </div>
                            <input value={mObj.id || ''} onChange={e => updateModel('id', e.target.value)}
                              placeholder="模型 ID" className="flex-1 px-2 py-1 text-sm font-mono font-medium bg-transparent border-b border-transparent focus:border-violet-500 outline-none transition-colors" />
                            <button onClick={() => {
                              const clone = JSON.parse(JSON.stringify(config));
                              clone.models.providers[pid].models.splice(idx, 1);
                              setConfig(clone);
                            }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                          </div>
                          <div className="grid grid-cols-3 gap-3 pl-9">
                            <div>
                              <label className="text-[10px] text-gray-400 font-medium block mb-1">Context Window</label>
                              <input type="number" value={mObj.contextWindow ?? ''} onChange={e => updateModel('contextWindow', e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="128k" className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 font-mono focus:border-violet-500 outline-none" />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 font-medium block mb-1">Max Tokens</label>
                              <input type="number" value={mObj.maxTokens ?? ''} onChange={e => updateModel('maxTokens', e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="8k" className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 font-mono focus:border-violet-500 outline-none" />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 font-medium block mb-1">推理模型</label>
                              <button onClick={() => updateModel('reasoning', !mObj.reasoning)}
                                className={`w-full px-2 py-1 text-xs rounded border transition-colors text-left flex items-center gap-1.5 ${mObj.reasoning ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                <div className={`w-2 h-2 rounded-full ${mObj.reasoning ? 'bg-violet-500' : 'bg-gray-300'}`}></div>
                                {mObj.reasoning ? '是' : '否'}
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                      <div className="flex gap-2 mt-2 flex-wrap pt-1">
                        <button onClick={() => {
                          const clone = JSON.parse(JSON.stringify(config));
                          if (!clone.models.providers[pid].models) clone.models.providers[pid].models = [];
                          clone.models.providers[pid].models.push({ id: '', name: '', contextWindow: 128000, maxTokens: 8192 });
                          setConfig(clone);
                        }} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 border-dashed hover:border-solid transition-all flex items-center gap-1.5">
                          <Plus size={12} /> 自定义模型
                        </button>
                        {KNOWN_PROVIDERS.filter(kp => prov.baseUrl?.includes(kp.baseUrl.replace('https://', '').split('/')[0])).flatMap(kp =>
                          kp.models.filter(m => !(prov.models || []).find((pm: any) => (typeof pm === 'string' ? pm : pm.id) === m)).slice(0, 4).map(m => (
                            <button key={m} onClick={() => {
                              const clone = JSON.parse(JSON.stringify(config));
                              if (!clone.models.providers[pid].models) clone.models.providers[pid].models = [];
                              clone.models.providers[pid].models.push({ id: m, name: m, contextWindow: 128000, maxTokens: 8192 });
                              setConfig(clone);
                            }} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1.5">
                              <Plus size={12} /> {m}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === Identity & Messages Tab === */}
      {tab === 'identity' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-200">
          {/* Login password display + change */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600">
                  <Key size={16} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">管理后台登录密码</h3>
              </div>
              <AdminPasswordField token={adminToken} onCopy={() => { setMsg('密码已复制'); setTimeout(() => setMsg(''), 2000); }} />
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                此密码在 .env 文件中的 ADMIN_TOKEN 配置
              </p>
            </div>
            <ChangePasswordSection />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
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
            </div>
            
            <div className="space-y-6">
              <CfgSection title="Agent 默认设置" icon={Brain} fields={[
                { path: 'agents.defaults.model.contextTokens', label: '上下文Token数', type: 'number' as const, placeholder: '200000' },
                { path: 'agents.defaults.model.maxTokens', label: '最大输出Token', type: 'number' as const, placeholder: '8192' },
                { path: 'agents.defaults.maxConcurrent', label: '最大并发', type: 'number' as const, placeholder: '4' },
                { path: 'agents.defaults.compaction.mode', label: '压缩模式', type: 'select' as const, options: ['default', 'aggressive', 'off'] },
                { path: 'agents.defaults.compaction.maxHistoryShare', label: '历史占比上限', type: 'number' as const, placeholder: '0.5' },
              ]} getVal={getVal} setVal={setVal} />
            </div>
          </div>

          {/* Identity MD files editor */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden flex flex-col h-[600px]">
            <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">身份文档 (Markdown)</h3>
                <p className="text-xs text-gray-500 mt-0.5">编辑核心人格设定与系统提示词</p>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden">
              <div className="p-3 border-r border-gray-100 dark:border-gray-800 overflow-y-auto bg-gray-50/30 dark:bg-gray-900/30 space-y-1">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 py-2">文件列表</h4>
                {identityDocs.map((doc: any) => (
                  <button key={doc.name} onClick={() => { setSelectedIdentityDoc(doc); setIdentityContent(doc.content || ''); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs transition-all duration-200 group ${
                      selectedIdentityDoc?.name === doc.name
                        ? 'bg-white dark:bg-gray-800 text-violet-700 dark:text-violet-300 font-medium shadow-sm ring-1 ring-violet-100 dark:ring-violet-900'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm'
                    }`}>
                    <div className={`shrink-0 ${selectedIdentityDoc?.name === doc.name ? 'text-violet-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                      <FileText size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{doc.name}</div>
                      <div className="text-[10px] text-gray-400 truncate opacity-80">{doc.exists === false ? '未创建' : `${(doc.size / 1024).toFixed(1)} KB`}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="lg:col-span-3 flex flex-col h-full bg-white dark:bg-gray-800">
                {selectedIdentityDoc ? (
                  <>
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-800 z-10">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedIdentityDoc.name}</span>
                      </div>
                      <button onClick={async () => {
                        setIdentitySaving(true);
                        try {
                          await api.saveIdentityDoc(selectedIdentityDoc.path, identityContent);
                          setMsg('文档已保存');
                          loadIdentityDocs();
                        } catch (err) { setMsg('保存失败: ' + String(err)); }
                        finally { setIdentitySaving(false); setTimeout(() => setMsg(''), 3000); }
                      }} disabled={identitySaving}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 shadow-sm transition-all hover:shadow-md hover:shadow-violet-200 dark:hover:shadow-none">
                        {identitySaving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                        {identitySaving ? '保存中...' : '保存更改'}
                      </button>
                    </div>
                    <div className="flex-1 relative">
                      <textarea value={identityContent} onChange={e => setIdentityContent(e.target.value)}
                        className="absolute inset-0 w-full h-full p-5 text-sm font-mono leading-relaxed bg-transparent border-none outline-none resize-none text-gray-800 dark:text-gray-200" 
                        spellCheck={false} />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                    <FileText size={48} className="opacity-10" />
                    <p className="text-sm">选择左侧文档进行编辑</p>
                  </div>
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
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6 space-y-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package size={16} className="text-violet-500" /> OpenClaw 版本
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                  <Package size={20} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">当前版本</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white font-mono mt-0.5">{versionInfo.currentVersion || '加载中...'}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${versionInfo.updateAvailable ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                  {versionInfo.updateAvailable ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">最新版本</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white font-mono mt-0.5">{versionInfo.latestVersion || '-'}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <RefreshCw size={20} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">上次检查</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 font-medium">{versionInfo.lastCheckedAt ? new Date(versionInfo.lastCheckedAt).toLocaleString('zh-CN') : versionInfo.checkedAt ? new Date(versionInfo.checkedAt).toLocaleString('zh-CN') : '-'}</p>
                </div>
              </div>
            </div>

            <UpdateSection versionInfo={versionInfo} updating={updating} setUpdating={setUpdating} updateStatus={updateStatus} setUpdateStatus={setUpdateStatus} updateLog={updateLog} setUpdateLog={setUpdateLog} checking={checking} setChecking={setChecking} setVersionInfo={setVersionInfo} setMsg={setMsg} loadVersion={loadVersion} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Archive size={16} className="text-violet-500" /> 备份与恢复
              </h3>
              <button onClick={handleBackup} disabled={backingUp}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 shadow-sm shadow-violet-200 dark:shadow-none transition-all hover:shadow-md hover:shadow-violet-200 dark:hover:shadow-none">
                {backingUp ? <RefreshCw size={14} className="animate-spin" /> : <Archive size={14} />}
                {backingUp ? '备份中...' : '立即备份'}
              </button>
            </div>
            <p className="text-xs text-gray-500">备份包含 openclaw.json 配置和定时任务。恢复前会自动备份当前配置。</p>
            
            {backups.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">暂无备份记录</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {backups.map((b: any) => (
                  <div key={b.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-800 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-white dark:bg-gray-800 shadow-sm text-gray-400 group-hover:text-violet-500 transition-colors">
                        <Archive size={16} />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300">{b.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(b.time).toLocaleString('zh-CN')} · <span className="font-mono">{(b.size / 1024).toFixed(1)} KB</span></p>
                      </div>
                    </div>
                    <button onClick={() => handleRestore(b.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-all">
                      <RotateCcw size={12} /> 恢复
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
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-200">
          {envLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <RefreshCw size={32} className="animate-spin text-violet-500/50" />
              <p className="text-sm">检测运行环境中...</p>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Monitor size={16} className="text-violet-500" /> 操作系统
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6">
                  {[
                    ['平台', envInfo.os?.platform, 'bg-gray-100 dark:bg-gray-800'], 
                    ['架构', envInfo.os?.arch, 'bg-gray-100 dark:bg-gray-800'],
                    ['发行版', envInfo.os?.distro, 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'], 
                    ['内核', envInfo.os?.release, 'bg-gray-100 dark:bg-gray-800'],
                    ['主机名', envInfo.os?.hostname, 'bg-gray-100 dark:bg-gray-800'], 
                    ['用户', envInfo.os?.userInfo, 'bg-gray-100 dark:bg-gray-800'],
                    ['CPU 核心', envInfo.os?.cpus ? `${envInfo.os.cpus} 核` : '-', 'bg-gray-100 dark:bg-gray-800'],
                    ['CPU 型号', envInfo.os?.cpuModel, 'bg-gray-100 dark:bg-gray-800 col-span-2 md:col-span-1'],
                    ['总内存', envInfo.os?.totalMemMB ? `${(envInfo.os.totalMemMB / 1024).toFixed(1)} GB` : '-', 'bg-gray-100 dark:bg-gray-800'],
                    ['可用内存', envInfo.os?.freeMemMB ? `${(envInfo.os.freeMemMB / 1024).toFixed(1)} GB` : '-', 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'],
                    ['系统运行', envInfo.os?.uptime ? formatEnvUptime(envInfo.os.uptime) : '-', 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'],
                    ['负载均值', envInfo.os?.loadAvg, 'bg-gray-100 dark:bg-gray-800'],
                  ].map(([label, value, bg]) => (
                    <div key={label as string} className={value === envInfo.os?.cpuModel ? "col-span-2 md:col-span-1" : ""}>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                      <p className={`text-xs font-medium truncate px-2 py-1 rounded-md inline-block max-w-full ${bg || 'bg-gray-50 dark:bg-gray-900'}`} title={String(value || '')}>{(value as string) || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <HardDrive size={16} className="text-violet-500" /> 软件环境
                </h3>
                <div className="space-y-3">
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
                      <div key={sw.name} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-800 transition-colors">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${installed ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                          {installed ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                        </div>
                        <div className="w-24">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{sw.name}</span>
                          {sw.required && <span className="block text-[10px] text-amber-600 dark:text-amber-500 font-medium">必需组件</span>}
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-mono flex-1 truncate bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-100 dark:border-gray-700">{sw.value || '未检测'}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${installed ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
                          {installed ? '已安装' : '未安装'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-xl border border-violet-100 dark:border-violet-800/30 p-6 space-y-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Command size={16} className="text-violet-600 dark:text-violet-400" /> 快速安装指南
                </h3>
                <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
                  <div>
                    <strong className="block text-gray-900 dark:text-white mb-1">Docker:</strong> 
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg p-2 border border-violet-100 dark:border-violet-800/50 font-mono text-gray-600 dark:text-gray-400 select-all">
                      curl -fsSL https://get.docker.com | sh
                    </div>
                  </div>
                  <div>
                    <strong className="block text-gray-900 dark:text-white mb-1">OpenClaw:</strong> 
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg p-2 border border-violet-100 dark:border-violet-800/50 font-mono text-gray-600 dark:text-gray-400 select-all">
                      curl -fsSL https://get.openclaw.ai | bash
                    </div>
                  </div>
                  <div>
                    <strong className="block text-gray-900 dark:text-white mb-1">Node.js:</strong> 
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg p-2 border border-violet-100 dark:border-violet-800/50 font-mono text-gray-600 dark:text-gray-400 select-all">
                      curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
                    </div>
                  </div>
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
          className="w-full pl-3 pr-10 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 font-mono text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all" />
        <button onClick={() => setVisible(!visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      <button onClick={() => { navigator.clipboard.writeText(token); onCopy(); }}
        className="px-3 py-2 text-xs font-medium rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors border border-violet-100 dark:border-violet-800/30">
        复制
      </button>
    </div>
  );
}

function formatEnvUptime(s: number) {
  if (s < 60) return `${Math.floor(s)}秒`;
  if (s < 3600) return `${Math.floor(s / 60)}分${Math.floor(s % 60)}秒`;
  if (s < 86400) return `${Math.floor(s / 3600)}时${Math.floor((s % 3600) / 60)}分`;
  return `${Math.floor(s / 86400)}天${Math.floor((s % 86400) / 3600)}时${Math.floor(((s % 86400) % 3600) / 60)}分`;
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600">
            <Shield size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Sudo 密码</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">用于系统更新等需要 sudo 权限的操作</p>
          </div>
        </div>
        {configured ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-100 dark:border-emerald-900/50">已配置</span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium border border-gray-200 dark:border-gray-700">未配置</span>
        )}
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} 
              placeholder={configured ? '••••••（已配置，留空不修改）' : '输入 sudo 密码'}
              className="w-full pl-4 pr-4 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-gray-400" />
          </div>
          <button onClick={handleSave} disabled={saving || !pwd}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 shadow-sm transition-all hover:shadow-md hover:shadow-amber-200 dark:hover:shadow-none">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
        {msg && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
            <CheckCircle size={12} /> {msg}
          </div>
        )}
      </div>
    </div>
  );
}

function ChangePasswordSection() {
  const { t } = useI18n();
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(true);

  const handleChange = async () => {
    if (!oldPwd || !newPwd) return;
    if (newPwd !== confirmPwd) { setMsg(t.sysConfig?.passwordMismatch || '两次输入的密码不一致'); setMsgOk(false); setTimeout(() => setMsg(''), 3000); return; }
    if (newPwd.length < 4) { setMsg(t.sysConfig?.passwordTooShort || '密码至少4位'); setMsgOk(false); setTimeout(() => setMsg(''), 3000); return; }
    setSaving(true);
    try {
      const r = await api.changePassword(oldPwd, newPwd);
      if (r.ok) {
        setMsg(t.sysConfig?.passwordChanged || '密码修改成功，即将退出登录...');
        setMsgOk(true);
        setTimeout(() => { localStorage.removeItem('admin-token'); window.location.reload(); }, 2000);
      } else {
        setMsg(r.error === 'Wrong current password' ? (t.sysConfig?.wrongPassword || '当前密码错误') : (r.error || '修改失败'));
        setMsgOk(false);
      }
    } catch { setMsg('修改失败'); setMsgOk(false); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 4000); }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30">
        <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600">
          <Key size={16} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t.sysConfig?.changePassword || '修改管理密码'}</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">{t.sysConfig?.changePasswordDesc || '修改 ClawPanel 管理后台登录密码，修改后需重新登录'}</p>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)}
          placeholder={t.sysConfig?.currentPassword || '当前密码'}
          className="w-full px-4 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-gray-400" />
        <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
          placeholder={t.sysConfig?.newPassword || '新密码'}
          className="w-full px-4 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-gray-400" />
        <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
          placeholder={t.sysConfig?.confirmPassword || '确认新密码'}
          className="w-full px-4 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-gray-400" />
        <button onClick={handleChange} disabled={saving || !oldPwd || !newPwd || !confirmPwd}
          className="w-full px-4 py-2.5 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 shadow-sm transition-all">
          {saving ? '修改中...' : (t.sysConfig?.changePasswordBtn || '修改密码')}
        </button>
        {msg && (
          <div className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border ${msgOk ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' : 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'}`}>
            {msgOk ? <CheckCircle size={12} /> : <AlertTriangle size={12} />} {msg}
          </div>
        )}
      </div>
    </div>
  );
}

function UpdateSection({ versionInfo, updating, setUpdating, updateStatus, setUpdateStatus, updateLog, setUpdateLog, checking, setChecking, setVersionInfo, setMsg, loadVersion }: any) {
  const logRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [updateLog]);

  // Elapsed timer
  useEffect(() => {
    if (updateStatus === 'running') {
      if (!startTimeRef.current) startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (updateStatus !== 'running') startTimeRef.current = 0;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [updateStatus]);

  const startUpdate = async () => {
    if (!confirm('确定要更新 OpenClaw？更新过程中服务可能短暂中断。\n\n注意：需要在宿主机运行 update-watcher.sh 脚本来执行实际更新。')) return;
    setUpdating(true); setUpdateLog(['⏳ 发送更新请求...']); setUpdateStatus('running'); setElapsed(0); startTimeRef.current = Date.now();
    try {
      const r = await api.doUpdate();
      if (!r.ok) { setUpdateLog(['❌ ' + (r.error || '启动更新失败')]); setUpdating(false); setUpdateStatus('failed'); return; }
      setUpdateLog(['✅ 更新请求已发送，等待宿主机执行...']);
    } catch { setUpdateLog(['❌ 启动更新失败（网络错误）']); setUpdating(false); setUpdateStatus('failed'); return; }
    // Poll update status every 1s
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const s = await api.getUpdateStatus();
        if (s.ok) {
          if (s.log?.length) setUpdateLog(s.log);
          setUpdateStatus(s.status);
          if (s.status === 'success') {
            clearInterval(pollRef.current!); pollRef.current = null;
            setUpdating(false);
            setMsg('✅ 更新完成！');
            setTimeout(() => { loadVersion(); }, 2000);
          } else if (s.status === 'failed') {
            clearInterval(pollRef.current!); pollRef.current = null;
            setUpdating(false);
            setMsg('❌ 更新失败，请查看日志');
          }
        }
      } catch { /* server might restart during update */ }
    }, 1000);
  };

  const fmtElapsed = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`;

  return (
    <>
      <div className="flex items-center gap-3 pt-2">
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
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors">
          <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
          {checking ? '检查中...' : '检查更新'}
        </button>
        
        {!updating && updateStatus !== 'running' && (
          <button onClick={startUpdate}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg shadow-sm transition-all hover:shadow-md ${versionInfo.updateAvailable ? 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-amber-200 dark:hover:shadow-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
            <Package size={14} />
            {versionInfo.updateAvailable ? '立即更新' : '强制更新'}
          </button>
        )}
      </div>

      {versionInfo.updateAvailable && !updating && updateStatus !== 'running' && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/30 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>有新版本可用！点击「立即更新」一键升级，或在终端运行: <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded font-bold">openclaw update</code></span>
        </div>
      )}

      {/* Update progress */}
      {(updating || updateStatus === 'running' || updateLog.length > 0) && (
        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Terminal size={16} className="text-gray-400" />
              <span>更新日志</span>
            </div>
            <div className="flex items-center gap-3">
              {updateStatus === 'running' && (
                <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{fmtElapsed(elapsed)}</span>
              )}
              {updateStatus === 'running' && <span className="flex items-center gap-1.5 text-xs text-blue-500"><RefreshCw size={12} className="animate-spin" /> 正在更新...</span>}
              {updateStatus === 'success' && <span className="flex items-center gap-1.5 text-xs text-emerald-500"><CheckCircle size={12} /> 更新完成</span>}
              {updateStatus === 'failed' && <span className="flex items-center gap-1.5 text-xs text-red-500"><AlertTriangle size={12} /> 更新失败</span>}
              {updateStatus !== 'running' && updateLog.length > 0 && (
                <button onClick={() => { setUpdateLog([]); setUpdateStatus('idle'); }} className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">清除</button>
              )}
            </div>
          </div>
          <div ref={logRef} className="bg-gray-900 dark:bg-black rounded-xl p-4 max-h-72 overflow-y-auto font-mono text-[11px] text-gray-300 space-y-0.5 shadow-inner scroll-smooth">
            {updateLog.map((line: string, i: number) => (
              <div key={i} className={`break-all border-l-2 pl-2 py-0.5 ${line.includes('✅') || line.includes('成功') ? 'border-emerald-500 text-emerald-400' : line.includes('❌') || line.includes('失败') || line.includes('error') ? 'border-red-500 text-red-400' : line.includes('⏳') || line.includes('等待') ? 'border-blue-500 text-blue-400' : 'border-gray-700'}`}>
                {line}
              </div>
            ))}
            {updateStatus === 'running' && <div className="animate-pulse text-blue-400 pl-2 pt-1">▌</div>}
          </div>
          {updateStatus === 'running' && (
            <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
              <AlertTriangle size={10} />
              提示：更新由宿主机 update-watcher.sh 脚本执行，请确保该脚本正在运行
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ProviderHealthCheck({ pid, prov }: { pid: string; prov: any }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ healthy?: boolean; error?: string } | null>(null);

  const check = async () => {
    if (!prov.baseUrl || !prov.apiKey) { setResult({ healthy: false, error: '请先填写 Base URL 和 API Key' }); return; }
    setChecking(true); setResult(null);
    try {
      const firstModel = (prov.models || [])[0];
      const modelId = typeof firstModel === 'string' ? firstModel : firstModel?.id;
      const r = await api.checkModelHealth(prov.baseUrl, prov.apiKey, prov.api || 'openai-completions', modelId);
      setResult(r);
    } catch (err: any) {
      setResult({ healthy: false, error: err.message || '检测失败' });
    } finally { setChecking(false); }
  };

  return (
    <div className="flex items-center gap-3 pt-1">
      <button onClick={check} disabled={checking}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors disabled:opacity-50">
        {checking ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
        {checking ? '检测中...' : '检测连通性'}
      </button>
      {result && (
        <span className={`flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full border ${
          result.healthy
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-800/30'
            : 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-100 dark:border-red-800/30'
        }`}>
          {result.healthy ? <><CheckCircle size={10} /> 可用</> : <><AlertTriangle size={10} /> {result.error || '不可用'}</>}
        </span>
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden transition-all hover:shadow-md">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
        <div className={`p-2 rounded-lg transition-colors ${expanded ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1">
          <span className="text-sm font-bold text-gray-900 dark:text-white block">{title}</span>
          <span className="text-[10px] text-gray-400 mt-0.5">{fields.length} 个配置项</span>
        </div>
        {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>
      
      {expanded && (
        <div className="px-5 pb-6 pt-2 border-t border-gray-50 dark:border-gray-800/50 space-y-5 animate-in slide-in-from-top-2 duration-200">
          {fields.map(field => (
            <div key={field.path}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{field.label}</label>
                <code className="text-[9px] text-gray-400 font-mono bg-gray-50 dark:bg-gray-900 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-800">{field.path}</code>
              </div>
              
              {field.type === 'toggle' ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30">
                  <button onClick={() => setVal(field.path, !getVal(field.path))}
                    className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-violet-500 ${getVal(field.path) ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${getVal(field.path) ? 'translate-x-4' : ''}`} />
                  </button>
                  <span className={`text-xs font-medium ${getVal(field.path) ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500'}`}>
                    {getVal(field.path) ? '已启用' : '已禁用'}
                  </span>
                </div>
              ) : field.type === 'textarea' ? (
                <textarea value={getVal(field.path) || ''} onChange={e => setVal(field.path, e.target.value)}
                  placeholder={field.placeholder} rows={4}
                  className="w-full px-3.5 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none font-mono leading-relaxed" />
              ) : field.type === 'select' ? (
                <div className="relative">
                  <select value={getVal(field.path) || ''} onChange={e => setVal(field.path, e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 appearance-none cursor-pointer">
                    <option value="">选择...</option>
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              ) : (
                <div className="relative group">
                  <input type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                    value={getVal(field.path) ?? ''} onChange={e => setVal(field.path, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-gray-400" />
                  {field.type === 'password' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <Key size={14} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

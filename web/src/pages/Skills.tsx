import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  Sparkles, Search, ToggleLeft, ToggleRight, Download,
  RefreshCw, Package, Globe, Check, Loader2, ExternalLink,
} from 'lucide-react';

interface SkillEntry {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  source: string;
  version?: string;
  installedAt?: string;
  metadata?: any;
  requires?: { env?: string[]; bins?: string[] };
  path?: string;
}

const CLAWHUB_CATALOG: { id: string; name: string; description: string; descriptionZh?: string; version: string; category: string }[] = [
  { id: 'feishu', name: '飞书 / Lark', description: 'Feishu/Lark bot channel via WebSocket', descriptionZh: '飞书机器人通道插件，支持 WebSocket 连接', version: '1.1.0', category: '通道' },
  { id: 'qqbot', name: 'QQ 官方机器人', description: 'QQ Official Bot API plugin', descriptionZh: 'QQ开放平台官方Bot API插件', version: '1.2.3', category: '通道' },
  { id: 'dingtalk', name: '钉钉', description: 'DingTalk robot channel plugin', descriptionZh: '钉钉机器人通道插件', version: '0.2.0', category: '通道' },
  { id: 'wecom', name: '企业微信', description: 'WeCom (WeChat Work) app message plugin', descriptionZh: '企业微信应用消息通道插件', version: '2026.1.30', category: '通道' },
  { id: 'msteams', name: 'Microsoft Teams', description: 'Bot Framework enterprise channel plugin', descriptionZh: 'Bot Framework 企业通道插件', version: '0.3.0', category: '通道' },
  { id: 'mattermost', name: 'Mattermost', description: 'Mattermost Bot API + WebSocket plugin', descriptionZh: 'Mattermost Bot API + WebSocket 插件', version: '0.2.0', category: '通道' },
  { id: 'line', name: 'LINE', description: 'LINE Messaging API channel plugin', descriptionZh: 'LINE Messaging API 通道插件', version: '0.1.0', category: '通道' },
  { id: 'matrix', name: 'Matrix', description: 'Matrix protocol channel plugin', descriptionZh: 'Matrix 协议通道插件', version: '0.1.0', category: '通道' },
  { id: 'nextcloud-talk', name: 'Nextcloud Talk', description: 'Nextcloud Talk self-hosted chat plugin', descriptionZh: 'Nextcloud Talk 自托管聊天插件', version: '0.1.0', category: '通道' },
  { id: 'nostr', name: 'Nostr', description: 'Decentralized NIP-04 DM plugin', descriptionZh: '去中心化 NIP-04 DM 插件', version: '0.1.0', category: '通道' },
  { id: 'twitch', name: 'Twitch', description: 'Twitch Chat via IRC plugin', descriptionZh: 'Twitch Chat via IRC 插件', version: '0.1.0', category: '通道' },
  { id: 'tlon', name: 'Tlon', description: 'Urbit-based messenger plugin', descriptionZh: 'Urbit-based messenger 插件', version: '0.1.0', category: '通道' },
  { id: 'zalo', name: 'Zalo', description: 'Zalo Bot API plugin', descriptionZh: 'Zalo Bot API 插件', version: '0.1.0', category: '通道' },
];

export default function Skills() {
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [tab, setTab] = useState<'installed' | 'clawhub'>('installed');
  const [msg, setMsg] = useState('');
  const [installing, setInstalling] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [configSkill, setConfigSkill] = useState<SkillEntry | null>(null);

  useEffect(() => { loadSkills(); }, []);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const r = await api.getSkills();
      if (r.ok) setSkills(r.skills || []);
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally { setLoading(false); }
  };

  const toggleSkill = async (id: string) => {
    const skill = skills.find(s => s.id === id);
    if (!skill) return;
    const newEnabled = !skill.enabled;
    setSkills(prev => prev.map(s => s.id === id ? { ...s, enabled: newEnabled } : s));
    try {
      await api.updatePlugin(id, { enabled: newEnabled });
      setMsg(`${skill.name} 已${newEnabled ? '启用' : '禁用'}`);
      setTimeout(() => setMsg(''), 2000);
    } catch {
      setSkills(prev => prev.map(s => s.id === id ? { ...s, enabled: !newEnabled } : s));
      setMsg('操作失败');
      setTimeout(() => setMsg(''), 2000);
    }
  };

  const installedIds = new Set(skills.map(s => s.id));
  const hubFiltered = CLAWHUB_CATALOG.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.id.includes(q) || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  const handleSyncClawHub = async () => {
    setSyncing(true);
    try {
      const r = await api.syncClawHub();
      if (r.ok && r.skills) {
        setMsg(`同步成功，获取到 ${r.skills.length} 个技能`);
      } else {
        setMsg('同步完成（使用本地缓存）');
      }
    } catch { setMsg('同步失败，使用本地数据'); }
    finally { setSyncing(false); setTimeout(() => setMsg(''), 3000); }
  };

  const handleInstallHint = (id: string) => {
    setInstalling(id);
    setMsg(`请在终端运行: openclaw plugins install ${id} — 安装后刷新页面`);
    setTimeout(() => setInstalling(''), 3000);
  };

  const filtered = skills.filter(s => {
    if (filter === 'enabled' && !s.enabled) return false;
    if (filter === 'disabled' && s.enabled) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  const getSourceBadge = (source: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      installed: { label: '已安装', color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' },
      'config-ext': { label: '开发扩展', color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
      skill: { label: '技能', color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' },
      'app-skill': { label: 'OpenClaw 技能', color: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' },
      workspace: { label: '工作区', color: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' },
      script: { label: '脚本', color: 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300' },
      config: { label: '配置项', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
    };
    const badge = badges[source] || { label: source, color: 'bg-gray-100 dark:bg-gray-800 text-gray-600' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.color}`}>{badge.label}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">技能中心</h2>
          <p className="text-xs text-gray-500 mt-0.5">管理 OpenClaw 的技能插件</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadSkills} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
            <RefreshCw size={13} />刷新
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        <button onClick={() => setTab('installed')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === 'installed' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Package size={13} className="inline mr-1.5" />已安装 ({skills.length})
        </button>
        <button onClick={() => setTab('clawhub')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === 'clawhub' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Globe size={13} className="inline mr-1.5" />ClawHub 商店 ({CLAWHUB_CATALOG.length})
        </button>
      </div>

      {msg && (
        <div className={`px-3 py-2 rounded-lg text-xs ${msg.includes('失败') ? 'bg-red-50 dark:bg-red-950 text-red-600' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'}`}>
          {msg}
        </div>
      )}

      {tab === 'installed' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索技能..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" />
            </div>
            <div className="flex gap-1">
              {(['all', 'enabled', 'disabled'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${filter === f ? 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                  {f === 'all' ? '全部' : f === 'enabled' ? '已启用' : '已禁用'}
                </button>
              ))}
            </div>
          </div>

          {/* Skills list */}
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-xs">加载中...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              {search ? '没有匹配的技能' : '暂无已安装的技能'}
            </div>
          ) : (
            <div className="grid gap-2">
              {filtered.map(skill => (
                <div key={skill.id} className="card px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900 dark:to-indigo-900 flex items-center justify-center shrink-0">
                    <Sparkles size={14} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{skill.name}</span>
                      {skill.version && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">v{skill.version}</span>}
                      {getSourceBadge(skill.source)}
                      {skill.requires && (skill.requires.env || skill.requires.bins) && (
                        <button onClick={() => setConfigSkill(skill)} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900">
                          需要配置
                        </button>
                      )}
                    </div>
                    {skill.description && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{skill.description}</p>}
                  </div>
                  <button onClick={() => toggleSkill(skill.id)} className="shrink-0">
                    {skill.enabled ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-gray-300" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'clawhub' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索 ClawHub 技能..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" />
            </div>
            <button onClick={handleSyncClawHub} disabled={syncing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
              {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {syncing ? '同步中...' : '同步商店'}
            </button>
            <a href="https://clawhub.ai/skills?sort=downloads" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900">
              <ExternalLink size={13} />访问 ClawHub
            </a>
          </div>
          <div className="grid gap-2">
            {hubFiltered.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">没有匹配的技能</div>
            ) : hubFiltered.map(skill => {
              const isInstalled = installedIds.has(skill.id);
              return (
                <div key={skill.id} className="card px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 flex items-center justify-center shrink-0">
                    <Globe size={14} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{skill.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">v{skill.version}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-600">{skill.category}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">{skill.description}</p>
                    {skill.descriptionZh && <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 truncate">{skill.descriptionZh}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a href={`https://clawhub.ai/skills/${skill.id}`} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950" title="在 ClawHub 查看">
                      <ExternalLink size={13} />
                    </a>
                    {isInstalled ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600"><Check size={13} />已安装</span>
                    ) : (
                      <button onClick={() => handleInstallHint(skill.id)} disabled={installing === skill.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                        {installing === skill.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        安装
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Config Modal */}
      {configSkill && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setConfigSkill(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{configSkill.name} - 配置要求</h3>
              <button onClick={() => setConfigSkill(null)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {configSkill.requires?.env && configSkill.requires.env.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">需要的环境变量</h4>
                  {configSkill.requires.env.map(envVar => (
                    <div key={envVar} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{envVar}</code>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">必需</span>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-2">
                        请在 OpenClaw 配置中设置此环境变量，或在系统配置的"认证密钥"部分添加。
                      </p>
                      <div className="bg-gray-900 dark:bg-black rounded p-2 text-[10px] font-mono text-gray-300">
                        <div className="text-gray-500"># 方法1: 在 ~/.openclaw/openclaw.json 中添加</div>
                        <div>"env": {"{"} "vars": {"{"} "{envVar}": "your_key_here" {"}"} {"}"}</div>
                        <div className="mt-2 text-gray-500"># 方法2: 在系统环境变量中设置</div>
                        <div>export {envVar}="your_key_here"</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {configSkill.requires?.bins && configSkill.requires.bins.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">需要的二进制工具</h4>
                  {configSkill.requires.bins.map(bin => (
                    <div key={bin} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-xs font-mono text-blue-600 dark:text-blue-400">{bin}</code>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">命令行工具</span>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-2">
                        此技能需要 <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">{bin}</code> 命令行工具。
                      </p>
                      {configSkill.metadata?.openclaw?.install && (
                        <div className="space-y-1">
                          <div className="text-[10px] text-gray-500 mb-1">安装方法：</div>
                          {configSkill.metadata.openclaw.install.map((inst: any, idx: number) => (
                            <div key={idx} className="bg-gray-900 dark:bg-black rounded p-2 text-[10px] font-mono text-gray-300">
                              <div className="text-gray-500"># {inst.label || `方法 ${idx + 1}`}</div>
                              {inst.kind === 'brew' && <div>brew install {inst.formula}</div>}
                              {inst.kind === 'apt' && <div>sudo apt install {inst.package}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {configSkill.path && (
                <div className="text-[10px] text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-800">
                  技能路径: <code className="text-gray-600 dark:text-gray-300">{configSkill.path}</code>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

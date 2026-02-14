import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Radio, Wifi, WifiOff, QrCode, Key, Zap, UserCheck, Check, X } from 'lucide-react';

type ChannelDef = {
  id: string; label: string; description: string; type: 'builtin' | 'plugin';
  configFields: { key: string; label: string; type: 'text' | 'password' | 'toggle' | 'number' | 'select'; options?: string[]; placeholder?: string; help?: string }[];
  loginMethods?: ('qrcode' | 'quick' | 'password')[];
};

const CHANNEL_DEFS: ChannelDef[] = [
  { id: 'qq', label: 'QQ (NapCat)', description: 'QQ个人号，NapCat OneBot11协议', type: 'builtin',
    loginMethods: ['qrcode', 'quick', 'password'],
    configFields: [
      { key: 'wsUrl', label: 'WebSocket 地址', type: 'text', placeholder: 'ws://127.0.0.1:3001' },
      { key: 'wakeProbability', label: '唤醒概率 (%)', type: 'number', help: '群聊中Bot回复的概率，0-100' },
      { key: 'minSendIntervalMs', label: '最小发送间隔 (ms)', type: 'number' },
      { key: 'wakeTrigger', label: '唤醒触发词', type: 'text', help: '逗号分隔' },
      { key: 'pokeReply', label: '戳一戳回复', type: 'toggle' },
      { key: 'pokeReplyText', label: '戳一戳回复内容', type: 'text', placeholder: '别戳我啦~' },
      { key: 'autoApproveGroup', label: '自动同意加群', type: 'toggle' },
      { key: 'autoApproveFriend', label: '自动同意好友', type: 'toggle' },
    ] },
  { id: 'wechat', label: '微信', description: '微信个人号 (wechatbot-webhook)', type: 'builtin',
    loginMethods: ['qrcode'],
    configFields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'text', placeholder: 'http://openclaw-wechat:3001' },
      { key: 'token', label: 'API Token', type: 'password' },
    ] },
  { id: 'whatsapp', label: 'WhatsApp', description: 'Baileys QR扫码配对', type: 'builtin', loginMethods: ['qrcode'],
    configFields: [{ key: 'dmPolicy', label: 'DM策略', type: 'select', options: ['pairing','open','allowlist'] }] },
  { id: 'telegram', label: 'Telegram', description: 'Bot API via grammŸ，支持群组', type: 'builtin',
    configFields: [
      { key: 'token', label: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF...' },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'text' },
    ] },
  { id: 'discord', label: 'Discord', description: 'Discord Bot API + Gateway', type: 'builtin',
    configFields: [
      { key: 'token', label: 'Bot Token', type: 'password' },
      { key: 'applicationId', label: 'Application ID', type: 'text' },
      { key: 'guildIds', label: 'Guild IDs', type: 'text', help: '逗号分隔' },
    ] },
  { id: 'irc', label: 'IRC', description: '经典IRC服务器', type: 'builtin',
    configFields: [
      { key: 'server', label: '服务器', type: 'text', placeholder: 'irc.libera.chat' },
      { key: 'nick', label: '昵称', type: 'text' },
      { key: 'channels', label: '频道', type: 'text', help: '逗号分隔' },
    ] },
  { id: 'slack', label: 'Slack', description: 'Bolt SDK，工作区应用', type: 'builtin',
    configFields: [
      { key: 'appToken', label: 'App Token', type: 'password', placeholder: 'xapp-...' },
      { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...' },
    ] },
  { id: 'signal', label: 'Signal', description: 'signal-cli REST API', type: 'builtin',
    configFields: [
      { key: 'apiUrl', label: 'REST API URL', type: 'text', placeholder: 'http://signal-cli:8080' },
      { key: 'phoneNumber', label: '手机号', type: 'text' },
    ] },
  { id: 'googlechat', label: 'Google Chat', description: 'Google Chat API Webhook', type: 'builtin',
    configFields: [
      { key: 'serviceAccountKey', label: '服务账号 JSON', type: 'text' },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'text' },
    ] },
  { id: 'bluebubbles', label: 'BlueBubbles (iMessage)', description: 'macOS iMessage', type: 'builtin',
    configFields: [
      { key: 'serverUrl', label: '服务器URL', type: 'text' },
      { key: 'password', label: '密码', type: 'password' },
    ] },
  { id: 'webchat', label: 'WebChat', description: 'Gateway WebChat UI (内置)', type: 'builtin', configFields: [] },
  // Plugin channels
  { id: 'feishu', label: '飞书 / Lark', description: '飞书机器人 WebSocket (插件)', type: 'plugin',
    configFields: [
      { key: 'appId', label: 'App ID', type: 'text' },
      { key: 'appSecret', label: 'App Secret', type: 'password' },
    ] },
  { id: 'qqbot', label: 'QQ 官方机器人', description: 'QQ开放平台官方Bot API (插件)', type: 'plugin',
    configFields: [
      { key: 'appId', label: 'App ID', type: 'text' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password' },
    ] },
  { id: 'dingtalk', label: '钉钉', description: '钉钉机器人 (插件)', type: 'plugin',
    configFields: [
      { key: 'appKey', label: 'App Key', type: 'text' },
      { key: 'appSecret', label: 'App Secret', type: 'password' },
      { key: 'robotCode', label: 'Robot Code', type: 'text' },
    ] },
  { id: 'wecom', label: '企业微信', description: '企业微信应用消息 (插件)', type: 'plugin',
    configFields: [
      { key: 'corpId', label: 'Corp ID', type: 'text' },
      { key: 'agentId', label: 'Agent ID', type: 'text' },
      { key: 'secret', label: 'Secret', type: 'password' },
    ] },
  { id: 'msteams', label: 'Microsoft Teams', description: 'Bot Framework (插件)', type: 'plugin',
    configFields: [
      { key: 'appId', label: 'App ID', type: 'text' },
      { key: 'appPassword', label: 'App Password', type: 'password' },
    ] },
  { id: 'mattermost', label: 'Mattermost', description: 'Bot API + WebSocket (插件)', type: 'plugin',
    configFields: [
      { key: 'url', label: '服务器URL', type: 'text' },
      { key: 'token', label: 'Bot Token', type: 'password' },
    ] },
  { id: 'line', label: 'LINE', description: 'LINE Messaging API (插件)', type: 'plugin',
    configFields: [
      { key: 'channelAccessToken', label: 'Channel Access Token', type: 'password' },
      { key: 'channelSecret', label: 'Channel Secret', type: 'password' },
    ] },
  { id: 'matrix', label: 'Matrix', description: 'Matrix 协议 (插件)', type: 'plugin',
    configFields: [
      { key: 'homeserverUrl', label: 'Homeserver URL', type: 'text' },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ] },
  { id: 'twitch', label: 'Twitch', description: 'Twitch Chat via IRC (插件)', type: 'plugin',
    configFields: [
      { key: 'username', label: '用户名', type: 'text' },
      { key: 'oauthToken', label: 'OAuth Token', type: 'password' },
      { key: 'channels', label: '频道', type: 'text', help: '逗号分隔' },
    ] },
];

export default function Channels() {
  const [status, setStatus] = useState<any>(null);
  const [selectedChannel, setSelectedChannel] = useState('qq');
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [ocConfig, setOcConfig] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    api.getStatus().then(r => { if (r.ok) setStatus(r); });
    api.getAdminConfig().then(r => { if (r.ok) setConfigs(r.config || {}); });
    api.getOpenClawConfig().then(r => { if (r.ok) setOcConfig(r.config || {}); });
    api.getRequests().then(r => { if (r.ok) setRequests(r.requests || []); });
  }, []);

  // Build connected channels from status
  const connected: { id: string; label: string }[] = [];
  if (status?.napcat?.connected) connected.push({ id: 'qq', label: `QQ: ${status.napcat.nickname || ''}` });
  if (status?.wechat?.loggedIn) connected.push({ id: 'wechat', label: `微信: ${status.wechat.name || ''}` });
  const ocChannels = ocConfig?.channels || {};
  const ocPlugins = ocConfig?.plugins?.entries || {};
  for (const ch of CHANNEL_DEFS) {
    if (ch.id === 'qq' || ch.id === 'wechat') continue;
    if (ocChannels[ch.id]?.enabled || ocPlugins[ch.id]?.enabled) {
      if (!connected.find(c => c.id === ch.id)) connected.push({ id: ch.id, label: `${ch.label}: 已启用` });
    }
  }

  const currentDef = CHANNEL_DEFS.find(c => c.id === selectedChannel);

  const handleSave = async () => {
    if (!currentDef) return;
    setSaving(true); setMsg('');
    try {
      await api.updateAdminConfig(configs);
      if (currentDef.type === 'plugin' || !['qq'].includes(currentDef.id)) {
        const chData = { ...(ocChannels[currentDef.id] || {}), enabled: true };
        for (const f of currentDef.configFields) {
          if (configs[currentDef.id]?.[f.key] !== undefined) chData[f.key] = configs[currentDef.id][f.key];
        }
        await api.updateChannel(currentDef.id, chData);
        if (currentDef.type === 'plugin') await api.updatePlugin(currentDef.id, { enabled: true });
      }
      setMsg('保存成功');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) { setMsg('保存失败: ' + String(err)); }
    finally { setSaving(false); }
  };

  const handleApprove = async (flag: string) => {
    await api.approveRequest(flag);
    setRequests(prev => prev.filter(r => r.flag !== flag));
  };
  const handleReject = async (flag: string) => {
    await api.rejectRequest(flag);
    setRequests(prev => prev.filter(r => r.flag !== flag));
  };

  const updateField = (channelId: string, key: string, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [channelId]: { ...(prev[channelId] || {}), [key]: value },
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">通道管理</h2>
        <p className="text-xs text-gray-500 mt-0.5">配置和管理所有消息通道</p>
      </div>

      {/* Connected channels — only show connected */}
      {connected.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {connected.map(ch => (
            <button key={ch.id} onClick={() => setSelectedChannel(ch.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors ${
                selectedChannel === ch.id
                  ? 'border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/50'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              <Wifi size={14} className="text-emerald-500" />
              <span>{ch.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Channel selector */}
        <div className="card p-3 space-y-1 max-h-[70vh] overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-500 mb-2 px-1">内置通道</h3>
          {CHANNEL_DEFS.filter(c => c.type === 'builtin').map(ch => (
            <button key={ch.id} onClick={() => setSelectedChannel(ch.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                selectedChannel === ch.id
                  ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              <Radio size={14} />
              <div className="min-w-0 flex-1"><div className="text-xs font-medium truncate">{ch.label}</div></div>
              {connected.find(c => c.id === ch.id) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
            </button>
          ))}
          <h3 className="text-xs font-semibold text-gray-500 mt-3 mb-2 px-1">插件通道</h3>
          {CHANNEL_DEFS.filter(c => c.type === 'plugin').map(ch => (
            <button key={ch.id} onClick={() => setSelectedChannel(ch.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                selectedChannel === ch.id
                  ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              <Radio size={14} />
              <div className="min-w-0 flex-1"><div className="text-xs font-medium truncate">{ch.label}</div></div>
              {connected.find(c => c.id === ch.id) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
            </button>
          ))}
        </div>

        {/* Channel config */}
        <div className="lg:col-span-3 space-y-4">
          {currentDef && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{currentDef.label} 配置</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">{currentDef.description}</p>
                </div>
                {currentDef.loginMethods && currentDef.loginMethods.length > 0 && (
                  <div className="flex gap-1.5">
                    {currentDef.loginMethods.includes('qrcode') && (
                      <button className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900">
                        <QrCode size={12} />扫码登录
                      </button>
                    )}
                    {currentDef.loginMethods.includes('quick') && (
                      <button className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900">
                        <Zap size={12} />快速登录
                      </button>
                    )}
                    {currentDef.loginMethods.includes('password') && (
                      <button className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900">
                        <Key size={12} />账密登录
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {currentDef.configFields.map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {field.label}
                      {field.help && <span className="text-gray-400 font-normal ml-1">— {field.help}</span>}
                    </label>
                    {field.type === 'toggle' ? (
                      <button
                        onClick={() => updateField(currentDef.id, field.key, !configs[currentDef.id]?.[field.key])}
                        className={`relative w-10 h-5 rounded-full transition-colors ${configs[currentDef.id]?.[field.key] ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${configs[currentDef.id]?.[field.key] ? 'translate-x-5' : ''}`} />
                      </button>
                    ) : (
                      <input
                        type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                        value={configs[currentDef.id]?.[field.key] || ''}
                        onChange={e => updateField(currentDef.id, field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent"
                      />
                    )}
                  </div>
                ))}
              </div>

              {currentDef.configFields.length === 0 && (
                <p className="text-xs text-gray-400 py-4 text-center">此通道无需额外配置</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                  {saving ? '保存中...' : '保存配置'}
                </button>
                {msg && <span className={`text-xs ${msg.includes('失败') ? 'text-red-500' : 'text-emerald-500'}`}>{msg}</span>}
              </div>
            </div>
          )}

          {/* QQ Requests — only when QQ selected */}
          {selectedChannel === 'qq' && requests.length > 0 && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck size={14} className="text-violet-500" />
                <h3 className="font-semibold text-sm">待审核请求</h3>
                <span className="text-[10px] text-gray-400">{requests.length} 条</span>
              </div>
              <div className="space-y-2">
                {requests.map((r: any) => (
                  <div key={r.flag} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-xs">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.type === 'group' ? '加群' : '加好友'}</span>
                      <span className="text-gray-400 ml-2">{r.userId || r.groupId || ''}</span>
                      {r.comment && <span className="text-gray-500 ml-2">"{r.comment}"</span>}
                    </div>
                    <button onClick={() => handleApprove(r.flag)} className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100"><Check size={12} /></button>
                    <button onClick={() => handleReject(r.flag)} className="p-1.5 rounded bg-red-50 dark:bg-red-950 text-red-500 hover:bg-red-100"><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

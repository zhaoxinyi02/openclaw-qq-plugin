import fs from 'fs';
import path from 'path';

// Directly read/write openclaw.json - the source of truth for OpenClaw configuration
export class OpenClawConfig {
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || process.env['OPENCLAW_CONFIG_PATH'] || '/root/.openclaw/openclaw.json';
  }

  exists(): boolean {
    return fs.existsSync(this.configPath);
  }

  read(): any {
    try {
      if (!this.exists()) return null;
      return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    } catch { return null; }
  }

  write(config: any) {
    fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  // Ensure QQ plugin is enabled and configured in openclaw.json
  autoSetup(napcatWsUrl: string, napcatToken: string, ownerQQ: number) {
    let config = this.read();
    if (!config) {
      console.log('[OpenClaw] No openclaw.json found, creating minimal config');
      config = { meta: { version: 1 } };
    }

    let changed = false;

    // Ensure plugins section exists — only create QQ entry if it doesn't exist at all
    // (Do NOT override enabled:false — user may have intentionally disabled it)
    if (!config.plugins) config.plugins = {};
    if (!config.plugins.entries) config.plugins.entries = {};
    if (!config.plugins.entries.qq) {
      config.plugins.entries.qq = { enabled: true };
      changed = true;
      console.log('[OpenClaw] Created QQ plugin entry');
    }

    // Ensure channels section exists and QQ channel is configured
    if (!config.channels) config.channels = {};
    if (!config.channels.qq) {
      config.channels.qq = {
        enabled: true,
        wsUrl: napcatWsUrl,
        accessToken: napcatToken,
        ownerQQ: ownerQQ,
        notifications: {
          memberChange: true,
          adminChange: true,
          banNotice: true,
          antiRecall: true,
          pokeReply: true,
          honorNotice: true,
        },
        welcome: { enabled: true, template: '欢迎 {nickname} 加入本群！' },
        autoApprove: { friend: { enabled: false }, group: { enabled: false } },
      };
      changed = true;
      console.log('[OpenClaw] Added QQ channel config');
    } else {
      // Update connection settings if changed
      if (config.channels.qq.wsUrl !== napcatWsUrl) {
        config.channels.qq.wsUrl = napcatWsUrl;
        changed = true;
      }
      if (napcatToken && config.channels.qq.accessToken !== napcatToken) {
        config.channels.qq.accessToken = napcatToken;
        changed = true;
      }
      if (ownerQQ && config.channels.qq.ownerQQ !== ownerQQ) {
        config.channels.qq.ownerQQ = ownerQQ;
        changed = true;
      }
    }

    if (changed) {
      this.write(config);
      console.log('[OpenClaw] Config updated');
    } else {
      console.log('[OpenClaw] Config already up to date');
    }

    return config;
  }

  getModels(): any {
    const config = this.read();
    if (!config) return { providers: {}, currentModel: '' };
    return {
      providers: config.models?.providers || {},
      currentModel: config.agents?.defaults?.model?.primary || '',
    };
  }

  updateModels(data: { providers?: any; currentModel?: string }) {
    const config = this.read();
    if (!config) return;
    if (data.providers) {
      if (!config.models) config.models = {};
      config.models.providers = data.providers;
    }
    if (data.currentModel) {
      if (!config.agents) config.agents = {};
      if (!config.agents.defaults) config.agents.defaults = {};
      if (!config.agents.defaults.model) config.agents.defaults.model = {};
      config.agents.defaults.model.primary = data.currentModel;
    }
    this.write(config);
  }

  getChannels(): any {
    const config = this.read();
    return {
      channels: config?.channels || {},
      plugins: config?.plugins?.entries || {},
    };
  }

  // Channels managed externally by ClawPanel (not by OpenClaw gateway)
  // Writing these into openclaw.json causes "unknown channel id" errors
  private static EXTERNAL_CHANNELS = new Set(['wechat']);

  updateChannel(id: string, data: any) {
    if (OpenClawConfig.EXTERNAL_CHANNELS.has(id)) return; // skip non-OpenClaw channels
    const config = this.read();
    if (!config) return;
    if (!config.channels) config.channels = {};
    config.channels[id] = { ...config.channels[id], ...data };
    this.write(config);
  }

  updatePlugin(id: string, data: any) {
    if (OpenClawConfig.EXTERNAL_CHANNELS.has(id)) return; // skip non-OpenClaw plugins
    const config = this.read();
    if (!config) return;
    if (!config.plugins) config.plugins = {};
    if (!config.plugins.entries) config.plugins.entries = {};
    config.plugins.entries[id] = { ...config.plugins.entries[id], ...data };
    this.write(config);
  }

  // Remove any externally-managed channel entries that may have been written previously
  cleanExternalChannels() {
    const config = this.read();
    if (!config) return;
    let changed = false;
    for (const ch of OpenClawConfig.EXTERNAL_CHANNELS) {
      if (config.channels?.[ch]) { delete config.channels[ch]; changed = true; }
      if (config.plugins?.entries?.[ch]) { delete config.plugins.entries[ch]; changed = true; }
    }
    if (changed) this.write(config);
  }
}

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import http from 'http';
import crypto from 'crypto';
import multer from 'multer';
import { AdminConfig } from '../core/admin-config.js';
import { OneBotClient } from '../core/onebot-client.js';
import { OpenClawConfig } from '../core/openclaw-config.js';
import { WeChatClient } from '../core/wechat-client.js';
import { WorkspaceManager } from '../core/workspace-manager.js';
import { getPendingRequests } from '../core/event-router.js';
import { JWT_SECRET } from '../core/ws-manager.js';
import { EventLog } from '../core/event-log.js';
import fs from 'fs';
import path from 'path';

export function createRoutes(adminConfig: AdminConfig, onebotClient: OneBotClient, openclawConfig: OpenClawConfig, wechatClient: WeChatClient, workspaceManager?: WorkspaceManager, eventLog?: EventLog) {
  const router = Router();

  // Auth middleware
  const auth = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ ok: false, error: 'No token' });
    try { jwt.verify(token, JWT_SECRET); next(); } catch { res.status(401).json({ ok: false, error: 'Invalid token' }); }
  };

  // === Auth ===
  router.post('/auth/login', (req, res) => {
    const { token } = req.body;
    const cfg = adminConfig.get();
    if (token === cfg.server.token) {
      const jwtToken = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ ok: true, token: jwtToken });
    } else {
      res.status(401).json({ ok: false, error: '密码错误' });
    }
  });

  // === Status ===
  router.get('/status', auth, async (_req, res) => {
    const cfg = adminConfig.get();
    let groupCount = 0, friendCount = 0;
    try {
      const groups = await onebotClient.callApi('get_group_list');
      groupCount = groups?.data?.length || 0;
    } catch {}
    try {
      const friends = await onebotClient.callApi('get_friend_list');
      friendCount = friends?.data?.length || 0;
    } catch {}

    const ocConfig = openclawConfig.read();
    let wechatInfo: any = { connected: wechatClient.connected };
    try {
      const wl = await wechatClient.getLoginStatus();
      wechatInfo.loggedIn = wl.loggedIn || false;
      wechatInfo.name = wl.name || wechatClient.loginUser?.name || '';
    } catch { wechatInfo.loggedIn = false; }

    res.json({
      ok: true,
      napcat: {
        connected: onebotClient.connected,
        selfId: onebotClient.selfId,
        nickname: onebotClient.nickname,
        groupCount, friendCount,
      },
      wechat: wechatInfo,
      openclaw: {
        configured: openclawConfig.exists(),
        qqPluginEnabled: !!ocConfig?.plugins?.entries?.qq?.enabled,
        qqChannelEnabled: !!ocConfig?.channels?.qq?.enabled,
        currentModel: ocConfig?.agents?.defaults?.model?.primary || '',
      },
      admin: {
        uptime: process.uptime(),
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    });
  });

  // === OpenClaw Config ===
  router.get('/openclaw/config', auth, (_req, res) => {
    const config = openclawConfig.read();
    res.json({ ok: true, config: config || {} });
  });

  router.put('/openclaw/config', auth, (req, res) => {
    try {
      openclawConfig.write(req.body.config);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  router.get('/openclaw/models', auth, (_req, res) => {
    res.json({ ok: true, ...openclawConfig.getModels() });
  });

  router.put('/openclaw/models', auth, (req, res) => {
    try {
      openclawConfig.updateModels(req.body);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  router.get('/openclaw/channels', auth, (_req, res) => {
    res.json({ ok: true, ...openclawConfig.getChannels() });
  });

  router.put('/openclaw/channels/:id', auth, (req, res) => {
    try {
      openclawConfig.updateChannel(req.params.id, req.body);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  router.put('/openclaw/plugins/:id', auth, (req, res) => {
    try {
      openclawConfig.updatePlugin(req.params.id, req.body);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // === Admin Config (QQ features) ===
  router.get('/admin/config', auth, (_req, res) => {
    res.json({ ok: true, config: adminConfig.get() });
  });

  router.put('/admin/config', auth, (req, res) => {
    try {
      adminConfig.update(req.body);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  router.put('/admin/config/:section', auth, (req, res) => {
    try {
      adminConfig.updateSection(req.params.section, req.body);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // === Bot operations ===
  router.get('/bot/groups', auth, async (_req, res) => {
    try {
      const result = await onebotClient.getGroupList();
      res.json({ ok: true, groups: result.data || [] });
    } catch (err) {
      res.json({ ok: false, groups: [], error: String(err) });
    }
  });

  router.get('/bot/friends', auth, async (_req, res) => {
    try {
      const result = await onebotClient.getFriendList();
      res.json({ ok: true, friends: result.data || [] });
    } catch (err) {
      res.json({ ok: false, friends: [], error: String(err) });
    }
  });

  router.post('/bot/send', auth, async (req, res) => {
    try {
      const { type, id, message } = req.body;
      if (type === 'group') await onebotClient.sendGroupMsg(id, message);
      else await onebotClient.sendPrivateMsg(id, message);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  router.post('/bot/reconnect', auth, (_req, res) => {
    onebotClient.disconnect();
    setTimeout(() => onebotClient.connect(), 1000);
    res.json({ ok: true });
  });

  // === Requests (approval) ===
  router.get('/requests', auth, (_req, res) => {
    const requests = Array.from(getPendingRequests().values());
    res.json({ ok: true, requests });
  });

  router.post('/requests/:flag/approve', auth, async (req, res) => {
    const { flag } = req.params;
    const pending = getPendingRequests().get(flag);
    if (!pending) return res.status(404).json({ ok: false, error: 'Request not found' });
    try {
      if (pending.type === 'group') {
        await onebotClient.setGroupAddRequest(flag, pending.subType || 'add', true);
      } else {
        await onebotClient.setFriendAddRequest(flag, true);
      }
      getPendingRequests().delete(flag);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  router.post('/requests/:flag/reject', auth, async (req, res) => {
    const { flag } = req.params;
    const pending = getPendingRequests().get(flag);
    if (!pending) return res.status(404).json({ ok: false, error: 'Request not found' });
    try {
      if (pending.type === 'group') {
        await onebotClient.setGroupAddRequest(flag, pending.subType || 'add', false, req.body.reason || '');
      } else {
        await onebotClient.setFriendAddRequest(flag, false);
      }
      getPendingRequests().delete(flag);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // === NapCat WebUI Proxy (QQ Login) ===
  const NAPCAT_WEBUI = 'http://127.0.0.1:6099';
  let napcatCredential = '';

  async function napcatAuth(adminCfg: AdminConfig): Promise<string> {
    if (napcatCredential) return napcatCredential;
    const webuiToken = adminCfg.get().server.token || 'openclaw-qq-admin';
    const hash = crypto.createHash('sha256').update(webuiToken + '.napcat').digest('hex');
    try {
      const res = await napcatProxy('POST', '/api/auth/login', { hash });
      if (res.code === 0 && res.data?.Credential) {
        napcatCredential = res.data.Credential;
      }
    } catch {}
    return napcatCredential;
  }

  function napcatProxy(method: string, path: string, body?: any, credential?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (credential) headers['Authorization'] = `Bearer ${credential}`;
      if (data) headers['Content-Length'] = Buffer.byteLength(data).toString();
      const url = new URL(path, NAPCAT_WEBUI);
      const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname, method, headers }, (res) => {
        let chunks = '';
        res.on('data', (c: Buffer) => chunks += c.toString());
        res.on('end', () => { try { resolve(JSON.parse(chunks)); } catch { resolve({ raw: chunks }); } });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  // QQ Login Status
  router.post('/napcat/login-status', auth, async (_req, res) => {
    try {
      const cred = await napcatAuth(adminConfig);
      const r = await napcatProxy('POST', '/api/QQLogin/CheckLoginStatus', {}, cred);
      res.json({ ok: true, ...r });
    } catch (err) { res.json({ ok: false, error: String(err) }); }
  });

  // Get QR Code
  router.post('/napcat/qrcode', auth, async (_req, res) => {
    try {
      const cred = await napcatAuth(adminConfig);
      const r = await napcatProxy('POST', '/api/QQLogin/GetQQLoginQrcode', {}, cred);
      res.json({ ok: true, ...r });
    } catch (err) { res.json({ ok: false, error: String(err) }); }
  });

  // Refresh QR Code
  router.post('/napcat/qrcode/refresh', auth, async (_req, res) => {
    try {
      const cred = await napcatAuth(adminConfig);
      const r = await napcatProxy('POST', '/api/QQLogin/RefreshQRcode', {}, cred);
      res.json({ ok: true, ...r });
    } catch (err) { res.json({ ok: false, error: String(err) }); }
  });

  // Quick Login List
  router.get('/napcat/quick-login-list', auth, async (_req, res) => {
    try {
      const cred = await napcatAuth(adminConfig);
      const r = await napcatProxy('POST', '/api/QQLogin/GetQuickLoginQQ', {}, cred);
      res.json({ ok: true, ...r });
    } catch (err) { res.json({ ok: false, error: String(err) }); }
  });

  // Quick Login
  router.post('/napcat/quick-login', auth, async (req, res) => {
    try {
      const cred = await napcatAuth(adminConfig);
      const r = await napcatProxy('POST', '/api/QQLogin/SetQuickLogin', { uin: req.body.uin }, cred);
      res.json({ ok: true, ...r });
    } catch (err) { res.json({ ok: false, error: String(err) }); }
  });

  // Password Login (server computes MD5 since browsers don't support it)
  router.post('/napcat/password-login', auth, async (req, res) => {
    try {
      const cred = await napcatAuth(adminConfig);
      const pwd = req.body.password || req.body.passwordMd5 || '';
      const passwordMd5 = crypto.createHash('md5').update(pwd).digest('hex');
      const r = await napcatProxy('POST', '/api/QQLogin/PasswordLogin', { uin: req.body.uin, passwordMd5 }, cred);
      res.json({ ok: true, ...r });
    } catch (err) { res.json({ ok: false, error: String(err) }); }
  });

  // Get QQ Login Info
  router.get('/napcat/login-info', auth, async (_req, res) => {
    try {
      const cred = await napcatAuth(adminConfig);
      const r = await napcatProxy('POST', '/api/QQLogin/GetQQLoginInfo', {}, cred);
      res.json({ ok: true, ...r });
    } catch (err) { res.json({ ok: false, error: String(err) }); }
  });

  // === WeChat API ===

  // WeChat status (health + login)
  router.get('/wechat/status', auth, async (_req, res) => {
    try {
      const loginRes = await wechatClient.getLoginStatus();
      res.json({
        ok: true,
        connected: wechatClient.connected,
        loggedIn: loginRes.loggedIn || false,
        name: loginRes.name || wechatClient.loginUser?.name || '',
      });
    } catch (err) {
      res.json({ ok: false, connected: false, loggedIn: false, error: String(err) });
    }
  });

  // WeChat login URL (returns the URL for QR code scanning)
  router.get('/wechat/login-url', auth, (_req, res) => {
    const cfg = adminConfig.get().wechat;
    // The login page is served by wechatbot-webhook container
    // From the browser, user accesses it via the mapped port 3002
    const externalUrl = `http://${_req.hostname}:3002/login?token=${cfg.token}`;
    const internalUrl = wechatClient.getLoginUrl();
    res.json({ ok: true, externalUrl, internalUrl });
  });

  // WeChat send message
  router.post('/wechat/send', auth, async (req, res) => {
    try {
      const { to, content, isRoom } = req.body;
      const r = await wechatClient.sendMessage(to, content, isRoom || false);
      res.json({ ok: true, result: r });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // WeChat send file
  router.post('/wechat/send-file', auth, async (req, res) => {
    try {
      const { to, fileUrl, isRoom } = req.body;
      const r = await wechatClient.sendFile(to, fileUrl, isRoom || false);
      res.json({ ok: true, result: r });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // WeChat config
  router.get('/wechat/config', auth, (_req, res) => {
    const cfg = adminConfig.get().wechat;
    res.json({ ok: true, config: cfg });
  });

  router.put('/wechat/config', auth, (req, res) => {
    try {
      adminConfig.updateSection('wechat', { ...adminConfig.get().wechat, ...req.body });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // === Workspace API ===
  if (workspaceManager) {
    const wsUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

    // List files
    router.get('/workspace/files', auth, (req: any, res: any) => {
      try {
        const subPath = (req.query.path as string) || '';
        const result = workspaceManager.listFiles(subPath);
        res.json({ ok: true, ...result });
      } catch (err) {
        res.status(400).json({ ok: false, error: String(err) });
      }
    });

    // Get workspace stats
    router.get('/workspace/stats', auth, (_req: any, res: any) => {
      try {
        const stats = workspaceManager.getStats();
        res.json({ ok: true, ...stats });
      } catch (err) {
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    // Get workspace config
    router.get('/workspace/config', auth, (_req: any, res: any) => {
      res.json({ ok: true, config: workspaceManager.getConfig() });
    });

    // Update workspace config
    router.put('/workspace/config', auth, (req: any, res: any) => {
      try {
        const config = workspaceManager.updateConfig(req.body);
        res.json({ ok: true, config });
      } catch (err) {
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    // Upload file(s)
    router.post('/workspace/upload', auth, wsUpload.array('files', 20), (req: any, res: any) => {
      try {
        const subPath = (req.body.path as string) || '';
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ ok: false, error: 'No files provided' });
        }
        const uploaded = files.map((f: Express.Multer.File) =>
          workspaceManager.saveUploadedFile(f.originalname, f.buffer, subPath)
        );
        res.json({ ok: true, files: uploaded });
      } catch (err) {
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    // Create directory
    router.post('/workspace/mkdir', auth, (req: any, res: any) => {
      try {
        const { name, path: subPath } = req.body;
        if (!name) return res.status(400).json({ ok: false, error: 'Directory name required' });
        workspaceManager.createDirectory(name, subPath || '');
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    // Delete file(s)
    router.post('/workspace/delete', auth, (req: any, res: any) => {
      try {
        const { paths } = req.body;
        if (!paths || !Array.isArray(paths) || paths.length === 0) {
          return res.status(400).json({ ok: false, error: 'No paths provided' });
        }
        const result = workspaceManager.deleteMultiple(paths);
        res.json({ ok: true, ...result });
      } catch (err) {
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    // Download file (supports token via query param for direct browser downloads)
    router.get('/workspace/download', (req: any, res: any) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
        if (!token) return res.status(401).json({ ok: false, error: 'No token' });
        try { jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ ok: false, error: 'Invalid token' }); }
        const filePath = req.query.path as string;
        if (!filePath) return res.status(400).json({ ok: false, error: 'Path required' });
        const { fullPath, stat } = workspaceManager.getFileContent(filePath);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filePath.split('/').pop() || 'file')}"`);
        const fs = require('fs');
        fs.createReadStream(fullPath).pipe(res);
      } catch (err) {
        res.status(400).json({ ok: false, error: String(err) });
      }
    });

    // Manual clean expired files
    router.post('/workspace/clean', auth, (_req: any, res: any) => {
      try {
        const result = workspaceManager.cleanExpiredFiles();
        res.json({ ok: true, ...result });
      } catch (err) {
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    // File notes/remarks
    router.get('/workspace/notes', auth, (_req: any, res: any) => {
      try {
        const notes = workspaceManager.getNotes();
        res.json({ ok: true, notes });
      } catch (err) {
        res.json({ ok: true, notes: {} });
      }
    });

    router.put('/workspace/notes', auth, (req: any, res: any) => {
      try {
        const { path: filePath, note } = req.body;
        if (!filePath) return res.status(400).json({ ok: false, error: 'Path required' });
        workspaceManager.setNote(filePath, note || '');
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    // File preview (text files, images served inline)
    router.get('/workspace/preview', (req: any, res: any) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
        if (!token) return res.status(401).json({ ok: false, error: 'No token' });
        try { jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ ok: false, error: 'Invalid token' }); }
        const filePath = req.query.path as string;
        if (!filePath) return res.status(400).json({ ok: false, error: 'Path required' });
        const { fullPath, stat } = workspaceManager.getFileContent(filePath);
        const ext = path.extname(fullPath).toLowerCase();
        const IMG_EXTS = ['.jpg','.jpeg','.png','.gif','.webp','.bmp','.svg','.ico'];
        const TXT_EXTS = ['.txt','.md','.log','.json','.jsonl','.js','.ts','.py','.sh','.yaml','.yml','.xml','.html','.css','.csv','.ini','.conf','.toml','.env'];
        if (IMG_EXTS.includes(ext)) {
          const mimeMap: Record<string,string> = {'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.gif':'image/gif','.webp':'image/webp','.bmp':'image/bmp','.svg':'image/svg+xml','.ico':'image/x-icon'};
          res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
          res.setHeader('Content-Length', stat.size);
          fs.createReadStream(fullPath).pipe(res);
        } else if (TXT_EXTS.includes(ext)) {
          const maxSize = 512 * 1024; // 512KB max for text preview
          if (stat.size > maxSize) {
            return res.json({ ok: true, type: 'text', content: fs.readFileSync(fullPath, 'utf-8').slice(0, maxSize) + '\n\n... (文件过大，已截断)', truncated: true });
          }
          res.json({ ok: true, type: 'text', content: fs.readFileSync(fullPath, 'utf-8'), truncated: false });
        } else {
          res.json({ ok: false, error: '不支持预览此文件类型', ext });
        }
      } catch (err) {
        res.status(400).json({ ok: false, error: String(err) });
      }
    });
  }

  // === System Info API ===
  const OPENCLAW_DIR = process.env['OPENCLAW_CONFIG'] ? path.dirname(process.env['OPENCLAW_CONFIG']) : '/root/.openclaw';

  // System environment detection
  router.get('/system/env', auth, async (_req, res) => {
    const { execSync } = await import('child_process');
    const info: any = { os: {}, software: {} };
    try { info.os.platform = process.platform; } catch {}
    try { info.os.arch = process.arch; } catch {}
    try { info.os.release = execSync('uname -r 2>/dev/null || echo unknown').toString().trim(); } catch {}
    try { info.os.hostname = execSync('hostname 2>/dev/null || echo unknown').toString().trim(); } catch {}
    try { info.os.totalMemMB = Math.round(require('os').totalmem() / 1024 / 1024); } catch {}
    try { info.os.freeMemMB = Math.round(require('os').freemem() / 1024 / 1024); } catch {}
    try { info.os.cpus = require('os').cpus().length; } catch {}
    try { info.software.node = process.version; } catch {}
    try { info.software.docker = execSync('docker --version 2>/dev/null || echo not installed').toString().trim(); } catch { info.software.docker = 'not installed'; }
    try { info.software.git = execSync('git --version 2>/dev/null || echo not installed').toString().trim(); } catch { info.software.git = 'not installed'; }
    try { info.software.openclaw = execSync('openclaw version 2>/dev/null || echo not found').toString().trim() || 'not found'; } catch { info.software.openclaw = 'not found'; }
    try { info.software.npm = execSync('npm --version 2>/dev/null || echo not installed').toString().trim(); } catch { info.software.npm = 'not installed'; }
    res.json({ ok: true, ...info });
  });

  // OpenClaw version info
  router.get('/system/version', auth, (_req, res) => {
    try {
      const ocConfig = openclawConfig.read();
      const currentVersion = ocConfig?.meta?.lastTouchedVersion || 'unknown';
      let updateInfo: any = {};
      const updateCheckPath = path.join(OPENCLAW_DIR, 'update-check.json');
      try {
        if (fs.existsSync(updateCheckPath)) {
          updateInfo = JSON.parse(fs.readFileSync(updateCheckPath, 'utf-8'));
        }
      } catch {}
      res.json({
        ok: true,
        currentVersion,
        latestVersion: updateInfo.lastNotifiedVersion || '',
        lastCheckedAt: updateInfo.lastCheckedAt || '',
        updateAvailable: updateInfo.lastNotifiedVersion && updateInfo.lastNotifiedVersion !== currentVersion,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Backup config
  router.post('/system/backup', auth, (_req, res) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(OPENCLAW_DIR, 'backups');
      fs.mkdirSync(backupDir, { recursive: true });
      const configSrc = path.join(OPENCLAW_DIR, 'openclaw.json');
      if (fs.existsSync(configSrc)) {
        fs.copyFileSync(configSrc, path.join(backupDir, `openclaw-${timestamp}.json`));
      }
      // Also backup cron jobs
      const cronSrc = path.join(OPENCLAW_DIR, 'cron', 'jobs.json');
      if (fs.existsSync(cronSrc)) {
        fs.copyFileSync(cronSrc, path.join(backupDir, `cron-jobs-${timestamp}.json`));
      }
      res.json({ ok: true, backupId: timestamp });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // List backups
  router.get('/system/backups', auth, (_req, res) => {
    try {
      const backupDir = path.join(OPENCLAW_DIR, 'backups');
      if (!fs.existsSync(backupDir)) return res.json({ ok: true, backups: [] });
      const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
      const backups = files.map(f => ({
        name: f,
        path: path.join(backupDir, f),
        size: fs.statSync(path.join(backupDir, f)).size,
        time: fs.statSync(path.join(backupDir, f)).mtime.toISOString(),
      }));
      res.json({ ok: true, backups });
    } catch (err) {
      res.json({ ok: true, backups: [] });
    }
  });

  // Restore backup
  router.post('/system/restore', auth, (req, res) => {
    try {
      const { backupName } = req.body;
      const backupDir = path.join(OPENCLAW_DIR, 'backups');
      const backupPath = path.join(backupDir, backupName);
      if (!fs.existsSync(backupPath)) return res.status(404).json({ ok: false, error: 'Backup not found' });
      // Auto-backup current before restore
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const configPath = path.join(OPENCLAW_DIR, 'openclaw.json');
      if (fs.existsSync(configPath)) {
        fs.copyFileSync(configPath, path.join(backupDir, `pre-restore-${timestamp}.json`));
      }
      if (backupName.startsWith('openclaw-')) {
        fs.copyFileSync(backupPath, configPath);
      } else if (backupName.startsWith('cron-jobs-')) {
        const cronPath = path.join(OPENCLAW_DIR, 'cron', 'jobs.json');
        fs.copyFileSync(backupPath, cronPath);
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Scan installed skills/extensions
  router.get('/system/skills', auth, (_req, res) => {
    try {
      const skills: any[] = [];
      const extDir = path.join(OPENCLAW_DIR, 'extensions');
      const ocConfig = openclawConfig.read() || {};
      const pluginEntries = ocConfig?.plugins?.entries || {};
      const pluginInstalls = ocConfig?.plugins?.installs || {};
      // Scan extensions directory
      if (fs.existsSync(extDir)) {
        for (const name of fs.readdirSync(extDir)) {
          const extPath = path.join(extDir, name);
          if (!fs.statSync(extPath).isDirectory()) continue;
          let pkgInfo: any = {};
          try { pkgInfo = JSON.parse(fs.readFileSync(path.join(extPath, 'package.json'), 'utf-8')); } catch {}
          skills.push({
            id: name,
            name: pkgInfo.name || name,
            description: pkgInfo.description || '',
            version: pluginInstalls[name]?.version || pkgInfo.version || '',
            enabled: pluginEntries[name]?.enabled !== false,
            source: pluginInstalls[name] ? 'installed' : 'local',
            installedAt: pluginInstalls[name]?.installedAt || '',
          });
        }
      }
      // Also check skills directory
      const skillsDir = path.join(OPENCLAW_DIR, 'skills');
      if (fs.existsSync(skillsDir)) {
        for (const name of fs.readdirSync(skillsDir)) {
          const skillPath = path.join(skillsDir, name);
          if (!fs.statSync(skillPath).isDirectory()) continue;
          if (skills.find(s => s.id === name)) continue;
          let pkgInfo: any = {};
          try { pkgInfo = JSON.parse(fs.readFileSync(path.join(skillPath, 'package.json'), 'utf-8')); } catch {}
          skills.push({
            id: name,
            name: pkgInfo.name || name,
            description: pkgInfo.description || '',
            version: pkgInfo.version || '',
            enabled: true,
            source: 'skill',
          });
        }
      }
      res.json({ ok: true, skills });
    } catch (err) {
      res.json({ ok: true, skills: [] });
    }
  });

  // Read cron jobs directly from file
  router.get('/system/cron', auth, (_req, res) => {
    try {
      const cronPath = path.join(OPENCLAW_DIR, 'cron', 'jobs.json');
      if (!fs.existsSync(cronPath)) return res.json({ ok: true, jobs: [] });
      const data = JSON.parse(fs.readFileSync(cronPath, 'utf-8'));
      res.json({ ok: true, jobs: data.jobs || [] });
    } catch (err) {
      res.json({ ok: true, jobs: [] });
    }
  });

  // Read MD docs from openclaw dir (agent profile, etc)
  router.get('/system/docs', auth, (_req, res) => {
    try {
      const docs: any[] = [];
      // Check agents dir for profile docs
      const agentsDir = path.join(OPENCLAW_DIR, 'agents');
      if (fs.existsSync(agentsDir)) {
        const scanDir = (dir: string, prefix: string) => {
          for (const name of fs.readdirSync(dir)) {
            const full = path.join(dir, name);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
              scanDir(full, prefix + name + '/');
            } else if (name.endsWith('.md')) {
              docs.push({
                name: prefix + name,
                path: full,
                content: fs.readFileSync(full, 'utf-8'),
                size: stat.size,
              });
            }
          }
        };
        scanDir(agentsDir, 'agents/');
      }
      // Check root-level md files
      for (const name of fs.readdirSync(OPENCLAW_DIR)) {
        if (name.endsWith('.md')) {
          const full = path.join(OPENCLAW_DIR, name);
          docs.push({
            name,
            path: full,
            content: fs.readFileSync(full, 'utf-8'),
            size: fs.statSync(full).size,
          });
        }
      }
      res.json({ ok: true, docs });
    } catch (err) {
      res.json({ ok: true, docs: [] });
    }
  });

  // Save MD doc
  router.put('/system/docs', auth, (req, res) => {
    try {
      const { path: docPath, content } = req.body;
      if (!docPath || !docPath.endsWith('.md')) return res.status(400).json({ ok: false, error: 'Invalid path' });
      // Security: ensure path is within OPENCLAW_DIR
      const resolved = path.resolve(docPath);
      if (!resolved.startsWith(path.resolve(OPENCLAW_DIR))) {
        return res.status(403).json({ ok: false, error: 'Path outside openclaw dir' });
      }
      fs.writeFileSync(resolved, content, 'utf-8');
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // === Event Log API ===
  if (eventLog) {
    router.get('/events', auth, (req: any, res: any) => {
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;
      const source = req.query.source as string || undefined;
      const search = req.query.search as string || undefined;
      const result = eventLog.getEntries({ limit, offset, source, search });
      res.json({ ok: true, ...result });
    });

    router.post('/events/clear', auth, (_req: any, res: any) => {
      eventLog.clear();
      res.json({ ok: true });
    });

    // Allow external services (e.g. OpenClaw QQ plugin) to post log entries
    router.post('/events/log', (req: any, res: any) => {
      const { source, type, summary, detail } = req.body || {};
      if (!summary) return res.status(400).json({ ok: false, error: 'summary required' });
      const entry = eventLog.add({
        time: Date.now(),
        source: source || 'openclaw',
        type: type || 'openclaw.action',
        summary,
        detail,
      });
      res.json({ ok: true, id: entry.id });
    });
  }

  return router;
}

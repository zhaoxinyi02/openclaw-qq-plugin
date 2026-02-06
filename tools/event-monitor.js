#!/usr/bin/env node

/**
 * 事件监听服务
 * 监听系统事件并通过 QQ 发送通知
 * 
 * 支持的事件类型：
 * 1. 端口访问监听（通过 iptables 日志）
 * 2. 文件变化监听（如邮箱、日志文件）
 * 3. 定时检查（如磁盘空间、内存使用）
 */

const fs = require('fs');
const { exec } = require('child_process');
const { sendQQMessage } = require('./send-message.js');

// 配置
const CONFIG = {
  qq_user: 'YOUR_QQ_NUMBER',  // TODO: 改为你的 QQ 号
  check_interval: 60000,  // 检查间隔（毫秒）
  
  // 监听的端口
  monitored_ports: [22, 80, 443, 3306],
  
  // 磁盘空间警告阈值（百分比）
  disk_warning_threshold: 90,
  
  // 内存使用警告阈值（百分比）
  memory_warning_threshold: 90,
};

// 状态记录
const state = {
  last_port_access: {},
  last_disk_warning: 0,
  last_memory_warning: 0,
};

/**
 * 检查端口访问（通过 ss 命令）
 */
function checkPortAccess() {
  CONFIG.monitored_ports.forEach(port => {
    exec(`ss -tn | grep :${port} | grep ESTAB`, (error, stdout) => {
      if (stdout && stdout.trim()) {
        const connections = stdout.trim().split('\n');
        const now = Date.now();
        
        // 如果距离上次通知超过 5 分钟，再次通知
        if (!state.last_port_access[port] || now - state.last_port_access[port] > 300000) {
          const ips = connections.map(line => {
            const match = line.match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
            return match ? match[1] : 'unknown';
          });
          
          const uniqueIps = [...new Set(ips)];
          const message = `🔔 端口 ${port} 检测到 ${connections.length} 个活动连接\n来源 IP: ${uniqueIps.join(', ')}`;
          
          sendQQMessage(CONFIG.qq_user, message)
            .then(() => console.log(`[事件监听] 已发送端口 ${port} 访问通知`))
            .catch(err => console.error(`[事件监听] 发送失败:`, err));
          
          state.last_port_access[port] = now;
        }
      }
    });
  });
}

/**
 * 检查磁盘空间
 */
function checkDiskSpace() {
  exec("df -h / | tail -1 | awk '{print $5}' | sed 's/%//'", (error, stdout) => {
    if (!error && stdout) {
      const usage = parseInt(stdout.trim(), 10);
      const now = Date.now();
      
      if (usage >= CONFIG.disk_warning_threshold) {
        // 每小时最多通知一次
        if (now - state.last_disk_warning > 3600000) {
          const message = `⚠️ 磁盘空间警告\n根分区使用率: ${usage}%\n建议清理磁盘空间`;
          
          sendQQMessage(CONFIG.qq_user, message)
            .then(() => console.log(`[事件监听] 已发送磁盘空间警告`))
            .catch(err => console.error(`[事件监听] 发送失败:`, err));
          
          state.last_disk_warning = now;
        }
      }
    }
  });
}

/**
 * 检查内存使用
 */
function checkMemoryUsage() {
  exec("free | grep Mem | awk '{print ($3/$2) * 100.0}'", (error, stdout) => {
    if (!error && stdout) {
      const usage = parseFloat(stdout.trim());
      const now = Date.now();
      
      if (usage >= CONFIG.memory_warning_threshold) {
        // 每小时最多通知一次
        if (now - state.last_memory_warning > 3600000) {
          const message = `⚠️ 内存使用警告\n内存使用率: ${usage.toFixed(1)}%\n建议检查进程`;
          
          sendQQMessage(CONFIG.qq_user, message)
            .then(() => console.log(`[事件监听] 已发送内存使用警告`))
            .catch(err => console.error(`[事件监听] 发送失败:`, err));
          
          state.last_memory_warning = now;
        }
      }
    }
  });
}

/**
 * 监听文件变化（如新邮件）
 */
function watchFile(filepath, callback) {
  let lastMtime = null;
  
  setInterval(() => {
    fs.stat(filepath, (err, stats) => {
      if (err) return;
      
      if (lastMtime === null) {
        lastMtime = stats.mtime;
        return;
      }
      
      if (stats.mtime > lastMtime) {
        lastMtime = stats.mtime;
        callback(filepath);
      }
    });
  }, CONFIG.check_interval);
}

/**
 * 主循环
 */
function startMonitoring() {
  console.log('[事件监听] 服务启动');
  console.log('[事件监听] 监听端口:', CONFIG.monitored_ports.join(', '));
  console.log('[事件监听] 检查间隔:', CONFIG.check_interval / 1000, '秒');
  
  // 发送启动通知
  sendQQMessage(CONFIG.qq_user, '🤖 事件监听服务已启动\n正在监控系统状态...')
    .catch(err => console.error('[事件监听] 启动通知发送失败:', err));
  
  // 定期检查
  setInterval(() => {
    checkPortAccess();
    checkDiskSpace();
    checkMemoryUsage();
  }, CONFIG.check_interval);
  
  // 示例：监听邮件目录（如果存在）
  const mailDir = '/var/mail/root';
  if (fs.existsSync(mailDir)) {
    watchFile(mailDir, (file) => {
      sendQQMessage(CONFIG.qq_user, `📧 检测到新邮件\n文件: ${file}`)
        .catch(err => console.error('[事件监听] 邮件通知发送失败:', err));
    });
  }
}

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n[事件监听] 收到退出信号，正在关闭...');
  sendQQMessage(CONFIG.qq_user, '🤖 事件监听服务已停止')
    .then(() => process.exit(0))
    .catch(() => process.exit(0));
});

// 启动
if (require.main === module) {
  startMonitoring();
}

module.exports = { startMonitoring };

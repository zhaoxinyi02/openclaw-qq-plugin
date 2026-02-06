#!/usr/bin/env node

/**
 * QQ 消息发送工具
 * 可以直接通过 NapCat 的 WebSocket API 发送消息，无需等待 OpenClaw agent
 * 
 * 用法：
 *   node send-message.js <user_id> <message>
 *   node send-message.js group:<group_id> <message>
 * 
 * 示例：
 *   node send-message.js 123456789 "这是一条测试消息"
 *   node send-message.js group:123456789 "群消息测试"
 */

const WebSocket = require('ws');

const NAPCAT_WS_URL = 'ws://127.0.0.1:3001';
const ACCESS_TOKEN = 'your_napcat_token';  // TODO: 改为你的 NapCat access token

function sendQQMessage(target, message) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(NAPCAT_WS_URL, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('发送超时'));
    }, 10000);

    ws.on('open', () => {
      console.log('[QQ发送工具] 已连接到 NapCat');
      
      let action, params;
      
      if (target.startsWith('group:')) {
        const groupId = parseInt(target.replace('group:', ''), 10);
        action = 'send_group_msg';
        params = {
          group_id: groupId,
          message: [{ type: 'text', data: { text: message } }]
        };
      } else {
        const userId = parseInt(target, 10);
        action = 'send_private_msg';
        params = {
          user_id: userId,
          message: [{ type: 'text', data: { text: message } }]
        };
      }

      const request = {
        action: action,
        params: params,
        echo: `send_${Date.now()}`
      };

      console.log('[QQ发送工具] 发送请求:', JSON.stringify(request, null, 2));
      ws.send(JSON.stringify(request));
    });

    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      console.log('[QQ发送工具] 收到响应:', JSON.stringify(response, null, 2));
      
      if (response.echo && response.echo.startsWith('send_')) {
        clearTimeout(timeout);
        if (response.status === 'ok') {
          console.log('[QQ发送工具] ✅ 消息发送成功');
          resolve(response.data);
        } else {
          console.error('[QQ发送工具] ❌ 发送失败:', response.message);
          reject(new Error(response.message || '发送失败'));
        }
        ws.close();
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[QQ发送工具] WebSocket 错误:', error);
      reject(error);
    });

    ws.on('close', () => {
      console.log('[QQ发送工具] 连接已关闭');
    });
  });
}

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('用法: node send-message.js <target> <message>');
    console.error('示例: node send-message.js 123456789 "你好"');
    console.error('示例: node send-message.js group:123456789 "群消息"');
    process.exit(1);
  }

  const [target, ...messageParts] = args;
  const message = messageParts.join(' ');

  sendQQMessage(target, message)
    .then(() => {
      console.log('[QQ发送工具] 完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[QQ发送工具] 错误:', error.message);
      process.exit(1);
    });
}

module.exports = { sendQQMessage };

#!/usr/bin/env node

/**
 * OpenClaw Cron 辅助工具
 * 通过 OpenClaw Gateway API 创建定时任务
 * 
 * 用法：
 *   node cron-helper.js add-daily <hour> <minute> <message>
 *   node cron-helper.js add-once <minutes-from-now> <message>
 *   node cron-helper.js list
 */

const GATEWAY_URL = 'http://127.0.0.1:18789';
const GATEWAY_TOKEN = 'your_gateway_token';  // TODO: 改为你的 Gateway token
const QQ_USER = 'YOUR_QQ_NUMBER';  // TODO: 改为你的 QQ 号

/**
 * 调用 Gateway API
 */
async function callGatewayAPI(endpoint, method = 'GET', body = null) {
  const url = `${GATEWAY_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API 调用失败: ${response.status} ${text}`);
  }

  return response.json();
}

/**
 * 创建每日定时任务
 */
async function addDailyTask(hour, minute, message) {
  const cronExpr = `${minute} ${hour} * * *`;
  
  const job = {
    name: `每日消息 ${hour}:${minute}`,
    schedule: {
      kind: 'cron',
      expr: cronExpr,
      tz: 'Asia/Shanghai'
    },
    sessionTarget: 'isolated',
    wakeMode: 'now',
    payload: {
      kind: 'agentTurn',
      message: message,
      deliver: true,
      channel: 'qq',
      to: QQ_USER,
      bestEffortDeliver: true
    },
    isolation: {
      postToMainPrefix: 'Cron',
      postToMainMode: 'summary'
    }
  };

  console.log('[Cron助手] 创建每日任务:', cronExpr);
  console.log('[Cron助手] 消息:', message);
  
  const result = await callGatewayAPI('/api/cron/add', 'POST', job);
  console.log('[Cron助手] ✅ 任务创建成功');
  console.log('[Cron助手] 任务ID:', result.jobId);
  
  return result;
}

/**
 * 创建一次性任务
 */
async function addOnceTask(minutesFromNow, message) {
  const atMs = Date.now() + minutesFromNow * 60 * 1000;
  
  const job = {
    name: `一次性提醒 (${minutesFromNow}分钟后)`,
    schedule: {
      kind: 'at',
      atMs: atMs
    },
    sessionTarget: 'isolated',
    wakeMode: 'now',
    payload: {
      kind: 'agentTurn',
      message: message,
      deliver: true,
      channel: 'qq',
      to: QQ_USER,
      bestEffortDeliver: true
    },
    deleteAfterRun: true
  };

  console.log('[Cron助手] 创建一次性任务');
  console.log('[Cron助手] 执行时间:', new Date(atMs).toLocaleString('zh-CN'));
  console.log('[Cron助手] 消息:', message);
  
  const result = await callGatewayAPI('/api/cron/add', 'POST', job);
  console.log('[Cron助手] ✅ 任务创建成功');
  console.log('[Cron助手] 任务ID:', result.jobId);
  
  return result;
}

/**
 * 列出所有任务
 */
async function listTasks() {
  const result = await callGatewayAPI('/api/cron/list');
  
  console.log('[Cron助手] 当前任务列表:');
  console.log('');
  
  if (!result.jobs || result.jobs.length === 0) {
    console.log('  (无任务)');
    return;
  }
  
  result.jobs.forEach((job, index) => {
    console.log(`${index + 1}. ${job.name}`);
    console.log(`   ID: ${job.jobId}`);
    console.log(`   状态: ${job.enabled ? '启用' : '禁用'}`);
    
    if (job.schedule.kind === 'cron') {
      console.log(`   时间: ${job.schedule.expr} (${job.schedule.tz || '本地时区'})`);
    } else if (job.schedule.kind === 'at') {
      console.log(`   时间: ${new Date(job.schedule.atMs).toLocaleString('zh-CN')}`);
    } else if (job.schedule.kind === 'every') {
      console.log(`   间隔: ${job.schedule.everyMs / 1000} 秒`);
    }
    
    console.log('');
  });
}

/**
 * 创建示例任务
 */
async function createExamples() {
  console.log('[Cron助手] 创建示例任务...\n');
  
  // 1. 早安问候
  await addDailyTask(8, 0, '早上好！新的一天开始了 🌅');
  
  // 2. 午餐提醒
  await addDailyTask(12, 0, '该吃午饭了！记得休息一下 🍱');
  
  // 3. 晚安问候
  await addDailyTask(22, 0, '晚安！早点休息哦 🌙');
  
  // 4. 一次性提醒（5分钟后）
  await addOnceTask(5, '这是一个测试提醒，5分钟前创建的');
  
  console.log('\n[Cron助手] ✅ 所有示例任务创建完成');
}

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  (async () => {
    try {
      if (command === 'add-daily') {
        const [hour, minute, ...messageParts] = args.slice(1);
        const message = messageParts.join(' ');
        await addDailyTask(parseInt(hour), parseInt(minute), message);
      } else if (command === 'add-once') {
        const [minutes, ...messageParts] = args.slice(1);
        const message = messageParts.join(' ');
        await addOnceTask(parseInt(minutes), message);
      } else if (command === 'list') {
        await listTasks();
      } else if (command === 'examples') {
        await createExamples();
      } else {
        console.error('用法:');
        console.error('  node cron-helper.js add-daily <hour> <minute> <message>');
        console.error('  node cron-helper.js add-once <minutes> <message>');
        console.error('  node cron-helper.js list');
        console.error('  node cron-helper.js examples');
        process.exit(1);
      }
    } catch (error) {
      console.error('[Cron助手] 错误:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { addDailyTask, addOnceTask, listTasks };

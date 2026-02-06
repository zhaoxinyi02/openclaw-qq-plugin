#!/usr/bin/env node

/**
 * 简化版定时任务工具
 * 直接使用 Linux crontab 和 at，不依赖 OpenClaw Gateway
 * 
 * 用法：
 *   node simple-cron.js add-daily <hour> <minute> <message>
 *   node simple-cron.js add-once <minutes> <message>
 *   node simple-cron.js list
 */

const SEND_SCRIPT = '/root/qq-tools/send-message.js';
const QQ_USER = 'YOUR_QQ_NUMBER';  // TODO: 改为你的 QQ 号

/**
 * 执行 shell 命令
 */
function execSync(command) {
  return require('child_process').execSync(command, { encoding: 'utf-8' });
}

/**
 * 添加每日定时任务
 */
function addDailyTask(hour, minute, message) {
  try {
    // 生成 cron 表达式
    const cronExpr = `${minute} ${hour} * * *`;
    
    // 生成唯一 ID
    const jobId = `daily_${hour}_${minute}_${Date.now()}`;
    
    // 获取当前 crontab
    let currentCrontab = '';
    try {
      const result = execSync('crontab -l 2>/dev/null');
      currentCrontab = result.toString().trim();
    } catch (e) {
      currentCrontab = '# 定时任务由 qq-tools 管理';
    }
    
    // 添加任务（写入文件再设置，避免引号问题）
    const taskLine = `${cronExpr} node ${SEND_SCRIPT} ${QQ_USER} '${message}' # ${jobId}`;
    const newCrontab = currentCrontab + '\n' + taskLine;
    
    // 写入临时文件并设置 crontab
    execSync(`echo "${newCrontab.replace(/"/g, '\\"')}" > /tmp/new_cron.txt`);
    execSync('crontab /tmp/new_cron.txt');
    
    console.log('[Cron助手] ✅ 每日任务创建成功');
    console.log('[Cron助手] 时间: ' + hour + ':' + minute);
    console.log('[Cron助手] 内容: ' + message);
    console.log('[Cron助手] Job ID: ' + jobId);
    
    return { success: true, jobId, message, time: `${hour}:${minute}` };
    
  } catch (error) {
    console.error('[Cron助手] ❌ 创建失败:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 添加一次性任务（使用 at 命令）
 */
function addOnceTask(minutesFromNow, message) {
  try {
    const executeTime = new Date(Date.now() + minutesFromNow * 60 * 1000);
    
    // 使用 at 命令（通过写入文件避免引号问题）
    const atTime = executeTime.toISOString().slice(0, 19).replace('T', ' ');
    const command = `node ${SEND_SCRIPT} ${QQ_USER} '${message}'`;
    
    // 写入 at 命令文件
    execSync(`echo "${command}" | at "${atTime}" 2>&1`);
    
    console.log('[Cron助手] ✅ 一次性任务创建成功');
    console.log('[Cron助手] 执行时间: ' + executeTime.toLocaleString());
    console.log('[Cron助手] 内容: ' + message);
    
    return { success: true, executeTime: executeTime.toISOString(), message };
    
  } catch (error) {
    console.error('[Cron助手] ❌ 创建失败:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 列出所有任务
 */
function listTasks() {
  try {
    console.log('[Cron助手] 当前定时任务:\n');
    
    // 列出 crontab
    console.log('=== 每日任务 (crontab) ===');
    const cronResult = execSync('crontab -l 2>/dev/null').toString();
    if (!cronResult.trim()) {
      console.log('  (无每日任务)');
    } else {
      const lines = cronResult.trim().split('\n').filter(line => line.trim() && !line.startsWith('#') && !line.includes('LANG='));
      if (lines.length === 0) {
        console.log('  (无任务)');
      } else {
        lines.forEach((line, index) => {
          // 提取时间和消息
          const timeMatch = line.match(/^\d+\s+\d+\s+\*\s+\*\s+\*/);
          const msgMatch = line.match(/node .*? (\d+) '(.+?)'/);
          if (timeMatch && msgMatch) {
            console.log(`${index + 1}. [${msgMatch[1]}] ${msgMatch[2]}`);
          } else {
            console.log(`${index + 1}. ${line}`);
          }
        });
      }
    }
    
    console.log('\n=== 一次性任务 (at) ===');
    const atResult = execSync('atq 2>/dev/null').toString();
    if (!atResult.trim()) {
      console.log('  (无一次性任务)');
    } else {
      console.log(atResult);
    }
    
    return { success: true };
    
  } catch (error) {
    console.log('  (无法获取任务列表)');
    return { success: true, jobs: [] };
  }
}

/**
 * 删除任务
 */
function removeTask(jobId) {
  try {
    // 获取当前 crontab
    const result = execSync('crontab -l').toString();
    const lines = result.split('\n').filter(line => !line.includes(jobId) || line.startsWith('#'));
    
    // 设置新的 crontab
    execSync(`echo "${lines.join('\n')}" | crontab -`);
    
    console.log('[Cron助手] ✅ 任务删除成功');
    console.log('[Cron助手] Job ID: ' + jobId);
    
    return { success: true };
    
  } catch (error) {
    console.error('[Cron助手] ❌ 删除失败:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 创建示例任务
 */
function createExamples() {
  console.log('[Cron助手] 创建示例任务...\n');
  
  addDailyTask(8, 0, '早上好！新的一天开始了 🌅');
  addDailyTask(12, 0, '该吃午饭了！记得休息一下 🍱');
  addDailyTask(22, 0, '晚安！早点休息哦 🌙');
  
  console.log('\n[Cron助手] ✅ 示例任务创建完成');
}

/**
 * 测试发送消息
 */
function testSend(message) {
  const msg = message || '测试消息';
  try {
    const result = execSync(`node ${SEND_SCRIPT} ${QQ_USER} '${msg}'`);
    console.log('[Cron助手] ✅ 消息发送成功');
    return { success: true };
  } catch (error) {
    console.error('[Cron助手] ❌ 发送失败:', error.message);
    return { success: false, error: error.message };
  }
}

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'add-daily') {
      const [hour, minute, ...messageParts] = args.slice(1);
      const message = messageParts.join(' ');
      addDailyTask(parseInt(hour), parseInt(minute), message);
      
    } else if (command === 'add-once') {
      const [minutes, ...messageParts] = args.slice(1);
      const message = messageParts.join(' ');
      addOnceTask(parseInt(minutes), message);
      
    } else if (command === 'list') {
      listTasks();
      
    } else if (command === 'remove') {
      const jobId = args[1];
      removeTask(jobId);
      
    } else if (command === 'examples') {
      createExamples();
      
    } else if (command === 'test') {
      const message = args.slice(1).join(' ') || '测试消息';
      testSend(message);
      
    } else {
      console.error('用法:');
      console.error('  node simple-cron.js add-daily <hour> <minute> <message>');
      console.error('  node simple-cron.js add-once <minutes> <message>');
      console.error('  node simple-cron.js list');
      console.error('  node simple-cron.js remove <job-id>');
      console.error('  node simple-cron.js examples');
      console.error('  node simple-cron.js test <message>');
      process.exit(1);
    }
  } catch (error) {
    console.error('[Cron助手] 错误:', error.message);
    process.exit(1);
  }
}

module.exports = { addDailyTask, addOnceTask, listTasks, removeTask, testSend };

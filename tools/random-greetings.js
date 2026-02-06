#!/usr/bin/env node

/**
 * 随机问候脚本
 * 每天随机生成 15-25 个问候时间点，从 7:00 到 23:59
 * 每次发送随机生成的亲切问候语
 */

const SEND_SCRIPT = '/root/qq-tools/send-message.js';
const QQ_USER = 'YOUR_QQ_NUMBER';  // TODO: 改为你的 QQ 号
const MIN_GREETINGS = 15;
const MAX_GREETINGS = 25;
const START_HOUR = 7;
const END_HOUR = 23;

/**
 * 随机问候语库（按时间段分类）
 */
const greetingTemplates = {
  morning: [
    "早安！新的一天开始了，记得吃早餐哦 🌅",
    "早上好呀！今天也要元气满满！☀️",
    "早安！今天的太阳特别温暖，适合出去走走 🌞",
    "起床啦！美好的一天从现在开始！✨",
    "早安！喝杯水，开启美好的一天 🥛",
    "早上好！记得今天要开心哦 🌸",
    "早安！今天的运气一定会很好 🍀",
    "新的一天，新的开始！早安！🌈",
  ],
  noon: [
    "中午好！吃饭了吗？🍱",
    "午休时间到了，记得休息一下 😴",
    "中午好呀！下午继续加油 💪",
    "午餐时间到！美食在向你招手 🍽️",
    "下午好！保持好心情 ☕",
  ],
  afternoon: [
    "下午好！工作/学习累了吗？休息一下 👀",
    "下午茶时间到！☕",
    "下午好呀！距离下班/下课又近了一步 🎉",
    "下午的阳光真好！🌤️",
    "下午好！记得多喝水 💧",
  ],
  evening: [
    "晚上好呀！今天过得怎么样？🌙",
    "晚饭吃了吗？不要饿肚子哦 🍚",
    "晚上好！放松一下自己吧 🛀",
    "夜幕降临了，晚安！🌃",
    "晚上好！今天辛苦啦 💐",
  ],
  random: [
    "突然想你了，就给你发个消息 😊",
    "在干嘛呀？想你啦！💕",
    "嘿！今天一切都好吗？👋",
    "给你一个温暖的抱抱！🤗",
    "今天也要开心哦！🌷",
    "突然问候你一下，证明在想你 😊",
    "嘿！别太累了，注意休息哦 💝",
    "给你说声好！愿你今天顺利！🍀",
    "希望收到消息的你今天心情好！🌸",
    "想你啦！给你一个大大拥抱！🤗",
  ]
};

/**
 * 生成随机问候语
 */
function generateGreeting() {
  const now = new Date();
  const hour = now.getHours();
  
  let category;
  if (hour >= 7 && hour < 10) {
    category = 'morning';
  } else if (hour >= 10 && hour < 14) {
    category = 'noon';
  } else if (hour >= 14 && hour < 18) {
    category = 'afternoon';
  } else {
    category = 'evening';
  }
  
  // 70% 概率使用时间段相关的问候，30% 使用随机问候
  if (Math.random() < 0.3) {
    category = 'random';
  }
  
  const templates = greetingTemplates[category];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // 30% 概率添加随机小表情后缀
  if (Math.random() < 0.3) {
    const suffixes = ["✨", "🌟", "💫", "🌸", "💖", "🎉", "🥰", "😘"];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return template + " " + suffix;
  }
  
  return template;
}

/**
 * 生成指定数量的随机时间点
 */
function generateRandomTimes(count) {
  const times = [];
  const startMinutes = START_HOUR * 60;
  const endMinutes = END_HOUR * 60 + 59;
  
  while (times.length < count) {
    const randomMinutes = Math.floor(Math.random() * (endMinutes - startMinutes + 1)) + startMinutes;
    const hour = Math.floor(randomMinutes / 60);
    const minute = randomMinutes % 60;
    
    const timeStr = `${hour}:${minute.toString().padStart(2, '0')}`;
    
    // 避免重复时间
    if (!times.includes(timeStr)) {
      times.push(timeStr);
    }
  }
  
  // 排序
  times.sort((a, b) => {
    const [ha, ma] = a.split(':').map(Number);
    const [hb, mb] = b.split(':').map(Number);
    return ha * 60 + ma - (hb * 60 + mb);
  });
  
  return times;
}

/**
 * 发送问候消息
 */
function sendGreeting(message) {
  try {
    const { execSync } = require('child_process');
    const result = execSync(`node ${SEND_SCRIPT} ${QQ_USER} '${message.replace(/'/g, "\\'")}'`);
    console.log(`[随机问候] ✅ 已发送: ${message}`);
    return true;
  } catch (error) {
    console.error(`[随机问候] ❌ 发送失败: ${error.message}`);
    return false;
  }
}

/**
 * 生成今天的问候任务
 */
function generateTodayGreetings() {
  // 生成 15-25 个随机时间点
  const count = Math.floor(Math.random() * (MAX_GREETINGS - MIN_GREETINGS + 1)) + MIN_GREETINGS;
  const times = generateRandomTimes(count);
  
  // 生成唯一 ID
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const jobId = `greeting_${dateStr}_${Date.now()}`;
  
  console.log(`[随机问候] 生成 ${count} 个问候任务`);
  console.log(`[随机问候] Job ID: ${jobId}`);
  console.log(`[随机问候] 时间点: ${times.join(', ')}`);
  
  return { times, jobId };
}

/**
 * 创建问候任务（添加到 crontab）
 */
function createGreetingTasks() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const { times, jobId } = generateTodayGreetings();
  
  try {
    const { execSync } = require('child_process');
    
    // 获取当前 crontab，删除旧的问候任务
    let currentCrontab = '';
    try {
      currentCrontab = execSync('crontab -l 2>/dev/null').toString();
    } catch (e) {
      currentCrontab = '# 定时任务';
    }
    
    // 移除旧的随机问候任务（以 # greeting_ 开头）
    const lines = currentCrontab.split('\n').filter(line => 
      !line.includes('# greeting_') && 
      line.trim() && 
      !line.startsWith('#')
    );
    
    // 添加新的问候任务
    const greetingMessages = {};
    times.forEach(time => {
      const [hour, minute] = time.split(':').map(Number);
      const message = generateGreeting();
      greetingMessages[time] = message;
      
      const cronJob = `${minute} ${hour} * * * node ${SEND_SCRIPT} ${QQ_USER} '${message.replace(/'/g, "\\'")}' # greeting_${jobId}_${time}`;
      lines.push(cronJob);
    });
    
    // 保存到 crontab
    const newCrontab = lines.join('\n');
    execSync(`echo "${newCrontab.replace(/"/g, '\\"')}" | crontab -`);
    
    console.log(`\n[随机问候] ✅ 任务创建成功！`);
    console.log(`[随机问候] 共 ${times.length} 个问候`);
    console.log(`[随机问候] Job ID: ${jobId}\n`);
    
    // 保存消息映射到文件
    const fs = require('fs');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const mappingPath = `/root/.openclaw/work/greetings_${dateStr}.json`;
    fs.writeFileSync(mappingPath, JSON.stringify({
      jobId,
      date: new Date().toISOString().slice(0, 10),
      times,
      messages: greetingMessages
    }, null, 2));
    
    console.log(`[随机问候] 消息映射已保存: ${mappingPath}`);
    
    return { success: true, count: times.length, jobId };
    
  } catch (error) {
    console.error(`[随机问候] ❌ 创建失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 主函数
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'generate') {
    // 生成今天的问候任务
    createGreetingTasks();
  } else if (command === 'test') {
    // 测试发送一条问候
    const message = generateGreeting();
    console.log(`[测试] 生成问候语: ${message}`);
    sendGreeting(message);
  } else if (command === 'preview') {
    // 预览今天的问候时间
    const { times, jobId } = generateTodayGreetings();
    console.log(`\n今天的问候时间点 (${times.length}个):\n`);
    times.forEach(time => {
      console.log(`  ${time}`);
    });
    console.log();
  } else {
    console.log('用法:');
    console.log('  node random-greetings.js generate   # 生成今天的问候任务');
    console.log('  node random-greetings.js test      # 测试发送一条问候');
    console.log('  node random-greetings.js preview   # 预览今天的随机时间');
    process.exit(1);
  }
}

module.exports = { generateGreeting, createGreetingTasks, sendGreeting };

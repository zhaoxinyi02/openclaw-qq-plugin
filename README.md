<div align="center">

<img src="img/openclaw_qw0210.png" alt="OpenClaw IM Manager" width="680" />

# OpenClaw IM Manager

**让你的 QQ 和微信个人号秒变 AI 助手**

Docker 一键部署 · 扫码即用 · 可视化管理后台

[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-brightgreen?style=flat-square&logo=docker&logoColor=white)](docker-compose.yml)
[![Version](https://img.shields.io/badge/version-3.0.0-orange?style=flat-square)](https://github.com/zhaoxinyi02/openclaw-im-manager/releases/tag/v3.0.0)
[![GitHub Stars](https://img.shields.io/github/stars/zhaoxinyi02/openclaw-im-manager?style=flat-square&logo=github)](https://github.com/zhaoxinyi02/openclaw-im-manager/stargazers)

[快速开始](#-快速开始) · [功能特性](#-主要功能) · [效果预览](#-效果预览) · [API 文档](docs/API.md) · [部署指南](docs/DEPLOYMENT.md)

</div>

---

> [!NOTE]
> 本项目原名 **openclaw-qq-plugin**，v3.0 起正式更名为 **openclaw-im-manager**，新增微信通道支持。
> 旧版本（仅 QQ）请查看 [v2.0.0 Tag](https://github.com/zhaoxinyi02/openclaw-im-manager/releases/tag/v2.0.0)。

## ✨ 主要功能

1. 💬 **QQ + 微信双通道 AI 对话** — 私聊/群聊发消息或 @机器人即可与 AI 对话，微信个人号自动回复。
2. 🤖 **多模型支持** — 通过 OpenClaw 接入 GPT-4o、Claude、Gemini、DeepSeek 等任意大模型。
3. 🛡️ **QQ 增强** — 防撤回、戳一戳回复、入群欢迎、好友/入群自动审核。
4. 📱 **微信个人号** — 扫码登录、消息收发、Webhook 回调，基于 wechatbot-webhook 稳定运行。
5. 💻 **可视化管理后台** — 7 个功能页面，所有操作浏览器内完成，实时事件流。
6. 🐳 **Docker 一键部署** — Docker Compose 双容器编排，启动即用。
7. 🌍 **跨平台** — Linux / macOS / Windows，提供 bash + PowerShell 双版本配置脚本。

## 📸 效果预览

<table>
  <tr>
    <td align="center"><b>仪表盘</b><br/><img src="img/dashboard.png" width="400"/></td>
    <td align="center"><b>QQ Bot 管理</b><br/><img src="img/qqbot.png" width="400"/></td>
  </tr>
  <tr>
    <td align="center"><b>QQ 登录</b><br/><img src="img/qqlogin.png" width="400"/></td>
    <td align="center"><b>微信登录</b><br/><img src="img/wechatlogin.png" width="400"/></td>
  </tr>
  <tr>
    <td align="center"><b>审核中心</b><br/><img src="img/requests.png" width="400"/></td>
    <td align="center"><b>设置</b><br/><img src="img/settings.png" width="400"/></td>
  </tr>
</table>

## 🏗️ 架构

```
┌──────────────────────────────────────────────────────┐
│                  Docker Compose                      │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │          openclaw-qq Container                  │ │
│  │  ┌─────────┐  ┌──────────┐  ┌───────────┐      │ │
│  │  │ NapCat  │  │ Manager  │  │ Frontend  │      │ │
│  │  │  (QQ)   │←→│ Backend  │←→│ (React)   │      │ │
│  │  │  :6099  │  │  :6199   │  │           │      │ │
│  │  └─────────┘  └────┬─────┘  └───────────┘      │ │
│  └─────────────────────┼───────────────────────────┘ │
│                        │ HTTP callback               │
│  ┌─────────────────────┼───────────────────────────┐ │
│  │     openclaw-wechat Container                   │ │
│  │  ┌──────────────────┴──────────────────────┐    │ │
│  │  │   wechatbot-webhook (微信 Web 协议)     │    │ │
│  │  │   :3001 (内部) → :3002 (外部)           │    │ │
│  │  └─────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────┘ │
└──────────┬──────────────┬────────────────────────────┘
           │              │
      ┌────┴────┐    ┌────┴────┐
      │ OpenClaw│    │ Browser │
      │ Gateway │    │ 管理后台 │
      └─────────┘    └─────────┘
```

## 🛠️ 技术栈

| 层级 | 技术 |
|:---|:---|
| QQ 协议 | [NapCat](https://github.com/NapNeko/NapCatQQ) (OneBot11 WebSocket) |
| 微信协议 | [wechatbot-webhook](https://github.com/danni-cool/wechatbot-webhook) (Web 微信) |
| 后端 | TypeScript · Express · WebSocket |
| 前端 | React · Vite · TailwindCSS |
| AI 引擎 | [OpenClaw](https://openclaw.ai) — 支持 GPT-4o / Claude / Gemini / DeepSeek 等 |
| 部署 | Docker Compose 双容器编排 |

## 🚀 快速开始

### 前提条件

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [OpenClaw](https://openclaw.ai) 已安装

### 1️⃣ 克隆 & 配置

```bash
git clone https://github.com/zhaoxinyi02/openclaw-im-manager.git
cd openclaw-im-manager
cp .env.example .env
```

编辑 `.env`：

```env
ADMIN_TOKEN=你的管理密码        # 管理后台登录密码
QQ_ACCOUNT=你的QQ号            # QQ 账号（可选，用于快速登录）
OWNER_QQ=主人QQ号              # 接收通知的 QQ 号
WECHAT_TOKEN=openclaw-wechat   # 微信 Webhook Token
OPENCLAW_DIR=~/.openclaw       # OpenClaw 配置目录
```

### 2️⃣ 启动

```bash
docker compose up -d
```

### 3️⃣ 配置 OpenClaw 频道

```bash
# Linux / macOS
chmod +x setup-openclaw.sh && ./setup-openclaw.sh

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File setup-openclaw.ps1
```

### 4️⃣ 登录 & 使用

1. 浏览器访问 `http://你的服务器IP:6199`
2. 输入 `ADMIN_TOKEN` 登录
3. 左侧 **「QQ 登录」** → 手机 QQ 扫码
4. 左侧 **「微信登录」** → 手机微信扫码
5. 用另一个号给 Bot 发消息，收到 AI 回复即成功 🎉

## 📡 端口说明

| 端口 | 服务 | 说明 |
|:---:|:---|:---|
| `6199` | 管理后台 | 主入口，浏览器访问 |
| `6099` | NapCat WebUI | QQ 协议管理（可选） |
| `3001` | OneBot11 WS | OpenClaw 连接 QQ 用 |
| `3002` | 微信 Webhook | 微信 API 调试用 |

## 🌍 跨平台部署

| 平台 | 启动命令 | 配置脚本 |
|:---:|:---|:---|
| 🐧 Linux | `docker compose up -d` | `./setup-openclaw.sh` |
| 🍎 macOS | `docker compose up -d` | `./setup-openclaw.sh` |
| 🪟 Windows | `docker compose up -d` | `powershell -File setup-openclaw.ps1` |

> [!TIP]
> Windows 用户需在 `.env` 中设置 `OPENCLAW_DIR=C:\Users\你的用户名\.openclaw`

## 📖 文档

| 文档 | 说明 |
|:---|:---|
| [API 接口文档](docs/API.md) | 完整的 REST API + WebSocket 接口说明 |
| [部署指南](docs/DEPLOYMENT.md) | 详细部署步骤、环境变量、防火墙、反向代理、故障排查 |

## ❓ 常见问题

<details>
<summary><b>QQ 扫码后提示登录失败？</b></summary>

确保 QQ 账号没有开启设备锁，或尝试使用快速登录。
</details>

<details>
<summary><b>微信扫码页面打不开？</b></summary>

确保微信容器已启动：`docker compose logs wechat`，且端口 3002 未被占用。
</details>

<details>
<summary><b>微信提示不支持网页版登录？</b></summary>

部分微信账号未开通网页版权限，需要使用较早注册的微信号。
</details>

<details>
<summary><b>OpenClaw 连接不上？</b></summary>

运行 `./setup-openclaw.sh` 重新配置，然后重启 OpenClaw。
</details>

<details>
<summary><b>如何查看日志？</b></summary>

```bash
docker compose logs -f          # 全部日志
docker compose logs -f wechat   # 仅微信容器
```
</details>

<details>
<summary><b>如何更新到最新版？</b></summary>

```bash
git pull && docker compose up -d --build
```
</details>

## 📋 更新日志

### v3.0.0 — QQ + 微信双通道 (2026-02-10)
- 🆕 新增微信个人号接入（基于 wechatbot-webhook）
- 🆕 管理后台新增微信登录页面、微信状态显示
- 🆕 仪表盘支持 QQ + 微信双通道实时事件
- 🆕 新增微信消息收发 API
- 🌍 跨平台支持（Linux / macOS / Windows）
- 📝 项目更名：`openclaw-qq-plugin` → `openclaw-im-manager`

### v2.0.0 — 全新管理后台 (2026-02-09)
- 💻 全新管理后台 UI（React + TailwindCSS）
- 🔐 集成 QQ 登录（扫码 / 快速 / 账密）
- 🔌 内置 OneBot WS 代理
- 💾 QQ 登录 session 持久化

### v1.0.0 — 初始版本
- 🐳 基础管理后台 + NapCat Docker 集成

## ❤️ 致谢

本项目的实现离不开以下优秀的开源项目：

- [NapNeko/NapCatQQ](https://github.com/NapNeko/NapCatQQ) — QQ 协议框架
- [danni-cool/wechatbot-webhook](https://github.com/danni-cool/wechatbot-webhook) — 微信 Webhook 机器人
- [OpenClaw](https://openclaw.ai) — AI 助手引擎

## 📄 License

[MIT](LICENSE) © 2026

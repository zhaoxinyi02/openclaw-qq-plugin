<div align="center">

<img src="img/logo.jpg" width="700"/>

# 🐾 ClawPanel

**OpenClaw Smart Management Panel — A more powerful visual management tool than the official console**

Multi-channel · Multi-model · Skill Center · Version Management · Environment Detection · Docker One-click Deploy

[![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-red?style=flat-square)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-brightgreen?style=flat-square&logo=docker&logoColor=white)](docker-compose.yml)
[![Version](https://img.shields.io/badge/version-4.2.1-violet?style=flat-square)](https://github.com/zhaoxinyi02/ClawPanel/releases)
[![GitHub Stars](https://img.shields.io/github/stars/zhaoxinyi02/ClawPanel?style=flat-square&logo=github)](https://github.com/zhaoxinyi02/ClawPanel/stargazers)

[Quick Start](#-quick-start) · [Features](#-features) · [API Docs](docs/API.md) · [Deployment Guide](docs/DEPLOYMENT.md) · [中文](README.md)

</div>

---

> [!CAUTION]
> **⚠️ Disclaimer**
>
> This project is for **learning and research purposes only**. **Commercial use is strictly prohibited.** Using third-party clients to log in to QQ/WeChat may violate Tencent's Terms of Service and **carries a risk of account suspension**. Please use test accounts. The author has **not performed any reverse engineering** and only integrates existing open-source projects. **No responsibility is assumed for any consequences.** By downloading and using this project, you agree to the [full disclaimer](DISCLAIMER.md).

## ✨ Features

### 📊 Smart Dashboard
Dynamically displays connected channel cards, AI model status, uptime, memory usage, daily message statistics, and a real-time activity stream. **Only connected channels are shown** — disconnected channels don't take up space.

### 📋 Activity Log
Enhanced logging system: filter by source (QQ / Bot Reply / WeChat / System), filter by type (text / media / emoji), keyword search, one-click JSON export.

### 📡 Channel Management (20+ Channels)
Unified configuration for **20+ channels**, divided into built-in and plugin channels:

**Built-in Channels:**
- **QQ (NapCat)** — QR code / quick / password login, wake probability, trigger words, poke reply, QQ approval requests
- **WeChat** — QR code login via wechatbot-webhook
- **Telegram** — Bot Token + Webhook
- **Discord** — Bot Token + Guild configuration
- **WhatsApp** — QR code scanning
- **Slack** — Socket Mode
- **Signal** — signal-cli REST API
- **Google Chat** — Service Account + Webhook

**Plugin Channels:**
- **Feishu / Lark** · **DingTalk** · **WeCom** · **QQ Official Bot** · **IRC** · **Mattermost** · **Microsoft Teams** · **LINE** · **Matrix** · **Twitch** · **BlueBubbles** · **WebChat**

### ⚡ Skill Center + ClawHub Store
- **Installed Skills**: Real-time scanning from server, one-click enable/disable, search and filter
- **ClawHub Store**: Browse 13+ installable skills, one-click install commands

### ⏰ Cron Jobs
Read real cron jobs from `cron/jobs.json`: Cron expression configuration, enable/pause/delete, run status tracking, message content editing.

### ⚙️ System Configuration (6 Modules)

#### 🧠 Model Configuration
Multi-provider model management with **8+ major AI providers** quick-fill:
- OpenAI · Anthropic · Google · DeepSeek · NVIDIA NIM · Groq · Together AI · OpenRouter
- Each provider supports Base URL, API Key, API Type, and model list configuration

#### 👤 Identity & Messages
Assistant name, avatar, theme color, system prompt, history message count, Agent defaults (context tokens, max output, concurrency, compression mode).

#### 🔧 General Configuration
Gateway config, tool config (media understanding / web search), Hooks, session config (auto-compress / trim), authentication keys (API Keys), raw JSON viewer.

#### 📦 Version Management
- Current version / latest version comparison
- Update detection and prompts
- **Config backup & restore**: One-click backup of openclaw.json, auto-backup before restore

#### 🖥️ Environment Detection
Auto-detect runtime environment:
- OS info (platform, architecture, kernel, CPU, memory)
- Software version detection (Node.js, Docker, Git, OpenClaw, npm)
- Quick installation guide

### 📁 Workspace
File browser: view, edit, and create files in the OpenClaw workspace.

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Docker Compose                      │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │          openclaw-qq Container                  │ │
│  │  ┌─────────┐  ┌──────────┐  ┌───────────┐      │ │
│  │  │ NapCat  │  │ClawPanel │  │ Frontend  │      │ │
│  │  │  (QQ)   │←→│ Backend  │←→│ (React)   │      │ │
│  │  │  :6099  │  │  :6199   │  │           │      │ │
│  │  └─────────┘  └────┬─────┘  └───────────┘      │ │
│  └─────────────────────┼───────────────────────────┘ │
│                        │ HTTP callback               │
│  ┌─────────────────────┼───────────────────────────┐ │
│  │     openclaw-wechat Container                   │ │
│  │  ┌──────────────────┴──────────────────────┐    │ │
│  │  │   wechatbot-webhook (WeChat Web)        │    │ │
│  │  │   :3001 (internal) → :3002 (external)   │    │ │
│  │  └─────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────┘ │
└──────────┬──────────────┬────────────────────────────┘
           │              │
      ┌────┴────┐    ┌────┴────┐
      │ OpenClaw│    │ Browser │
      │ Gateway │    │ClawPanel│
      └─────────┘    └─────────┘
```

## 🛠️ Tech Stack

| Layer | Technology |
|:---|:---|
| QQ Protocol | [NapCat](https://github.com/NapNeko/NapCatQQ) (OneBot11 WebSocket) |
| WeChat Protocol | [wechatbot-webhook](https://github.com/danni-cool/wechatbot-webhook) (Web WeChat) |
| Backend | TypeScript · Express · WebSocket |
| Frontend | React · Vite · TailwindCSS · Lucide Icons |
| AI Engine | [OpenClaw](https://openclaw.ai) — supports GPT-4o / Claude / Gemini / DeepSeek etc. |
| Deployment | Docker Compose dual-container orchestration |

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [OpenClaw](https://openclaw.ai) installed

### 1️⃣ Clone & Configure

```bash
git clone https://github.com/zhaoxinyi02/ClawPanel.git
cd ClawPanel
cp .env.example .env
```

Edit `.env`:

```env
ADMIN_TOKEN=your_admin_password     # ClawPanel login password
QQ_ACCOUNT=your_qq_number           # QQ account (optional, for quick login)
OWNER_QQ=owner_qq_number            # QQ number to receive notifications
WECHAT_TOKEN=openclaw-wechat        # WeChat Webhook Token
OPENCLAW_DIR=~/.openclaw            # OpenClaw config directory
```

### 2️⃣ Start

```bash
docker compose up -d
```

### 3️⃣ Configure OpenClaw Channel

```bash
# Linux / macOS
chmod +x setup-openclaw.sh && ./setup-openclaw.sh

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File setup-openclaw.ps1
```

### 4️⃣ Login & Use

1. Open `http://your-server-ip:6199` in your browser
2. Enter your `ADMIN_TOKEN` to log in
3. Go to **"Channel Management"** → Select QQ → Scan QR code to log in
4. Go to **"Channel Management"** → Select WeChat → Scan QR code to log in
5. Send a message to the Bot from another account — if you receive an AI reply, it's working! 🎉

## 📡 Port Reference

| Port | Service | Description |
|:---:|:---|:---|
| `6199` | ClawPanel | Main entry, browser access |
| `6099` | NapCat WebUI | QQ protocol management (optional) |
| `3001` | OneBot11 WS | For OpenClaw to connect to QQ |
| `3002` | WeChat Webhook | WeChat API debugging |

## 🌍 Cross-platform Deployment

| Platform | Start Command | Config Script |
|:---:|:---|:---|
| 🐧 Linux | `docker compose up -d` | `./setup-openclaw.sh` |
| 🍎 macOS | `docker compose up -d` | `./setup-openclaw.sh` |
| 🪟 Windows | `docker compose up -d` | `powershell -File setup-openclaw.ps1` |

> [!TIP]
> Windows users need to set `OPENCLAW_DIR=C:\Users\YourUsername\.openclaw` in `.env`

## 📖 Documentation

| Document | Description |
|:---|:---|
| [API Documentation](docs/API.md) | Complete REST API + WebSocket interface reference |
| [Deployment Guide](docs/DEPLOYMENT.md) | Detailed deployment steps, environment variables, firewall, reverse proxy, troubleshooting |

## ❓ FAQ

<details>
<summary><b>QQ login fails after scanning QR code?</b></summary>

Make sure the QQ account doesn't have device lock enabled, or try using quick login.
</details>

<details>
<summary><b>WeChat QR code page won't open?</b></summary>

Make sure the WeChat container is running: `docker compose logs wechat`, and port 3002 is not occupied.
</details>

<details>
<summary><b>WeChat says web login is not supported?</b></summary>

Some WeChat accounts don't have web login permission. Try using an older WeChat account.
</details>

<details>
<summary><b>Can't connect to OpenClaw?</b></summary>

Run `./setup-openclaw.sh` to reconfigure, then restart OpenClaw.
</details>

<details>
<summary><b>How to view logs?</b></summary>

```bash
docker compose logs -f          # All logs
docker compose logs -f wechat   # WeChat container only
```
</details>

<details>
<summary><b>How to update to the latest version?</b></summary>

```bash
git pull && docker compose up -d --build
```
</details>

## ❤️ Acknowledgments

This project would not be possible without these excellent open-source projects:

- [NapNeko/NapCatQQ](https://github.com/NapNeko/NapCatQQ) — QQ protocol framework
- [danni-cool/wechatbot-webhook](https://github.com/danni-cool/wechatbot-webhook) — WeChat Webhook bot
- [OpenClaw](https://openclaw.ai) — AI assistant engine

## ⚠️ Disclaimer

> **This project is for learning and research purposes only. Commercial use is strictly prohibited.**

- 🚫 **No Commercial Use** — Must not be used for any commercial purpose, paid services, or paid bots
- ⚠️ **Account Risk** — Using third-party clients to log in to QQ/WeChat may result in account suspension
- 🔒 **No Reverse Engineering** — This project does not perform any reverse engineering, only integrates existing open-source projects
- 📋 **Use at Your Own Risk** — Users assume all risks and legal responsibilities
- 💰 **Non-profit** — The author does not profit from this project in any way

**Please read the full [DISCLAIMER.md](DISCLAIMER.md)**

## 📄 License

[CC BY-NC-SA 4.0](LICENSE) © 2026 — **No Commercial Use**

This project is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-nc-sa/4.0/).

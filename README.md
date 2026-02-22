<div align="center">

<img src="img/logo.jpg" width="700"/>

# ClawPanel

**OpenClaw 智能管理面板 — 单文件部署、跨平台、全功能可视化管理**

Go 单二进制 · React 18 · TailwindCSS · SQLite · WebSocket 实时推送 · 跨平台

[![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-red?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-5.0.0-violet?style=flat-square)](https://github.com/zhaoxinyi02/ClawPanel/releases)
[![Go](https://img.shields.io/badge/go-1.22+-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev)
[![React](https://img.shields.io/badge/react-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![GitHub Stars](https://img.shields.io/github/stars/zhaoxinyi02/ClawPanel?style=flat-square&logo=github)](https://github.com/zhaoxinyi02/ClawPanel/stargazers)

[快速开始](#-快速开始) · [功能特性](#-主要功能) · [更新日志](changelogs/) · [API 文档](docs/API.md) · [English](README_EN.md)

</div>

---

> [!CAUTION]
> **免责声明 | Disclaimer**
>
> 本项目仅供**学习研究**使用，**严禁用于任何商业用途**。使用第三方客户端登录 QQ/微信可能违反腾讯服务协议，**存在封号风险**，请使用小号测试。本项目作者**未进行任何逆向工程**，仅做开源项目整合，**不对任何后果承担责任**。下载使用即表示同意 [完整免责声明](DISCLAIMER.md)。
>
> This project is for **learning and research purposes only**. **Commercial use is strictly prohibited.** Use at your own risk. See [full disclaimer](DISCLAIMER.md).

> [!NOTE]
> **v5.0.0 全栈重写** — 后端从 Node.js 迁移至 Go，前端升级为 React 18 + TailwindCSS。单个二进制文件即可部署，内嵌 Web 服务和前端资源，支持 Linux / Windows / macOS (x86_64 / arm64)。

## 主要功能

### 智能仪表盘
- OpenClaw 进程状态监控（启动/停止/重启）
- 已启用通道概览、当前模型、运行时间、内存占用
- 快捷操作：一键重启 OpenClaw / 网关 / ClawPanel / NapCat

### 通道管理（20+ 通道）
支持 **20+ 种通道**的统一配置和一键启用/禁用：
- **内置通道**：QQ (NapCat) · 微信 · Telegram · Discord · WhatsApp · Slack · Signal · Google Chat · BlueBubbles · WebChat
- **插件通道**：飞书 · 钉钉 · 企业微信 · QQ 官方 Bot · IRC · Mattermost · Teams · LINE · Matrix · Twitch
- **QQ 登录**：扫码 / 快速 / 密码三种方式，支持退出登录和重启 NapCat 容器
- **QR 码智能刷新**：自动检测过期二维码，重试获取全新二维码

### 配置中心
- **模型配置**：多提供商管理（OpenAI / Anthropic / Google / DeepSeek / 火山引擎等）
- **Agent 配置**：系统提示词、温度、最大 Token 数
- **JSON 模式**：直接编辑完整配置 JSON
- 自动为非 OpenAI 提供商注入 `compat.supportsDeveloperRole=false` 兼容性修复

### 技能中心 + 插件管理
- 技能/插件分离展示，搜索筛选
- 一键启用/禁用，实时扫描已安装技能（内置 + 工作区 + 应用）

### 事件日志
- 实时消息流：QQ 消息、Bot 回复、系统事件
- 按来源/类型筛选、关键词搜索
- SQLite 持久化存储，重启不丢失
- 外部服务日志接入（POST /api/events）

### 系统管理
- 系统环境检测（OS / CPU / Go / OpenClaw 版本）
- 配置备份与恢复（自动备份当前配置再恢复）
- 软件安装中心：一键安装 Docker、NapCat、微信机器人等
- 消息中心：安装任务进度实时追踪
- 身份文档编辑（IDENTITY.md / USER.md 等）
- 管理密码修改、版本更新检查

### AI 智能助手
内置 AI 对话助手浮窗，支持多提供商/多模型切换，自动使用 OpenClaw 配置的 API。

## 架构

```
┌──────────────────────────────────────────────┐
│            ClawPanel (单二进制)                │
│                                              │
│  ┌───────────┐  ┌────────────┐  ┌─────────┐ │
│  │  Go 后端  │  │ React 前端 │  │ SQLite  │ │
│  │  (Gin)    │←→│ (go:embed) │  │   DB    │ │
│  │  :19527   │  │            │  │         │ │
│  └─────┬─────┘  └────────────┘  └─────────┘ │
│        │                                     │
│  ┌─────┴──────┐  ┌────────────┐             │
│  │  Process   │  │ WebSocket  │             │
│  │  Manager   │  │    Hub     │             │
│  └─────┬──────┘  └──────┬─────┘             │
└────────┼────────────────┼────────────────────┘
         │                │
    ┌────┴────┐    ┌──────┴──────┐
    │ OpenClaw│    │ NapCat/微信 │
    │ Process │    │ Docker 容器 │
    └─────────┘    └─────────────┘
```

## 技术栈

| 层级 | 技术 |
|:---|:---|
| 后端 | Go 1.22+ · Gin · SQLite (modernc.org/sqlite) · gorilla/websocket · golang-jwt |
| 前端 | React 18 · TypeScript · TailwindCSS · Lucide Icons · Vite |
| 部署 | 单二进制 · `go:embed` 内嵌前端 · 跨平台静态编译 (`CGO_ENABLED=0`) |
| AI 引擎 | [OpenClaw](https://openclaw.ai) — 支持 GPT-4o / Claude / Gemini / DeepSeek 等 |

## 快速开始

> 跟宝塔面板一样，一条命令搞定安装，自动注册系统服务、开机自启动、配置防火墙。

### 方式一：一键安装（推荐）

**Linux / macOS**

```bash
curl -sSO https://raw.githubusercontent.com/zhaoxinyi02/ClawPanel/main/scripts/install.sh && sudo bash install.sh
```

自动完成：下载二进制 → 安装到 `/opt/clawpanel` → 注册系统服务 → 开机自启动 → 配置防火墙 → 启动。

**Windows（PowerShell 管理员）**

```powershell
irm https://raw.githubusercontent.com/zhaoxinyi02/ClawPanel/main/scripts/install.ps1 | iex
```

或从 [Releases](https://github.com/zhaoxinyi02/ClawPanel/releases) 下载 `ClawPanel-Setup.exe`，右键以管理员身份运行。

### 方式二：手动下载运行

从 [Releases](https://github.com/zhaoxinyi02/ClawPanel/releases) 下载对应平台的二进制文件：

```bash
# Linux
chmod +x clawpanel-linux-amd64 && ./clawpanel-linux-amd64

# macOS
chmod +x clawpanel-darwin-arm64 && ./clawpanel-darwin-arm64

# Windows (双击或命令行)
clawpanel-windows-amd64.exe
```

启动后访问 `http://localhost:19527`，默认密码 `clawpanel`。

> [!WARNING]
> 手动运行不会注册系统服务，关闭终端后服务会停止。推荐使用一键安装。

### 方式三：从源码构建

```bash
git clone https://github.com/zhaoxinyi02/ClawPanel.git
cd ClawPanel
make build        # 构建当前平台
make cross        # 交叉编译所有平台
make installer    # 构建 Windows exe 安装包
./bin/clawpanel
```

> [!TIP]
> 构建需要 Go 1.22+ 和 Node.js 18+。中国大陆用户请设置：
> ```bash
> export GOPROXY=https://goproxy.cn,direct
> npm config set registry https://registry.npmmirror.com
> ```

## 环境变量

| 变量 | 默认值 | 说明 |
|:---|:---|:---|
| `CLAWPANEL_PORT` | `19527` | Web 服务端口 |
| `CLAWPANEL_DATA` | `./data` | 数据目录（配置 + 数据库） |
| `OPENCLAW_DIR` | `~/.openclaw` | OpenClaw 配置目录 |
| `OPENCLAW_CONFIG` | - | OpenClaw 配置文件路径（自动推导目录） |
| `OPENCLAW_APP` | - | OpenClaw 应用目录（用于技能扫描） |
| `OPENCLAW_WORK` | - | OpenClaw 工作目录 |
| `CLAWPANEL_SECRET` | 随机 | JWT 签名密钥 |
| `ADMIN_TOKEN` | `clawpanel` | 管理密码 |
| `CLAWPANEL_DEBUG` | `false` | 调试模式 |

## 服务管理

```bash
# systemd (Linux)
systemctl start clawpanel
systemctl stop clawpanel
systemctl restart clawpanel
systemctl status clawpanel
journalctl -u clawpanel -f

# Windows 服务
sc start ClawPanel
sc stop ClawPanel
sc query ClawPanel
```

## 跨平台支持

| 平台 | 架构 | 二进制文件 |
|:---:|:---:|:---|
| Linux | x86_64 | `clawpanel-linux-amd64` |
| Linux | ARM64 | `clawpanel-linux-arm64` |
| macOS | x86_64 | `clawpanel-darwin-amd64` |
| macOS | ARM64 (M1/M2/M3) | `clawpanel-darwin-arm64` |
| Windows | x86_64 | `clawpanel-windows-amd64.exe` |

## 更新日志

完整更新日志请查看 [changelogs/](changelogs/) 目录。

### v5.0.0 — 全栈重写 (2026-02-22)
- **全栈重写**：后端 Node.js → Go (Gin)，前端 React 18 + TailwindCSS
- **单文件部署**：单个静态编译二进制，内嵌前端，无需 Node.js/Docker
- **跨平台**：Linux / Windows / macOS (x86_64 / arm64)
- **SQLite 持久化**：事件日志和配置使用 SQLite 存储
- **WebSocket 实时推送**：进程日志和消息事件实时推送
- **进程管理器**：内置 OpenClaw 进程管理（启动/停止/重启/监控）
- **AI 智能助手**：内置多模型 AI 对话浮窗
- **软件安装中心**：一键安装 Docker、NapCat、微信机器人
- **快捷重启**：一键重启 OpenClaw / 网关 / ClawPanel / NapCat
- **QR 码修复**：智能刷新机制，解决过期二维码问题
- **活动日志增强**：显示 Bot 回复消息，持久化存储
- **原生安装脚本**：Linux/macOS/Windows 一键安装 + 系统服务注册

<details>
<summary><b>v4.x 及更早版本</b></summary>

- **v4.4.0** (2026-02-21) — AI 助手、模型兼容性修复
- **v4.3.0** (2026-02-19) — 技能插件分离、修改密码、多语言、原生安装脚本
- **v4.2.x** (2026-02-16~17) — 紫罗兰主题、通道显示修复、QQ 登录修复
- **v4.1.0** (2026-02-14) — 20+ 通道、技能中心、6 标签页系统配置
- **v4.0.0** (2026-02-13) — ClawPanel 品牌升级
- **v3.0.0** (2026-02-10) — QQ + 微信双通道
- **v2.0.0** (2026-02-09) — React + TailwindCSS 管理后台
- **v1.0.0** — 基础管理后台 + NapCat Docker 集成
</details>

## 致谢

- [OpenClaw](https://openclaw.ai) — AI 助手引擎
- [Gin](https://github.com/gin-gonic/gin) — Go Web 框架
- [NapCat](https://github.com/NapNeko/NapCatQQ) — QQ 协议框架
- [modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite) — 纯 Go SQLite 驱动
- [Lucide](https://lucide.dev) — 图标库

## 免责声明

> **本项目仅供学习研究使用，严禁商用。**

- **严禁商用** — 不得用于任何商业目的
- **封号风险** — 使用第三方客户端登录 QQ/微信可能导致账号被封禁
- **无逆向** — 本项目未进行任何逆向工程
- **自担风险** — 使用者需自行承担一切风险和法律责任

**详细免责声明请阅读 [DISCLAIMER.md](DISCLAIMER.md)**

## License

[CC BY-NC-SA 4.0](LICENSE) © 2026 — **禁止商用**

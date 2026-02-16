# ClawPanel 部署指南

## 环境要求

| 组件 | 最低版本 |
|------|----------|
| Docker | 20.10+ |
| Docker Compose | v2+ |
| 内存 | 2GB+ |
| 系统 | Linux / macOS / Windows (Docker Desktop) |

## Linux 部署

```bash
# 1. 安装 Docker（如未安装）
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker && sudo systemctl start docker

# 2. 安装 OpenClaw
curl -fsSL https://get.openclaw.ai | bash
openclaw onboard
openclaw gateway start

# 3. 克隆项目
git clone https://github.com/zhaoxinyi02/ClawPanel.git
cd ClawPanel

# 4. 配置
cp .env.example .env
nano .env   # 修改 ADMIN_TOKEN、QQ_ACCOUNT、OWNER_QQ 等

# 5. 启动
docker compose up -d

# 6. 配置 OpenClaw 频道
chmod +x setup-openclaw.sh
./setup-openclaw.sh
```

## macOS 部署

1. 安装 [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
2. 其余步骤与 Linux 相同

## Windows 部署

1. 安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. 确保 WSL2 后端已启用

```powershell
# 克隆项目
git clone https://github.com/zhaoxinyi02/ClawPanel.git
cd ClawPanel

# 配置
copy .env.example .env
# 编辑 .env，设置 OPENCLAW_DIR=C:\Users\你的用户名\.openclaw

# 启动
docker compose up -d

# 配置 OpenClaw 频道
powershell -ExecutionPolicy Bypass -File setup-openclaw.ps1
```

## 环境变量说明

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `ADMIN_TOKEN` | 是 | `openclaw-qq-admin` | ClawPanel 登录密码 |
| `QQ_ACCOUNT` | 否 | 空 | QQ 号，填写后支持快速登录 |
| `OWNER_QQ` | 否 | `0` | 主人 QQ 号，接收通知 |
| `WEBUI_TOKEN` | 否 | `openclaw-qq-admin` | NapCat WebUI Token |
| `NAPCAT_TOKEN` | 否 | 空 | NapCat OneBot AccessToken |
| `WECHAT_TOKEN` | 否 | `openclaw-wechat` | 微信 Webhook API Token |
| `OPENCLAW_DIR` | 否 | `~/.openclaw` | OpenClaw 配置目录路径 |

## 端口映射

| 宿主机端口 | 容器端口 | 服务 | 用途 |
|------------|----------|------|------|
| 6199 | 6199 | ClawPanel | 主入口 |
| 6099 | 6099 | NapCat WebUI | QQ 管理（可选访问） |
| 3001 | 3001 | OneBot11 WS | OpenClaw 连接 QQ |
| 3002 | 3001 | 微信 Webhook | 微信 API（调试用） |

## Docker Volume

| Volume | 容器路径 | 说明 |
|--------|----------|------|
| `qq-session` | `/app/.config/QQ` | QQ 登录 session 持久化 |
| `napcat-data` | `/app/napcat/config` | NapCat 配置 |
| `manager-data` | `/app/manager/data` | ClawPanel 配置 |
| `wechat-data` | `/app/data` | 微信登录数据 |

## 常用运维命令

```bash
# 查看容器状态
docker compose ps

# 查看所有日志
docker compose logs -f

# 只看 QQ 容器日志
docker compose logs -f openclaw-qq

# 只看微信容器日志
docker compose logs -f wechat

# 重启所有服务
docker compose restart

# 停止所有服务
docker compose down

# 更新到最新版本
git pull
docker compose up -d --build

# 完全重建（清除缓存）
docker compose down
docker compose build --no-cache
docker compose up -d
```

## 防火墙配置

建议只开放必要端口：

```bash
# UFW (Ubuntu)
sudo ufw allow 6199/tcp   # ClawPanel（必须）
sudo ufw allow 3001/tcp   # OneBot WS（OpenClaw 需要）
# 6099 和 3002 仅调试时开放

# firewalld (CentOS)
sudo firewall-cmd --permanent --add-port=6199/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

## 反向代理（可选）

如需通过域名 + HTTPS 访问 ClawPanel，可配置 Nginx：

```nginx
server {
    listen 443 ssl;
    server_name panel.example.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:6199;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://127.0.0.1:6199;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 故障排查

### 容器启动失败
```bash
docker compose logs openclaw-qq 2>&1 | head -50
```

### QQ 无法登录
- 检查 NapCat 日志中是否有二维码
- 确认 QQ 账号未开启设备锁
- 尝试快速登录或账密登录

### 微信无法登录
- 确认微信容器正常运行：`docker compose logs wechat`
- 部分微信号不支持网页版登录，需使用较早注册的账号
- 检查端口 3002 是否被占用

### OpenClaw 连接失败
- 确认 `openclaw.json` 中 QQ 频道的 `wsUrl` 为 `ws://127.0.0.1:6199/onebot`
- 重新运行配置脚本：`./setup-openclaw.sh`
- 重启 OpenClaw：`systemctl restart openclaw`

### OpenClaw 报错 `unknown channel id: wechat`
- ClawPanel v4.2.0 已修复此问题。微信通道由 ClawPanel 内部管理，不写入 `openclaw.json`
- 如果升级后仍有此错误，重启容器即可自动清理：`docker compose restart openclaw-qq`
- 或手动删除 `openclaw.json` 中的 `channels.wechat` 字段

### OpenClaw 报错 `Unrecognized keys: "tools", "session"`
- ClawPanel v4.2.0 已修复此问题。GET/PUT 配置接口自动过滤 OpenClaw 不支持的顶层键
- 如果升级后仍有此错误，手动删除 `openclaw.json` 中的 `tools` 和 `session` 顶层字段

### 关闭通道后仍能收到消息
- 确保使用 ClawPanel v4.2.0+，通道开关会自动重启 OpenClaw 网关
- 关闭 QQ 通道会同时退出 QQ 登录，重新开启需扫码登录

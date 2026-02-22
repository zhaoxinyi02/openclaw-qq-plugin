#!/bin/bash
trap "" SIGPIPE

echo "=========================================="
echo " ClawPanel - NapCat QQ 容器"
echo "=========================================="

cd /app

# === 1. Setup NapCat ===
if [ ! -f "napcat/napcat.mjs" ]; then
    echo "[NapCat] 解压 NapCat..."
    unzip -q NapCat.Shell.zip -d ./NapCat.Shell
    cp -rf NapCat.Shell/* napcat/
    rm -rf ./NapCat.Shell
fi
if [ ! -f "napcat/config/napcat.json" ]; then
    unzip -q NapCat.Shell.zip -d ./NapCat.Shell
    cp -rf NapCat.Shell/config/* napcat/config/
    rm -rf ./NapCat.Shell
fi

# === 2. Configure NapCat WebUI ===
WEBUI_TOKEN="${WEBUI_TOKEN:-openclaw-qq-admin}"
CONFIG_PATH=/app/napcat/config/webui.json

if [ ! -f "${CONFIG_PATH}" ]; then
    echo "[NapCat] 配置 WebUI Token..."
    cat > "${CONFIG_PATH}" << EOF
{
    "host": "0.0.0.0",
    "port": 6099,
    "token": "${WEBUI_TOKEN}",
    "loginRate": 3
}
EOF
fi

# === 3. Configure OneBot11 (WebSocket + HTTP) ===
ONEBOT_CONFIG=/app/napcat/config/onebot11.json
NAPCAT_WS_PORT="${NAPCAT_WS_PORT:-3001}"
NAPCAT_HTTP_PORT="${NAPCAT_HTTP_PORT:-3000}"
NAPCAT_TOKEN="${NAPCAT_TOKEN:-}"

echo "[NapCat] 配置 OneBot11 (WS:${NAPCAT_WS_PORT} HTTP:${NAPCAT_HTTP_PORT})..."
cat > "${ONEBOT_CONFIG}" << EOF
{
    "network": {
        "websocketServers": [
            {
                "name": "ws-server",
                "enable": true,
                "host": "0.0.0.0",
                "port": ${NAPCAT_WS_PORT},
                "token": "${NAPCAT_TOKEN}",
                "reportSelfMessage": false,
                "enableForcePushEvent": true,
                "messagePostFormat": "array",
                "debug": false,
                "heartInterval": 30000
            }
        ],
        "httpServers": [
            {
                "name": "http-api",
                "enable": true,
                "host": "0.0.0.0",
                "port": ${NAPCAT_HTTP_PORT},
                "token": "${NAPCAT_TOKEN}"
            }
        ],
        "httpSseServers": [],
        "httpClients": [],
        "websocketClients": [],
        "plugins": []
    },
    "musicSignUrl": "",
    "enableLocalFile2Url": true,
    "parseMultMsg": true,
    "imageDownloadProxy": ""
}
EOF

# === 4. Setup user permissions ===
: ${NAPCAT_GID:=0}
: ${NAPCAT_UID:=0}
usermod -o -u ${NAPCAT_UID} napcat 2>/dev/null || true
groupmod -o -g ${NAPCAT_GID} napcat 2>/dev/null || true
usermod -g ${NAPCAT_GID} napcat 2>/dev/null || true
chown -R ${NAPCAT_UID}:${NAPCAT_GID} /app/napcat/config /app/.config 2>/dev/null || true

# === 5. Start Xvfb ===
rm -rf "/tmp/.X1-lock"
gosu napcat Xvfb :1 -screen 0 1080x760x16 +extension GLX +render > /dev/null 2>&1 &
sleep 2
export DISPLAY=:1
export FFMPEG_PATH=/usr/bin/ffmpeg

# === 6. Auto-install QQ plugin into OpenClaw extensions ===
OPENCLAW_DIR="/root/.openclaw"
QQ_PLUGIN_DIR="${OPENCLAW_DIR}/extensions/qq"
if [ -d "/app/manager/docker/qq-plugin" ] && [ ! -d "${QQ_PLUGIN_DIR}/src" ]; then
    echo "[Plugin] 安装 QQ 插件到 ${QQ_PLUGIN_DIR}..."
    mkdir -p "${QQ_PLUGIN_DIR}"
    cp -rf /app/manager/docker/qq-plugin/* "${QQ_PLUGIN_DIR}/"
    cd "${QQ_PLUGIN_DIR}" && npm install --production 2>/dev/null || true
    echo "[Plugin] QQ 插件安装完成"
else
    echo "[Plugin] QQ 插件已存在"
fi

# === 7. Start QQ (NapCat) as main process ===
echo "[NapCat] 启动 QQ..."
cd /app/napcat

if [ -z "${ACCOUNT}" ]; then
    DETECTED=$(ls /app/napcat/config/napcat_*.json 2>/dev/null | head -1 | grep -oP 'napcat_\K[0-9]+')
    if [ -n "${DETECTED}" ]; then
        echo "[NapCat] 自动检测到已登录 QQ 号: ${DETECTED}"
        ACCOUNT="${DETECTED}"
    fi
fi

# Keep QQ running even if it exits (for QR code login flow)
while true; do
    if [ -n "${ACCOUNT}" ]; then
        echo "[NapCat] 使用快速登录: QQ ${ACCOUNT}"
        gosu napcat /opt/QQ/qq --no-sandbox -q $ACCOUNT || true
    else
        echo "[NapCat] 未检测到已登录账号，需要扫码登录"
        gosu napcat /opt/QQ/qq --no-sandbox || true
    fi
    echo "[NapCat] QQ 进程退出，5秒后重启..."
    sleep 5
    # Re-detect account after restart
    ACCOUNT=""
    DETECTED=$(ls /app/napcat/config/napcat_*.json 2>/dev/null | head -1 | grep -oP 'napcat_\K[0-9]+')
    if [ -n "${DETECTED}" ]; then
        ACCOUNT="${DETECTED}"
    fi
done

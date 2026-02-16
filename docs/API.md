# ClawPanel API 接口文档

所有接口需要 JWT 认证（除 `/api/auth/login`），请在请求头中添加：
```
Authorization: Bearer <token>
```

## 认证

### POST `/api/auth/login`
登录获取 JWT Token。

**请求体：**
```json
{ "token": "你的 ADMIN_TOKEN" }
```

**响应：**
```json
{ "ok": true, "token": "eyJhbGci..." }
```

## 系统状态

### GET `/api/status`
获取系统整体状态（仪表盘数据源）。

**响应：**
```json
{
  "ok": true,
  "napcat": {
    "connected": true,
    "selfId": 123456789,
    "nickname": "Bot",
    "groupCount": 5,
    "friendCount": 20
  },
  "wechat": {
    "connected": true,
    "loggedIn": true,
    "name": "微信昵称"
  },
  "openclaw": {
    "configured": true,
    "qqPluginEnabled": true,
    "qqChannelEnabled": true,
    "currentModel": "anthropic/claude-sonnet-4-5"
  },
  "admin": {
    "uptime": 3600,
    "memoryMB": 128
  }
}
```

## 活动日志

### GET `/api/events`
获取活动日志列表。

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| `limit` | number | 返回条数，默认 100 |
| `offset` | number | 偏移量，默认 0 |
| `source` | string | 来源筛选：`qq` / `wechat` / `openclaw` / `system` |
| `search` | string | 关键词搜索 |

### POST `/api/events/clear`
清空所有日志。

### POST `/api/events/log`
外部服务推送日志条目（无需认证）。

**请求体：**
```json
{
  "source": "openclaw",
  "type": "openclaw.action",
  "summary": "日志摘要",
  "detail": "详细信息（可选）"
}
```

## QQ 登录（NapCat 代理）

### POST `/api/napcat/login-status`
获取 QQ 登录状态。

### POST `/api/napcat/qrcode`
获取 QQ 登录二维码 URL。

### POST `/api/napcat/qrcode/refresh`
刷新二维码。

### GET `/api/napcat/quick-login-list`
获取可快速登录的 QQ 账号列表。

### POST `/api/napcat/quick-login`
快速登录。

**请求体：**
```json
{ "uin": "QQ号" }
```

### POST `/api/napcat/password-login`
账密登录。

**请求体：**
```json
{ "uin": "QQ号", "password": "密码" }
```

## QQ Bot 操作

### GET `/api/bot/groups`
获取群列表。

### GET `/api/bot/friends`
获取好友列表。

### POST `/api/bot/send`
发送 QQ 消息。

**请求体：**
```json
{
  "type": "private",
  "id": 123456789,
  "message": [{ "type": "text", "data": { "text": "Hello" } }]
}
```

### POST `/api/bot/reconnect`
重连 NapCat OneBot WebSocket。

## 微信

### GET `/api/wechat/status`
获取微信连接和登录状态。

### GET `/api/wechat/login-url`
获取微信扫码登录页面地址。

### POST `/api/wechat/send`
发送微信文本消息。

**请求体：**
```json
{
  "to": "wxid_xxx 或群名",
  "content": "消息内容",
  "isRoom": false
}
```

### POST `/api/wechat/send-file`
发送微信文件。

**请求体：**
```json
{
  "to": "wxid_xxx",
  "fileUrl": "https://example.com/file.pdf",
  "isRoom": false
}
```

### GET `/api/wechat/config`
获取微信相关配置。

### PUT `/api/wechat/config`
更新微信配置。

## OpenClaw 配置

### GET `/api/openclaw/config`
获取完整 openclaw.json 配置（系统配置页数据源）。

### PUT `/api/openclaw/config`
更新完整配置（系统配置页保存）。

**请求体：**
```json
{ "config": { ... } }
```

### GET `/api/openclaw/models`
获取模型配置。

### PUT `/api/openclaw/models`
更新模型配置。

### GET `/api/openclaw/channels`
获取通道配置（通道管理页数据源）。

### PUT `/api/openclaw/channels/:id`
更新指定通道配置。

### PUT `/api/openclaw/plugins/:id`
更新指定插件配置（技能中心启用/禁用）。

### POST `/api/openclaw/toggle-channel`
切换通道启用/禁用（v4.2.0+）。自动处理配置更新、系统日志、QQ 退出登录、网关重启。

**请求体：**
```json
{ "channelId": "qq", "enabled": false }
```

**响应：**
```json
{ "ok": true, "message": "QQ (NapCat) 通道已禁用" }
```

### POST `/api/napcat/logout`
退出 QQ 登录（v4.2.0+）。清除 QQ 会话数据并重启容器。

**响应：**
```json
{ "ok": true, "message": "QQ 已退出登录，容器正在重启..." }
```

### GET `/api/napcat/login-info`
获取当前 QQ 登录信息。

### POST `/api/system/restart-gateway`
请求宿主机重启 OpenClaw 网关（通过信号文件机制）。

### GET `/api/system/restart-gateway-status`
获取网关重启状态。

## 管理配置

### GET `/api/admin/config`
获取 ClawPanel 管理配置（通道详细参数等）。

### PUT `/api/admin/config`
更新管理配置。

### PUT `/api/admin/config/:section`
更新指定配置段（如 `qq`、`wechat`）。

## 审核

### GET `/api/requests`
获取待审核的好友/入群请求列表。

### POST `/api/requests/:flag/approve`
同意请求。

### POST `/api/requests/:flag/reject`
拒绝请求。

**请求体（可选）：**
```json
{ "reason": "拒绝原因" }
```

## 工作区

### GET `/api/workspace/files`
列出工作区文件。

### GET `/api/workspace/stats`
获取工作区统计信息。

### POST `/api/workspace/upload`
上传文件（multipart/form-data）。

### POST `/api/workspace/mkdir`
创建目录。

### POST `/api/workspace/delete`
删除文件/目录。

### GET `/api/workspace/download?path=xxx`
下载文件。

### GET `/api/workspace/preview?path=xxx`
预览文件（文本/图片）。

## WebSocket

### `/ws?token=<JWT>`
ClawPanel 实时事件推送。

**消息类型：**
| type | 说明 |
|------|------|
| `napcat-status` | QQ 连接状态变更 |
| `wechat-status` | 微信连接状态变更 |
| `event` | QQ 事件（消息、通知等） |
| `wechat-event` | 微信事件（消息等） |
| `log-entry` | 活动日志新条目 |

### `/onebot`
OneBot11 WebSocket 代理，供宿主机 OpenClaw 连接到容器内 NapCat。

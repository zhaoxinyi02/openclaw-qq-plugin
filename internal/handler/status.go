package handler

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zhaoxinyi02/ClawPanel/internal/config"
	"github.com/zhaoxinyi02/ClawPanel/internal/process"
)

var startTime = time.Now()

// GetStatus 获取系统状态总览
func GetStatus(db *sql.DB, cfg *config.Config, procMgr *process.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		ocConfig, _ := cfg.ReadOpenClawJSON()

		// 提取已启用的通道
		channelLabels := map[string]string{
			"qq": "QQ (NapCat)", "wechat": "微信", "whatsapp": "WhatsApp",
			"telegram": "Telegram", "discord": "Discord", "irc": "IRC",
			"slack": "Slack", "signal": "Signal", "googlechat": "Google Chat",
			"webchat": "WebChat", "feishu": "飞书 / Lark", "qqbot": "QQ 官方机器人",
			"dingtalk": "钉钉", "wecom": "企业微信", "msteams": "Microsoft Teams",
			"mattermost": "Mattermost", "line": "LINE", "matrix": "Matrix", "twitch": "Twitch",
		}

		type enabledChannel struct {
			ID    string `json:"id"`
			Label string `json:"label"`
			Type  string `json:"type"`
		}
		var channels []enabledChannel

		if ocConfig != nil {
			// 扫描 channels
			if ch, ok := ocConfig["channels"].(map[string]interface{}); ok {
				for id, conf := range ch {
					if m, ok := conf.(map[string]interface{}); ok {
						if enabled, _ := m["enabled"].(bool); enabled {
							label := channelLabels[id]
							if label == "" {
								label = id
							}
							channels = append(channels, enabledChannel{ID: id, Label: label, Type: "builtin"})
						}
					}
				}
			}
			// 扫描 plugins.entries
			if plugins, ok := ocConfig["plugins"].(map[string]interface{}); ok {
				if entries, ok := plugins["entries"].(map[string]interface{}); ok {
					for id, conf := range entries {
						// 检查是否已在 channels 中
						found := false
						for _, ch := range channels {
							if ch.ID == id {
								found = true
								break
							}
						}
						if found {
							continue
						}
						if m, ok := conf.(map[string]interface{}); ok {
							if enabled, _ := m["enabled"].(bool); enabled {
								label := channelLabels[id]
								if label == "" {
									label = id
								}
								channels = append(channels, enabledChannel{ID: id, Label: label, Type: "plugin"})
							}
						}
					}
				}
			}
		}
		if channels == nil {
			channels = []enabledChannel{}
		}

		// 获取当前模型
		currentModel := ""
		if ocConfig != nil {
			if agents, ok := ocConfig["agents"].(map[string]interface{}); ok {
				if defaults, ok := agents["defaults"].(map[string]interface{}); ok {
					if model, ok := defaults["model"].(map[string]interface{}); ok {
						currentModel, _ = model["primary"].(string)
					}
				}
			}
		}

		// 进程状态
		procStatus := procMgr.GetStatus()

		// 内存使用
		var memStats runtime.MemStats
		runtime.ReadMemStats(&memStats)

		// NapCat 登录状态
		napcatInfo := gin.H{"connected": false}
		if loginR, err := napcatApiCallSafe(cfg, "POST", "/api/QQLogin/CheckLoginStatus", nil); err == nil {
			if data, ok := loginR["data"].(map[string]interface{}); ok {
				if isLogin, _ := data["isLogin"].(bool); isLogin {
					napcatInfo["connected"] = true
					// 获取登录信息
					if infoR, err := napcatApiCallSafe(cfg, "POST", "/api/QQLogin/GetQQLoginInfo", nil); err == nil {
						if infoData, ok := infoR["data"].(map[string]interface{}); ok {
							napcatInfo["nickname"], _ = infoData["nick"].(string)
							if uin, ok := infoData["uin"].(string); ok {
								napcatInfo["selfId"] = uin
							}
						}
					}
					// 获取群数和好友数 (通过 OneBot11 HTTP API)
					if groupR, err := onebotApiCallSafe("POST", "/get_group_list", nil); err == nil {
						if groupData, ok := groupR["data"].([]interface{}); ok {
							napcatInfo["groupCount"] = len(groupData)
						}
					}
					if friendR, err := onebotApiCallSafe("POST", "/get_friend_list", nil); err == nil {
						if friendData, ok := friendR["data"].([]interface{}); ok {
							napcatInfo["friendCount"] = len(friendData)
						}
					}
				}
			}
		}

		// WeChat 状态
		wechatInfo := gin.H{"connected": false, "loggedIn": false}
		if wechatR, err := wechatApiCallSafe(cfg, "GET", "/loginCheck", nil); err == nil {
			if success, ok := wechatR["success"].(bool); ok && success {
				wechatInfo["connected"] = true
				wechatInfo["loggedIn"] = true
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"ok": true,
			"openclaw": gin.H{
				"configured":      cfg.OpenClawConfigExists(),
				"currentModel":    currentModel,
				"enabledChannels": channels,
			},
			"napcat":  napcatInfo,
			"wechat":  wechatInfo,
			"process": procStatus,
			"admin": gin.H{
				"uptime":   int64(time.Since(startTime).Seconds()),
				"memoryMB": int(memStats.Sys / 1024 / 1024),
				"os":       runtime.GOOS,
				"arch":     runtime.GOARCH,
				"goroutines": runtime.NumGoroutine(),
			},
		})
	}
}

// napcatApiCallSafe calls NapCat API with a short timeout, returns nil on error
func napcatApiCallSafe(cfg *config.Config, method, path string, body interface{}) (map[string]interface{}, error) {
	cred := napcatAuth(cfg)
	var bodyReader io.Reader
	if body != nil {
		data, _ := json.Marshal(body)
		bodyReader = strings.NewReader(string(data))
	}
	req, err := http.NewRequest(method, "http://127.0.0.1:6099"+path, bodyReader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if cred != "" {
		req.Header.Set("Authorization", "Bearer "+cred)
	}
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(data, &result)
	return result, nil
}

// wechatApiCallSafe calls WeChat API with a short timeout
func wechatApiCallSafe(cfg *config.Config, method, path string, body interface{}) (map[string]interface{}, error) {
	adminCfg := loadAdminConfig(cfg)
	wechatUrl := "http://127.0.0.1:3002"
	wechatToken := "openclaw-wechat"
	if wc, ok := adminCfg["wechat"].(map[string]interface{}); ok {
		if u, ok := wc["apiUrl"].(string); ok && u != "" {
			wechatUrl = u
		}
		if t, ok := wc["token"].(string); ok && t != "" {
			wechatToken = t
		}
	}
	req, err := http.NewRequest(method, wechatUrl+path, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+wechatToken)
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(data, &result)
	return result, nil
}

// onebotApiCallSafe calls OneBot11 HTTP API (port 3000) with a short timeout
func onebotApiCallSafe(method, path string, body interface{}) (map[string]interface{}, error) {
	var bodyReader io.Reader
	if body != nil {
		data, _ := json.Marshal(body)
		bodyReader = strings.NewReader(string(data))
	}
	req, err := http.NewRequest(method, "http://127.0.0.1:3000"+path, bodyReader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(data, &result)
	return result, nil
}

// runCmd runs a command and returns trimmed stdout, or fallback on error
func runCmd(name string, args ...string) string {
	cmd := exec.Command(name, args...)
	cmd.Env = append(os.Environ(), "PATH="+os.Getenv("PATH")+":/usr/local/bin:/usr/bin:/bin:/snap/bin")
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// GetSystemEnv 获取系统环境信息
func GetSystemEnv(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		hostname, _ := os.Hostname()

		// OS info
		osInfo := gin.H{
			"platform": runtime.GOOS,
			"arch":     runtime.GOARCH,
			"hostname": hostname,
			"cpus":     runtime.NumCPU(),
		}

		// Try to read host-env.json first
		var hostEnv map[string]interface{}
		hostEnvPath := filepath.Join(cfg.OpenClawDir, "host-env.json")
		if data, err := os.ReadFile(hostEnvPath); err == nil {
			json.Unmarshal(data, &hostEnv)
		}

		if hostEnv != nil {
			if osData, ok := hostEnv["os"].(map[string]interface{}); ok {
				if v, ok := osData["distro"].(string); ok && v != "" {
					osInfo["distro"] = v
				}
				if v, ok := osData["release"].(string); ok && v != "" {
					osInfo["release"] = v
				}
			}
		}

		// Fallback OS detection
		if _, ok := osInfo["distro"]; !ok {
			distro := runCmd("bash", "-c", `cat /etc/os-release 2>/dev/null | grep "^PRETTY_NAME=" | cut -d= -f2 | tr -d '"'`)
			if distro != "" {
				osInfo["distro"] = distro
			}
		}
		if _, ok := osInfo["release"]; !ok {
			release := runCmd("uname", "-r")
			if release != "" {
				osInfo["release"] = release
			}
		}

		// User info
		userInfo := runCmd("whoami")
		if userInfo != "" {
			osInfo["userInfo"] = userInfo
		}

		// Memory info (from /proc/meminfo, locale-independent)
		totalMem := runCmd("bash", "-c", `awk '/^MemTotal:/{printf "%d", $2/1024}' /proc/meminfo 2>/dev/null`)
		freeMem := runCmd("bash", "-c", `awk '/^MemAvailable:/{printf "%d", $2/1024}' /proc/meminfo 2>/dev/null`)
		if totalMem != "" {
			if v, err := strconv.Atoi(totalMem); err == nil {
				osInfo["totalMemMB"] = v
			}
		}
		if freeMem != "" {
			if v, err := strconv.Atoi(freeMem); err == nil {
				osInfo["freeMemMB"] = v
			}
		}

		// CPU model
		cpuModel := runCmd("bash", "-c", `cat /proc/cpuinfo 2>/dev/null | grep "model name" | head -1 | cut -d: -f2`)
		if cpuModel != "" {
			osInfo["cpuModel"] = strings.TrimSpace(cpuModel)
		}

		// Uptime
		uptimeStr := runCmd("bash", "-c", `cat /proc/uptime 2>/dev/null | awk '{printf "%d", $1}'`)
		if uptimeStr != "" {
			osInfo["uptime"] = uptimeStr
		}

		// Load average
		loadAvg := runCmd("bash", "-c", `cat /proc/loadavg 2>/dev/null | awk '{print $1", "$2", "$3}'`)
		if loadAvg != "" {
			osInfo["loadAvg"] = loadAvg
		}

		// Software detection
		software := gin.H{}

		// Prefer host-env.json software info
		var hostSw map[string]interface{}
		if hostEnv != nil {
			hostSw, _ = hostEnv["software"].(map[string]interface{})
		}

		// Node.js
		nodeVer := ""
		if hostSw != nil {
			nodeVer, _ = hostSw["node"].(string)
		}
		if nodeVer == "" {
			nodeVer = runCmd("node", "--version")
		}
		if nodeVer != "" {
			software["node"] = nodeVer
		} else {
			software["node"] = "not installed"
		}

		// npm
		npmVer := runCmd("npm", "--version")
		if npmVer != "" {
			software["npm"] = npmVer
		} else {
			software["npm"] = "not installed"
		}

		// Docker
		dockerVer := ""
		if hostSw != nil {
			dockerVer, _ = hostSw["docker"].(string)
		}
		if dockerVer == "" {
			dockerVer = runCmd("docker", "--version")
		}
		if dockerVer != "" {
			software["docker"] = dockerVer
		} else {
			software["docker"] = "not installed"
		}

		// Git
		gitVer := ""
		if hostSw != nil {
			gitVer, _ = hostSw["git"].(string)
		}
		if gitVer == "" {
			gitVer = runCmd("git", "--version")
		}
		if gitVer != "" {
			software["git"] = gitVer
		} else {
			software["git"] = "not installed"
		}

		// Python
		pythonVer := ""
		if hostSw != nil {
			pythonVer, _ = hostSw["python"].(string)
		}
		if pythonVer == "" {
			pythonVer = runCmd("python3", "--version")
		}
		if pythonVer != "" {
			software["python"] = pythonVer
		} else {
			software["python"] = "not installed"
		}

		// Go
		software["go"] = runtime.Version()

		// OpenClaw
		software["openclaw"] = detectOpenClaw(cfg)

		c.JSON(http.StatusOK, gin.H{
			"ok": true,
			"os": osInfo,
			"software": software,
		})
	}
}

// detectOpenClaw 检测 OpenClaw 版本
func detectOpenClaw(cfg *config.Config) string {
	ocConfig, err := cfg.ReadOpenClawJSON()
	if err != nil {
		return "not found"
	}
	if meta, ok := ocConfig["meta"].(map[string]interface{}); ok {
		if ver, ok := meta["lastTouchedVersion"].(string); ok {
			return "v" + ver
		}
	}
	return "installed (config found)"
}

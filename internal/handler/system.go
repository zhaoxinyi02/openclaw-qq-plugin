package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zhaoxinyi02/ClawPanel/internal/config"
)

// GetVersion 获取版本信息
func GetVersion(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		ocConfig, _ := cfg.ReadOpenClawJSON()
		currentVersion := "unknown"
		if ocConfig != nil {
			if meta, ok := ocConfig["meta"].(map[string]interface{}); ok {
				if v, ok := meta["lastTouchedVersion"].(string); ok {
					currentVersion = v
				}
			}
		}

		var updateInfo map[string]interface{}
		updateCheckPath := filepath.Join(cfg.OpenClawDir, "update-check.json")
		if data, err := os.ReadFile(updateCheckPath); err == nil {
			json.Unmarshal(data, &updateInfo)
		}

		latestVersion := ""
		lastCheckedAt := ""
		updateAvailable := false
		if updateInfo != nil {
			latestVersion, _ = updateInfo["lastNotifiedVersion"].(string)
			lastCheckedAt, _ = updateInfo["lastCheckedAt"].(string)
			if latestVersion != "" && latestVersion != currentVersion {
				updateAvailable = true
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"ok":              true,
			"currentVersion":  currentVersion,
			"latestVersion":   latestVersion,
			"lastCheckedAt":   lastCheckedAt,
			"updateAvailable": updateAvailable,
		})
	}
}

// Backup 备份配置
func Backup(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		timestamp := time.Now().Format("2006-01-02T15-04-05")
		backupDir := filepath.Join(cfg.OpenClawDir, "backups")
		os.MkdirAll(backupDir, 0755)

		configSrc := filepath.Join(cfg.OpenClawDir, "openclaw.json")
		if _, err := os.Stat(configSrc); err == nil {
			data, _ := os.ReadFile(configSrc)
			os.WriteFile(filepath.Join(backupDir, fmt.Sprintf("openclaw-%s.json", timestamp)), data, 0644)
		}

		cronSrc := filepath.Join(cfg.OpenClawDir, "cron", "jobs.json")
		if _, err := os.Stat(cronSrc); err == nil {
			data, _ := os.ReadFile(cronSrc)
			os.WriteFile(filepath.Join(backupDir, fmt.Sprintf("cron-jobs-%s.json", timestamp)), data, 0644)
		}

		c.JSON(http.StatusOK, gin.H{"ok": true, "backupId": timestamp})
	}
}

// ListBackups 列出备份
func ListBackups(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		backupDir := filepath.Join(cfg.OpenClawDir, "backups")
		entries, err := os.ReadDir(backupDir)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"ok": true, "backups": []interface{}{}})
			return
		}

		type backupInfo struct {
			Name string `json:"name"`
			Path string `json:"path"`
			Size int64  `json:"size"`
			Time string `json:"time"`
		}

		var backups []backupInfo
		for _, e := range entries {
			if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
				continue
			}
			info, _ := e.Info()
			backups = append(backups, backupInfo{
				Name: e.Name(),
				Path: filepath.Join(backupDir, e.Name()),
				Size: info.Size(),
				Time: info.ModTime().Format(time.RFC3339),
			})
		}
		sort.Slice(backups, func(i, j int) bool { return backups[i].Name > backups[j].Name })

		if backups == nil {
			backups = []backupInfo{}
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "backups": backups})
	}
}

// Restore 恢复备份
func Restore(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			BackupName string `json:"backupName"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.BackupName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "backupName required"})
			return
		}

		backupDir := filepath.Join(cfg.OpenClawDir, "backups")
		backupPath := filepath.Join(backupDir, req.BackupName)
		if _, err := os.Stat(backupPath); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"ok": false, "error": "备份文件不存在"})
			return
		}

		// 恢复前自动备份当前配置
		timestamp := time.Now().Format("2006-01-02T15-04-05")
		configPath := filepath.Join(cfg.OpenClawDir, "openclaw.json")
		if data, err := os.ReadFile(configPath); err == nil {
			os.WriteFile(filepath.Join(backupDir, fmt.Sprintf("pre-restore-%s.json", timestamp)), data, 0644)
		}

		data, err := os.ReadFile(backupPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": err.Error()})
			return
		}

		if strings.HasPrefix(req.BackupName, "openclaw-") || strings.HasPrefix(req.BackupName, "pre-restore-") {
			os.WriteFile(configPath, data, 0644)
		} else if strings.HasPrefix(req.BackupName, "cron-jobs-") {
			cronPath := filepath.Join(cfg.OpenClawDir, "cron", "jobs.json")
			os.WriteFile(cronPath, data, 0644)
		}

		c.JSON(http.StatusOK, gin.H{"ok": true})
	}
}

// RestartGateway 重启 OpenClaw 网关
func RestartGateway(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		patchModelsJSON(cfg)
		signalPath := filepath.Join(cfg.OpenClawDir, "restart-gateway-signal.json")
		data, _ := json.Marshal(map[string]interface{}{
			"requestedAt": time.Now().Format(time.RFC3339),
		})
		if err := os.WriteFile(signalPath, data, 0644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "message": "网关重启请求已发送"})
	}
}

// RestartPanel 重启 ClawPanel 自身 (通过 systemctl)
func RestartPanel() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true, "message": "ClawPanel 即将重启"})
		// Delay restart so the response can be sent
		go func() {
			time.Sleep(500 * time.Millisecond)
			exec.Command("systemctl", "restart", "clawpanel").Run()
			// Fallback: exit and let systemd restart us
			os.Exit(0)
		}()
	}
}

// RestartGatewayStatus 获取网关重启状态
func RestartGatewayStatus(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		resultPath := filepath.Join(cfg.OpenClawDir, "restart-gateway-result.json")
		data, err := os.ReadFile(resultPath)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"ok": true, "status": "idle"})
			return
		}
		var result map[string]interface{}
		json.Unmarshal(data, &result)
		c.JSON(http.StatusOK, gin.H{"ok": true, "result": result})
	}
}

// CheckUpdate 检查更新
func CheckUpdate(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		ocConfig, _ := cfg.ReadOpenClawJSON()
		currentVersion := "unknown"
		if ocConfig != nil {
			if meta, ok := ocConfig["meta"].(map[string]interface{}); ok {
				if v, ok := meta["lastTouchedVersion"].(string); ok {
					currentVersion = v
				}
			}
		}

		latestVersion := ""
		updateAvailable := false

		// Try openclaw update --check
		if out := runCmd("openclaw", "update", "--check"); out != "" {
			latestVersion = strings.TrimSpace(out)
		}

		// Fallback: try npm view
		if latestVersion == "" {
			if out := runCmd("npm", "view", "openclaw", "version"); out != "" {
				latestVersion = strings.TrimSpace(out)
			}
		}

		if latestVersion != "" && latestVersion != currentVersion {
			updateAvailable = true
		}
		if latestVersion == "" {
			latestVersion = currentVersion
		}

		// Save check result
		checkData := map[string]interface{}{
			"lastCheckedAt":       time.Now().Format(time.RFC3339),
			"lastNotifiedVersion": latestVersion,
			"updateAvailable":     updateAvailable,
		}
		if data, err := json.MarshalIndent(checkData, "", "  "); err == nil {
			os.WriteFile(filepath.Join(cfg.OpenClawDir, "update-check.json"), data, 0644)
		}

		c.JSON(http.StatusOK, gin.H{
			"ok":              true,
			"currentVersion":  currentVersion,
			"latestVersion":   latestVersion,
			"updateAvailable": updateAvailable,
			"checkedAt":       time.Now().Format(time.RFC3339),
		})
	}
}

// DoUpdate 执行更新
func DoUpdate(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		signalPath := filepath.Join(cfg.OpenClawDir, "update-signal.json")
		resultPath := filepath.Join(cfg.OpenClawDir, "update-result.json")

		// 检查是否正在更新
		if data, err := os.ReadFile(resultPath); err == nil {
			var result map[string]interface{}
			json.Unmarshal(data, &result)
			if status, _ := result["status"].(string); status == "running" {
				c.JSON(http.StatusOK, gin.H{"ok": false, "error": "更新正在进行中"})
				return
			}
		}

		signalData, _ := json.Marshal(map[string]interface{}{
			"requestedAt": time.Now().Format(time.RFC3339),
		})
		resultData, _ := json.Marshal(map[string]interface{}{
			"status":    "running",
			"log":       []string{"等待宿主机执行更新..."},
			"startedAt": time.Now().Format(time.RFC3339),
		})

		os.WriteFile(signalPath, signalData, 0644)
		os.WriteFile(resultPath, resultData, 0644)

		c.JSON(http.StatusOK, gin.H{"ok": true, "message": "更新请求已发送"})
	}
}

// UpdateStatus 获取更新状态
func UpdateStatus(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		resultPath := filepath.Join(cfg.OpenClawDir, "update-result.json")
		logPath := filepath.Join(cfg.OpenClawDir, "update-log.txt")

		data, err := os.ReadFile(resultPath)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"ok": true, "status": "idle", "log": []string{}})
			return
		}

		var result map[string]interface{}
		json.Unmarshal(data, &result)

		// 尝试读取实时日志
		var logLines []string
		if logData, err := os.ReadFile(logPath); err == nil {
			content := strings.TrimSpace(string(logData))
			if content != "" {
				logLines = strings.Split(content, "\n")
			}
		}
		if logLines == nil {
			if l, ok := result["log"].([]interface{}); ok {
				for _, v := range l {
					if s, ok := v.(string); ok {
						logLines = append(logLines, s)
					}
				}
			}
		}
		if logLines == nil {
			logLines = []string{}
		}

		c.JSON(http.StatusOK, gin.H{
			"ok":         true,
			"status":     result["status"],
			"log":        logLines,
			"startedAt":  result["startedAt"],
			"finishedAt": result["finishedAt"],
		})
	}
}

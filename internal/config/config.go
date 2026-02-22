package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sync"
)

// Config 应用配置
type Config struct {
	Port        int    `json:"port"`
	DataDir     string `json:"dataDir"`
	OpenClawDir string `json:"openClawDir"`
	OpenClawApp string `json:"openClawApp"`
	OpenClawWork string `json:"openClawWork"`
	JWTSecret   string `json:"jwtSecret"`
	AdminToken  string `json:"adminToken"`
	Debug       bool   `json:"debug"`
	mu          sync.RWMutex
}

const (
	DefaultPort     = 19527
	ConfigFileName  = "clawpanel.json"
	DefaultJWTSecret = "clawpanel-secret-change-me"
	DefaultAdminToken = "clawpanel"
)

// Load 加载配置，如果不存在则创建默认配置
func Load() (*Config, error) {
	dataDir := getDataDir()
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("创建数据目录失败: %w", err)
	}

	cfgPath := filepath.Join(dataDir, ConfigFileName)
	cfg := &Config{
		Port:        DefaultPort,
		DataDir:     dataDir,
		OpenClawDir: getDefaultOpenClawDir(),
		JWTSecret:   DefaultJWTSecret,
		AdminToken:  DefaultAdminToken,
		Debug:       false,
	}

	// 从环境变量覆盖
	if v := os.Getenv("CLAWPANEL_PORT"); v != "" {
		fmt.Sscanf(v, "%d", &cfg.Port)
	}
	if v := os.Getenv("CLAWPANEL_DATA"); v != "" {
		cfg.DataDir = v
	}
	if v := os.Getenv("OPENCLAW_DIR"); v != "" {
		cfg.OpenClawDir = v
	}
	if v := os.Getenv("OPENCLAW_CONFIG"); v != "" {
		cfg.OpenClawDir = filepath.Dir(v)
	}
	if v := os.Getenv("OPENCLAW_APP"); v != "" {
		cfg.OpenClawApp = v
	}
	if v := os.Getenv("OPENCLAW_WORK"); v != "" {
		cfg.OpenClawWork = v
	}
	if v := os.Getenv("CLAWPANEL_SECRET"); v != "" {
		cfg.JWTSecret = v
	}
	if v := os.Getenv("ADMIN_TOKEN"); v != "" {
		cfg.AdminToken = v
	}
	if os.Getenv("CLAWPANEL_DEBUG") == "true" {
		cfg.Debug = true
	}

	// 尝试从文件加载
	if data, err := os.ReadFile(cfgPath); err == nil {
		if err := json.Unmarshal(data, cfg); err != nil {
			fmt.Printf("[ClawPanel] 配置文件解析失败，使用默认配置: %v\n", err)
		}
	}

	// 设置默认工作目录（基于 OpenClawDir 的父目录）
	parentDir := filepath.Dir(cfg.OpenClawDir) // e.g. /home/user/openclaw
	if cfg.OpenClawWork == "" || !dirExists(cfg.OpenClawWork) {
		cfg.OpenClawWork = filepath.Join(parentDir, "work")
	}
	// 设置默认 App 目录
	if cfg.OpenClawApp == "" || !dirExists(cfg.OpenClawApp) {
		cfg.OpenClawApp = filepath.Join(parentDir, "app")
	}

	// 保存配置（确保文件存在）
	cfg.Save()

	return cfg, nil
}

// Save 保存配置到文件
func (c *Config) Save() error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	cfgPath := filepath.Join(c.DataDir, ConfigFileName)
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(cfgPath, data, 0644)
}

// SetAdminToken 修改管理密码
func (c *Config) SetAdminToken(token string) {
	c.mu.Lock()
	c.AdminToken = token
	c.mu.Unlock()
	c.Save()
}

// GetAdminToken 获取管理密码
func (c *Config) GetAdminToken() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.AdminToken
}

// getDataDir 获取数据目录（与可执行文件同目录）
func getDataDir() string {
	if v := os.Getenv("CLAWPANEL_DATA"); v != "" {
		return v
	}
	// 使用可执行文件所在目录
	exe, err := os.Executable()
	if err != nil {
		return "./data"
	}
	return filepath.Join(filepath.Dir(exe), "data")
}

// getDefaultOpenClawDir 获取默认 OpenClaw 配置目录
func getDefaultOpenClawDir() string {
	home, _ := os.UserHomeDir()
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(home, ".openclaw")
	case "darwin":
		return filepath.Join(home, ".openclaw")
	default:
		return filepath.Join(home, ".openclaw")
	}
}

// ReadOpenClawJSON 读取 openclaw.json
func (c *Config) ReadOpenClawJSON() (map[string]interface{}, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	cfgPath := filepath.Join(c.OpenClawDir, "openclaw.json")
	data, err := os.ReadFile(cfgPath)
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// WriteOpenClawJSON 写入 openclaw.json
func (c *Config) WriteOpenClawJSON(data map[string]interface{}) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	cfgPath := filepath.Join(c.OpenClawDir, "openclaw.json")
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(cfgPath, jsonData, 0644)
}

// dirExists 检查目录是否存在
func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

// OpenClawConfigExists 检查 openclaw.json 是否存在
func (c *Config) OpenClawConfigExists() bool {
	cfgPath := filepath.Join(c.OpenClawDir, "openclaw.json")
	_, err := os.Stat(cfgPath)
	return err == nil
}

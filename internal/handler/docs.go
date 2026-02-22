package handler

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/zhaoxinyi02/ClawPanel/internal/config"
)

// GetDocs 获取文档列表
func GetDocs(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var docs []gin.H

		// 扫描 agents 目录
		agentsDir := filepath.Join(cfg.OpenClawDir, "agents")
		if info, err := os.Stat(agentsDir); err == nil && info.IsDir() {
			scanMdDir(agentsDir, "agents/", &docs)
		}

		// 扫描根目录 md 文件
		entries, _ := os.ReadDir(cfg.OpenClawDir)
		for _, e := range entries {
			if e.IsDir() || !strings.HasSuffix(e.Name(), ".md") {
				continue
			}
			full := filepath.Join(cfg.OpenClawDir, e.Name())
			content, _ := os.ReadFile(full)
			info, _ := e.Info()
			docs = append(docs, gin.H{
				"name":    e.Name(),
				"path":    full,
				"content": string(content),
				"size":    info.Size(),
			})
		}

		if docs == nil {
			docs = []gin.H{}
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "docs": docs})
	}
}

// SaveDoc 保存文档
func SaveDoc(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Path    string `json:"path"`
			Content string `json:"content"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Path == "" || !strings.HasSuffix(req.Path, ".md") {
			c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "无效路径"})
			return
		}

		resolved, _ := filepath.Abs(req.Path)
		openclawAbs, _ := filepath.Abs(cfg.OpenClawDir)
		if !strings.HasPrefix(resolved, openclawAbs) {
			c.JSON(http.StatusForbidden, gin.H{"ok": false, "error": "路径超出允许范围"})
			return
		}

		if err := os.WriteFile(resolved, []byte(req.Content), 0644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	}
}

// GetIdentityDocs 获取身份文档
func GetIdentityDocs(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		workDir := cfg.OpenClawWork
		if workDir == "" {
			workDir = filepath.Join(filepath.Dir(cfg.OpenClawDir), "openclaw", "work")
		}

		identityFiles := []string{"AGENTS.md", "BOOTSTRAP.md", "HEARTBEAT.md", "IDENTITY.md", "SOUL.md", "TOOLS.md", "USER.md"}
		var docs []gin.H

		for _, name := range identityFiles {
			full := filepath.Join(workDir, name)
			if info, err := os.Stat(full); err == nil {
				content, _ := os.ReadFile(full)
				docs = append(docs, gin.H{
					"name":     name,
					"path":     full,
					"content":  string(content),
					"size":     info.Size(),
					"modified": info.ModTime().Format("2006-01-02T15:04:05Z07:00"),
				})
			} else {
				docs = append(docs, gin.H{
					"name":    name,
					"path":    full,
					"content": "",
					"size":    0,
					"exists":  false,
				})
			}
		}

		c.JSON(http.StatusOK, gin.H{"ok": true, "docs": docs, "workDir": workDir})
	}
}

// SaveIdentityDoc 保存身份文档
func SaveIdentityDoc(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Path    string `json:"path"`
			Content string `json:"content"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Path == "" || !strings.HasSuffix(req.Path, ".md") {
			c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "无效路径"})
			return
		}

		workDir := cfg.OpenClawWork
		if workDir == "" {
			workDir = filepath.Join(filepath.Dir(cfg.OpenClawDir), "openclaw", "work")
		}

		resolved, _ := filepath.Abs(req.Path)
		workAbs, _ := filepath.Abs(workDir)
		openclawAbs, _ := filepath.Abs(cfg.OpenClawDir)
		if !strings.HasPrefix(resolved, workAbs) && !strings.HasPrefix(resolved, openclawAbs) {
			c.JSON(http.StatusForbidden, gin.H{"ok": false, "error": "路径超出允许范围"})
			return
		}

		if err := os.WriteFile(resolved, []byte(req.Content), 0644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	}
}

// scanMdDir 递归扫描 md 文件
func scanMdDir(dir, prefix string, docs *[]gin.H) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	for _, e := range entries {
		full := filepath.Join(dir, e.Name())
		if e.IsDir() {
			scanMdDir(full, prefix+e.Name()+"/", docs)
		} else if strings.HasSuffix(e.Name(), ".md") {
			content, _ := os.ReadFile(full)
			info, _ := e.Info()
			*docs = append(*docs, gin.H{
				"name":    prefix + e.Name(),
				"path":    full,
				"content": string(content),
				"size":    info.Size(),
			})
		}
	}
}

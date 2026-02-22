package handler

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zhaoxinyi02/ClawPanel/internal/config"
	"github.com/zhaoxinyi02/ClawPanel/internal/middleware"
	"github.com/zhaoxinyi02/ClawPanel/internal/model"
)

// Login 登录
func Login(db *sql.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Token string `json:"token"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "参数错误"})
			return
		}

		if req.Token != cfg.GetAdminToken() {
			c.JSON(http.StatusUnauthorized, gin.H{"ok": false, "error": "密码错误"})
			return
		}

		token, err := middleware.GenerateToken(cfg.JWTSecret)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "生成令牌失败"})
			return
		}

		model.AddEvent(db, &model.Event{
			Source:  "system",
			Type:    "auth.login",
			Summary: "管理员登录成功",
		})

		c.JSON(http.StatusOK, gin.H{"ok": true, "token": token})
	}
}

// ChangePassword 修改密码
func ChangePassword(db *sql.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			OldPassword string `json:"oldPassword"`
			NewPassword string `json:"newPassword"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "参数错误"})
			return
		}

		if req.OldPassword == "" || req.NewPassword == "" {
			c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "请填写完整"})
			return
		}
		if len(req.NewPassword) < 4 {
			c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "密码至少4位"})
			return
		}
		if req.OldPassword != cfg.GetAdminToken() {
			c.JSON(http.StatusUnauthorized, gin.H{"ok": false, "error": "当前密码错误"})
			return
		}

		cfg.SetAdminToken(req.NewPassword)

		model.AddEvent(db, &model.Event{
			Source:  "system",
			Type:    "auth.password_changed",
			Summary: "管理后台密码已修改",
		})

		c.JSON(http.StatusOK, gin.H{"ok": true})
	}
}

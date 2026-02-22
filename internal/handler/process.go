package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zhaoxinyi02/ClawPanel/internal/eventlog"
	"github.com/zhaoxinyi02/ClawPanel/internal/process"
)

// StartProcess 启动 OpenClaw 进程
func StartProcess(procMgr *process.Manager, sysLog ...*eventlog.SystemLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := procMgr.Start(); err != nil {
			if len(sysLog) > 0 && sysLog[0] != nil {
				sysLog[0].Log("system", "process.start.failed", "OpenClaw 启动失败: "+err.Error())
			}
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": err.Error()})
			return
		}
		if len(sysLog) > 0 && sysLog[0] != nil {
			sysLog[0].Log("system", "process.start", "OpenClaw 进程已启动")
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "message": "OpenClaw 已启动"})
	}
}

// StopProcess 停止 OpenClaw 进程
func StopProcess(procMgr *process.Manager, sysLog ...*eventlog.SystemLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := procMgr.Stop(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": err.Error()})
			return
		}
		if len(sysLog) > 0 && sysLog[0] != nil {
			sysLog[0].Log("system", "process.stop", "OpenClaw 进程已停止")
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "message": "OpenClaw 已停止"})
	}
}

// RestartProcess 重启 OpenClaw 进程
func RestartProcess(procMgr *process.Manager, sysLog ...*eventlog.SystemLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := procMgr.Restart(); err != nil {
			if len(sysLog) > 0 && sysLog[0] != nil {
				sysLog[0].Log("system", "process.restart.failed", "OpenClaw 重启失败: "+err.Error())
			}
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": err.Error()})
			return
		}
		if len(sysLog) > 0 && sysLog[0] != nil {
			sysLog[0].Log("system", "process.restart", "OpenClaw 进程已重启")
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "message": "OpenClaw 已重启"})
	}
}

// ProcessStatus 获取进程状态
func ProcessStatus(procMgr *process.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		status := procMgr.GetStatus()
		c.JSON(http.StatusOK, gin.H{"ok": true, "status": status})
	}
}

package handler

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/zhaoxinyi02/ClawPanel/internal/model"
)

// GetEvents 获取事件日志
func GetEvents(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
		offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
		source := c.Query("source")
		search := c.Query("search")

		events, total, err := model.GetEvents(db, limit, offset, source, search)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"ok":     true,
			"events": events,
			"total":  total,
			"limit":  limit,
			"offset": offset,
		})
	}
}

// ClearEvents 清空事件日志
func ClearEvents(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := model.ClearEvents(db); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	}
}

// PostEvent 外部服务提交事件（无需认证）
func PostEvent(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Source  string `json:"source"`
			Type    string `json:"type"`
			Summary string `json:"summary"`
			Detail  string `json:"detail"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Summary == "" {
			c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "summary required"})
			return
		}

		if req.Source == "" {
			req.Source = "openclaw"
		}
		if req.Type == "" {
			req.Type = "openclaw.action"
		}

		id, err := model.AddEvent(db, &model.Event{
			Source:  req.Source,
			Type:    req.Type,
			Summary: req.Summary,
			Detail:  req.Detail,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"ok": true, "id": id})
	}
}

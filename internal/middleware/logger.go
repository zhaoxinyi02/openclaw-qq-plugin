package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger 请求日志中间件
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		if status >= 400 {
			log.Printf("[HTTP] %s %s → %d (%v)", method, path, status, latency)
		} else if c.Request.URL.Path != "/api/ws/logs" {
			// 不记录 WebSocket 的常规日志
			log.Printf("[HTTP] %s %s → %d (%v)", method, path, status, latency)
		}
	}
}

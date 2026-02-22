package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/zhaoxinyi02/ClawPanel/internal/config"
)

// Claims JWT 声明
type Claims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

// Auth JWT 认证中间件
func Auth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr := c.GetHeader("Authorization")
		tokenStr = strings.TrimPrefix(tokenStr, "Bearer ")

		// 也支持 query 参数传 token（用于 WebSocket）
		if tokenStr == "" {
			tokenStr = c.Query("token")
		}

		if tokenStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"ok": false, "error": "未提供认证令牌"})
			c.Abort()
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"ok": false, "error": "认证令牌无效或已过期"})
			c.Abort()
			return
		}

		c.Set("role", claims.Role)
		c.Next()
	}
}

// GenerateToken 生成 JWT Token
func GenerateToken(secret string) (string, error) {
	claims := &Claims{
		Role: "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

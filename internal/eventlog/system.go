package eventlog

import (
	"database/sql"
	"encoding/json"
	"log"
	"time"

	"github.com/zhaoxinyi02/ClawPanel/internal/model"
	"github.com/zhaoxinyi02/ClawPanel/internal/websocket"
)

// SystemLogger logs system events to DB and broadcasts via WebSocket
type SystemLogger struct {
	db  *sql.DB
	hub *websocket.Hub
}

// NewSystemLogger creates a new system event logger
func NewSystemLogger(db *sql.DB, hub *websocket.Hub) *SystemLogger {
	return &SystemLogger{db: db, hub: hub}
}

// Log records a system event
func (s *SystemLogger) Log(source, eventType, summary string) {
	s.LogDetail(source, eventType, summary, "")
}

// LogDetail records a system event with detail
func (s *SystemLogger) LogDetail(source, eventType, summary, detail string) {
	event := &model.Event{
		Time:    time.Now().UnixMilli(),
		Source:  source,
		Type:    eventType,
		Summary: summary,
		Detail:  detail,
	}

	id, err := model.AddEvent(s.db, event)
	if err != nil {
		log.Printf("[SystemLog] 保存事件失败: %v", err)
		return
	}
	event.ID = id

	// Broadcast to WebSocket clients
	entry := map[string]interface{}{
		"id":      event.ID,
		"time":    event.Time,
		"source":  event.Source,
		"type":    event.Type,
		"summary": event.Summary,
		"detail":  event.Detail,
	}
	wsMsg, _ := json.Marshal(map[string]interface{}{
		"type": "log-entry",
		"data": entry,
	})
	s.hub.Broadcast(wsMsg)
}

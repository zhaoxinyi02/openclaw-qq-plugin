package process

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"github.com/zhaoxinyi02/ClawPanel/internal/config"
	"github.com/zhaoxinyi02/ClawPanel/internal/websocket"
)

// Status 进程状态
type Status struct {
	Running   bool      `json:"running"`
	PID       int       `json:"pid"`
	StartedAt time.Time `json:"startedAt,omitempty"`
	Uptime    int64     `json:"uptime"` // 秒
	ExitCode  int       `json:"exitCode,omitempty"`
}

// Manager 进程管理器
type Manager struct {
	cfg       *config.Config
	cmd       *exec.Cmd
	status    Status
	mu        sync.RWMutex
	logLines  []string
	logMu     sync.RWMutex
	maxLog    int
	stopCh    chan struct{}
	logReader io.ReadCloser
}

// NewManager 创建进程管理器
func NewManager(cfg *config.Config) *Manager {
	return &Manager{
		cfg:    cfg,
		maxLog: 5000,
		stopCh: make(chan struct{}),
	}
}

// Start 启动 OpenClaw 进程
func (m *Manager) Start() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.status.Running {
		return fmt.Errorf("OpenClaw 已在运行中 (PID: %d)", m.status.PID)
	}

	// 查找 openclaw 可执行文件
	openclawBin := m.findOpenClawBin()
	if openclawBin == "" {
		return fmt.Errorf("未找到 openclaw 可执行文件，请确保已安装 OpenClaw")
	}

	// 构建启动命令
	m.cmd = exec.Command(openclawBin, "start")
	m.cmd.Dir = m.cfg.OpenClawDir
	m.cmd.Env = append(os.Environ(),
		fmt.Sprintf("OPENCLAW_DIR=%s", m.cfg.OpenClawDir),
	)

	// 捕获 stdout 和 stderr
	stdout, err := m.cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("创建 stdout 管道失败: %w", err)
	}
	stderr, err := m.cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("创建 stderr 管道失败: %w", err)
	}

	if err := m.cmd.Start(); err != nil {
		return fmt.Errorf("启动 OpenClaw 失败: %w", err)
	}

	m.status = Status{
		Running:   true,
		PID:       m.cmd.Process.Pid,
		StartedAt: time.Now(),
	}

	// 合并 stdout 和 stderr
	m.logReader = io.NopCloser(io.MultiReader(stdout, stderr))

	// 后台监控进程退出
	go m.waitForExit()

	log.Printf("[ProcessMgr] OpenClaw 已启动 (PID: %d)", m.status.PID)
	return nil
}

// Stop 停止 OpenClaw 进程
func (m *Manager) Stop() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.status.Running || m.cmd == nil || m.cmd.Process == nil {
		return fmt.Errorf("OpenClaw 未在运行")
	}

	log.Printf("[ProcessMgr] 正在停止 OpenClaw (PID: %d)...", m.status.PID)

	// 先尝试优雅关闭
	if runtime.GOOS == "windows" {
		m.cmd.Process.Kill()
	} else {
		m.cmd.Process.Signal(os.Interrupt)
		// 等待 5 秒，如果还没退出则强制杀死
		done := make(chan struct{})
		go func() {
			m.cmd.Wait()
			close(done)
		}()
		select {
		case <-done:
		case <-time.After(5 * time.Second):
			m.cmd.Process.Kill()
		}
	}

	m.status.Running = false
	m.status.PID = 0
	log.Println("[ProcessMgr] OpenClaw 已停止")
	return nil
}

// Restart 重启 OpenClaw 进程
func (m *Manager) Restart() error {
	if m.GetStatus().Running {
		if err := m.Stop(); err != nil {
			log.Printf("[ProcessMgr] 停止失败: %v", err)
		}
		time.Sleep(time.Second)
	}
	return m.Start()
}

// StopAll 停止所有进程
func (m *Manager) StopAll() {
	if m.GetStatus().Running {
		m.Stop()
	}
}

// GetStatus 获取进程状态
func (m *Manager) GetStatus() Status {
	m.mu.RLock()
	defer m.mu.RUnlock()

	s := m.status
	if s.Running {
		s.Uptime = int64(time.Since(s.StartedAt).Seconds())
	}
	return s
}

// GetLogs 获取日志
func (m *Manager) GetLogs(n int) []string {
	m.logMu.RLock()
	defer m.logMu.RUnlock()

	if n <= 0 || n > len(m.logLines) {
		n = len(m.logLines)
	}
	start := len(m.logLines) - n
	if start < 0 {
		start = 0
	}
	result := make([]string, n)
	copy(result, m.logLines[start:])
	return result
}

// StreamLogs 将进程日志流式推送到 WebSocket Hub
func (m *Manager) StreamLogs(hub *websocket.Hub) {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	lastIdx := 0
	for {
		select {
		case <-m.stopCh:
			return
		case <-ticker.C:
			m.logMu.RLock()
			newLines := m.logLines[lastIdx:]
			lastIdx = len(m.logLines)
			m.logMu.RUnlock()

			for _, line := range newLines {
				hub.Broadcast([]byte(line))
			}
		}
	}
}

// addLogLine 添加日志行
func (m *Manager) addLogLine(line string) {
	m.logMu.Lock()
	defer m.logMu.Unlock()

	m.logLines = append(m.logLines, line)
	if len(m.logLines) > m.maxLog {
		m.logLines = m.logLines[len(m.logLines)-m.maxLog:]
	}
}

// waitForExit 等待进程退出
func (m *Manager) waitForExit() {
	if m.logReader != nil {
		scanner := bufio.NewScanner(m.logReader)
		scanner.Buffer(make([]byte, 64*1024), 64*1024)
		for scanner.Scan() {
			m.addLogLine(scanner.Text())
		}
	}

	if m.cmd != nil {
		err := m.cmd.Wait()
		m.mu.Lock()
		m.status.Running = false
		if err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok {
				m.status.ExitCode = exitErr.ExitCode()
			}
		}
		m.mu.Unlock()
		log.Printf("[ProcessMgr] OpenClaw 进程已退出 (code: %d)", m.status.ExitCode)
	}
}

// findOpenClawBin 查找 openclaw 可执行文件
func (m *Manager) findOpenClawBin() string {
	candidates := []string{
		"openclaw",
	}

	// 添加常见路径
	home, _ := os.UserHomeDir()
	if home != "" {
		candidates = append(candidates,
			filepath.Join(home, ".local", "bin", "openclaw"),
			filepath.Join(home, "openclaw", "app", "openclaw"),
		)
	}

	switch runtime.GOOS {
	case "linux":
		candidates = append(candidates,
			"/usr/local/bin/openclaw",
			"/usr/bin/openclaw",
			"/snap/bin/openclaw",
		)
	case "darwin":
		candidates = append(candidates,
			"/usr/local/bin/openclaw",
			"/opt/homebrew/bin/openclaw",
		)
	case "windows":
		candidates = append(candidates,
			`C:\Program Files\openclaw\openclaw.exe`,
			filepath.Join(home, "AppData", "Roaming", "npm", "openclaw.cmd"),
		)
	}

	for _, c := range candidates {
		if p, err := exec.LookPath(c); err == nil {
			return p
		}
	}
	return ""
}

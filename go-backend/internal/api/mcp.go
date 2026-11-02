package api

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
)

type McpClient struct {
	serverURL string
	sessionID string
	mu        sync.Mutex
	client    *http.Client
}

func NewMcpClient() *McpClient {
	url := os.Getenv("MCP_SERVER_URL")
	if url == "" {
		url = "https://silent-birch-9f14b5d6.tunnl.gg/mcp"
	}
	return &McpClient{
		serverURL: url,
		client:    &http.Client{},
	}
}

func (m *McpClient) ensureSession() (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.sessionID != "" {
		return m.sessionID, nil
	}

	initPayload := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "initialize",
		"params": map[string]interface{}{
			"protocolVersion": "2024-11-05",
			"capabilities":    map[string]interface{}{},
			"clientInfo": map[string]string{
				"name":    "go-backend-mcp-client",
				"version": "1.0",
			},
		},
	}

	bodyBytes, _ := json.Marshal(initPayload)
	req, err := http.NewRequest(http.MethodPost, m.serverURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")

	resp, err := m.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to reach MCP server: %w", err)
	}
	defer resp.Body.Close()

	sessionID := resp.Header.Get("mcp-session-id")
	if sessionID == "" {
		return "", fmt.Errorf("no mcp-session-id in MCP server response (status: %d)", resp.StatusCode)
	}

	m.sessionID = sessionID
	return m.sessionID, nil
}

func (m *McpClient) resetSession() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sessionID = ""
}

func (m *McpClient) sendMCPRequest(payload interface{}) (string, error) {
	for attempt := 0; attempt < 2; attempt++ {
		sessionID, err := m.ensureSession()
		if err != nil {
			return "", err
		}

		bodyBytes, err := json.Marshal(payload)
		if err != nil {
			return "", err
		}

		req, err := http.NewRequest(http.MethodPost, m.serverURL, bytes.NewReader(bodyBytes))
		if err != nil {
			return "", err
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json, text/event-stream")
		req.Header.Set("mcp-session-id", sessionID)

		resp, err := m.client.Do(req)
		if err != nil {
			return "", err
		}

		// Handle expired or invalid session (MCP server returns 404 Not Found)
		if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusBadRequest {
			resp.Body.Close()
			m.resetSession()
			if attempt == 0 {
				continue
			}
			return "", fmt.Errorf("MCP request failed with status %d", resp.StatusCode)
		}

		dataStr, err := parseSSEData(resp.Body)
		resp.Body.Close()
		if err != nil {
			m.resetSession()
			if attempt == 0 {
				continue
			}
			return "", err
		}

		return dataStr, nil
	}

	return "", fmt.Errorf("failed to execute MCP request after retry")
}

func (m *McpClient) ListTools() ([]map[string]interface{}, error) {
	payload := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      2,
		"method":  "tools/list",
		"params":  map[string]interface{}{},
	}

	dataStr, err := m.sendMCPRequest(payload)
	if err != nil {
		return nil, err
	}

	var jsonResp struct {
		Result struct {
			Tools []map[string]interface{} `json:"tools"`
		} `json:"result"`
	}

	if err := json.Unmarshal([]byte(dataStr), &jsonResp); err != nil {
		return nil, fmt.Errorf("unmarshal error: %w (raw: %s)", err, dataStr)
	}

	return jsonResp.Result.Tools, nil
}

func (m *McpClient) CallTool(name string, args map[string]interface{}) (string, error) {
	payload := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      3,
		"method":  "tools/call",
		"params": map[string]interface{}{
			"name":      name,
			"arguments": args,
		},
	}

	dataStr, err := m.sendMCPRequest(payload)
	if err != nil {
		return "", err
	}

	var jsonResp struct {
		Result struct {
			Content []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
			IsError bool `json:"isError"`
		} `json:"result"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal([]byte(dataStr), &jsonResp); err != nil {
		return "", fmt.Errorf("unmarshal error: %w (raw: %s)", err, dataStr)
	}

	if jsonResp.Error != nil {
		return "", fmt.Errorf("MCP error: %s", jsonResp.Error.Message)
	}

	if len(jsonResp.Result.Content) > 0 {
		return jsonResp.Result.Content[0].Text, nil
	}

	return "Tool executed successfully (empty content)", nil
}

func parseSSEData(r io.Reader) (string, error) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "data: ") {
			return strings.TrimPrefix(line, "data: "), nil
		}
	}
	if err := scanner.Err(); err != nil {
		return "", err
	}
	return "", fmt.Errorf("no SSE data line found in response")
}

package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"iot-assignment/backend/internal/config"
	"iot-assignment/backend/internal/store"
)

type Publisher interface {
	Publish(topic string, payload string) error
}

type Router struct {
	mux       *http.ServeMux
	cfg       *config.Config
	state     *store.State
	publisher Publisher
	mcp       *McpClient
}

type ledRequest struct {
	Action string `json:"action"`
}

func NewRouter(cfg *config.Config, st *store.State, pub Publisher) *Router {
	if cfg == nil {
		cfg = config.Load()
	}

	r := &Router{
		mux:       http.NewServeMux(),
		cfg:       cfg,
		state:     st,
		publisher: pub,
		mcp:       NewMcpClient(),
	}

	r.mux.HandleFunc("/api/config", r.handleConfig)
	r.mux.HandleFunc("/api/led", r.handleLED)
	r.mux.HandleFunc("/api/sensors", r.handleSensors)
	r.mux.HandleFunc("/api/history", r.handleHistory)
	r.mux.HandleFunc("/api/lora", r.handleLoRa)
	r.mux.HandleFunc("/api/health", r.handleHealth)
	r.mux.HandleFunc("/api/mcp/tools", r.handleMcpTools)
	r.mux.HandleFunc("/api/mcp/call", r.handleMcpCall)

	return r
}

func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	// Enable CORS for frontend
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if req.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	r.mux.ServeHTTP(w, req)
}

func (r *Router) handleLED(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body ledRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	action := strings.ToUpper(strings.TrimSpace(body.Action))
	if action != "ON" && action != "OFF" {
		http.Error(w, "Action must be ON or OFF", http.StatusBadRequest)
		return
	}

	topic := r.cfg.LEDCommandTopic()
	if err := r.publisher.Publish(topic, action); err != nil {
		http.Error(w, "Failed to publish MQTT command", http.StatusInternalServerError)
		return
	}
	r.state.SetLEDStatus(action)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Command published",
		"action":  action,
	})
}

func (r *Router) handleConfig(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"group_name":          r.cfg.GroupName,
		"topic_prefix":        r.cfg.MqttTopicPrefix,
		"broker_url":          r.cfg.MqttBroker,
		"polling_interval_ms": r.cfg.PollingIntervalMs,
		"sensors_topic":       r.cfg.SensorsTopic(),
		"led_topic":           r.cfg.LEDCommandTopic(),
		"lora_topic":          r.cfg.LoRaTopic(),
	})
}

func (r *Router) handleSensors(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	data := r.state.GetSnapshot()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(data)
}

func (r *Router) handleHistory(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	history := r.state.GetHistory()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(history)
}

func (r *Router) handleLoRa(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	lora := r.state.GetLoRaData()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(lora)
}

func (r *Router) handleHealth(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "healthy",
		"service": "go-iot-backend",
		"mqtt":    "connected",
	})
}

func (r *Router) handleMcpTools(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tools, err := r.mcp.ListTools()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list MCP tools: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"server":  "RaspberryPi-IoT",
		"tools":   tools,
	})
}

type mcpCallRequest struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
}

func (r *Router) handleMcpCall(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body mcpCallRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	if body.Arguments == nil {
		body.Arguments = make(map[string]interface{})
	}

	output, err := r.mcp.CallTool(body.Name, body.Arguments)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"tool":    body.Name,
		"result":  output,
	})
}

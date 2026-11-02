package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port              string `json:"port"`
	GroupName         string `json:"group_name"`
	MqttBroker        string `json:"broker_url"`
	MqttTopicPrefix   string `json:"topic_prefix"`
	McpServerURL      string `json:"mcp_server_url"`
	PollingIntervalMs int    `json:"polling_interval_ms"`
}

func Load() *Config {
	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}

	groupName := strings.TrimSpace(os.Getenv("GROUP_NAME"))
	if groupName == "" {
		groupName = "IoT Assignment"
	}

	mqttBroker := strings.TrimSpace(os.Getenv("MQTT_BROKER"))
	if mqttBroker == "" {
		mqttBroker = "tcp://broker.hivemq.com:1883"
	}

	mqttTopicPrefix := strings.Trim(strings.TrimSpace(os.Getenv("MQTT_TOPIC_PREFIX")), "/")
	if mqttTopicPrefix == "" {
		mqttTopicPrefix = "iot/67070134"
	}

	mcpServerURL := strings.TrimSpace(os.Getenv("MCP_SERVER_URL"))
	if mcpServerURL == "" {
		mcpServerURL = "https://silent-birch-9f14b5d6.tunnl.gg/mcp"
	}

	pollingIntervalMs := 2000
	if rawInterval := strings.TrimSpace(os.Getenv("POLLING_INTERVAL_MS")); rawInterval != "" {
		if parsed, err := strconv.Atoi(rawInterval); err == nil && parsed > 0 {
			pollingIntervalMs = parsed
		}
	}

	return &Config{
		Port:              port,
		GroupName:         groupName,
		MqttBroker:        mqttBroker,
		MqttTopicPrefix:   mqttTopicPrefix,
		McpServerURL:      mcpServerURL,
		PollingIntervalMs: pollingIntervalMs,
	}
}

func (c *Config) SensorsTopic() string {
	return fmt.Sprintf("%s/sensors", c.MqttTopicPrefix)
}

func (c *Config) LEDCommandTopic() string {
	return fmt.Sprintf("%s/actuators/led", c.MqttTopicPrefix)
}

func (c *Config) LEDStatusTopic() string {
	return fmt.Sprintf("%s/actuators/led/status", c.MqttTopicPrefix)
}

func (c *Config) LoRaTopic() string {
	return fmt.Sprintf("%s/lora", c.MqttTopicPrefix)
}

func (c *Config) WildcardTopic() string {
	return fmt.Sprintf("%s/#", c.MqttTopicPrefix)
}

package mqtt

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"

	paho "github.com/eclipse/paho.mqtt.golang"
	"iot-assignment/backend/internal/store"
)

type MessageHandler struct {
	state *store.State
}

func NewMessageHandler(st *store.State) *MessageHandler {
	return &MessageHandler{state: st}
}

func (h *MessageHandler) ProcessMessage(topic string, payload []byte) {
	cleanTopic := strings.TrimSpace(topic)

	if strings.HasSuffix(cleanTopic, "/sensors") || strings.HasSuffix(cleanTopic, "/pi/sensors") {
		var data struct {
			Temperature *float64 `json:"temperature"`
			Humidity    *float64 `json:"humidity"`
			DistanceCM  *float64 `json:"distance_cm"`
		}
		if err := json.Unmarshal(payload, &data); err == nil {
			h.state.RecordTelemetryNullable(data.Temperature, data.Humidity, data.DistanceCM)
			return
		}
	}

	if strings.HasSuffix(cleanTopic, "/lora") || strings.HasSuffix(cleanTopic, "/lora/data") {
		var lora struct {
			NodeID   string   `json:"node_id"`
			Humidity *float64 `json:"humidity"`
			Battery  *float64 `json:"battery_voltage"`
			RSSI     *int     `json:"rssi"`
		}
		if err := json.Unmarshal(payload, &lora); err == nil {
			h.state.RecordLoRaData(store.LoRaData{
				NodeID:   lora.NodeID,
				Humidity: lora.Humidity,
				Battery:  lora.Battery,
				RSSI:     lora.RSSI,
			})
			return
		}
	}

	if strings.HasSuffix(cleanTopic, "/actuators/led/status") || strings.HasSuffix(cleanTopic, "/led/status") {
		// Can be JSON {"status": "ON"} or plain string "ON"
		var statusObj struct {
			Status string `json:"status"`
		}
		if err := json.Unmarshal(payload, &statusObj); err == nil && statusObj.Status != "" {
			h.state.SetLEDStatus(strings.ToUpper(strings.TrimSpace(statusObj.Status)))
			return
		}

		rawStatus := strings.ToUpper(strings.TrimSpace(string(payload)))
		if rawStatus == "ON" || rawStatus == "OFF" {
			h.state.SetLEDStatus(rawStatus)
		}
	}
}

type Client struct {
	client  paho.Client
	handler *MessageHandler
}

func NewClient(broker string, clientID string, topicPrefix string, handler *MessageHandler) (*Client, error) {
	opts := paho.NewClientOptions()
	opts.AddBroker(broker)
	opts.SetClientID(clientID)
	opts.SetAutoReconnect(true)

	cleanPrefix := strings.Trim(strings.TrimSpace(topicPrefix), "/")
	if cleanPrefix == "" {
		cleanPrefix = "iot/67070134"
	}
	subTopic := fmt.Sprintf("%s/#", cleanPrefix)

	opts.SetDefaultPublishHandler(func(c paho.Client, m paho.Message) {
		handler.ProcessMessage(m.Topic(), m.Payload())
	})

	opts.OnConnect = func(c paho.Client) {
		log.Println("[MQTT] Connected to broker")
		token := c.Subscribe(subTopic, 1, nil)
		token.Wait()
		if token.Error() != nil {
			log.Printf("[MQTT] Subscribe error for %s: %v\n", subTopic, token.Error())
		} else {
			log.Printf("[MQTT] Subscribed to %s\n", subTopic)
		}
	}

	c := paho.NewClient(opts)
	return &Client{
		client:  c,
		handler: handler,
	}, nil
}

func (c *Client) Connect() error {
	token := c.client.Connect()
	token.Wait()
	return token.Error()
}

func (c *Client) Disconnect() {
	c.client.Disconnect(250)
}

func (c *Client) Publish(topic string, payload string) error {
	token := c.client.Publish(topic, 1, false, payload)
	token.Wait()
	if token.Error() != nil {
		return fmt.Errorf("publish error: %w", token.Error())
	}
	return nil
}

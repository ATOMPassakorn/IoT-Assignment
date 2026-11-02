package main

import (
	"log"
	"net/http"

	"iot-assignment/backend/internal/api"
	"iot-assignment/backend/internal/config"
	"iot-assignment/backend/internal/mqtt"
	"iot-assignment/backend/internal/store"
)

func main() {
	cfg := config.Load()

	log.Printf("[Server] Initializing Go IoT Backend for '%s' on port %s...", cfg.GroupName, cfg.Port)
	log.Printf("[Server] MQTT Broker: %s, Topic Prefix: %s", cfg.MqttBroker, cfg.MqttTopicPrefix)

	st := store.NewState()
	msgHandler := mqtt.NewMessageHandler(st)

	mqttClient, err := mqtt.NewClient(cfg.MqttBroker, "go-iot-backend-runner", cfg.MqttTopicPrefix, msgHandler)
	if err != nil {
		log.Fatalf("[MQTT] Client init error: %v", err)
	}

	if err := mqttClient.Connect(); err != nil {
		log.Printf("[MQTT] Initial connection warning: %v. Reconnect enabled.", err)
	}

	router := api.NewRouter(cfg, st, mqttClient)

	log.Printf("[Server] HTTP API ready at http://0.0.0.0:%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatalf("[Server] Fatal server error: %v", err)
	}
}

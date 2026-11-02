package store

import (
	"sync"
	"time"
)

type SensorItem struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Value     *float64 `json:"value"`
	Unit      string   `json:"unit"`
	Available bool     `json:"available"`
}

type TelemetryPoint struct {
	Temperature *float64 `json:"temperature"`
	Humidity    *float64 `json:"humidity"`
	DistanceCM  *float64 `json:"distance_cm"`
	Timestamp   string   `json:"timestamp"`
}

type LoRaData struct {
	NodeID    string   `json:"node_id"`
	Humidity  *float64 `json:"humidity"`
	Battery   *float64 `json:"battery_voltage"`
	RSSI      *int     `json:"rssi"`
	UpdatedAt string   `json:"updated_at"`
}

type State struct {
	mu          sync.RWMutex
	temperature *float64
	humidity    *float64
	distance    *float64
	ledStatus   string
	updatedAt   time.Time
	history     []TelemetryPoint
	maxHistory  int
	loraData    LoRaData
}

func NewState() *State {
	return &State{
		temperature: nil,
		humidity:    nil,
		distance:    nil,
		ledStatus:   "OFF",
		updatedAt:   time.Now(),
		history:     make([]TelemetryPoint, 0, 100),
		maxHistory:  100,
		loraData: LoRaData{
			NodeID:    "lora-node-01",
			Humidity:  nil,
			Battery:   nil,
			RSSI:      nil,
			UpdatedAt: time.Now().UTC().Format(time.RFC3339),
		},
	}
}

func (s *State) SetLEDStatus(status string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ledStatus = status
	s.updatedAt = time.Now()
}

func (s *State) GetLEDStatus() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.ledStatus
}

func (s *State) RecordTelemetryNullable(temp, hum, dist *float64) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if temp != nil {
		s.temperature = temp
	}
	if hum != nil {
		s.humidity = hum
	}
	if dist != nil {
		s.distance = dist
	}
	s.updatedAt = time.Now()

	pt := TelemetryPoint{
		Temperature: s.temperature,
		Humidity:    s.humidity,
		DistanceCM:  s.distance,
		Timestamp:   s.updatedAt.UTC().Format(time.RFC3339),
	}

	if len(s.history) >= s.maxHistory {
		s.history = s.history[1:]
	}
	s.history = append(s.history, pt)
}

func (s *State) RecordTelemetry(temp, hum, dist float64) {
	t := temp
	h := hum
	d := dist
	s.RecordTelemetryNullable(&t, &h, &d)
}

func (s *State) GetHistory() []TelemetryPoint {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]TelemetryPoint, len(s.history))
	copy(result, s.history)
	return result
}

func (s *State) RecordLoRaData(data LoRaData) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if data.UpdatedAt == "" {
		data.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	}
	s.loraData = data
}

func (s *State) GetLoRaData() LoRaData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.loraData
}

func (s *State) GetSnapshot() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sensors := []SensorItem{
		{
			ID:        "temperature",
			Name:      "Temperature",
			Value:     s.temperature,
			Unit:      "°C",
			Available: s.temperature != nil,
		},
		{
			ID:        "humidity",
			Name:      "Humidity",
			Value:     s.humidity,
			Unit:      "%",
			Available: s.humidity != nil,
		},
		{
			ID:        "distance_cm",
			Name:      "Water Level Distance",
			Value:     s.distance,
			Unit:      "cm",
			Available: s.distance != nil,
		},
	}

	return map[string]interface{}{
		"temperature": s.temperature,
		"humidity":    s.humidity,
		"distance_cm": s.distance,
		"sensors":     sensors,
		"led_status":  s.ledStatus,
		"updated_at":  s.updatedAt.UTC().Format(time.RFC3339),
	}
}

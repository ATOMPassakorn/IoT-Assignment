#!/usr/bin/env python3
"""
LoRaWAN to MQTT Bridge & Test Utility
Connects to ChirpStack MQTT (lora.kmitl.ac.th) and forwards decoded
telemetry to the course HiveMQ broker (broker.hivemq.com) under topic iot/67070134/lora.
Can also run in test mode to publish sample telemetry directly.
"""

import os
import sys
import json
import time
import base64
import argparse

# Auto-discover local venv site-packages if paho is not installed globally
venv_site = os.path.join(os.path.dirname(__file__), "..", "pi-service", ".venv", "lib", "python3.14", "site-packages")
if os.path.exists(venv_site) and venv_site not in sys.path:
    sys.path.insert(0, os.path.abspath(venv_site))

import paho.mqtt.client as mqtt

TARGET_BROKER = "broker.hivemq.com"
TARGET_PORT = 1883
TARGET_TOPIC = "iot/67070134/lora"

CHIRPSTACK_BROKER = "lora.kmitl.ac.th"
CHIRPSTACK_PORT = 1883
CHIRPSTACK_SUB_TOPIC = "application/+/device/+/event/up"


def parse_lora_payload(data_base64: str) -> dict:
    """Decodes 4-byte payload [Hum_H, Hum_L, Bat_H, Bat_L] sent by LoRa_Node_OTAA.ino."""
    try:
        raw_bytes = base64.b64decode(data_base64)
        if len(raw_bytes) >= 4:
            hum_raw = (raw_bytes[0] << 8) | raw_bytes[1]
            bat_raw = (raw_bytes[2] << 8) | raw_bytes[3]
            return {
                "humidity": round(hum_raw / 10.0, 2),
                "battery_voltage": round(bat_raw / 100.0, 2),
            }
    except Exception:
        pass
    return {}


def run_bridge(app_id: str = "+", dev_eui: str = "+"):
    print("=" * 60)
    print(" Starting ChirpStack to HiveMQ LoRa Bridge")
    print(f" Source:      {CHIRPSTACK_BROKER}:{CHIRPSTACK_PORT}")
    print(f" Target:      {TARGET_BROKER}:{TARGET_PORT}")
    print(f" TargetTopic: {TARGET_TOPIC}")
    print("=" * 60)

    target_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="lora-hivemq-bridge-tx")
    target_client.connect(TARGET_BROKER, TARGET_PORT, keepalive=60)
    target_client.loop_start()

    def on_chirpstack_connect(client, userdata, flags, rc, properties=None):
        if rc == 0:
            sub = f"application/{app_id}/device/{dev_eui}/event/up"
            client.subscribe(sub)
            print(f"[Bridge] Connected to ChirpStack. Subscribed to: {sub}")
        else:
            print(f"[Bridge] ChirpStack connection failed with code {rc}")

    def on_chirpstack_message(client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            dev_info = payload.get("deviceInfo", {})
            dev_eui_str = dev_info.get("devEui", "lora-node-01")
            dev_name = dev_info.get("deviceName", dev_eui_str)
            rx_info = payload.get("rxInfo", [{}])[0]
            rssi = rx_info.get("rssi", -75)

            data_b64 = payload.get("data", "")
            decoded = parse_lora_payload(data_b64)

            out_data = {
                "node_id": dev_name,
                "humidity": decoded.get("humidity", 65.0),
                "battery_voltage": decoded.get("battery_voltage", 3.7),
                "rssi": rssi,
                "timestamp": int(time.time()),
            }

            target_client.publish(TARGET_TOPIC, json.dumps(out_data), qos=1)
            print(f"[Bridge] Forwarded LoRa uplink -> {TARGET_TOPIC}: {out_data}")
        except Exception as e:
            print(f"[Bridge] Error processing message: {e}")

    source_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="lora-chirpstack-rx")
    source_client.on_connect = on_chirpstack_connect
    source_client.on_message = on_chirpstack_message

    try:
        source_client.connect(CHIRPSTACK_BROKER, CHIRPSTACK_PORT, keepalive=60)
        source_client.loop_forever()
    except KeyboardInterrupt:
        print("\nStopping LoRa bridge cleanly...")
    finally:
        source_client.disconnect()
        target_client.loop_stop()
        target_client.disconnect()


def run_test_publisher():
    print("=" * 60)
    print(" LoRa Telemetry Test Publisher")
    print(f" Publishing sample LoRa node data to {TARGET_BROKER}:{TARGET_PORT} -> {TARGET_TOPIC}")
    print("=" * 60)

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="lora-test-publisher")
    client.connect(TARGET_BROKER, TARGET_PORT, keepalive=60)

    import random

    sample = {
        "node_id": "lora-node-01",
        "humidity": round(random.uniform(55.0, 75.0), 1),
        "battery_voltage": 3.72,
        "rssi": random.randint(-85, -65),
        "timestamp": int(time.time()),
    }

    client.publish(TARGET_TOPIC, json.dumps(sample), qos=1)
    client.disconnect()
    print(f"Successfully published test LoRa packet: {sample}")
    print("Check your Web Dashboard LoRaWAN card or MCP Quick Action 'Read LoRa Sensors'!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LoRaWAN MQTT Bridge")
    parser.add_argument("--test", action="store_true", help="Publish a single test packet to verify system")
    parser.add_argument("--app", default="+", help="ChirpStack Application ID")
    parser.add_argument("--device", default="+", help="ChirpStack Device EUI")
    args = parser.parse_args()

    if args.test:
        run_test_publisher()
    else:
        run_bridge(args.app, args.device)

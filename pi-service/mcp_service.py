import os
import sys
import json
import time
import signal
import logging
import threading
from typing import Literal
import paho.mqtt.client as mqtt

def suppress_keyboard_interrupt_traceback(exctype, value, tb):
    if issubclass(exctype, (KeyboardInterrupt, SystemExit)):
        return
    sys.__excepthook__(exctype, value, tb)

sys.excepthook = suppress_keyboard_interrupt_traceback

try:
    from mcp.server import MCPServer
    from mcp.server.transport_security import TransportSecuritySettings
    HAS_MCP = True
except ImportError:
    HAS_MCP = False

from hardware.led import LEDController
from hardware.sht31 import SHT31Sensor
from hardware.ultrasonic import UltrasonicSensor
from config import load_config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

cfg = load_config()

BROKER = cfg.broker_host
PORT = cfg.broker_port
TOPIC_PREFIX = cfg.topic_prefix

COMMAND_TOPIC = cfg.command_topic
STATUS_TOPIC = cfg.status_topic
SENSORS_TOPIC = cfg.sensors_topic
LORA_TOPIC = cfg.lora_topic

try:
    led = LEDController(pin=cfg.led_pin)
except Exception as e:
    logging.warning(f"LED controller unavailable on this host: {e}")
    led = None

try:
    sht31 = SHT31Sensor(address=cfg.sht31_addr)
except Exception as e:
    logging.warning(f"SHT31 sensor unavailable on this host: {e}")
    sht31 = None

try:
    ultrasonic = UltrasonicSensor(
        trigger_pin=cfg.hcsr04_trig,
        echo_pin=cfg.hcsr04_echo
    )
except Exception as e:
    logging.warning(f"Ultrasonic sensor unavailable on this host: {e}")
    ultrasonic = None

lora_cache = {}
lora_lock = threading.Lock()

mqtt_client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id=f"pi-unified-service-{os.getpid()}"
)

def telemetry_loop():
    logging.info("Real telemetry publisher thread started in unified MCP service.")
    while True:
        payload = {"timestamp": int(time.time())}
        if sht31 is not None:
            try:
                temp, hum = sht31.read()
                payload["temperature"] = round(temp, 2)
                payload["humidity"] = round(hum, 2)
            except Exception as e:
                logging.warning(f"SHT31 read skipped: {e}")

        if ultrasonic is not None:
            try:
                dist = ultrasonic.read_distance()
                payload["distance_cm"] = round(dist, 2)
            except TimeoutError:
                payload["distance_cm"] = None
            except Exception as e:
                logging.warning(f"HC-SR04 read skipped: {e}")

        if "temperature" in payload or "distance_cm" in payload:
            try:
                if mqtt_client.is_connected():
                    mqtt_client.publish(SENSORS_TOPIC, json.dumps(payload), qos=1)
                    logging.info(f"Published real telemetry to {SENSORS_TOPIC}: {payload}")
            except Exception as e:
                logging.error(f"MQTT publish error: {e}")

        time.sleep(cfg.telemetry_interval_sec)

def on_connect(client, userdata, flags, reason_code, properties=None):
    if reason_code == 0:
        client.subscribe(LORA_TOPIC)
        client.subscribe(COMMAND_TOPIC)
        logging.info(f"[MCP-MQTT] Connected and subscribed to {LORA_TOPIC} and {COMMAND_TOPIC}")

        initial_status = "ON" if (led is not None and led.is_on()) else "OFF"
        client.publish(STATUS_TOPIC, json.dumps({"status": initial_status}), qos=1)

def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload = msg.payload.decode("utf-8").strip()

        if topic == LORA_TOPIC:
            data = json.loads(payload)
            with lora_lock:
                lora_cache.update(data)
                lora_cache["last_seen"] = "Just now"
            logging.info(f"[MCP-MQTT] Received real LoRa uplink: {data}")

        elif topic == COMMAND_TOPIC:
            action = payload.upper()
            if action in ("ON", "OFF"):
                if led is not None:
                    new_status = led.set_state(action)
                    client.publish(STATUS_TOPIC, json.dumps({"status": new_status}), qos=1)
                    logging.info(f"Published status confirmation to {STATUS_TOPIC}: {new_status}")
                else:
                    logging.warning("LED hardware unavailable on this host to change state.")
    except Exception as e:
        logging.error(f"[MCP-MQTT] Error in message processing: {e}")

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

def mqtt_background_worker():
    while True:
        try:
            logging.info(f"[MCP-MQTT] Connecting to {BROKER}:{PORT}...")
            mqtt_client.connect(BROKER, PORT, keepalive=60)
            mqtt_client.loop_forever()
        except Exception as e:
            logging.warning(f"[MCP-MQTT] Broker connection failed or dropped: {e}. Retrying in 5 seconds...")
            time.sleep(5)

# Start background MQTT worker and Telemetry loop
threading.Thread(target=mqtt_background_worker, daemon=True).start()
threading.Thread(target=telemetry_loop, daemon=True).start()

# Tool Implementations
def read_pi_sensors() -> str:
    """Read actual real-time temperature, humidity from SHT31 and distance from HC-SR04 on Raspberry Pi."""
    readings = []
    if sht31 is not None:
        try:
            temp, hum = sht31.read()
            readings.append(f"Temperature: {temp:.2f}°C, Humidity: {hum:.2f}% (SHT31)")
        except Exception as e:
            readings.append(f"SHT31 sensor error: {e}")
    else:
        readings.append("SHT31: hardware not connected")

    if ultrasonic is not None:
        try:
            dist = ultrasonic.read_distance()
            readings.append(f"Distance: {dist:.2f} cm (HC-SR04)")
        except TimeoutError:
            readings.append("Distance: Out of range (> 400 cm / No obstacle in front)")
        except Exception as e:
            readings.append(f"HC-SR04 ultrasonic error: {e}")
    else:
        readings.append("HC-SR04: hardware not connected")

    return " | ".join(readings)

def control_pi_devices(action: Literal["on", "off"] = "on") -> str:
    """Turn physical Raspberry Pi LED ON or OFF. Action must be 'on' or 'off'."""
    clean = action.strip().lower()
    if clean not in ("on", "off"):
        return f"Error: action must be 'on' or 'off', got '{action}'"

    if led is None:
        return "Error: Physical LED hardware is not connected or GPIO is unavailable."

    new_state = led.set_state(clean.upper())

    try:
        mqtt_client.publish(STATUS_TOPIC, json.dumps({"status": new_state}), qos=1)
    except Exception as e:
        logging.error(f"Failed to publish status: {e}")

    return f"Physical LED is now turned {new_state}"

def read_lora_sensors() -> str:
    """Read actual telemetry received from remote LoRa node via MQTT."""
    with lora_lock:
        if not lora_cache:
            return "No LoRa node telemetry received yet from the network."

        node_id = lora_cache.get("node_id", "Unknown")
        hum = lora_cache.get("humidity", "N/A")
        bat = lora_cache.get("battery_voltage", "N/A")
        rssi = lora_cache.get("rssi", "N/A")
        return f"LoRa Node ({node_id}) Real Telemetry: Humidity={hum}%, Battery={bat}V, RSSI={rssi} dBm"

def publish_mqtt_command(topic: str = "", message: Literal["ON", "OFF"] = "ON") -> str:
    """Publish command message ('ON' or 'OFF') to MQTT Broker topic."""
    clean_topic = topic.strip() if topic else COMMAND_TOPIC
    clean_msg = message.strip().upper() if isinstance(message, str) else "ON"
    if clean_msg not in ("ON", "OFF"):
        clean_msg = "ON"
    info = mqtt_client.publish(clean_topic, clean_msg, qos=1)
    info.wait_for_publish(timeout=3)
    return f"Published to {clean_topic}: {clean_msg}"

def create_mcp_app():
    if not HAS_MCP:
        return None
    server = MCPServer("RaspberryPi-IoT")
    server.tool()(read_pi_sensors)
    server.tool()(control_pi_devices)
    server.tool()(read_lora_sensors)
    server.tool()(publish_mqtt_command)
    return server

def get_security_settings():
    return TransportSecuritySettings(
        allowed_hosts=[
            "silent-birch-9f14b5d6.tunnl.gg",
            "silent-birch-9f14b5d6.tunnl.gg:*",
            "*.tunnl.gg",
            "*.tunnl.gg:*",
            "10.74.200.63",
            "10.74.200.63:*",
            "localhost:8000",
            "127.0.0.1:8000",
            "0.0.0.0:8000",
            "*",
        ],
        allowed_origins=[
            "https://silent-birch-9f14b5d6.tunnl.gg/",
            "https://silent-birch-9f14b5d6.tunnl.gg",
            "https://*.tunnl.gg/",
            "https://*.tunnl.gg",
            "http://10.74.200.63:8000",
            "http://localhost:3000",
            "http://localhost:8080",
            "*",
        ]
    )

def graceful_shutdown(signum=None, frame=None):
    logging.info("\nShutting down Unified MCP Service cleanly (Ctrl+C received)...")
    try:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
    except Exception:
        pass
    if led is not None:
        try:
            led.cleanup()
        except Exception:
            pass
    logging.info("Unified MCP Service shutdown complete. Goodbye.")
    sys.exit(0)

try:
    signal.signal(signal.SIGINT, graceful_shutdown)
    signal.signal(signal.SIGTERM, graceful_shutdown)
except (ValueError, AttributeError):
    pass

if __name__ == "__main__":
    if HAS_MCP:
        mcp_app = create_mcp_app()
        security = get_security_settings()
        logging.info("Starting Unified MCP and Telemetry Service on 0.0.0.0:8000...")
        try:
            mcp_app.run(
                transport="streamable-http",
                transport_security=security,
                host="0.0.0.0",
                port=8000
            )
        except (KeyboardInterrupt, SystemExit):
            graceful_shutdown()
        except Exception as e:
            logging.error(f"MCP server runtime error: {e}")
            graceful_shutdown()
    else:
        logging.error("mcp package is not available.")

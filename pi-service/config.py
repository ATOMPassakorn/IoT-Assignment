"""
Centralized Configuration Module for Raspberry Pi IoT Service.
Loads operational parameters from environment variables with safe defaults.
"""
import os
from dataclasses import dataclass

@dataclass(frozen=True)
class PiConfig:
    broker_host: str
    broker_port: int
    topic_prefix: str
    led_pin: int
    hcsr04_trig: int
    hcsr04_echo: int
    sht31_addr: int
    mcp_port: int
    telemetry_interval_sec: float

    @property
    def command_topic(self) -> str:
        return f"{self.topic_prefix}/actuators/led"

    @property
    def status_topic(self) -> str:
        return f"{self.topic_prefix}/actuators/led/status"

    @property
    def sensors_topic(self) -> str:
        return f"{self.topic_prefix}/sensors"

    @property
    def lora_topic(self) -> str:
        return f"{self.topic_prefix}/lora"


def load_config() -> PiConfig:
    broker_host = os.getenv("MQTT_BROKER_HOST", "broker.hivemq.com").strip()
    try:
        broker_port = int(os.getenv("MQTT_BROKER_PORT", "1883").strip())
    except ValueError:
        broker_port = 1883

    topic_prefix = os.getenv("MQTT_TOPIC_PREFIX", "iot/67070134").strip().strip("/")
    if not topic_prefix:
        topic_prefix = "iot/67070134"

    try:
        led_pin = int(os.getenv("LED_PIN", "18").strip())
    except ValueError:
        led_pin = 18

    try:
        hcsr04_trig = int(os.getenv("HCSR04_TRIG", "23").strip())
    except ValueError:
        hcsr04_trig = 23

    try:
        hcsr04_echo = int(os.getenv("HCSR04_ECHO", "24").strip())
    except ValueError:
        hcsr04_echo = 24

    raw_sht31 = os.getenv("SHT31_ADDR", "0x44").strip()
    try:
        sht31_addr = int(raw_sht31, 16) if raw_sht31.startswith("0x") else int(raw_sht31)
    except ValueError:
        sht31_addr = 0x44

    try:
        mcp_port = int(os.getenv("MCP_PORT", "5001").strip())
    except ValueError:
        mcp_port = 5001

    try:
        telemetry_interval_sec = float(os.getenv("TELEMETRY_INTERVAL_SEC", "2.0").strip())
    except ValueError:
        telemetry_interval_sec = 2.0

    return PiConfig(
        broker_host=broker_host,
        broker_port=broker_port,
        topic_prefix=topic_prefix,
        led_pin=led_pin,
        hcsr04_trig=hcsr04_trig,
        hcsr04_echo=hcsr04_echo,
        sht31_addr=sht31_addr,
        mcp_port=mcp_port,
        telemetry_interval_sec=telemetry_interval_sec,
    )

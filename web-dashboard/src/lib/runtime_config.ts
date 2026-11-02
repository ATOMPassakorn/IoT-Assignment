export interface RuntimeConfig {
  group_name: string;
  topic_prefix: string;
  broker_url: string;
  polling_interval_ms: number;
  sensors_topic: string;
  led_topic: string;
  lora_topic: string;
}

export function fallbackRuntimeConfig(): RuntimeConfig {
  return {
    group_name: "IoT Assignment",
    topic_prefix: "iot/67070134",
    broker_url: "",
    polling_interval_ms: 2000,
    sensors_topic: "iot/67070134/sensors",
    led_topic: "iot/67070134/actuators/led",
    lora_topic: "iot/67070134/lora",
  };
}

export function parseRuntimeConfig(raw: unknown): RuntimeConfig {
  const fallback = fallbackRuntimeConfig();
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const record = raw as Record<string, unknown>;
  const topicPrefix = (typeof record.topic_prefix === "string" && record.topic_prefix.trim().length > 0)
    ? record.topic_prefix.trim()
    : fallback.topic_prefix;

  return {
    group_name: (typeof record.group_name === "string" && record.group_name.trim().length > 0)
      ? record.group_name.trim()
      : fallback.group_name,
    topic_prefix: topicPrefix,
    broker_url: typeof record.broker_url === "string" ? record.broker_url : fallback.broker_url,
    polling_interval_ms: (typeof record.polling_interval_ms === "number" && record.polling_interval_ms > 0)
      ? record.polling_interval_ms
      : fallback.polling_interval_ms,
    sensors_topic: typeof record.sensors_topic === "string" && record.sensors_topic.length > 0
      ? (record.sensors_topic as string)
      : `${topicPrefix}/sensors`,
    led_topic: typeof record.led_topic === "string" && record.led_topic.length > 0
      ? (record.led_topic as string)
      : `${topicPrefix}/actuators/led`,
    lora_topic: typeof record.lora_topic === "string" && record.lora_topic.length > 0
      ? (record.lora_topic as string)
      : `${topicPrefix}/lora`,
  };
}

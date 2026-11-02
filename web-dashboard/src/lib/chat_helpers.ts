import { McpTool } from "./api";

export function formatToolLabel(toolName: string): string {
  if (!toolName) return "Tool";
  return toolName
    .split("_")
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === "lora") return "LoRa";
      if (lower === "pi") return "Pi";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function getDefaultToolArgs(tool: McpTool): Record<string, unknown> {
  if (!tool || !tool.inputSchema || typeof tool.inputSchema !== "object") {
    return {};
  }
  const schemaObj = tool.inputSchema as Record<string, unknown>;
  const properties = schemaObj.properties as Record<string, unknown> | undefined;
  if (!properties || typeof properties !== "object") {
    return {};
  }

  const args: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(properties)) {
    if (prop && typeof prop === "object") {
      const propObj = prop as Record<string, unknown>;
      if (Array.isArray(propObj.enum) && propObj.enum.length > 0) {
        args[key] = propObj.enum.includes("on") ? "on" : propObj.enum[0];
      } else if (propObj.default !== undefined) {
        args[key] = propObj.default;
      } else if (key === "action") {
        args[key] = "on";
      } else if (key === "topic") {
        args[key] = "iot/67070134/actuators/led";
      } else if (key === "message") {
        args[key] = "ON";
      } else if (propObj.type === "string") {
        args[key] = "default";
      } else if (propObj.type === "number" || propObj.type === "integer") {
        args[key] = 0;
      } else if (propObj.type === "boolean") {
        args[key] = true;
      }
    }
  }
  return args;
}

export interface QuickActionButton {
  id: string;
  label: string;
  toolName: string;
  args: Record<string, unknown>;
  queryText: string;
  variant: "default" | "on" | "off";
}

export function getQuickActionButtons(tools: McpTool[]): QuickActionButton[] {
  if (!tools || !Array.isArray(tools)) return [];

  const buttons: QuickActionButton[] = [];

  for (const tool of tools) {
    if (!tool || !tool.name) continue;

    const defaultArgs = getDefaultToolArgs(tool);
    const schemaObj =
      tool.inputSchema && typeof tool.inputSchema === "object"
        ? (tool.inputSchema as Record<string, unknown>)
        : {};
    const props =
      schemaObj.properties && typeof schemaObj.properties === "object"
        ? (schemaObj.properties as Record<string, unknown>)
        : {};

    const hasActionProp = "action" in props || "action" in defaultArgs;
    const isPublishMqtt =
      tool.name === "publish_mqtt_command" ||
      "message" in props ||
      (tool.name.includes("mqtt") && tool.name.includes("publish"));

    if (hasActionProp) {
      const baseLabel = formatToolLabel(tool.name);
      buttons.push({
        id: `${tool.name}-on`,
        label: `${baseLabel} (ON)`,
        toolName: tool.name,
        args: { ...defaultArgs, action: "on" },
        queryText: `Execute ${tool.name} (ON)`,
        variant: "on",
      });
      buttons.push({
        id: `${tool.name}-off`,
        label: `${baseLabel} (OFF)`,
        toolName: tool.name,
        args: { ...defaultArgs, action: "off" },
        queryText: `Execute ${tool.name} (OFF)`,
        variant: "off",
      });
    } else if (isPublishMqtt) {
      const baseLabel = formatToolLabel(tool.name);
      buttons.push({
        id: `${tool.name}-on`,
        label: `${baseLabel} (ON)`,
        toolName: tool.name,
        args: { ...defaultArgs, message: "ON" },
        queryText: `Execute ${tool.name} (ON)`,
        variant: "on",
      });
      buttons.push({
        id: `${tool.name}-off`,
        label: `${baseLabel} (OFF)`,
        toolName: tool.name,
        args: { ...defaultArgs, message: "OFF" },
        queryText: `Execute ${tool.name} (OFF)`,
        variant: "off",
      });
    } else {
      buttons.push({
        id: tool.name,
        label: formatToolLabel(tool.name),
        toolName: tool.name,
        args: defaultArgs,
        queryText: `Execute ${tool.name}`,
        variant: "default",
      });
    }
  }

  return buttons;
}

export interface MatchedMcpToolResult {
  tool: McpTool;
  args: Record<string, unknown>;
}

function matchesKeyword(text: string, kw: string): boolean {
  if (/^[a-zA-Z]+$/.test(kw)) {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    return regex.test(text);
  }
  return text.includes(kw);
}

export function matchMcpTool(query: string, tools: McpTool[]): MatchedMcpToolResult | null {
  if (!tools || tools.length === 0) {
    return null;
  }
  if (!query || typeof query !== "string") {
    const defaultTool = tools[0];
    return { tool: defaultTool, args: getDefaultToolArgs(defaultTool) };
  }

  const q = query.toLowerCase();

  const ON_KEYWORDS = ["on", "เปิด", "start", "enable", "ติด"];
  const OFF_KEYWORDS = ["off", "ปิด", "ดับ", "stop", "disable"];
  const ACTUATOR_KEYWORDS = [
    "led",
    "light",
    "lamp",
    "device",
    "control",
    "ไฟ",
    "หลอด",
    "สวิตช์",
    ...ON_KEYWORDS,
    ...OFF_KEYWORDS,
  ];
  const LORA_KEYWORDS = [
    "lora",
    "node",
    "battery",
    "rssi",
    "uplink",
    "โหนด",
    "ระยะไกล",
    "แบต",
    "แบตเตอรี่",
  ];
  const SENSOR_KEYWORDS = [
    "sensor",
    "temp",
    "temperature",
    "humidity",
    "distance",
    "cm",
    "ultrasonic",
    "sht31",
    "reading",
    "อุณหภูมิ",
    "ความชื้น",
    "ระดับ",
    "น้ำ",
    "ระยะ",
  ];

  let bestTool = tools[0];
  let highestScore = -1;

  for (const tool of tools) {
    let score = 0;
    const nameLower = (tool.name || "").toLowerCase();
    const descLower = (tool.description || "").toLowerCase();

    // Direct name match
    if (q.includes(nameLower)) {
      score += 10;
    }

    // Name parts match
    for (const part of nameLower.split("_")) {
      if (part.length > 2 && q.includes(part)) {
        score += 3;
      }
    }

    // Keyword relevance matching
    const isActuatorTool =
      nameLower.includes("control") || nameLower.includes("led") || descLower.includes("led");
    const isLoRaTool = nameLower.includes("lora") || descLower.includes("lora");
    const isSensorTool =
      nameLower.includes("sensor") ||
      descLower.includes("temperature") ||
      descLower.includes("sensor");

    if (isActuatorTool && ACTUATOR_KEYWORDS.some((kw) => matchesKeyword(q, kw))) {
      score += 5;
    }
    if (isLoRaTool && LORA_KEYWORDS.some((kw) => matchesKeyword(q, kw))) {
      score += 6;
    }
    if (isSensorTool && SENSOR_KEYWORDS.some((kw) => matchesKeyword(q, kw))) {
      score += 4;
    }

    if (score > highestScore) {
      highestScore = score;
      bestTool = tool;
    }
  }

  // Extract arguments based on matched tool schema
  const args = getDefaultToolArgs(bestTool);
  if (bestTool.inputSchema && typeof bestTool.inputSchema === "object") {
    const schemaObj = bestTool.inputSchema as Record<string, unknown>;
    const props = schemaObj.properties as Record<string, unknown> | undefined;
    if (props && "action" in props) {
      if (OFF_KEYWORDS.some((kw) => matchesKeyword(q, kw))) {
        args.action = "off";
      } else if (ON_KEYWORDS.some((kw) => matchesKeyword(q, kw))) {
        args.action = "on";
      }
    }
    if (props && "message" in props) {
      if (OFF_KEYWORDS.some((kw) => matchesKeyword(q, kw))) {
        args.message = "OFF";
      } else if (ON_KEYWORDS.some((kw) => matchesKeyword(q, kw))) {
        args.message = "ON";
      }
    }
  }

  return { tool: bestTool, args };
}

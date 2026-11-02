import { RuntimeConfig, fallbackRuntimeConfig, parseRuntimeConfig } from "./runtime_config";

export { type RuntimeConfig, fallbackRuntimeConfig, parseRuntimeConfig };

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/config`, { cache: "no-store" });
    if (!res.ok) {
      return fallbackRuntimeConfig();
    }
    const data = await res.json();
    return parseRuntimeConfig(data);
  } catch {
    return fallbackRuntimeConfig();
  }
}

export interface SensorItem {
  id: string;
  name: string;
  value: number | null;
  unit: string;
  available: boolean;
}

export interface SensorData {
  temperature: number | null;
  humidity: number | null;
  distance_cm: number | null;
  led_status: "ON" | "OFF";
  updated_at: string;
  sensors?: SensorItem[];
}

export interface TelemetryPoint {
  temperature: number | null;
  humidity: number | null;
  distance_cm: number | null;
  timestamp: string;
}

export interface LoRaData {
  node_id: string;
  humidity: number | null;
  battery_voltage: number | null;
  rssi: number | null;
  updated_at: string;
}

export async function fetchSensors(): Promise<SensorData> {
  const res = await fetch(`${API_BASE_URL}/api/sensors`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch sensors: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchHistory(): Promise<TelemetryPoint[]> {
  const res = await fetch(`${API_BASE_URL}/api/history`, { cache: "no-store" });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function fetchLoRa(): Promise<LoRaData> {
  const res = await fetch(`${API_BASE_URL}/api/lora`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch LoRa data: ${res.statusText}`);
  }
  return res.json();
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema?: unknown;
}

export async function fetchMcpTools(): Promise<{ server: string; tools: McpTool[] }> {
  const res = await fetch(`${API_BASE_URL}/api/mcp/tools`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch MCP tools: ${res.statusText}`);
  }
  return res.json();
}

export async function callMcpTool(
  name: string,
  args: Record<string, unknown> = {}
): Promise<{ success: boolean; result?: string; error?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/mcp/call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, arguments: args }),
  });
  return res.json();
}

export async function toggleLed(action: "ON" | "OFF"): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/led`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    throw new Error(`Failed to toggle LED: ${res.statusText}`);
  }
  return res.json();
}

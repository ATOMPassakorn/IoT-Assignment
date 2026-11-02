export function getNextLedAction(currentStatus: string): "ON" | "OFF" {
  return currentStatus === "ON" ? "OFF" : "ON";
}

"""
Unified Daemon Entrypoint for Raspberry Pi IoT Service.
Merges MQTT Telemetry publishing and MCP Server into a single process
to avoid GPIO pin allocation conflicts.
"""
import os
import sys

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    mcp_script = os.path.join(current_dir, "mcp_service.py")
    print(f"[INFO] Launching unified MCP and Telemetry service: {mcp_script}")
    os.execv(sys.executable, [sys.executable, mcp_script] + sys.argv[1:])

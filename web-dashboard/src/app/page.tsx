"use client";

import React, { useEffect, useState, useRef } from "react";
import LedControl from "../components/LedControl";
import SensorCard from "../components/SensorCard";
import TelemetryChart from "../components/TelemetryChart";
import AiChatBox from "../components/AiChatBox";
import {
  fetchSensors,
  fetchHistory,
  fetchLoRa,
  fetchRuntimeConfig,
  SensorData,
  TelemetryPoint,
  LoRaData,
  RuntimeConfig,
  fallbackRuntimeConfig,
} from "../lib/api";
import { resolveTheme, ThemeMode } from "../lib/theme";
import {
  Activity,
  Wifi,
  Thermometer,
  Droplets,
  Gauge,
  Radio,
  Sun,
  Moon,
  Layers,
} from "lucide-react";

export default function Home() {
  const [data, setData] = useState<SensorData>({
    temperature: null,
    humidity: null,
    distance_cm: null,
    led_status: "OFF",
    updated_at: new Date().toISOString(),
  });
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [lora, setLora] = useState<LoRaData>({
    node_id: "lora-node-01",
    humidity: null,
    battery_voltage: null,
    rssi: null,
    updated_at: new Date().toISOString(),
  });
  const [connected, setConnected] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig>(fallbackRuntimeConfig());
  const lastUserLedActionRef = useRef<number>(0);

  // Fetch dynamic runtime configuration on mount
  useEffect(() => {
    let isMounted = true;
    fetchRuntimeConfig().then((cfg) => {
      if (isMounted) {
        setRuntimeConfig(cfg);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize theme from OS preference & localStorage
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("apple-theme") : null;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const initialTheme = resolveTheme(stored, media.matches);
    setTheme(initialTheme);

    const listener = (e: MediaQueryListEvent) => {
      const currentStored = localStorage.getItem("apple-theme");
      if (!currentStored) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  // Synchronize active theme with document root
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  const toggleTheme = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("apple-theme", nextTheme);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const pollData = async () => {
      try {
        const [sensors, hist, loraData] = await Promise.all([
          fetchSensors(),
          fetchHistory(),
          fetchLoRa(),
        ]);
        if (isMounted) {
          const isRecentlyInteracted = Date.now() - lastUserLedActionRef.current < 2500;
          setData((prev) => ({
            ...sensors,
            led_status: isRecentlyInteracted ? prev.led_status : sensors.led_status,
          }));
          setHistory(hist);
          setLora(loraData);
          setConnected(true);
        }
      } catch {
        if (isMounted) {
          setConnected(false);
        }
      }
    };

    pollData();
    const interval = setInterval(pollData, runtimeConfig.polling_interval_ms);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [runtimeConfig.polling_interval_ms]);

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <main className="min-h-screen relative bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-slate-100 p-4 sm:p-8 md:p-12 transition-colors duration-500">
        {/* Floating Atmospheric Deep Spatial Mesh Orbs (Refracts through ultra liquid glass) */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-8%] left-[-5%] w-[650px] h-[650px] rounded-full bg-gradient-to-br from-indigo-600/40 via-purple-600/35 to-pink-500/30 blur-[130px] animate-float-slow" />
          <div className="absolute top-[25%] right-[-10%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-cyan-400/35 via-sky-500/30 to-blue-600/30 blur-[140px] animate-float-reverse" />
          <div className="absolute bottom-[-10%] left-[15%] w-[650px] h-[650px] rounded-full bg-gradient-to-br from-rose-500/35 via-fuchsia-600/30 to-purple-600/30 blur-[140px] animate-float-slow" />
        </div>

        <div className="max-w-7xl mx-auto space-y-8 relative z-10">
          {/* Header Glass Capsule */}
          <header className="liquid-capsule px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300">
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-md">
                <Layers className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{runtimeConfig.group_name}</span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Raspberry Pi & LoRaWAN & Intelligence MCP Bridge
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 self-end md:self-auto">
              {/* REST / MQTT Status Pill */}
              <div className="liquid-capsule px-3.5 py-1.5 text-xs font-medium flex items-center space-x-2">
                <Wifi
                  className={`w-3.5 h-3.5 ${
                    connected ? "text-emerald-500 animate-pulse" : "text-rose-500"
                  }`}
                />
                <span className={connected ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>
                  {connected ? "Live System Online" : "Connecting..."}
                </span>
              </div>

              {/* Dynamic Topic Prefix Pill */}
              <span className="liquid-capsule px-3 py-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 hidden sm:inline-block">
                {runtimeConfig.topic_prefix}
              </span>

              {/* Theme Switcher Capsule Button */}
              <button
                type="button"
                onClick={toggleTheme}
                title={`Switch to ${theme === "dark" ? "Light Frosted Pearl" : "Dark Cosmic"} mode`}
                aria-label={`Switch to ${theme === "dark" ? "Light Frosted Pearl" : "Dark Cosmic"} mode`}
                className="liquid-capsule liquid-capsule-btn w-9 h-9 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer select-none"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-400 pointer-events-none" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-600 pointer-events-none" />
                )}
              </button>
            </div>
          </header>

          {/* Section: Live Sensor Readings (visionOS Specular Cards) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                <span>Environmental Telemetry</span>
              </h2>
              <span className="text-xs text-slate-400">Auto-updating every 2s</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <SensorCard
                title="Temperature"
                value={data.temperature}
                unit="°C"
                subtitle="SHT31 Sensor (I2C 0x44)"
                icon={Thermometer}
                colorTheme="amber"
              />
              <SensorCard
                title="Relative Humidity"
                value={data.humidity}
                unit="%"
                subtitle="SHT31 Sensor (I2C 0x44)"
                icon={Droplets}
                colorTheme="sky"
              />
              <SensorCard
                title="Ultrasonic Range"
                value={data.distance_cm}
                unit="cm"
                subtitle="HC-SR04 Sensor (GPIO 23/24)"
                icon={Gauge}
                colorTheme="emerald"
              />
              <SensorCard
                title={`LoRaWAN (${lora.node_id})`}
                value={lora.humidity}
                unit="%"
                subtitle={`Bat: ${lora.battery_voltage}V | RSSI: ${lora.rssi}dBm`}
                icon={Radio}
                colorTheme="violet"
              />
            </div>
          </section>

          {/* Section: Interactive Actuator & Environmental Chart */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <LedControl
                status={data.led_status}
                topic={runtimeConfig.led_topic}
                onStatusChange={(newStatus) => {
                  lastUserLedActionRef.current = Date.now();
                  setData((prev) => ({ ...prev, led_status: newStatus }));
                }}
              />
            </div>

            <div className="lg:col-span-2">
              <TelemetryChart data={history} />
            </div>
          </section>

          {/* Section: Conversational AI (Apple Intelligence Floating Sheet) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 animate-pulse" />
                <span>Intelligence Conversational Control</span>
              </h2>
            </div>
            <AiChatBox
              onLedChange={(newStatus) =>
                setData((prev) => ({ ...prev, led_status: newStatus }))
              }
            />
          </section>
        </div>
      </main>
    </div>
  );
}

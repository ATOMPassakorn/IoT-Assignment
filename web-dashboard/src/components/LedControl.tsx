"use client";

import React, { useState, useRef, useEffect } from "react";
import { Lightbulb } from "lucide-react";
import { toggleLed } from "../lib/api";
import { getNextLedAction } from "../lib/led";
import { attachLiquidPointerTracker } from "../lib/pointer_engine";

interface LedControlProps {
  status: "ON" | "OFF";
  topic?: string;
  onStatusChange?: (newStatus: "ON" | "OFF") => void;
}

export default function LedControl({ status, topic, onStatusChange }: LedControlProps) {
  // Local state for 0ms instant UI response
  const [localStatus, setLocalStatus] = useState<"ON" | "OFF">(status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // References for queue serialization and race condition prevention
  const desiredStatusRef = useRef<"ON" | "OFF">(status);
  const sentStatusRef = useRef<"ON" | "OFF">(status);
  const isFlushingRef = useRef(false);

  // Sync external prop updates only when no user command is actively in-flight
  useEffect(() => {
    if (!isFlushingRef.current) {
      setLocalStatus(status);
      desiredStatusRef.current = status;
      sentStatusRef.current = status;
    }
  }, [status]);

  useEffect(() => {
    if (cardRef.current) {
      return attachLiquidPointerTracker(cardRef.current);
    }
  }, []);

  const isOn = localStatus === "ON";

  // Serialized asynchronous flusher: Ensures rapid clicks coalesce to the latest desired state
  const flushQueue = async () => {
    if (isFlushingRef.current) return;
    isFlushingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      while (sentStatusRef.current !== desiredStatusRef.current) {
        const target = desiredStatusRef.current;
        await toggleLed(target);
        sentStatusRef.current = target;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to control physical LED");
      }
      // Revert to last confirmed state on error
      setLocalStatus(sentStatusRef.current);
      desiredStatusRef.current = sentStatusRef.current;
      if (onStatusChange) {
        onStatusChange(sentStatusRef.current);
      }
    } finally {
      isFlushingRef.current = false;
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const nextStatus = getNextLedAction(localStatus);

    // 1. Instant optimistic update: Toggle immediately (zero dropped clicks, zero lag)
    setLocalStatus(nextStatus);
    desiredStatusRef.current = nextStatus;
    if (onStatusChange) {
      onStatusChange(nextStatus);
    }

    // 2. Dispatch to async serial flusher
    flushQueue();
  };

  return (
    <div
      ref={cardRef}
      className="apple-liquid-glass liquid-sheen-tracker glass-sheen rounded-3xl p-6 relative overflow-hidden transition-all duration-300"
    >
      {/* Specular top-edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3.5">
          <div
            className={`p-3 rounded-2xl transition-all duration-500 ${
              isOn
                ? "bg-emerald-500/15 text-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)] scale-105"
                : "bg-slate-200/50 dark:bg-white/5 text-slate-400"
            }`}
          >
            <Lightbulb
              className={`w-6 h-6 stroke-[2.2] transition-all duration-300 ${
                isOn ? "animate-pulse" : ""
              }`}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Raspberry Pi LED
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Actuator GPIO Pin 18
            </p>
          </div>
        </div>

        {/* State Pill */}
        <span
          className={`liquid-capsule px-3.5 py-1 text-xs font-bold tracking-wider transition-colors duration-300 ${
            isOn
              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
              : "bg-slate-200/60 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-300/40 dark:border-white/10"
          }`}
        >
          {isOn ? "ACTIVE (ON)" : "OFF"}
        </span>
      </div>

      {/* iOS Fluid Toggle Switch Centerpiece (Never disabled, accepts rapid clicks seamlessly) */}
      <div className="py-4 flex flex-col items-center justify-center space-y-4">
        <button
          onClick={handleToggle}
          aria-label="Toggle Raspberry Pi LED"
          className={`relative inline-flex h-12 w-24 shrink-0 cursor-pointer rounded-full p-1 transition-all duration-300 ease-in-out focus:outline-none shadow-inner select-none ${
            isOn
              ? "bg-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.5)] border border-emerald-400/40"
              : "bg-slate-300 dark:bg-slate-800 border border-slate-400/30 dark:border-white/10"
          } active:scale-95 hover:scale-105`}
        >
          <span className="sr-only">Toggle LED</span>
          {/* Sliding white glass thumb */}
          <span
            className={`pointer-events-none flex items-center justify-center h-10 w-10 transform rounded-full bg-white shadow-md transition duration-300 ease-spring ${
              isOn ? "translate-x-12 shadow-[0_2px_12px_rgba(16,185,129,0.5)]" : "translate-x-0"
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                isOn ? "bg-emerald-500" : "bg-slate-300"
              } ${loading ? "animate-pulse" : ""}`}
            />
          </span>
        </button>

        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {loading ? "Syncing with device..." : isOn ? "Tap to switch OFF" : "Tap to switch ON"}
        </span>
      </div>

      {/* Error Message if any */}
      {error && (
        <p className="text-xs text-rose-500 text-center mt-2 bg-rose-500/10 p-2.5 rounded-2xl border border-rose-500/20">
          {error}
        </p>
      )}

      {/* Footer Status */}
      <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between text-xs text-slate-400">
        <span>Protocol: MQTT / REST</span>
        <span className="font-mono">{topic || "iot/67070134/actuators/led"}</span>
      </div>
    </div>
  );
}

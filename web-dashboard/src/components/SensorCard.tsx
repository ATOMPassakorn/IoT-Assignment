"use client";

import React, { useRef, useEffect } from "react";
import { LucideIcon } from "lucide-react";
import { formatSensorValue } from "../lib/format";
import { attachLiquidPointerTracker } from "../lib/pointer_engine";

interface SensorCardProps {
  title: string;
  value: number | null | undefined;
  unit: string;
  subtitle: string;
  icon: LucideIcon;
  colorTheme: "amber" | "sky" | "emerald" | "violet";
}

export default function SensorCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  colorTheme,
}: SensorCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      return attachLiquidPointerTracker(cardRef.current);
    }
  }, []);

  const themeStyles = {
    amber: {
      lightBg: "bg-amber-500/10",
      lightText: "text-amber-600 dark:text-amber-400",
      borderGlow: "shadow-[0_4px_24px_-4px_rgba(245,158,11,0.2)]",
      iconGlow: "shadow-[0_0_16px_rgba(245,158,11,0.3)]",
      ring: "ring-amber-500/20",
    },
    sky: {
      lightBg: "bg-sky-500/10",
      lightText: "text-sky-600 dark:text-sky-400",
      borderGlow: "shadow-[0_4px_24px_-4px_rgba(14,165,233,0.2)]",
      iconGlow: "shadow-[0_0_16px_rgba(14,165,233,0.3)]",
      ring: "ring-sky-500/20",
    },
    emerald: {
      lightBg: "bg-emerald-500/10",
      lightText: "text-emerald-600 dark:text-emerald-400",
      borderGlow: "shadow-[0_4px_24px_-4px_rgba(16,185,129,0.2)]",
      iconGlow: "shadow-[0_0_16px_rgba(16,185,129,0.3)]",
      ring: "ring-emerald-500/20",
    },
    violet: {
      lightBg: "bg-violet-500/10",
      lightText: "text-violet-600 dark:text-violet-400",
      borderGlow: "shadow-[0_4px_24px_-4px_rgba(139,92,246,0.2)]",
      iconGlow: "shadow-[0_0_16px_rgba(139,92,246,0.3)]",
      ring: "ring-violet-500/20",
    },
  }[colorTheme];

  const formatted = formatSensorValue(value);
  const isAvailable = value !== null && value !== undefined && !Number.isNaN(value);

  return (
    <div
      ref={cardRef}
      className={`apple-liquid-glass liquid-sheen-tracker glass-sheen rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${themeStyles.borderGlow} flex flex-col justify-between relative overflow-hidden group`}
    >
      {/* Specular light catch reflection on top edge */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent pointer-events-none" />

      {/* Header section */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div
          className={`p-2.5 rounded-2xl ${themeStyles.lightBg} ${themeStyles.lightText} ${themeStyles.iconGlow} transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>
      </div>

      {/* Main Metric Value with Tabular Numbers */}
      <div className="my-3">
        <div className="flex items-baseline space-x-2">
          <span className="text-4xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white drop-shadow-sm">
            {formatted}
          </span>
          <span className={`text-base font-bold ${themeStyles.lightText}`}>
            {unit}
          </span>
        </div>
      </div>

      {/* Subtitle & Live Status */}
      <div className="pt-3 border-t border-slate-200/50 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span className="truncate pr-2">{subtitle}</span>
        {isAvailable ? (
          <span className="relative flex h-2 w-2 flex-shrink-0" title="Telemetry live">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Waiting for telemetry">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Waiting
          </span>
        )}
      </div>
    </div>
  );
}

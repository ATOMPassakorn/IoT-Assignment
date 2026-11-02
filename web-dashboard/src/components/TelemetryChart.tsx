"use client";

import React, { useRef, useEffect } from "react";
import { TelemetryPoint } from "../lib/api";
import { calculateChartBounds } from "../lib/chart";
import { Activity } from "lucide-react";
import { attachLiquidPointerTracker } from "../lib/pointer_engine";

interface TelemetryChartProps {
  data: TelemetryPoint[];
}

export default function TelemetryChart({ data }: TelemetryChartProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      return attachLiquidPointerTracker(cardRef.current);
    }
  }, []);

  const validData = (data || []).filter(
    (d): d is TelemetryPoint & { temperature: number } =>
      d.temperature !== null && d.temperature !== undefined && !Number.isNaN(d.temperature)
  );

  const hasEnoughData = validData.length >= 2;
  const { min: minTemp, range } = hasEnoughData
    ? calculateChartBounds(validData)
    : { min: 0, range: 1 };

  const width = 800;
  const height = 220;
  const paddingX = 24;
  const paddingY = 28;

  const points = hasEnoughData
    ? validData.map((d, index) => {
        const x = paddingX + (index / (validData.length - 1)) * (width - 2 * paddingX);
        const y = height - paddingY - ((d.temperature - minTemp) / range) * (height - 2 * paddingY);
        return { x, y };
      })
    : [];

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const latestTemp = validData.length > 0 ? validData[validData.length - 1].temperature : null;

  return (
    <div
      ref={cardRef}
      className="apple-liquid-glass liquid-sheen-tracker glass-sheen rounded-3xl p-6 relative overflow-hidden transition-all duration-300"
    >
      {/* Specular top-edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Temperature Environmental Trend
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sliding window of {data.length} telemetry samples (SHT31)
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-left sm:text-right">
            <span className="text-3xl font-extrabold tabular-nums text-amber-500 dark:text-amber-400 drop-shadow-sm">
              {latestTemp !== null ? `${latestTemp.toFixed(1)} °C` : "-- °C"}
            </span>
            <p className="text-[11px] font-medium text-slate-400">Current Temperature</p>
          </div>
        </div>
      </div>

      {/* Canvas */}
      {!hasEnoughData ? (
        <div className="w-full h-48 flex flex-col items-center justify-center space-y-3 rounded-2xl bg-slate-500/5 border border-dashed border-slate-300/40 dark:border-white/10 mt-2">
          <Activity className="w-7 h-7 text-amber-500/60 animate-breathe" />
          <p className="text-xs text-slate-400">Accumulating real-time telemetry data points from MQTT...</p>
        </div>
      ) : (
        <div className="w-full overflow-hidden mt-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-48 overflow-visible"
          >
            <defs>
              <linearGradient id="appleTempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Frosted Grid Lines */}
            <line
              x1={paddingX}
              y1={height - paddingY}
              x2={width - paddingX}
              y2={height - paddingY}
              stroke="currentColor"
              className="text-slate-200 dark:text-white/10"
              strokeDasharray="4 6"
            />
            <line
              x1={paddingX}
              y1={paddingY}
              x2={width - paddingX}
              y2={paddingY}
              stroke="currentColor"
              className="text-slate-200 dark:text-white/10"
              strokeDasharray="4 6"
            />

            {/* Area fill */}
            <polygon
              points={`${paddingX},${height - paddingY} ${polylinePoints} ${width - paddingX},${height - paddingY}`}
              fill="url(#appleTempGradient)"
            />

            {/* Luminous Line stroke */}
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePoints}
              filter="url(#glow)"
            />

            {/* Latest Point Pulsing Dot (Native SVG SMIL: Zero transform origin jump, Zero flash) */}
            {points.length > 0 && (
              <g>
                <circle
                  cx={points[points.length - 1].x}
                  cy={points[points.length - 1].y}
                  r="6"
                  fill="#f59e0b"
                  opacity="0.5"
                >
                  <animate
                    attributeName="r"
                    values="6;16;6"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.5;0;0.5"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx={points[points.length - 1].x}
                  cy={points[points.length - 1].y}
                  r="5"
                  fill="#ffffff"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                />
              </g>
            )}
          </svg>
        </div>
      )}

      {/* Axis Footer */}
      <div className="flex justify-between text-[11px] text-slate-400 mt-2 px-1">
        <span>Earliest recorded</span>
        <span className="flex items-center space-x-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-breathe" />
          <span>Live 2s Stream</span>
        </span>
        <span>Most recent</span>
      </div>
    </div>
  );
}

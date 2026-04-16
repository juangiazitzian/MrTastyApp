"use client";

import React from "react";

export interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarDataPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  showGrid?: boolean;
  defaultColor?: string;
  className?: string;
  horizontal?: boolean;
}

export function BarChart({
  data,
  height = 200,
  formatValue = (v) => v.toLocaleString("es-AR"),
  showGrid = true,
  defaultColor = "hsl(25, 90%, 55%)",
  className = "",
  horizontal = false,
}: BarChartProps) {
  const PAD_LEFT = horizontal ? 110 : 48;
  const PAD_RIGHT = 16;
  const PAD_TOP = 12;
  const PAD_BOTTOM = horizontal ? 24 : 32;
  const WIDTH = 600;
  const HEIGHT = height;
  const CHART_W = WIDTH - PAD_LEFT - PAD_RIGHT;
  const CHART_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const maxVal = Math.max(...data.map((d) => d.value), 0.01);
  const steps = 4;
  const gridLines = Array.from({ length: steps + 1 }, (_, i) => {
    const v = (maxVal / steps) * i;
    return { v, label: formatValue(v) };
  });

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-white/30 text-sm ${className}`}
        style={{ height }}
      >
        Sin datos para mostrar
      </div>
    );
  }

  if (horizontal) {
    const barH = Math.max(8, Math.min(28, (CHART_H / data.length) * 0.65));
    const barGap = CHART_H / data.length;

    return (
      <div className={className}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          style={{ height }}
          preserveAspectRatio="none"
        >
          {/* Grid vertical lines */}
          {showGrid &&
            gridLines.map((gl, i) => {
              const x = PAD_LEFT + (gl.v / maxVal) * CHART_W;
              return (
                <g key={i}>
                  <line
                    x1={x} y1={PAD_TOP}
                    x2={x} y2={PAD_TOP + CHART_H}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={HEIGHT - 6}
                    textAnchor="middle"
                    fontSize="9"
                    fill="rgba(255,255,255,0.3)"
                  >
                    {gl.label}
                  </text>
                </g>
              );
            })}

          {data.map((d, i) => {
            const barWidth = (d.value / maxVal) * CHART_W;
            const y = PAD_TOP + i * barGap + (barGap - barH) / 2;
            const clr = d.color || defaultColor;
            return (
              <g key={i}>
                {/* Label */}
                <text
                  x={PAD_LEFT - 6}
                  y={y + barH / 2 + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="rgba(255,255,255,0.55)"
                >
                  {d.label.length > 14 ? d.label.slice(0, 13) + "…" : d.label}
                </text>
                {/* Bar background */}
                <rect
                  x={PAD_LEFT}
                  y={y}
                  width={CHART_W}
                  height={barH}
                  rx="4"
                  fill="rgba(255,255,255,0.04)"
                />
                {/* Bar */}
                {barWidth > 0 && (
                  <rect
                    x={PAD_LEFT}
                    y={y}
                    width={barWidth}
                    height={barH}
                    rx="4"
                    fill={clr}
                    opacity="0.85"
                  />
                )}
                {/* Value */}
                <text
                  x={PAD_LEFT + barWidth + 4}
                  y={y + barH / 2 + 4}
                  fontSize="10"
                  fill={clr}
                >
                  {formatValue(d.value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Vertical bars
  const barW = Math.max(6, Math.min(40, (CHART_W / data.length) * 0.6));
  const barGap = CHART_W / data.length;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        {/* Grid horizontal lines */}
        {showGrid &&
          gridLines.map((gl, i) => {
            const y = PAD_TOP + CHART_H - (gl.v / maxVal) * CHART_H;
            return (
              <g key={i}>
                <line
                  x1={PAD_LEFT} y1={y}
                  x2={PAD_LEFT + CHART_W} y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
                <text
                  x={PAD_LEFT - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="9"
                  fill="rgba(255,255,255,0.3)"
                >
                  {gl.label}
                </text>
              </g>
            );
          })}

        {data.map((d, i) => {
          const barHeight = (d.value / maxVal) * CHART_H;
          const x = PAD_LEFT + i * barGap + (barGap - barW) / 2;
          const y = PAD_TOP + CHART_H - barHeight;
          const clr = d.color || defaultColor;
          const step = Math.ceil(data.length / 10);

          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={barHeight}
                rx="3"
                fill={clr}
                opacity="0.85"
              />
              {/* Label */}
              {(i % step === 0 || i === data.length - 1) && (
                <text
                  x={x + barW / 2}
                  y={HEIGHT - 6}
                  textAnchor="middle"
                  fontSize="9"
                  fill="rgba(255,255,255,0.35)"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

"use client";

import React, { useMemo } from "react";

export interface DataPoint {
  label: string;
  value: number;
  [key: string]: string | number;
}

interface Series {
  key: string;
  label: string;
  color: string;
}

interface LineChartProps {
  data: DataPoint[];
  series?: Series[];
  /** Si no hay series, usa la key "value" por defecto */
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
  showGrid?: boolean;
  showArea?: boolean;
  className?: string;
}

const DEFAULT_COLOR = "hsl(25, 90%, 55%)";

function buildPath(points: { x: number; y: number }[], close = false): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
  }
  if (close && points.length > 0) {
    d += ` L ${points[points.length - 1].x} 100%`;
    d += ` L ${points[0].x} 100% Z`;
  }
  return d;
}

export function LineChart({
  data,
  series,
  color = DEFAULT_COLOR,
  height = 180,
  formatValue = (v) => v.toLocaleString("es-AR"),
  showGrid = true,
  showArea = true,
  className = "",
}: LineChartProps) {
  const PAD_LEFT = 52;
  const PAD_RIGHT = 12;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 28;
  const WIDTH = 600;
  const HEIGHT = height;
  const CHART_W = WIDTH - PAD_LEFT - PAD_RIGHT;
  const CHART_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const seriesList: Series[] = series ?? [
    { key: "value", label: "Valor", color },
  ];

  const allValues = data.flatMap((d) =>
    seriesList.map((s) => Number(d[s.key] ?? 0))
  );
  const rawMax = Math.max(...allValues, 0);
  const rawMin = Math.min(...allValues.filter((v) => v > 0), 0);
  const yMax = rawMax === 0 ? 1 : rawMax * 1.1;
  const yMin = rawMin;
  const yRange = yMax - yMin || 1;

  function toSvgX(i: number) {
    return PAD_LEFT + (i / Math.max(data.length - 1, 1)) * CHART_W;
  }
  function toSvgY(v: number) {
    return PAD_TOP + CHART_H - ((v - yMin) / yRange) * CHART_H;
  }

  const gridLines = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const v = yMin + (yRange / steps) * i;
      return { y: toSvgY(v), label: formatValue(v) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yMin, yRange, formatValue]);

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

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        <defs>
          {seriesList.map((s) => (
            <linearGradient
              key={s.key}
              id={`area-grad-${s.key}`}
              x1="0" y1="0" x2="0" y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines */}
        {showGrid &&
          gridLines.map((gl, i) => (
            <g key={i}>
              <line
                x1={PAD_LEFT}
                x2={PAD_LEFT + CHART_W}
                y1={gl.y}
                y2={gl.y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
              <text
                x={PAD_LEFT - 6}
                y={gl.y + 4}
                textAnchor="end"
                fontSize="9"
                fill="rgba(255,255,255,0.3)"
              >
                {gl.label}
              </text>
            </g>
          ))}

        {/* X axis labels */}
        {data.map((d, i) => {
          const x = toSvgX(i);
          // Only show every N-th label to avoid overlap
          const step = Math.ceil(data.length / 8);
          if (i % step !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={i}
              x={x}
              y={HEIGHT - 6}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(255,255,255,0.3)"
            >
              {d.label}
            </text>
          );
        })}

        {/* Series */}
        {seriesList.map((s) => {
          const pts = data.map((d, i) => ({
            x: toSvgX(i),
            y: toSvgY(Number(d[s.key] ?? 0)),
          }));
          const linePath = buildPath(pts);
          const areaBottom = PAD_TOP + CHART_H;
          const areaPath =
            linePath +
            ` L ${pts[pts.length - 1].x} ${areaBottom} L ${pts[0].x} ${areaBottom} Z`;

          return (
            <g key={s.key}>
              {showArea && (
                <path
                  d={areaPath}
                  fill={`url(#area-grad-${s.key})`}
                  stroke="none"
                />
              )}
              <path
                d={linePath}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dots */}
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

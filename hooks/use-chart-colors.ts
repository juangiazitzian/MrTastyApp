"use client";
import { useEffect, useState } from "react";

/** Reserva usada en el servidor y antes de leer los tokens del documento. */
const FALLBACK = {
  balbin: "#f28e19",
  peron: "#2f2b26",
  series: ["#f28e19", "#2f2b26", "#b07f4e", "#cfc7bb", "#efd9b4"],
  grid: "#e4e0d9",
  axis: "#7e776e",
  cursor: "rgba(242,142,25,.08)",
};

export type ChartColors = typeof FALLBACK;

const read = (style: CSSStyleDeclaration, name: string, fallback: string) =>
  style.getPropertyValue(name).trim() || fallback;

/**
 * Recharts necesita colores literales, pero la paleta vive en los tokens CSS.
 * Este hook los lee del documento y vuelve a leerlos cuando cambia el tema,
 * de modo que los gráficos acompañen al modo claro y al oscuro.
 */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(FALLBACK);

  useEffect(() => {
    const sync = () => {
      const style = getComputedStyle(document.documentElement);
      const series = [1, 2, 3, 4, 5].map((n, i) =>
        read(style, `--chart-${n}`, FALLBACK.series[i]),
      );
      setColors({
        balbin: series[0],
        peron: series[1],
        series,
        grid: read(style, "--chart-grid", FALLBACK.grid),
        axis: read(style, "--chart-axis", FALLBACK.axis),
        cursor: read(style, "--chart-cursor", FALLBACK.cursor),
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}

// packages/ui/src/components/chart.tsx
"use client";

import { areaY, type ChartPoint, d3Curve, defineChart } from "@tanstack/charts";
import { motion } from "@tanstack/charts/motion";
import { RendererChart } from "@tanstack/charts/react/tooltip";
import { tooltip } from "@tanstack/charts/tooltip";
import { scaleLinear, scalePoint } from "d3-scale";
import { curveNatural } from "d3-shape";
import * as React from "react";

import { cn } from "../lib/utils";

// ============================================================
// Types
// ============================================================
const Reg = /-?(bars|lines|areas|slices|values|radar)$/u;
export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  }
>;

export type ChartDataPoint = Record<string, string | number>;

export type ChartSeries = {
  dataKey: string;
  label: string;
  color: string;
};

// ============================================================
// Constants
// ============================================================

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
];

// ============================================================
// Context
// ============================================================

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

// ============================================================
// Chart Container
// ============================================================

type ChartContainerProps = {
  children: React.ReactNode;
  config: ChartConfig;
  height?: number;
  width?: number;
} & React.ComponentProps<"div">;

export function ChartContainer({
  id,
  className,
  children,
  config,
  height = 300,
  width = 600,
  ...props
}: ChartContainerProps) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replaceAll(":", "")}`;
  const contextValue = React.useMemo(() => ({ config }), [config]);

  return (
    <ChartContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex w-full justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          className
        )}
        data-chart={chartId}
        data-slot="chart"
        {...props}
      >
        <div className="w-full" style={{ height, width }}>
          {children}
        </div>
      </div>
    </ChartContext.Provider>
  );
}

// ============================================================
// Chart Tooltip
// ============================================================

function shadcnTooltipContent<TDatum>(
  points: ReadonlyArray<ChartPoint<TDatum>>
) {
  return {
    title: String(points[0]?.xValue ?? ""),
    rows: points.map((point) => ({
      label: String(point.group ?? point.markId.replace(Reg, "")),
      value: Number(point.yValue ?? point.xValue ?? 0).toLocaleString("en-US"),
      color: point.color,
    })),
  };
}

// ============================================================
// Chart Components
// ============================================================

type ChartProps = {
  colors?: Array<string>;
  data: Array<ChartDataPoint>;
  dataKeys: Array<string>;
  height?: number;
  width?: number;
  xAxisKey?: string;
};
type ChartVariant = "area" | "line" | "bar";

const VARIANT_STYLES: Record<
  ChartVariant,
  {
    fillOpacity: number;
    strokeWidth: number;
    ariaLabel: string;
  }
> = {
  area: { fillOpacity: 0.4, strokeWidth: 2, ariaLabel: "Area chart" },
  line: { fillOpacity: 0.1, strokeWidth: 2.5, ariaLabel: "Line chart" },
  bar: { fillOpacity: 0.8, strokeWidth: 0, ariaLabel: "Bar chart" },
};

function BaseChart({
  variant,
  data,
  dataKeys,
  colors = DEFAULT_COLORS,
  xAxisKey = "month",
  height = 300,
  width = 600,
}: ChartProps & { variant: ChartVariant }) {
  const style = VARIANT_STYLES[variant];

  const renderer = React.useMemo(
    () =>
      motion({
        initial: "always",
        transition: {
          type: "spring",
          stiffness: 170,
          damping: 18,
          mass: 1,
        },
      }),
    []
  );

  const definition = React.useMemo(() => {
    const marks = dataKeys.map((key, index) =>
      areaY(data, {
        id: key,
        x: xAxisKey,
        y: (point: ChartDataPoint) => Number(point[key]),
        curve: d3Curve(curveNatural),
        fill: colors[index % colors.length],
        fillOpacity: style.fillOpacity,
        stroke: colors[index % colors.length],
        strokeWidth: style.strokeWidth,
      })
    );

    return defineChart(
      {
        marks,
        scales: {
          x: {
            scale: scalePoint,
            axis: { line: false, ticks: { size: 0, padding: 10 } },
          },
          y: {
            scale: scaleLinear,
            grid: true,
            axis: { line: false, ticks: false, tickLabels: false },
          },
        },
        color: { domain: dataKeys, range: colors },
        margin: { top: 10, right: 10, bottom: 35, left: 40 },
        theme: {
          foreground: "var(--muted-foreground)",
          grid: "var(--border)",
          background: "transparent",
        },
      },
      {
        svgAnimation: false,
        focus: "group-x",
        tooltip: {
          use: tooltip,
          className: "sc-chart-tooltip",
          anchor: "group-center",
          placement: "auto",
          sort: "color-domain",
          content: (points) => shadcnTooltipContent(points),
        },
      }
    );
  }, [data, dataKeys, colors, xAxisKey, style]);

  return (
    <div style={{ width, height }}>
      <RendererChart
        ariaLabel={style.ariaLabel}
        definition={definition}
        height={height}
        initialWidth={width}
        renderer={renderer}
      />
    </div>
  );
}

export function AreaChart(props: ChartProps) {
  return <BaseChart variant="area" {...props} />;
}

export function LineChart(props: ChartProps) {
  return <BaseChart variant="line" {...props} />;
}

export function BarChart(props: ChartProps) {
  return <BaseChart variant="bar" {...props} />;
}

// ============================================================
// Chart Tooltip Content
// ============================================================

export type ChartTooltipContentProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
};

export function ChartTooltipContent({
  active,
  payload,
  label,
}: ChartTooltipContentProps) {
  if (!(active && payload?.length)) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
      {!!label && (
        <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((item, index) => (
          <div className="flex items-center justify-between gap-4" key={index}>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {item.name}
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {typeof item.value === "number"
                ? item.value.toLocaleString()
                : String(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Chart Legend
// ============================================================

export type ChartLegendProps = {
  config: ChartConfig;
};

export function ChartLegend({ config }: ChartLegendProps) {
  const entries = Object.entries(config);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
      {entries.map(([key, item]) => (
        <div className="flex items-center gap-1.5" key={key}>
          <div
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground text-sm">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Export
// ============================================================

export type { ChartContextProps };

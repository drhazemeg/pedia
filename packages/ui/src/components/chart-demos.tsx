"use client";

import type { ChartConfig } from "@pedia/ui/components/chart";
import {
  AreaChart,
  BarChart,
  ChartContainer,
  ChartLegend,
  LineChart,
} from "@pedia/ui/components/chart";

// Sample data for demos
const areaData = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  { month: "Mar", desktop: 237, mobile: 120 },
  { month: "Apr", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "Jun", desktop: 214, mobile: 140 },
];

const barData = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  { month: "Mar", desktop: 237, mobile: 120 },
  { month: "Apr", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "Jun", desktop: 214, mobile: 140 },
];

const lineData = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  { month: "Mar", desktop: 237, mobile: 120 },
  { month: "Apr", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "Jun", desktop: 214, mobile: 140 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const desktopAndMobileKeys = ["desktop", "mobile"];
const desktopAndMobileColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];

export function AreaChartDemo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <ChartContainer config={chartConfig}>
        <AreaChart
          colors={desktopAndMobileColors}
          data={areaData}
          dataKeys={desktopAndMobileKeys}
          xAxisKey="month"
        />
      </ChartContainer>
      <ChartLegend config={chartConfig} />
    </div>
  );
}

export function BarChartDemo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <ChartContainer config={chartConfig}>
        <BarChart
          colors={desktopAndMobileColors}
          data={barData}
          dataKeys={desktopAndMobileKeys}
          xAxisKey="month"
        />
      </ChartContainer>
      <ChartLegend config={chartConfig} />
    </div>
  );
}

export function LineChartDemo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <ChartContainer config={chartConfig}>
        <LineChart
          colors={desktopAndMobileColors}
          data={lineData}
          dataKeys={desktopAndMobileKeys}
          xAxisKey="month"
        />
      </ChartContainer>
      <ChartLegend config={chartConfig} />
    </div>
  );
}

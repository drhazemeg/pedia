"use client";

import { Button } from "@pedia/ui/components/button";
import { Label } from "@pedia/ui/components/label";
import { Toggle } from "@pedia/ui/components/toggle";
import type { BaseColor } from "@pedia/ui/components/ui-builder/internal/utils/base-colors";
import {
  baseColors,
  TAILWIND_V4_COLOR_KEYS,
} from "@pedia/ui/components/ui-builder/internal/utils/base-colors";
import type { ComponentLayer } from "@pedia/ui/components/ui-builder/types";
import { useLayerStore } from "@pedia/ui/lib/ui-builder/store/layer-store";
import { cn } from "@pedia/ui/lib/utils";
import { CheckIcon, InfoIcon, MoonIcon, SunIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const RESET_THEME_PROPS = {
  style: undefined,
  "data-mode": undefined,
  "data-color-theme": undefined,
  "data-border-radius": undefined,
} as const;

export function TailwindThemePanel() {
  const {
    selectedPageId,
    updateLayer: updateLayerProps,
    findLayerById,
  } = useLayerStore();
  const selectedPageData = findLayerById(selectedPageId);

  const [isCustomTheme, setIsCustomTheme] = useState(
    selectedPageData?.props["data-color-theme"] !== undefined
  );
  //if not isCustomTheme we delete the themeColors from the pageLayer
  useEffect(() => {
    if (!isCustomTheme) {
      updateLayerProps(selectedPageId, RESET_THEME_PROPS);
    }
  }, [isCustomTheme, selectedPageId, updateLayerProps]);

  const handleOnToggle = useCallback(() => {
    setIsCustomTheme(!isCustomTheme);
  }, [isCustomTheme]);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <Toggle
        aria-label="Toggle italic"
        onPressedChange={handleOnToggle}
        variant="outline"
      >
        {isCustomTheme ? "Use Default Theme" : "Use Custom Theme"}
      </Toggle>
      {!isCustomTheme && (
        <span className="flex items-center gap-2">
          <InfoIcon className="size-4" /> Using Your Project&apos;s Theme
        </span>
      )}
      {selectedPageData && isCustomTheme && (
        <ThemePicker
          isDisabled={!isCustomTheme}
          key={selectedPageId}
          pageLayer={selectedPageData}
        />
      )}
    </div>
  );
}

function ThemePicker({
  className,
  isDisabled,
  pageLayer,
}: {
  className?: string;
  isDisabled: boolean;
  pageLayer: ComponentLayer;
}) {
  const { updateLayer: updateLayerProps } = useLayerStore();

  // Safely extract values with type checking
  const colorThemeValue = pageLayer.props?.["data-color-theme"];
  const modeValue = pageLayer.props?.["data-mode"];
  const borderRadiusValue = pageLayer.props?.borderRadius;

  const [colorTheme, setColorTheme] = useState<BaseColor["name"]>(
    (typeof colorThemeValue === "string"
      ? colorThemeValue
      : "red") as BaseColor["name"]
  );
  const [borderRadius, setBorderRadius] = useState(
    typeof borderRadiusValue === "number" ? borderRadiusValue : 0.5
  );
  const [mode, setMode] = useState<"light" | "dark">(
    (typeof modeValue === "string" ? modeValue : "light") as "light" | "dark"
  );

  useEffect(() => {
    if (isDisabled) return;

    const colorThemeData = baseColors.find(
      (color) => color.name === colorTheme
    );

    if (colorThemeData) {
      const colorDataWithBorder = {
        ...colorThemeData,
        cssVars: {
          ...colorThemeData.cssVars,
          [mode]: {
            ...colorThemeData.cssVars[mode],
            radius: `${borderRadius}rem`,
          },
        },
      } as const;

      const themeStyle = themeToStyleVars(colorDataWithBorder.cssVars[mode]);

      updateLayerProps(pageLayer.id, {
        style: themeStyle,
        "data-mode": mode,
        "data-color-theme": colorTheme,
        "data-border-radius": borderRadius,
      });
    }
  }, [
    pageLayer.id,
    updateLayerProps,
    colorTheme,
    borderRadius,
    mode,
    isDisabled,
  ]);

  const colorOptions = useMemo(
    () =>
      baseColors.map((color: BaseColor) => (
        <ThemeColorOption
          color={color}
          colorTheme={colorTheme}
          key={color.name}
          mode={mode}
          onClick={setColorTheme}
        />
      )),
    [colorTheme, mode]
  );
  const borderRadiusOptions = useMemo(
    () =>
      [0.0, 0.15, 0.3, 0.5, 0.75, 1.0].map((radius) => (
        <ThemeBorderRadiusOption
          borderRadius={borderRadius}
          key={radius}
          onClick={setBorderRadius}
          radius={radius}
        />
      )),
    [borderRadius]
  );

  const modeOptions = useMemo(
    () =>
      (["light", "dark"] as const).map((modeOption) => (
        <ThemeModeOption
          key={modeOption}
          mode={mode}
          modeOption={modeOption}
          onClick={setMode}
        />
      )),
    [mode]
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        className,
        isDisabled && "pointer-events-none opacity-30"
      )}
    >
      <Label className="mt-2">Colors</Label>
      <div className="flex flex-wrap gap-2">{colorOptions}</div>
      <Label className="mt-2">Border Radius</Label>
      <div className="flex flex-wrap gap-2">{borderRadiusOptions}</div>
      <Label className="mt-2">Mode</Label>
      <div className="flex gap-2">{modeOptions}</div>
    </div>
  );
}

function ThemeColorOption({
  color,
  colorTheme,
  mode,
  onClick,
}: {
  color: BaseColor;
  colorTheme: string;
  mode: "light" | "dark";
  onClick: (name: BaseColor["name"]) => void;
}) {
  const handleOnClick = useCallback(() => {
    onClick(color.name);
  }, [onClick, color.name]);

  const style = useMemo(() => {
    return {
      backgroundColor: `hsl(${
        color.activeColor[mode === "dark" ? "dark" : "light"]
      })`,
    };
  }, [color.activeColor, mode]);

  return (
    <Button
      className={cn(
        "gap-2",
        color.name === colorTheme && "border-primary border-2"
      )}
      key={color.name}
      onClick={handleOnClick}
      size="sm"
      variant="outline"
    >
      <div className="size-4 rounded-full" style={style}>
        {color.name === colorTheme && <CheckIcon className="size-4" />}
      </div>
      {color.label}
    </Button>
  );
}

function ThemeBorderRadiusOption({
  radius,
  borderRadius,
  onClick,
}: {
  radius: number;
  borderRadius: number;
  onClick: (radius: number) => void;
}) {
  const handleOnClick = useCallback(() => {
    onClick(radius);
  }, [onClick, radius]);

  const style = useMemo(() => {
    return {
      borderRadius: `${radius}rem`,
    };
  }, [radius]);

  return (
    <Button
      className={cn(
        "gap-2",
        radius === borderRadius && "border-primary border-2"
      )}
      key={radius}
      onClick={handleOnClick}
      size="sm"
      variant="outline"
    >
      <div className="bg-secondary size-6 overflow-hidden rounded-sm">
        <div
          className="border-secondary-foreground ms-2 mt-2 size-10 border-2"
          style={style}
        />
      </div>
      {radius}
    </Button>
  );
}

function ThemeModeOption({
  modeOption,
  mode,
  onClick,
}: {
  modeOption: "light" | "dark";
  mode: "light" | "dark";
  onClick: (mode: "light" | "dark") => void;
}) {
  const handleOnClick = useCallback(() => {
    onClick(modeOption);
  }, [onClick, modeOption]);

  return (
    <Button
      className={cn(mode === modeOption && "border-primary border-2")}
      key={modeOption}
      onClick={handleOnClick}
      size="sm"
      variant="outline"
    >
      {modeOption === "light" ? (
        <SunIcon className="me-1 -translate-x-1 rtl:translate-x-1" />
      ) : (
        <MoonIcon className="me-1 -translate-x-1 rtl:translate-x-1" />
      )}
      {modeOption}
    </Button>
  );
}

function themeToStyleVars(
  colors:
    | BaseColor["cssVars"]["dark"]
    | BaseColor["cssVars"]["light"]
    | undefined
) {
  if (!colors) {
    return;
  }

  const styleVariables: Record<string, string> = {};

  // Set base CSS variables (e.g., --foreground: "222.2 84% 4.9%")
  Object.entries(colors).forEach(([key, value]) => {
    styleVariables[`--${key}`] = value;
  });

  // Also set --color-* variables for Tailwind v4 compatibility
  // Tailwind v4's @theme block defines these at :root, but we need to override them
  // at the element level for custom themes to work
  TAILWIND_V4_COLOR_KEYS.forEach((key) => {
    const value = colors[key as keyof typeof colors];
    if (value) {
      styleVariables[`--color-${key}`] = `hsl(${value})`;
    }
  });

  // Set radius variables for Tailwind v4
  const radiusValue = (colors as { radius?: string }).radius;
  if (radiusValue) {
    styleVariables["--radius-lg"] = radiusValue;
    styleVariables["--radius-md"] = `calc(${radiusValue} - 2px)`;
    styleVariables["--radius-sm"] = `calc(${radiusValue} - 4px)`;
  }

  // Global overrides for text and border colors
  const globalOverrides = {
    color: `hsl(${colors.foreground})`,
    borderColor: `hsl(${colors.border})`,
    backgroundColor: `hsl(${colors.background})`,
  };

  return { ...styleVariables, ...globalOverrides };
}

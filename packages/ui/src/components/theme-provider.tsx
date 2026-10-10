import { THEME_COLORS } from "@pedia/ui/lib/utils";
import { createClientOnlyFn, createIsomorphicFn } from "@tanstack/react-start";
import * as React from "react";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { z } from "zod";

export const themeModeSchema = z.enum(["light", "dark", "auto"]);
export const resolvedThemeSchema = z.enum(["light", "dark"]);

export type ThemeMode = z.infer<typeof themeModeSchema>;
export type ResolvedTheme = z.infer<typeof resolvedThemeSchema>;

export const THEME_STORAGE_KEY = "theme";

// ─── Context ──────────────────────────────────────────────────────────────────

type ThemeContextProps = {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleMode: () => void;
};

export const ThemeContext = React.createContext<ThemeContextProps | undefined>(
  undefined
);

export function useTheme(): ThemeContextProps {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// ─── Isomorphic helpers ───────────────────────────────────────────────────────

const setStoredThemeMode = createClientOnlyFn((theme: ThemeMode) => {
  try {
    const parsed = themeModeSchema.safeParse(theme);
    if (parsed.success) {
      localStorage.setItem(THEME_STORAGE_KEY, parsed.data);
    }
  } catch {
    // storage unavailable
  }
});

const getSystemTheme = createIsomorphicFn()
  .server((): ResolvedTheme => "light")
  .client((): ResolvedTheme =>
    globalThis.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );

const updateThemeClass = createClientOnlyFn((themeMode: ThemeMode) => {
  const root = document.documentElement;
  if (!root) return;

  root.classList.add("theme-switching");
  root.classList.remove("light", "dark", "auto");

  const newTheme = themeMode === "auto" ? getSystemTheme() : themeMode;
  root.classList.add(newTheme);
  root.style.colorScheme = newTheme;

  if (themeMode === "auto") {
    root.classList.add("auto");
  }

  root.dataset.themeMode = themeMode;

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      "content",
      newTheme === "dark" ? THEME_COLORS.dark : THEME_COLORS.light
    );
  }

  void root.offsetHeight;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove("theme-switching");
    });
  });
});

const THEME_NEXT: Record<ThemeMode, ThemeMode> = {
  auto: "light",
  light: "dark",
  dark: "auto",
};

function getNextTheme(current: ThemeMode): ThemeMode {
  return THEME_NEXT[current];
}

// ─── Store subscriptions ──────────────────────────────────────────────────────

function subscribeToTheme(callback: () => void): () => void {
  if (typeof globalThis.window === "undefined") return () => {};

  const mql = globalThis.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", callback);
  globalThis.addEventListener("storage", callback);

  return () => {
    mql.removeEventListener("change", callback);
    globalThis.removeEventListener("storage", callback);
  };
}

function getClientThemeSnapshot(
  defaultThemeMode: ThemeMode = "auto"
): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const parsed = themeModeSchema.safeParse(stored);
    return parsed.success ? parsed.data : defaultThemeMode;
  } catch {
    return defaultThemeMode;
  }
}

function getServerThemeSnapshot(
  defaultThemeMode: ThemeMode = "auto"
): ThemeMode {
  return defaultThemeMode;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

type ThemeProviderProps = {
  children: React.ReactNode;
  /** Initial mode used during SSR + first render. Defaults to "auto". */
  defaultMode?: ThemeMode;
};

export function ThemeProvider({
  children,
  defaultMode = "auto",
}: ThemeProviderProps) {
  const themeMode = useSyncExternalStore(
    subscribeToTheme,
    getClientThemeSnapshot,
    () => getServerThemeSnapshot(defaultMode)
  );

  // Derive resolvedTheme from themeMode + system preference.
  const resolvedTheme: ResolvedTheme =
    themeMode === "auto"
      ? typeof globalThis.window === "undefined"
        ? "light"
        : getSystemTheme()
      : themeMode;

  useEffect(() => {
    updateThemeClass(themeMode);
  }, [themeMode]);

  const setTheme = useCallback((next: ThemeMode) => {
    setStoredThemeMode(next);
    globalThis.dispatchEvent(new Event("storage"));
  }, []);

  const toggleMode = useCallback(() => {
    setTheme(getNextTheme(getClientThemeSnapshot(defaultMode)));
  }, [setTheme, defaultMode]);

  const value = useMemo<ThemeContextProps>(
    () => ({ themeMode, resolvedTheme, setTheme, toggleMode }),
    [themeMode, resolvedTheme, setTheme, toggleMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ─── Optional: read <html> class for hydration matching ───────────────────────

const getHtmlClass = createIsomorphicFn()
  .server(() => "")
  .client(() => document.documentElement.className ?? "");

export function useHtmlClass(): string {
  return getHtmlClass();
}

import * as React from "react";

export const useTheme = () => {
  const subscribe = React.useCallback((callback: () => void) => {
    const darkModeMediaQuery = globalThis.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    const handleChange = () => callback();

    if (typeof darkModeMediaQuery.addEventListener === "function") {
      darkModeMediaQuery.addEventListener("change", handleChange);
      return () =>
        darkModeMediaQuery.removeEventListener("change", handleChange);
    }

    darkModeMediaQuery.addListener(handleChange);
    return () => darkModeMediaQuery.removeListener(handleChange);
  }, []);

  const getSnapshot = React.useCallback(
    () =>
      typeof globalThis.window !== "undefined" &&
      globalThis.matchMedia("(prefers-color-scheme: dark)").matches,
    []
  );

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
};

export default useTheme;

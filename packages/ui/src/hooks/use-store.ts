// prevents nextjs hydration error if using nextjs
export const useStore = <T, F>(
  store: (callback: (state: T) => unknown) => unknown,
  callback: (state: T) => F
) => store(callback) as F;

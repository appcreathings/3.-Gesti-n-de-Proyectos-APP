import { useMediaQuery } from "./useMediaQuery";

const BREAKPOINTS = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
} as const;

export function useBreakpoint(breakpoint: keyof typeof BREAKPOINTS): boolean {
  return useMediaQuery(BREAKPOINTS[breakpoint]);
}

export function useIsMobile(): boolean {
  return !useMediaQuery(BREAKPOINTS.md);
}

export function useIsTablet(): boolean {
  return useMediaQuery(BREAKPOINTS.md) && !useMediaQuery(BREAKPOINTS.lg);
}

export function useIsDesktop(): boolean {
  return useMediaQuery(BREAKPOINTS.lg);
}

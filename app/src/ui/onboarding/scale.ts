import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

/** The onboarding mockup (`direction-b.html` → boot) is authored at a 390pt phone width. */
export const MOCKUP_WIDTH = 390;

/** Converts a mockup pixel value to device points at the current window width. */
export type Scale = (n: number) => number;

/**
 * Scale the mockup's exact pixel values by the real window width, so the scenes match on any
 * phone instead of being approximated.
 *
 * Reads `useWindowDimensions()` rather than `Dimensions.get()` at module scope: the module-scope
 * value is frozen at import time and never sees split-screen, foldables, or a display-size
 * change. On a 390pt phone `s(n) === n`, so nothing moves on the reference device.
 */
export function useMockupScale(): { width: number; height: number; s: Scale } {
  const { width, height } = useWindowDimensions();
  const s = useMemo<Scale>(() => {
    const k = width / MOCKUP_WIDTH;
    return (n: number) => Math.round(n * k);
  }, [width]);
  return { width, height, s };
}

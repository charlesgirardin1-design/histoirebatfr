"use client";

import { useEffect, useState } from "react";

/**
 * Reads the `prefers-reduced-motion` media query as a live boolean.
 *
 * Scoped for render loops outside react-spring — e.g. an `@react-three/fiber`
 * `useFrame` loop. `<ReducedMotion>` (src/components/common/reduced-motion.tsx)
 * does not reach those: it only toggles react-spring's global `skipAnimation`.
 * See obsidian/workflows/optimize-3d-scene.md.
 */
export const useReducedMotionPreference = (): boolean => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const handleChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return reduced;
};

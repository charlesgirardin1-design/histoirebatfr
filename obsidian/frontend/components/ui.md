---
tags: [frontend, stable]
updated: 2026-08-24
---

# Catalog — UI Components

Files in `src/components/ui/` — design-system primitives, stateless, no provider
deps. Conventions: [[component-conventions]].

## `<CubeAnimation>` — `CubeAnimation.tsx`

Decorative, interactive 3D cube — a dark metallo-glass rounded cube built on
`@react-three/fiber` + `@react-three/drei` (`three`). Not part of the
[[animation-system]]: a WebGL render loop is not DOM/React motion and isn't
governed by hard rule #1 — see [[optimize-3d-scene]] → "How it sits with the
hard rules". `"use client"` leaf.

- **Motion:** idle rotation drift on X/Y, plus a pointer-parallax tilt (an outer
  `<group>` lerps toward the normalised R3F pointer; an inner `<group>` carries
  the continuous spin — kept separate so the two don't fight over the same
  rotation values).
- **Hover:** spin speed multiplies, the edge colour warms, and the key light
  intensifies — driven by one `hovered` boolean lifted to the scene root.
- **Material:** `meshPhysicalMaterial` (metalness/clearcoat) for the glass-metal
  look, `<Edges>` for crisp silhouette lines, a `night` HDRI via
  `<Environment>` (`background={false}`) for reflections without a visible
  backdrop.
- **Accessibility / perf:** respects `prefers-reduced-motion` via
  [[hooks|`useReducedMotionPreference`]] (freezes rotation, keeps the pointer
  tilt); the wrapper is `aria-hidden` (purely decorative); the render loop
  stops on a hidden tab (`document.visibilitychange` → Canvas `frameloop`);
  `dpr={[1, 2]}` clamps pixel ratio. This is a baseline, not a full
  [[optimize-3d-scene]] pass — device tiering, a bot poster, and asset
  compression are deferred to that skill if/when this scene needs it.
- **Loading:** the whole `<Canvas>` is wrapped in `<Suspense>` (the `Environment`
  HDRI is the suspending resource); the fallback is a static placeholder block —
  no CSS keyframes, per hard rule #1.
- **Constants:** cube geometry, material colours, rotation speeds, parallax
  strength and light intensities are named constants at the top of the file —
  not design tokens (those govern CSS/Tailwind, not WebGL scene values) but not
  sprinkled through the render code either.

Props: `className` (Tailwind classes for the wrapper — defaults to
`"h-full w-full"`, filling the parent per the design brief).

## Related

[[component-conventions]] · [[animation-system]] · [[optimize-3d-scene]] · [[hooks]]
